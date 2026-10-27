import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -186, y: -66, w: 372, d: 132, r: 8 };
const PLATE_Z = -14;

const CANAL_X0 = -152;
const CANAL_X1 = 116;
const WALL_Z = 10;
const WATER_Z = 1.2;

const GATES = [
  { x: -100, label: "global 1" },
  { x: -50, label: "global 2" },
  { x: 0, label: "class" },
  { x: 50, label: "method" },
];
const LEAF_LIFT = 15;

const WHEEL = [130, 0];
const WHEEL_Z = 19;
const WHEEL_R = 13;

const BARREL_START = -146;
const BARREL_END = 106;

const TALLY = [148, 26];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    [GATES[0].x, -14, 30],
    [GATES[3].x, 14, 34],
    [WHEEL[0] + 14, WHEEL[1], WHEEL_Z + WHEEL_R + 2],
    [TALLY[0] + 10, TALLY[1], 26],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 38 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const R = A.recorder(P);
const put = (name, at, svg, shapes, extra = {}) => R.put({ name, piece: name, at, svg, shapes, ...extra });
const rec = (list) => list.map((s) => R.solid(s));

function plateSvg() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, PLATE_Z - 6, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, PLATE_Z - 7, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, PLATE_Z - 5.4, 5.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, PLATE_Z, 14, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 10), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: -130, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 31, label.y + 6.2], 1.05, P), "the filter canal", { size: 2.4, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function canalBackSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: CANAL_X0, y: -14, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 0, WALL_Z, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: CANAL_X0, y: -14, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 6, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: CANAL_X0, y: -8, w: CANAL_X1 - CANAL_X0, d: 16, r: 1 }, 0, WATER_Z, P, 2, 0), { tone: "lo", crease: "none" }));
  out.push(L(k.onTop([[CANAL_X0 + 4, -3], [CANAL_X1 - 4, -3]], WATER_Z + 0.06, P), { tone: "faint", dashed: true, flow: true }));
  out.push(D([at([CANAL_X0 + 4, -3, WATER_Z + 0.06]), at([CANAL_X1 - 4, -3, WATER_Z + 0.06])], { size: 0.7 }));
  return out.join("");
}

function canalFrontSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: CANAL_X0, y: 8, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 0, WALL_Z, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: CANAL_X0, y: 8, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 6, P, 3), { tone: "faint" }));
  out.push(L(k.onTop([[CANAL_X0 + 4, 3], [CANAL_X1 - 4, 3]], WATER_Z + 0.06, P), { tone: "faint", dashed: true, flow: true }));
  out.push(D([at([CANAL_X0 + 4, 3, WATER_Z + 0.06]), at([CANAL_X1 - 4, 3, WATER_Z + 0.06])], { size: 0.7 }));
  GATES.forEach((gate) => {
    const plate = { x: gate.x - 8, y: 14, w: 16, d: 0.8, r: 0.4 };
    out.push(S(k.slabOf(plate, 3, 5, P, 2, 0.3), { tone: "lo", crease: "none" }));
    out.push(k.faceTextSvg(k.sideMatrix([gate.x, 14.9], 7.2, P, "left"), gate.label, { size: 1.7, tone: "mid", anchor: "middle" }));
  });
  return out.join("");
}

function gateSvg(index) {
  const out = [];
  const gx = GATES[index].x;
  for (const y of [-11, 11]) {
    out.push(S(k.cylinder(gx, y, 2, WALL_Z, 15, P, 18), { tone: "mid" }));
    out.push(L(k.sideArc(gx, y, 2, WALL_Z + 6, P, 14), { tone: "faint" }));
  }
  out.push(S(k.slabOf({ x: gx - 2, y: -13, w: 4, d: 26, r: 1 }, 25, 3.5, P, 2, 0.3), { tone: "mid" }));
  const F = G.frameAlong([gx, 0, 28.6], [0, 1, 0]);
  out.push(S(G.disc(-2.4, 2.4, 3, F, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(-3.4, 3.4, 1.1, F, P), { tone: "mid" }));
  out.push(L(G.spokesOf(F, 3.4, 1.1, 2.9, 4, P, { phase: 0.4 }), { tone: "lo" }));
  out.push(D([at([gx + 3.4, 0, 28.6])], { size: 0.5 }));
  return out.join("");
}

const leafSvg = (lift) => {
  const z = 1.2 + lift;
  return S(k.slabOf({ x: 0, y: -7.6, w: 3, d: 15.2, r: 0.8 }, z, 22, P, 2, 0.3), { tone: "hi", crease: "lo", lit: lift > 1 });
};

function wheelSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: WHEEL[0] - 12, y: WHEEL[1] - 10, w: 24, d: 20, r: 3 }, 0, 6, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: WHEEL[0] - 12, y: WHEEL[1] - 10, w: 24, d: 20, r: 3 }, 3), 6, P, 5), { tone: "faint" }));
  const F = G.frameAlong([WHEEL[0] - 4, WHEEL[1], WHEEL_Z], [0, 1, 0]);
  out.push(S(G.disc(-2.4, 2.4, WHEEL_R, F, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(-4, 4, 3, F, P), { tone: "mid" }));
  out.push(L(G.circleOf(F, 2.6, 3, P), { tone: "faint" }));
  out.push(L(G.spokesOf(F, 2.6, 3, WHEEL_R - 0.4, 6, P, { phase: 0.3 }), { tone: "lo" }));
  out.push(D(G.dotsOf(F, 2.6, WHEEL_R - 4.5, 6, P), { size: 0.4 }));
  out.push(`<path data-part="wheelmark" class="iso-line" data-tone="lit" d="${markPath(0.5)}" style="stroke-width:1"/>`);
  return out.join("");
}

