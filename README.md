# ConsoleAppFramework · Anatomy

Ten interactive, isometric figures that explain [ConsoleAppFramework](https://github.com/Cysharp/ConsoleAppFramework) (CAF) — a zero-dependency, zero-reflection CLI framework for .NET 8+ — as a set of small physical machines.

**Start here:** the gallery → **[index.html](https://iafahim.github.io/consoleappframework-anatomy/)** (or open `index.html` locally), and the write-up in [`docs/why-and-architecture.md`](docs/why-and-architecture.md).

## The one-sentence version

CAF is a Roslyn source generator that emits the *entire* entry point of your CLI — argument parse loop, command routing switch, help text, filter chain, DI wiring, signal handling — as ordinary, hand-written-looking C# into your own assembly. It is a **function-like macro in the Rust sense**, not a reflection framework: ~5,800 lines of generator produce code with no runtime library behind it, which is why cold start, binary size and Native AOT all come out as good as they do.

## The figures

Every figure is a standalone HTML page (dark and light themes) with calm interactive motion — click or press Space; each figure also runs an idle tour. All geometry is audited (`--audit`): no interpenetrating solids, no floating line ends, true depth order, in both themes.

| # | Page | Topic | The machine |
|---|------|-------|-------------|
| 1 | [machine-line](anatomy/figures/01-machine-line/machine-line.html) | Overview | A production line: blueprint stand → press → switch → flywheel → bell |
| 2 | [code-press](anatomy/figures/02-code-press/code-press.html) | The source generator | A punch press stamping the emitted `Run` body like a receipt |
| 3 | [switchyard](anatomy/figures/03-switchyard/switchyard.html) | Command routing | Wagons dispatched by a string-constant switch with an OrdinalIgnoreCase fallback |
| 4 | [parsing-station](anatomy/figures/04-parsing-station/parsing-station.html) | Argument parsing | One pass over argv: slots for `TryParse`/`ISpanParsable`/enums, flags, arrays, `--` escape |
| 5 | [help-letterpress](anatomy/figures/05-help-letterpress/help-letterpress.html) | Help & version | Help text composed at compile time from doc comments, printed in one stroke |
| 6 | [filter-canal](anatomy/figures/06-filter-canal/filter-canal.html) | Filter pipeline | Global → class → method middleware flowing around the command |
| 7 | [service-manifold](anatomy/figures/07-service-manifold/service-manifold.html) | Dependency injection | `ConfigureServices` after routing, before parsing; the provider disposed after the run |
| 8 | [signal-house](anatomy/figures/08-signal-house/signal-house.html) | Signals & shutdown | SIGINT/SIGTERM/SIGQUIT → one handler, a 5 s fuse, exit 130 either way |
| 9 | [inspector-bench](anatomy/figures/09-inspector-bench/inspector-bench.html) | Diagnostics & validation | Duplicate options stamped CAF020, reserved `-h` stamped CAF019, runtime validation → exit 1 |
| 10 | [twin-rail](anatomy/figures/10-twin-rail/twin-rail.html) | Performance parity | The generated main *is* the switch you'd write by hand: two carts, one course, tie |

## Repository layout

```
docs/why-and-architecture.md   the internal engineering note (10 topics, source map, trade-offs)
index.html                     the gallery
anatomy/figures/NN-*/build.mjs one Node build script per figure; writes the HTML pages
anatomy/figures/NN-*/shots/    verification screenshots
anatomy/kit/                   the vendored Anatomy drawing kit (iso-kit, lathe, audit; MIT)
anatomy/scripts/               capture/line-check tooling
```

## Rebuilding a figure

```bash
cd anatomy/figures/08-signal-house
node build.mjs --audit        # rebuilds the dark page and runs the geometry audit
node build.mjs --light        # light theme
node ../../scripts/lines.mjs signal-house.html   # line-end check: must print 0
```

Requires Node 20.10+ and Chrome/Chromium (`CHROME_PATH`) for the checks.

## Credits

- [ConsoleAppFramework](https://github.com/Cysharp/ConsoleAppFramework) by Cysharp — MIT. Every claim in the doc is checked against the source at commit `9b6fb25`.
- Figures drawn with the [Anatomy](https://github.com/wheresryan22/anatomy) drawing kit — MIT, vendored under `anatomy/kit/`.
