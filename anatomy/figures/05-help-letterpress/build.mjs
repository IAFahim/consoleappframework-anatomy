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

const PLATE = { x: -196, y: -72, w: 392, d: 144, r: 8 };
const PLATE_Z = -14;

const BED = { x: -140, y: -26, w: 84, d: 62, r: 3 };
const BED_H = 9;
const CHASE = { x: -132, y: -20, w: 68, d: 50, r: 2 };
const SLUGS = [
  "Usage: [options...] [-h|--help]",
  "  [--version]",
  "Display Hello.",
  "Options:",
  "-m, --message <string>",
  "  Message to show. [Required]",
];

const UPRIGHT_X = -150;
const UPRIGHT_Y = [-44, 36];
const ARM = { x: -143, y: -12, w: 65, d: 24, r: 2 };
const ARM_Z = 46;
const ARM_TOP = 54;
const PLATEN = { x: -128, y: -14, w: 52, d: 26, r: 2 };
const PLATEN_REST = 20;
const PLATEN_DROP = 7.4;
const PLATEN_X = -102;

const LEVER = [-84, 0];

const CASE = { x: 6, y: -52, w: 74, d: 40, r: 3 };
const CASE_H = 22;
const DRAWERS = [
  { label: "docs", out: 20 },
  { label: "names", out: 8 },
  { label: "defaults", out: 8 },
  { label: "version", out: 8 },
];