const markPath = (angle) => {
  const F = { o: [WHEEL[0] - 4, WHEEL[1], WHEEL_Z], a: [0, 1, 0], u: [Math.cos(angle), 0, Math.sin(angle)], v: [0, 1, 0] };
  return k.segment(G.pointOf(F, 2.8, 2.7, 0), G.pointOf(F, 2.8, WHEEL_R - 0.7, 0), P);
};

function chuteSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: CANAL_X0 - 22, y: -7, w: 20, d: 14, r: 2 }, 0, 1.2, P, 2, 0), { tone: "lo", crease: "none" }));
  for (const y of [-7, 7]) {
    out.push(S(k.slabOf({ x: CANAL_X0 - 22, y, w: 20, d: 1.6, r: 0.6 }, 1.2, 3.4, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(L(k.onTop([[CANAL_X0 - 20, 0], [CANAL_X0 - 2, 0]], 1.3, P), { tone: "faint", dashed: true, flow: true }));
  out.push(D([at([CANAL_X0 - 20, 0, 1.3]), at([CANAL_X0 - 2, 0, 1.3])], { size: 0.7 }));
  return out.join("");
}

function barrelSvg() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 3.4, 1.2, 6, P, 28), { tone: "hi", crease: "lo", lit: true }));
  out.push(L([2.4, 4.6].map((z) => k.sideArc(0, 0, 3.45, z, P, 24)).join(""), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 2.2, 7.2, P, 20), { tone: "lo" }));
  out.push(`<g data-part="pennant" opacity="0">${pennantSvg()}</g>`);
  return out.join("");
}

function pennantSvg() {
  return S(k.cylinder(0, 0, 0.5, 7.2, 6.5, P, 10), { tone: "mid", crease: "none" }) +
    S(k.slabOf({ x: 0.4, y: -0.2, w: 5.5, d: 0.4, r: 0.2 }, 11.6, 2.6, P, 2), { tone: "hi", crease: "none", lit: true }) +
    L(k.segment([0, 0, 13.7], [5.9, 0, 13.7], P), { tone: "lo", free: "start" });
}

