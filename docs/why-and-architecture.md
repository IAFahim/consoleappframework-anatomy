# Why ConsoleAppFramework is good, and how it is built

*Internal engineering note · October 2026 · every claim checked against the source in [`Cysharp/ConsoleAppFramework`](https://github.com/Cysharp/ConsoleAppFramework) at `9b6fb25`.*

---

## 0. TL;DR

ConsoleAppFramework (CAF) v5 is a CLI framework for .NET 8+ that ships as **a Roslyn source generator with no runtime library at all**. Your `ConsoleApp.Run(args, (int foo, int bar) => …)` is inspected at compile time and the entire entry-point code — argument loop, type parsing, help text, command routing, filter chain, DI wiring — is emitted as ordinary, hand-written-looking C# into your own assembly. The result is the fastest cold start and the smallest binary a .NET CLI can have while still offering middleware filters, dependency injection, validation, graceful shutdown and generated help.

The one-sentence pitch: **it is a function-like macro, in the Rust sense — not a reflection framework.**

The whole implementation is ~5,800 lines of C# across 17 files. For comparison, that is less than most single *middlewares* in a typical hosted .NET app.

## 1. The problem it solves

A CLI tool is the one .NET workload where classic optimization tricks actively hurt:

- **It runs once, from a cold start.** Reflection caches, `Expression.Compile`, IL emit and pooled arrays never amortize; you pay their warm-up cost exactly once, which is the only cost the user feels.
- **Every dependency is pure overhead.** A hosting stack pulled in "just to parse args" costs DLLs, AOT size, and startup JIT work.
- **Trimming and Native AOT punish reflection.** Anything resolved at runtime by name is a trimming hazard or an AOT failure.

So the design answer is: *decide everything at compile time.* The number of commands, their parameter types, the parse loops, the help strings, the filter chain — all are fixed the moment the programmer hits save. CAF turns that fixed shape into straight-line code.

## 2. The properties that make it good

| # | Property | What it means in practice |
|---|----------|--------------------------|
| 1 | **Zero dependency** | The NuGet package is an analyzer; the generated `ConsoleApp` class is written *into your assembly*. There is no `ConsoleAppFramework.dll` to ship, version or trim. |
| 2 | **Zero reflection** | Option matching is a `switch` on string constants; delegates are held in statically-typed fields; parsing calls `int.TryParse` etc. directly. Nothing is resolved by name at runtime. |
| 3 | **Zero allocation in the framework path** | No arrays of delegates, no captured lambdas, no boxed values. Filter allocation = number of filter classes + 1 (the invoker that wraps the command). |
| 4 | **Zero overhead** | The emitted `Run` body is what a performance-obsessed engineer would have written by hand: one `for` loop over `args`, an exact-match `switch` per option, a case-insensitive fallback, throw-on-miss. The framework's execution cost is literally unreadable in the profile. |
| 5 | **AOT safe** | No reflection, no dynamic emit. (One caveat: if command objects bind via JSON, supply source-generated `JsonSerializerOptions` under AOT.) |
| 6 | **Function-like macro generation** | Unlike attribute-keyed generators that emit *helpers*, CAF analyzes the actual lambda/method expression you passed and emits the `Run` method itself, matching its signature. Influenced by Rust's function-like macros. |
| 7 | **Compile-time diagnostics (CAF001–CAF020)** | Bad signatures, duplicate command names, `Add` in loops, duplicate option aliases, reserved `-h/--help` — all become red squiggles before the program exists. |
| 8 | **Doc comments as metadata** | Descriptions and short aliases come from `/// <param name="message">-m, Message.</param>`. No attribute soup on parameters; CAF015 catches mismatches. |
| 9 | **Real framework features** | Filters (middleware), DI (optional, reference-conditional), validation (DataAnnotations), SIGINT/SIGTERM/SIGQUIT graceful shutdown with a kill-timeout, nested commands with aliases, global options, `--` escape, JSON/array/params binding, CLI schema export. |
| 10 | **Honest about syntax policy** | No bundling (`-fdx`), no case-sensitive `-x` vs `-X` games: lower-kebab-case, single-pass, unambiguous. Speed and clarity beat POSIX completeness, and the README says so. |

## 3. Architecture at a glance

```
 your Program.cs                Roslyn (compile time)                 your binary (runtime)
┌──────────────────┐   ┌───────────────────────────────────┐   ┌────────────────────────────┐
│ ConsoleApp.Run(  │   │ ConsoleAppGenerator (incremental) │   │ ConsoleApp.Run(args, cmd)  │
│   args,          │ → │  Parser.cs     syntax → model     │ → │   switch ("--foo") …       │
│   (int foo) => …)│   │  Command.cs    the model          │   │   int.TryParse(args[i])    │
│                  │   │  Emitter.cs    model → C# source  │   │   command(arg0, arg1);     │
│ app.Add<T>() …   │   │  ConsoleAppBaseCode  runtime text │   │   filters → DI → help      │
└──────────────────┘   └───────────────────────────────────┘   └────────────────────────────┘
```

Compile-time half (all in `src/ConsoleAppFramework/`):

| File | Lines | Role |
|------|------:|------|
| `ConsoleAppGenerator.cs` | 611 | Incremental generator: finds `Run/RunAsync/Create/Add` call sites, caches via `EquatableArray`, drives parse → emit → report |
| `Parser.cs` | 903 | Turns the lambda/method/class at a call site into a `CommandMethodModel` (parameters, types, defaults, aliases from doc comments, special params) |
| `Command.cs` | 530 | Model + attribute definitions (`CommandMethod`, `CommandParameter`, …) |
| `Emitter.cs` | 1167 | Emits per-command `Run*` bodies, `AddCore`/`RunCore` switches, filter invoker chains, `ShowHelp` string literals |
| `ConsoleAppBaseCode.cs` | 1244 | The runtime source text (context record, filter base, generated `ConsoleApp` skeleton) |
| `CommandHelpBuilder.cs` | 428 | Help/version text composition at emit time |
| `DiagnosticDescriptors.cs` | 144 | CAF001–CAF020 |
| other (SourceBuilder, NameConverter, RoslynExtensions, WellKnownTypes…) | ~1,000 | plumbing |

Runtime half: *there isn't one.* `ConsoleApp.Abstractions` / `CliSchema` are optional packages; the core is generated.

## 4. The ten topics (this is the layout the figures follow)

### T1 · Overview — from source line to running command
The journey: your call site → generator model → emitted partial `ConsoleApp` → your assembly. Nothing is loaded, registered or discovered at runtime; the "framework" exists only as text in your compilation.

**Figure:** `01-machine-line` — a production line: blueprint stand (your code), stamping press (the generator), dispatch yard (router), engine bed (your command), delivery bell (exit code).

### T2 · The source generator — a function-like macro
`ConsoleApp.Run(args, lambda)` is analyzed *as an expression*: parameter names/types/defaults are read off the lambda itself. The generator then emits a `Run(string[] args, Action<int,int> command)` whose body is the parse loop + invocation, inlined. Same for `Add<T>` (class methods become commands) and `[RegisterCommands]`. The emitted code is fully visible (`// <auto-generated/>` partial), which is the framework's own documentation.

**Figure:** `02-code-press` — a stamping press that takes a blueprint (the lambda) and casts/emerges a code strip; the strip carries the actual emitted lines.

### T3 · Command registration & routing — typed fields and nested switches
`Add`/`Add<T>` calls become **typed delegate fields** (`Action`, `Action<int,int>`, `Func<…,Task>`…). `AddCore` is a `switch (commandName)` that assigns via `Unsafe.As<Delegate, TAction>` — no `Dictionary<string, Delegate>`, no boxing. `RunCore` routes with **nested string-constant switches on `args[0]`, `args[1]`, …**, which the C# compiler lowers to extremely fast dispatch (hash-free, length-checks first). Command names: lower-kebab-case by default, aliases via `build|b`, nesting via `"foo bar"` paths, `[Command("")]` for root.

**Figure:** `03-switchyard` — a rail yard: a wagon (the first arg) enters, switch towers read it and route it down one stall per typed command field.

### T4 · Argument parsing & value binding — one pass, inline, typed
The emitted loop is: exact-match `case "--foo"` fast path; fallback `string.Equals(…, OrdinalIgnoreCase)`; `TryIncrementIndex` to grab the value; direct `int.TryParse` / `ISpanParsable<T>` / `Enum.TryParse(ignoreCase: true)`; `bool` is a flag; `T[]` takes `[1,2,3]` (JSON) or comma-separated; `params T[]` swallows the rest; unknown shapes bind via `JsonSerializer.Deserialize<T>`; `[Argument]` params bind positionally; `CancellationToken` and `ConsoleAppContext` are special (never parsed). Required-vs-optional is known at compile time, so the "was it provided?" check is two lines after the loop. Custom converters: write an attribute implementing `IArgumentParser<T>`.

**Figure:** `04-parsing-station` — a hopper-and-gate station: tokens drop onto a belt, a reader gate matches the option name, and the value is pressed into a labelled, typed slot; the belt sweeps past `--` and everything after is bypassed to the escape chute.

### T5 · Help & version — cast at compile time
Help text is not built at runtime: `ShowHelp` is emitted as a `Log("""…""")` **string literal**, with usage lines, option names, aliases, `<T>` value types, `[Required]`/`[Default: …]` markers, and the command list — all known at compile time from doc comments. `-h`/`--help` are recognized at any position before `--` (reserved names — CAF019 prevents you shadowing them), shown when no args are passed, and `--version` prints `AssemblyInformationalVersion`. Because `TryShowHelpOrVersion` runs before routing, help costs one string print — "the absolute maximum performance that cannot be surpassed".

**Figure:** `05-help-letterpress` — a letterpress whose type slugs are pre-cast: pull the lever and the composed help card prints in one stroke.

### T6 · The filter pipeline — middleware with N+1 allocations
`ConsoleAppFilter(next)` is an ASP.NET-Core-style middleware; implement `InvokeAsync(context, ct)` and call `await Next.InvokeAsync(...)`. Order is **global → class → method**, in declaration order. The generator emits `new Filter4(new Filter3(… new Command0Invoker(…)))` — a statically-built chain, no `List<ConsoleAppFilter>`, no lambda captures. Context (`ConsoleAppContext`, an immutable record) carries `CommandName`, arguments, `State` (use `context with { State = … }` to pass data), `GlobalOptions`. Filters are the extension point for exit codes, error styles, tracing, mutexes, scopes.

**Figure:** `06-filter-canal` — a lock canal: water (the call) passes gates in fixed order (two global, one class, one method) into the work wheel; each gate's before/after is the filter body.

### T7 · Dependency injection — opt-in by reference, wired by generation
There is no hard DI dependency. If `Microsoft.Extensions.DependencyInjection` is referenced, the generator adds `ConfigureServices`/`ConfigureLogging`/`ConfigureDefaultConfiguration` to the builder; otherwise they don't exist. `[FromServices]`/`[FromKeyedServices]` mark lambda params; classes registered with `Add<T>` get plain constructor injection (filters too). `ConfigureServices` runs *after routing, before parse*; the provider lands in the static `ConsoleApp.ServiceProvider` and is disposed after the run. Escape hatches: `ConfigureContainer` with any `IServiceProviderFactory` (DryIoc, Autofac), `Host.CreateApplicationBuilder().ToConsoleAppBuilder()` for shared hosting/OTel setups, scope-per-command via a filter.

**Figure:** `07-service-manifold` — a pump room: a reservoir (service collection) feeds through a valve block (ConfigureServices) into the engine's inlet ([FromServices]); the gauge shows the provider is built only after the routing wheel has already chosen the command.

### T8 · Signals, cancellation & graceful shutdown
Adding a `CancellationToken` parameter (or any filter) makes the generator emit a `PosixSignalHandler.Register(ConsoleApp.Timeout)` — it hooks **SIGINT, SIGTERM, SIGQUIT** (Ctrl+C), cancels the token, and blocks immediate termination so your code can wind down. Because a mishandled token would hang the process, a **timeout fuse** (default 5 s, `ConsoleApp.Timeout`) force-terminates after the signal. External tokens (`app.RunAsync(args, cts.Token)`) combine with the signal registration. Without the token parameter, Ctrl+C kills the process immediately — you opt into the machinery.

**Figure:** `08-signal-house` — a signal box: the big lever trips the bell (SIGINT), the governor wheel (token) spins down the flywheel (your command), and a fuse-lit guillotine brake waits at 5.0 s.

### T9 · Compile-time diagnostics & runtime validation
Twenty analyzers, CAF001–CAF020: bad `Run` signatures, illegal return types (incl. `async void`), non-literal command names, duplicate command names, `Add` in a loop, filters on `Run`, multiple constructors, no public methods, static/abstract classes, cross-project registration, doc-comment param mismatches, duplicate `ConfigureGlobalOptions`, illegal global-option types, reserved help names (CAF019), duplicate option names/aliases (CAF020). At runtime, `ValidationAttribute`s (DataAnnotations) run after binding, before invocation; failure throws `ValidationException` → message printed, exit code 1. Return `int`/`Task<int>` to set the exit code; unhandled exceptions set 1 and print `Exception.ToString()` via `ConsoleApp.LogError`.

**Figure:** `09-inspector-bench` — an inspector's bench: signature blocks slide under a dial gauge and a reject stamp (CAF020) fires on the duplicate alias.

### T10 · Performance & AOT — parity with hand-written code
The claim CAF makes is not "fast for a framework" but "indistinguishable from the code you'd have written": the emitted `Run` **is** that hand-written code. Cold start (the CLI metric) benefits twice: no reflection warm-up and no dependency DLL probing. Native AOT works because nothing resolves at runtime. Static function references can be passed as `delegate* managed<…>` to skip even the delegate. The generator+runtime is ~5.8k lines, so the whole story fits in one reviewer's head.

**Figure:** `10-parity-strip` — a twin launch rail: two carts, "hand-written switch" and "generated", released together; the story is that they tie.

## 5. Source map

- `src/ConsoleAppFramework/` — the generator (17 files, ~5.8k lines; see §3).
- `src/ConsoleAppFramework.Abstractions/` — optional package: `IArgumentParser<T>`, `ConsoleAppContext`, `ConsoleAppFilter`, `ConsoleAppFilterAttribute<T>` (shared filters across projects; sets `USE_EXTERNAL_CONSOLEAPP_ABSTRACTIONS`).
- `src/ConsoleAppFramework.CliSchema/` — optional package: `GetCliSchema()` → `CommandHelpDefinition[]`, JSON-serializable AOT-safely; for docs generation and LLM tool descriptions.
- `tests/`, `sandbox/` — perf and behaviour harnesses.

## 6. Trade-offs to keep in mind (the honest list)

- **Syntax policy is opinionated.** No `-fdx` bundling, no distinct `-x`/`-X`; command names are case-sensitive. Deliberate: single-pass parsing.
- **Everything must be visible to the generator.** Commands must be in the compiling project (`CAF014`), command names must be literals (`CAF006`), `Add` can't sit in a loop (`CAF008`).
- **Lambda doc comments don't exist in C#**, so aliases/descriptions need a class or local-function-with-class route.
- **JSON binding under Native AOT** needs source-generated serializer options.
- **`ConfigureServices` doesn't run for help** (help precedes routing) — loggers for help output must be swapped via `ConsoleApp.Log` before that.
- **v4→v5 is a rewrite** (no `Microsoft.Extensions.Hosting` in the core; `Host` users convert via `ToConsoleAppBuilder`).

---

## 7. The figures (anatomy of each topic)

Each topic above has an interactive isometric figure in [`anatomy/figures/`](../anatomy/figures/), built with the [Anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, vendored in `anatomy/kit/`). Build any of them with `node anatomy/figures/NN-name/build.mjs` (add `--light` for the light theme); the standalone HTML page lands next to the script. Or open the gallery: [`index.html`](../index.html).

| Figure | Topic | The machine |
|--------|-------|-------------|
| `01-machine-line` | Overview | A production line from blueprint to dispatch |
| `02-code-press` | T2 Generator | A stamping press casting the code strip |
| `03-switchyard` | T3 Routing | A rail yard of typed stalls |
| `04-parsing-station` | T4 Parsing | Hopper, reader gate and typed slots |
| `05-help-letterpress` | T5 Help | Pre-cast type, one stroke to print |
| `06-filter-canal` | T6 Filters | A lock canal with ordered gates |
| `07-service-manifold` | T7 DI | A pump room fed after routing |
| `08-signal-house` | T8 Shutdown | Lever, bell, governor and the 5 s fuse |
| `09-inspector-bench` | T9 Diagnostics | Dial gauge and the CAF020 reject stamp |
| `10-parity-strip` | T10 Performance | Two carts that tie |