const TRAY = { x: 50, y: 20, w: 62, d: 20, r: 1.5 };
const CARD = { x: -126, y: -6, w: 56, d: 14, r: 1 };
const CARD_Z = BED_H + 2.6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    ...k.boxCorners(ARM, ARM_Z, ARM_TOP),
    [LEVER[0] + 4, LEVER[1], ARM_TOP + 12],
    [CASE.x + CASE.w + 4, CASE.y + CASE.d, CASE_H + 8],
    [TRAY.x + TRAY.w + 3, TRAY.y + TRAY.d, 8],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 40 },
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
  const label = { x: -150, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 31, label.y + 6.2], 1.05, P), "the help letterpress", { size: 2.3, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function bedSvg() {
  const out = [];
  out.push(S(k.slabOf(BED, 0, BED_H, P, 5, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 4), BED_H, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf(CHASE, BED_H, 1.2, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(CHASE, 1.5), BED_H + 1.2, P, 4), { tone: "lo" }));
  SLUGS.forEach((line, index) => {
    const y = CHASE.y + 4 + index * 8;
    const plan = { x: CHASE.x + 3, y, w: 62, d: 6.4, r: 1 };
    out.push(S(k.slabOf(plan, BED_H + 1.2, 1.4, P, 2, 0.2), { tone: index === 5 ? "hi" : "mid", crease: "none", lit: index === 5 }));
    out.push(k.faceTextSvg(k.topMatrix([CHASE.x + 6, y + 3.9], BED_H + 2.65, P), line, { size: 1.55, tone: index === 5 ? "mid" : "lo", anchor: "start" }));
  });
  return out.join("");
}

function frameSvg() {
  const out = [];
  for (const y of UPRIGHT_Y) {
    out.push(S(k.cylinder(UPRIGHT_X, y, 4.4, 0, ARM_Z, P, 28), { tone: "mid", crease: "none" }));
    out.push(L([14, 30].map((z) => k.sideArc(UPRIGHT_X, y, 4.4, z, P, 16)).join(""), { tone: "faint" }));
  }
  out.push(S(k.slabOf({ x: UPRIGHT_X - 7, y: UPRIGHT_Y[0] - 4, w: 14, d: UPRIGHT_Y[1] - UPRIGHT_Y[0] + 8, r: 2 }, ARM_Z, ARM_TOP - ARM_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(ARM, ARM_Z, ARM_TOP - ARM_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam(ARM, ARM_Z + 4, P, 4), { tone: "faint" }));
  out.push(S(k.cylinder(UPRIGHT_X, 0, 5.6, ARM_Z - 2.5, 2.5, P, 28), { tone: "mid" }));
  const screws = k.corners(BED, 7);
  out.push(D(screws.map(([x, y]) => at([x, y, BED_H])), { size: 0.45 }));
  return out.join("");
}

const platenSvg = (drop) => {
  const z = PLATEN_REST - drop;
  return S(k.cylinder(-122, -10, 1.5, z + 4, ARM_Z - z - 4, P, 12), { tone: "mid", crease: "none" }) +
    S(k.cylinder(-122, 8, 1.5, z + 4, ARM_Z - z - 4, P, 12), { tone: "mid", crease: "none" }) +
    S(k.slabOf(PLATEN, z, 4, P, 4, 0.5), { tone: "hi", crease: "lo", lit: drop > 2 });
};

function leverSvgAt(angle) {
  const out = [];
  out.push(S(k.slabOf({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, ARM_TOP, 4, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 1.7, ARM_TOP + 4, 5, P, 16), { tone: "mid" }));
  const tip = [LEVER[0] + Math.cos(angle) * 15, LEVER[1] + Math.sin(angle) * 15];
  out.push(L(k.lineOnTop([LEVER[0] + Math.cos(angle) * 1.7, LEVER[1] + Math.sin(angle) * 1.7], tip, ARM_TOP + 9.2, P), { tone: "hi" }));
  out.push(S(k.cylinder(tip[0], tip[1], 2.3, ARM_TOP + 7.4, 3.6, P, 20), { tone: "hi", crease: "lo", lit: true }));
  out.push(L(k.knurl(tip[0], tip[1], 2.3, ARM_TOP + 7.4, ARM_TOP + 11, 16, P), { tone: "lo" }));
  return out.join("");
}

function caseSvg() {
  const out = [];
  out.push(S(k.slabOf(CASE, 0, 2.4, P, 4, 0.4), { tone: "mid" }));
  for (const x of [CASE.x + 24, CASE.x + 48]) {
    out.push(S(k.slabOf({ x: x - 1.4, y: CASE.y + 2.4, w: 2.8, d: CASE.d - 2.4, r: 0.8 }, 2.4, CASE_H - 2.4, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: 2.4, r: 0.8 }, 2.4, CASE_H - 2.4, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d - 6, r: 1 }, 11.6, 0.4, P, 2, 0), { tone: "lo", crease: "none" }));
  DRAWERS.forEach((drawer, index) => {
    const lane = index % 2;
    const row = Math.floor(index / 2);
    const w = 17;
    const x0 = CASE.x + 3 + lane * 24.4;
    const y0 = CASE.y + 4 + row * 17 + drawer.out;
    const plan = { x: x0, y: y0, w, d: 14, r: 1.2 };
    out.push(S(k.slabOf(plan, 2.4 + row * 9.6, 5.6, P, 3, 0.4), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: plan.x + 1.6, y: plan.y + plan.d - 0.6, w: 3.4, d: 1.8, r: 0.8 }, 2.4 + row * 9.6 + 5.6, 1.8, P, 2), { tone: "mid", crease: "none" }));
    out.push(k.faceTextSvg(k.sideMatrix([plan.x + 3.3, plan.y + plan.d + 0.1], 2.4 + row * 9.6 + 4.4, P, "left"), drawer.label, { size: 1.6, tone: "mid", anchor: "start" }));
    if (index === 0) {
      for (let s = 0; s < 3; s++) {
        out.push(S(k.slabOf({ x: plan.x + 2 + s * 4.6, y: y0 + 3, w: 3.2, d: 8, r: 0.6 }, 8, 1.2, P, 2, 0.15), { tone: "lo", crease: "none" }));
      }
      out.push(L([k.lineOnTop([plan.x + 2.4, y0 + 5.4], [plan.x + 12, y0 + 5.4], 9.2, P), k.lineOnTop([plan.x + 2.4, y0 + 8.6], [plan.x + 9.4, y0 + 8.6], 9.2, P)].join(""), { tone: "faint", free: true }));
    }
  });
  return out.join("");
}

function traySvg() {
  const out = [];
  for (const y of [TRAY.y - 3, TRAY.y + TRAY.d]) {
    out.push(S(k.slabOf({ x: TRAY.x, y, w: TRAY.w, d: 3, r: 1 }, 0, 4.5, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: TRAY.x + TRAY.w - 2.6, y: TRAY.y, w: 2.6, d: TRAY.d, r: 1 }, 0, 4.5, P, 2, 0.3), { tone: "mid" }));
  out.push(D([[TRAY.x + 1.5, TRAY.y - 1.5, 4.5], [TRAY.x + 1.5, TRAY.y + TRAY.d - 1.5, 4.5]].map(at), { size: 0.4 }));
  return out.join("");
}

function cardSvg() {
  const out = [];
  out.push(S(k.slabOf(CARD, CARD_Z, 0.8, P, 2, 0.2), { tone: "hi", crease: "none" }));
  SLUGS.forEach((line, index) => {
    out.push(`<g data-line="${index}" opacity="0">`);
    out.push(k.faceTextSvg(k.topMatrix([CARD.x + 4, CARD.y + 3 + index * 2.3], CARD_Z + 0.85, P), line, { size: 1.35, tone: "mid", anchor: "start" }));
    out.push(`</g>`);
  });
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -150, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("bed", [BED.x + 42, BED.y + 31, BED_H / 2], bedSvg(), rec([
  A.slab(BED, 0, BED_H, { name: "press.bed" }),
  A.slab(CHASE, BED_H, 1.2, { name: "press.chase" }),
]));
put("slugs.far", [CHASE.x + 34, CHASE.y + 12, BED_H + 2], "", rec(
  SLUGS.slice(0, 3).map((_, index) => A.slab({ x: CHASE.x + 3, y: CHASE.y + 4 + index * 8, w: 62, d: 6.4, r: 1 }, BED_H + 1.2, 1.4, { name: `slug${index}` })),
));
put("slugs.near", [CHASE.x + 34, CHASE.y + 36, BED_H + 2], "", rec(
  SLUGS.slice(3).map((_, index) => A.slab({ x: CHASE.x + 3, y: CHASE.y + 4 + (index + 3) * 8, w: 62, d: 6.4, r: 1 }, BED_H + 1.2, 1.4, { name: `slug${index + 3}` })),
));
put("press.frame", [UPRIGHT_X, 0, ARM_Z / 2], frameSvg(), rec([
  ...UPRIGHT_Y.map((y, i) => A.cylinder(UPRIGHT_X, y, 4.4, 0, ARM_Z, { name: `press.upright${i}` })),
  A.slab({ x: UPRIGHT_X - 7, y: UPRIGHT_Y[0] - 4, w: 14, d: UPRIGHT_Y[1] - UPRIGHT_Y[0] + 8, r: 2 }, ARM_Z, ARM_TOP - ARM_Z, { name: "press.crown" }),
  A.slab(ARM, ARM_Z, ARM_TOP - ARM_Z, { name: "press.arm" }),
  A.cylinder(UPRIGHT_X, 0, 5.6, ARM_Z - 2.5, 2.5, { name: "press.boss" }),
]));
put("press.platen", [PLATEN_X, 0, PLATEN_REST + 2], `<g data-part="platen">${platenSvg(0)}</g>`, rec([
  A.cylinder(-122, -10, 1.5, PLATEN_REST + 4, ARM_Z - PLATEN_REST - 4, { name: "press.rod" }),
  A.cylinder(-122, 8, 1.5, PLATEN_REST + 4, ARM_Z - PLATEN_REST - 4, { name: "press.rod" }),
  A.slab(PLATEN, PLATEN_REST, 4, { name: "press.platen", owner: "press.platen" }),
]));
put("lever", [LEVER[0], LEVER[1], ARM_TOP + 6], `<g data-part="lever">${leverSvgAt(-0.5)}</g>`, rec([
  A.slab({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, ARM_TOP, 4, { name: "lever.base" }),
  A.cylinder(LEVER[0], LEVER[1], 1.7, ARM_TOP + 4, 5, { name: "lever.post" }),
  A.cylinder(LEVER[0] + Math.cos(-0.5) * 15, LEVER[1] + Math.sin(-0.5) * 15, 2.3, ARM_TOP + 7.4, 3.6, { name: "lever.knob", owner: "lever" }),
  A.box([-87, -12, ARM_TOP + 8.8], [-69, 12, ARM_TOP + 9.6], { name: "lever.rod", owner: "lever" }),
]));
put("typecase", [CASE.x + 37, CASE.y + 20, CASE_H / 2], caseSvg(), rec([
  A.slab(CASE, 0, 2.4, { name: "case.base" }),
  ...[CASE.x + 24, CASE.x + 48].map((x, i) => A.slab({ x: x - 1.4, y: CASE.y + 2.4, w: 2.8, d: CASE.d - 2.4, r: 0.8 }, 2.4, CASE_H - 2.4, { name: `case.divider${i}` })),
  A.slab({ x: CASE.x, y: CASE.y, w: CASE.w, d: 2.4, r: 0.8 }, 2.4, CASE_H - 2.4, { name: "case.back" }),
  A.slab({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d - 6, r: 1 }, 11.6, 0.4, { name: "case.shelf" }),
  ...DRAWERS.flatMap((drawer, index) => {
    const lane = index % 2;
    const row = Math.floor(index / 2);
    const plan = { x: CASE.x + 3 + lane * 24.4, y: CASE.y + 4 + row * 17 + drawer.out, w: 17, d: 14, r: 1.2 };
    return [A.slab(plan, 2.4 + row * 9.6, 5.6, { name: `drawer${index}` })];
  }),
]));
put("tray", [TRAY.x + 15, TRAY.y + 11, 2.5], traySvg(), rec([
  A.slab({ x: TRAY.x, y: TRAY.y - 3, w: TRAY.w, d: 3, r: 1 }, 0, 4.5, { name: "tray.rail" }),
  A.slab({ x: TRAY.x, y: TRAY.y + TRAY.d, w: TRAY.w, d: 3, r: 1 }, 0, 4.5, { name: "tray.rail" }),
  A.slab({ x: TRAY.x + TRAY.w - 2.6, y: TRAY.y, w: 2.6, d: TRAY.d, r: 1 }, 0, 4.5, { name: "tray.end" }),
]));
put("card", [CARD.x + 28, CARD.y + 7, CARD_Z + 0.4], `<g data-part="card">${cardSvg()}</g>`, rec([
  A.slab(CARD, CARD_Z, 0.8, { name: "card" }),
]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "bed", "typecase", "card"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A letterpress: the chase on the bed holds six type slugs cast from doc comments, parameter names and defaults; the platen prints the composed help card in one stroke and the card slides to the delivery tray. A type case beside holds the sources, one drawer open.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const SLUGS = ${JSON.stringify(SLUGS)};
const CARD = ${JSON.stringify(CARD)}, CARD_Z = ${CARD_Z};
const PLATEN = ${JSON.stringify(PLATEN)}, PLATEN_REST = ${PLATEN_REST}, PLATEN_DROP = ${PLATEN_DROP}, ARM_Z = ${ARM_Z}, PLATEN_X = ${PLATEN_X};
const LEVER = ${JSON.stringify(LEVER)}, ARM_TOP = ${ARM_TOP};
const TRAY = ${JSON.stringify(TRAY)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const platenEl = svg.querySelector('[data-part="platen"]');
const leverEl = svg.querySelector('[data-part="lever"]');
const cardEl = svg.querySelector('[data-part="card"]');
const lineEls = SLUGS.map((_, index) => cardEl.querySelector('[data-line="' + index + '"]'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const burst = (age, rise, fall) => (age <= 0 ? 0 : smooth(0, rise, age) * Math.exp(-(age - rise) / fall));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const platenPaths = (drop) => {
  const z = PLATEN_REST - drop;
  return solidSvg(cylinder(-122, -10, 1.5, z + 4, ARM_Z - z - 4, P, 12), { tone: "mid", crease: "none" }) +
    solidSvg(cylinder(-122, 8, 1.5, z + 4, ARM_Z - z - 4, P, 12), { tone: "mid", crease: "none" }) +
    solidSvg(slabOf(PLATEN, z, 4, P, 4, 0.5), { tone: "hi", crease: "lo", lit: drop > 2 });
};
const leverPaths = (angle) => {
  const tip = [LEVER[0] + Math.cos(angle) * 15, LEVER[1] + Math.sin(angle) * 15];
  return solidSvg(cylinder(tip[0], tip[1], 2.3, ARM_TOP + 7.4, 3.6, P, 20), { tone: "hi", crease: "lo", lit: true }) +
    lineSvg(knurl(tip[0], tip[1], 2.3, ARM_TOP + 7.4, ARM_TOP + 11, 16, P), { tone: "lo" }) +
    lineSvg(lineOnTop([LEVER[0] + Math.cos(angle) * 1.7, LEVER[1] + Math.sin(angle) * 1.7], tip, ARM_TOP + 9.2, P), { tone: "hi" });
};
const DELIVER = 2.2;
let phase = 0, phaseAt = 0, clock = 0, cardOut = 0, frame = 0, last = 0, visible = false, touring = true, nextAt = 1;
const NAMES = ["composing: 6 lines cast from doc comments", "pulling the lever · TryShowHelpOrVersion first", "printed in one stroke · 0 string building", "delivered · help shown before routing"];
function draw() {
  const pull = still.matches ? 0 : burst(clock - phaseAt, 0.12, 0.4) * (phase === 1 ? 1 : 0);
  platenEl.innerHTML = platenPaths(pull * PLATEN_DROP);
  leverEl.innerHTML = leverPaths(-0.5 - pull * 0.9);
  const deliver = still.matches ? (phase >= 3 ? 1 : 0) : ease(clamp((clock - phaseAt) / 1.4, 0, 1)) * (phase >= 3 ? 1 : 0);
  cardEl.setAttribute("transform", translateAlong(P, [deliver * ${TRAY.x - CARD.x - 2}, deliver * ${TRAY.y + 3 - CARD.y}, -deliver * ${CARD_Z - 1}]));
  const revealed = phase >= 2 ? SLUGS.length : Math.floor(pull * SLUGS.length + 0.001);
  lineEls.forEach((el, index) => {
    const want = index < revealed ? "1" : "0";
    if (el.getAttribute("opacity") !== want) el.setAttribute("opacity", want);
  });
  const text = NAMES[phase];
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const holds = [1.1, 1.0, 1.2, 2.2];
  if (clock - phaseAt >= holds[phase]) {
    phaseAt = clock;
    phase = (phase + 1) % 4;
    if (phase === 0) cardOut = 0;
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (phase === 0) { phaseAt = clock; phase = 1; run(); }
  else if (phase === 3) { phaseAt = clock; phase = 0; cardOut = 0; lineEls.forEach((el) => el.setAttribute("opacity", "0")); run(); }
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
  fig: "Fig 5",
  title: "The help letterpress",
  hint: "Click or press Space to print",
  readout: "composing: 6 lines cast from doc comments",
  keys: [
    { mark: "lit", label: "The platen and the version slug" },
    { mark: "raised", label: "Type slugs: help cast at compile time" },
    { mark: "flat", label: "Type case: doc comments, names, defaults" },
  ],
  caption:
    "Help is not built at run time. The generator composes the usage text from doc comments, parameter names, defaults and the assembly version, and emits ShowHelp as a raw string literal. TryShowHelpOrVersion runs before anything parses, so -h anywhere prints instantly — the type was cast when you compiled.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Help letterpress: press Space to print the help card">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "help-letterpress-light.html" : "help-letterpress.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the help letterpress", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "help-letterpress-light.html" : "help-letterpress.html");