function tallySvg() {
  const out = [];
  out.push(S(k.cylinder(TALLY[0], TALLY[1], 1.6, 0, 14, P, 16), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TALLY[0] - 9, y: TALLY[1] - 8, w: 19, d: 16, r: 1.5 }, 14, 1, P, 3, 0.3), { tone: "hi", crease: "lo" }));
  for (let i = 0; i < 4; i++) {
    out.push(L(k.lineOnTop([TALLY[0] - 6 + i * 3.4, TALLY[1] - 4], [TALLY[0] - 6 + i * 3.4, TALLY[1] + 3], 15.05, P), { tone: "lo", free: true }));
  }
  out.push(L(k.lineOnTop([TALLY[0] - 7.4, TALLY[1] - 0.5], [TALLY[0] + 6.4, TALLY[1] + 1.5], 15.05, P), { tone: "mid", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([TALLY[0], TALLY[1] + 6], 15.05, P), "4 + 1", { size: 2.2, tone: "mid", anchor: "middle" }));
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -130, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("canal.back", [0, -11, 5], canalBackSvg(), rec([
  A.slab({ x: CANAL_X0, y: -14, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 0, WALL_Z, { name: "canal.wallback" }),
  A.slab({ x: CANAL_X0, y: -8, w: CANAL_X1 - CANAL_X0, d: 16, r: 1 }, 0, WATER_Z, { name: "canal.water" }),
]));
put("canal.front", [0, 11, 5], canalFrontSvg(), rec([
  A.slab({ x: CANAL_X0, y: 8, w: CANAL_X1 - CANAL_X0, d: 6, r: 1 }, 0, WALL_Z, { name: "canal.wallfront" }),
  ...GATES.map((gate) => A.slab({ x: gate.x - 8, y: 14, w: 16, d: 0.8, r: 0.4 }, 3, 5, { name: "canal.plate" })),
]));
GATES.forEach((gate, index) => {
  put(`gate${index}`, [gate.x, 0, 15], gateSvg(index), rec([
    ...[-11, 11].map((y) => A.cylinder(gate.x, y, 2, WALL_Z, 15, { name: `gate${index}.post` })),
    A.slab({ x: gate.x - 2, y: -13, w: 4, d: 26, r: 1 }, 25, 3.5, { name: `gate${index}.beam`, owner: `gate${index}` }),
    A.disc(G.frameAlong([gate.x, 0, 28.6], [0, 1, 0]), -2.4, 2.4, 3, { name: `gate${index}.drum`, owner: `gate${index}` }),
  ]));
  put(`leaf${index}`, [gate.x, 0, 12], `<g data-part="leaf${index}">${S(k.slabOf({ x: gate.x - 1.5, y: -7.6, w: 3, d: 15.2, r: 0.8 }, 1.2, 22, P, 2, 0.3), { tone: "hi", crease: "lo" })}</g>`, rec([
    A.slab({ x: gate.x - 1.5, y: -7.6, w: 3, d: 15.2, r: 0.8 }, 1.2, 22, { name: `leaf${index}` }),
  ]));
});
put("chute", [CANAL_X0 - 12, 0, 2], chuteSvg(), rec([
  A.slab({ x: CANAL_X0 - 22, y: -7, w: 20, d: 14, r: 2 }, 0, 1.2, { name: "chute.floor" }),
  A.slab({ x: CANAL_X0 - 22, y: -7, w: 20, d: 1.6, r: 0.6 }, 1.2, 3.4, { name: "chute.rail" }),
  A.slab({ x: CANAL_X0 - 22, y: 7, w: 20, d: 1.6, r: 0.6 }, 1.2, 3.4, { name: "chute.rail" }),
]));
put("barrel", [BARREL_START, 0, 4.2], `<g data-part="barrel" transform="${k.translateAlong(P, [BARREL_START, 0, 0])}">${barrelSvg()}</g>`, rec([
  A.cylinder(BARREL_START, 0, 3.4, 1.2, 6, { name: "barrel" }),
  A.cylinder(BARREL_START, 0, 0.5, 7.2, 6.5, { name: "barrel.pennant" }),
]));
put("wheel", [WHEEL[0], WHEEL[1], WHEEL_Z], wheelSvg(), rec([
  A.slab({ x: WHEEL[0] - 12, y: WHEEL[1] - 10, w: 24, d: 20, r: 3 }, 0, 6, { name: "wheel.bed" }),
  A.disc(G.frameAlong([WHEEL[0] - 4, WHEEL[1], WHEEL_Z], [0, 1, 0]), -2.4, 2.4, WHEEL_R, { name: "wheel.disc", owner: "wheel" }),
  A.disc(G.frameAlong([WHEEL[0] - 4, WHEEL[1], WHEEL_Z], [0, 1, 0]), -4, 4, 3, { name: "wheel.hub", owner: "wheel" }),
]));
put("tally", [TALLY[0], TALLY[1], 8], tallySvg(), rec([
  A.cylinder(TALLY[0], TALLY[1], 1.6, 0, 14, { name: "tally.post" }),
  A.slab({ x: TALLY[0] - 9, y: TALLY[1] - 8, w: 19, d: 16, r: 1.5 }, 14, 1, { name: "tally.plate" }),
]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "canal", "barrel", "tally"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A lock canal: the context barrel enters from the chute, four gates lift in order (global, global, class, method) as it passes, a pennant rises at the second gate when a filter sets the state, and the work wheel turns at the end. A tally board counts four filters plus one invoker.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const GATES = ${JSON.stringify(GATES.map((g) => g.x))};
const BARREL_START = ${BARREL_START}, BARREL_END = ${BARREL_END};
const WHEEL = ${JSON.stringify(WHEEL)}, WHEEL_Z = ${WHEEL_Z}, WHEEL_R = ${WHEEL_R};
const LEAF_LIFT = ${LEAF_LIFT};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const leafEls = GATES.map((_, index) => svg.querySelector('[data-part="leaf' + index + '"]'));
const barrelEl = svg.querySelector('[data-part="barrel"]');
const pennantEl = svg.querySelector('[data-part="pennant"]');
const wheelMarkEl = svg.querySelector('[data-part="wheelmark"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const burst = (age, rise, fall) => (age <= 0 ? 0 : smooth(0, rise, age) * Math.exp(-(age - rise) / fall));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const leafSvg = (lift, gx) => solidSvg(slabOf({ x: gx - 1.5, y: -7.6, w: 3, d: 15.2, r: 0.8 }, 1.2 + lift, 22, P, 2, 0.3), { tone: "hi", crease: "lo", lit: lift > 1 });
const markPath = (angle) => {
  const F = { o: [WHEEL[0] - 4, WHEEL[1], WHEEL_Z], a: [0, 1, 0], u: [Math.cos(angle), 0, Math.sin(angle)], v: [0, 1, 0] };
  return segment(pointOf(F, 2.8, 2.7, 0), pointOf(F, 2.8, WHEEL_R - 0.7, 0), P);
};
const RUN = 3.2;
const NAMES = ["ready · the call waits at the chute", "gates lift · global → global → class → method", "gate 2 · a filter sets context.State", "at the wheel · the command body runs", "after-filters · 4 + 1 allocations, no arrays"];
let phase = 0, phaseAt = 0, runAt = 0, clock = 0, wheelAngle = 0.5, wheelRate = 0, wheelKicked = false;
let frame = 0, last = 0, visible = false, touring = true, nextAt = 1;
function draw() {
  const t = still.matches ? 1 : clamp((clock - runAt) / RUN, 0, 1);
  const bx = BARREL_START + (BARREL_END - BARREL_START) * ease(t);
  const running = clock >= runAt && phase >= 1 && phase <= 4;
  const open = running && clock - runAt < RUN + 1.1;
  GATES.forEach((gx, index) => {
    const lift = open ? smooth(0, 0.4, clamp((clock - runAt - index * 0.14) / 0.4, 0, 1)) * LEAF_LIFT : 0;
    leafEls[index].innerHTML = leafSvg(lift, gx);
  });
  barrelEl.setAttribute("transform", translateAlong(P, [bx, 0, 0]));
  barrelEl.setAttribute("opacity", String(smooth(BARREL_END - 10, BARREL_END, bx) < 1 || !running ? 1 : 1 - smooth(BARREL_END - 10, BARREL_END, bx)));
  pennantEl.setAttribute("opacity", bx > -60 && running ? "1" : "0");
  wheelAngle += wheelRate * ${1 / 60};
  wheelRate *= Math.exp(-${1 / 60} / 0.7);
  if (wheelRate < 0.02) wheelRate = 0;
  wheelMarkEl.setAttribute("d", markPath(wheelAngle));
  const text = running ? NAMES[Math.min(1 + Math.floor(bx - BARREL_START) / ((BARREL_END - BARREL_START) / 3), 4)] : NAMES[0];
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (phase >= 1 && !wheelKicked) {
    const bx = BARREL_START + (BARREL_END - BARREL_START) * ease(clamp((clock - runAt) / RUN, 0, 1));
    if (bx > 78) { wheelRate = 11; wheelKicked = true; }
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (clock - runAt > RUN + 2.2 || phase === 0) { runAt = clock; wheelKicked = false; wheelRate = 0; }
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", (event) => { event.preventDefault(); start(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); start(); }
});
draw();
`;


const body = k.plateHtml({
  fig: "Fig 6",
  title: "The filter canal",
  hint: "Click or press Space to run the call",
  readout: "ready · the call waits at the chute",
  keys: [
    { mark: "lit", label: "The context barrel and the work wheel" },
    { mark: "raised", label: "Gate leaves lift as the call passes" },
    { mark: "flat", label: "Tally: 4 filters + 1 invoker" },
  ],
  caption:
    "Filters are middleware: each ConsoleAppFilter wraps Next.InvokeAsync with before/after code, invoked global → class → method. The generator builds the chain statically — new Filter3(new Filter2(… new Command0Invoker(…))) — so the whole pipeline costs exactly the filter classes plus one invoker: no arrays, no captures. State travels down the canal on the context.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Filter canal: press Space to run the call through the gates">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "filter-canal-light.html" : "filter-canal.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the filter canal", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "filter-canal-light.html" : "filter-canal.html");
