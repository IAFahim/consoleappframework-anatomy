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

const PLATE = { x: -196, y: -76, w: 392, d: 148, r: 8 };
const PLATE_Z = -14;

const BELT = { x: -150, y: 20, w: 260, d: 18, r: 1 };
const BELT_TOP = 10;
const DRUM_X = [BELT.x - 3.4, BELT.x + BELT.w + 3.4];

const SLOT_Y = -36.5;
const SLOTS = [
  { x: -84, label: "--foo <int>", fill: 0.8 },
  { x: -48, label: "--bar <int>", fill: 0.55 },
  { x: -12, label: "--dry-run", fill: 0.3 },
  { x: 24, label: "--tags params", fill: 0.8 },
];
const TUBE_R = 4.2;
const TUBE_H = 15;
const PANEL = { x: -104, y: SLOT_Y - 10, w: 148, d: 14, r: 2 };
const PANEL_Z = 12;

const ARCH_X = -60;
const ARCH_Z = 26;

const DIVIDER_X = 56;
const CHUTE = { x: 70, y: 44, w: 44, d: 12, r: 2 };

const TOKENS = [
  { text: "--foo", kind: "name", slot: 0 },
  { text: "10", kind: "value", slot: 0 },
  { text: "--bar", kind: "name", slot: 1 },
  { text: "20", kind: "value", slot: 1 },
  { text: "--", kind: "escape", slot: -1 },
  { text: "-x", kind: "escaped", slot: -1 },
];
const TOKEN_Z = BELT_TOP;
const TOKEN_STEP = 26;
const TOKEN_X0 = -138;

const BIN = { x: 118, y: 14, w: 22, d: 30, r: 2 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    [ARCH_X - 6, 29, ARCH_Z + 4],
    [PANEL.x - 4, PANEL.y, PANEL_Z + 12],
    [CHUTE.x + CHUTE.w, CHUTE.y + CHUTE.d, 6],
    [BIN.x + BIN.w, BIN.y + BIN.d, 16],
    [DRUM_X[1] + 4, BELT.y, BELT_TOP],
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
  const label = { x: -96, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 31, label.y + 6.2], 1.05, P), "the parsing station", { size: 2.3, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function beltFrameSvg() {
  const out = [];
  const railAt = (y) => S(k.slabOf({ x: BELT.x - 3, y, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, P, 2, 0.3), { tone: "mid" });
  out.push(railAt(BELT.y - 2));
  out.push(railAt(BELT.y + BELT.d));
  const legs = [[-140, 19], [-60, 19], [20, 19], [100, 19], [DRUM_X[0], 29], [60, 29], [113.4, 29], [-140, 39.4], [-60, 39.4], [20, 39.4], [100, 39.4]];
  for (const [x, y] of byDepth(legs)) {
    out.push(S(k.slabOf({ x: x - 1.6, y: y - 1.4, w: 3.2, d: 2.8, r: 0.6 }, 0, 4, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

function beltSurfaceSvg() {
  const out = [];
  out.push(S(k.slabOf(BELT, 8, 2, P, 2, 0), { tone: "lo", crease: "none" }));
  const cleats = k.topTicks(BELT.x + 8, BELT.x + BELT.w - 8, 13, 3, BELT.y + 0.1, BELT_TOP + 0.05, [17.8, 17.8], P);
  out.push(L(cleats.minor, { tone: "faint" }));
  out.push(L(cleats.major, { tone: "lo" }));
  const flowEnds = [[DRUM_X[0] + 1.2, BELT.y + BELT.d / 2], [DRUM_X[1] - 1.2, BELT.y + BELT.d / 2]];
  out.push(L(k.onTop(flowEnds, BELT_TOP + 0.06, P), { tone: "lo", dashed: true, flow: true }));
  out.push(D(flowEnds.map(([x, y]) => at([x, y, BELT_TOP + 0.06])), { size: 0.9 }));
  return out.join("");
}

function drumsSvg() {
  const out = [];
  for (const x of DRUM_X) {
    const F = G.frameAlong([x, BELT.y + BELT.d / 2, BELT_TOP - 2.4], [0, 1, 0]);
    out.push(S(G.disc(-3, 3, 2.4, F, P), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 1.6, y: 25.5, w: 3.2, d: 7, r: 0.8 }, 4, 1.4, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

function archBackSvg() {
  return S(k.slabOf({ x: ARCH_X - 2.4, y: BELT.y - 9, w: 4.8, d: 6, r: 1 }, 0, ARCH_Z, P, 2, 0.4), { tone: "mid" }) +
    D([[ARCH_X, BELT.y - 8, ARCH_Z], [ARCH_X, BELT.y - 4, ARCH_Z]].map(at), { size: 0.4 });
}

function archSvg() {
  const out = [];
  for (const y of [BELT.y + BELT.d + 3]) {
    out.push(S(k.slabOf({ x: ARCH_X - 2.4, y, w: 4.8, d: 6, r: 1 }, 0, ARCH_Z, P, 2, 0.4), { tone: "mid" }));
    out.push(D([[ARCH_X, y + 1, ARCH_Z], [ARCH_X, y + 5, ARCH_Z]].map(at), { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: ARCH_X - 6, y: BELT.y - 11, w: 12, d: BELT.d + 16, r: 2 }, ARCH_Z, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: ARCH_X - 6, y: BELT.y - 11, w: 12, d: BELT.d + 16, r: 2 }, ARCH_Z + 2, P, 3), { tone: "faint" }));
  out.push(S(k.cylinder(ARCH_X, BELT.y + BELT.d / 2, 4.6, ARCH_Z + 4, 3.5, P, 36, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(ARCH_X, BELT.y + BELT.d / 2, 3.4, ARCH_Z + 7.5, P, 32), { tone: "lo" }));
  const ticks = k.radialTicks(ARCH_X, BELT.y + BELT.d / 2, 2.7, 20, 5, ARCH_Z + 7.5, [0.9, 1.9], P, -1.8, 2.2);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(`<path data-part="archneedle" class="iso-line" data-tone="lit" data-free="start" d="${k.lineOnTop([ARCH_X, BELT.y + BELT.d / 2 - 0.4], [ARCH_X + 2, BELT.y + BELT.d / 2 + 1.4], ARCH_Z + 7.7, P)}" style="stroke-width:0.9"/>`);
  return out.join("");
}

function panelSvg() {
  const out = [];
  for (const [x, y] of byDepth(k.corners({ x: PANEL.x - 2, y: PANEL.y - 2, w: PANEL.w + 4, d: PANEL.d + 4 }, 4))) {
    out.push(S(k.slabOf({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, 0, PANEL_Z - 2, P, 2), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.slabOf(PANEL, PANEL_Z - 2, 2, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PANEL, 2), PANEL_Z, P, 4), { tone: "faint" }));
  return out.join("");
}

function tubeSvg(index) {
  const out = [];
  const slot = SLOTS[index];
  out.push(S(k.cylinder(slot.x, SLOT_Y, TUBE_R, PANEL_Z, TUBE_H, P, 32), { tone: "mid" }));
  out.push(L([PANEL_Z + 4, PANEL_Z + 9].map((z) => k.sideArc(slot.x, SLOT_Y, TUBE_R, z, P, 20)).join(""), { tone: "faint" }));
  out.push(L(k.ring(slot.x, SLOT_Y, TUBE_R - 0.7, PANEL_Z + TUBE_H, P, 32), { tone: "lo" }));
  const ticks = k.sideTicks(slot.x - TUBE_R - 0.2, slot.x + TUBE_R + 0.2, 2.5, 3, SLOT_Y + TUBE_R + 0.3, PANEL_Z + 2, [1.6, 2.6], P, "x");
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  const plate = { x: slot.x - 10.5, y: SLOT_Y - 10, w: 21, d: 5.6, r: 1 };
  out.push(S(k.slabOf(plate, PANEL_Z, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([slot.x, SLOT_Y - 6.4], PANEL_Z + 0.85, P), slot.label, { size: 1.8, tone: "mid", anchor: "middle" }));
  return out.join("");
}


function plungerAt(index, rise) {
  const slot = SLOTS[index];
  const z = PANEL_Z + 1 + rise;
  return S(k.cylinder(slot.x, SLOT_Y, TUBE_R - 1.1, z, 1.6, P, 24), { tone: "hi", crease: "none", lit: rise > 0.5 });
}

function dividerSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: DIVIDER_X - 3, y: BELT.y + BELT.d + 2, w: 6, d: 6, r: 1 }, 0, 14, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(DIVIDER_X, BELT.y + BELT.d + 5, 1.4, 14, 4, P, 14), { tone: "mid" }));
  out.push(`<g data-part="flag">${flagSvg(0)}</g>`);
  return out.join("");
}

const flagSvg = (swing) => {
  const pivot = [DIVIDER_X, BELT.y + BELT.d + 5, 18];
  const a = -2.2 + swing;
  const tip = [pivot[0] + Math.cos(a) * 9, pivot[1], pivot[2] + Math.sin(a) * 9];
  return S(k.slabOf({ x: Math.min(pivot[0], tip[0]) - 1, y: pivot[1] - 2.6, w: Math.abs(tip[0] - pivot[0]) + 2, d: 5.2, r: 1 }, Math.min(pivot[2], tip[2]) - 1, 2, P, 2), { tone: "hi", crease: "none", lit: swing > 0.3 }) +
    L(k.segment(pivot, [tip[0], pivot[1], tip[2] - 1], P), { tone: "lo", free: "start" });
};

function chuteSvg() {
  const out = [];
  for (const y of [CHUTE.y - 2, CHUTE.y + CHUTE.d]) {
    out.push(S(k.slabOf({ x: CHUTE.x, y, w: CHUTE.w, d: 2.4, r: 0.8 }, 0, 2.6, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf(CHUTE, 0, 0.6, P, 2, 0), { tone: "lo", crease: "none" }));
  out.push(L(k.topTicks(CHUTE.x + 4, CHUTE.x + CHUTE.w - 4, 9, 3, CHUTE.y, 0.65, [CHUTE.d - 2, CHUTE.d - 2], P).minor, { tone: "faint" }));
  return out.join("");
}

function binSvg() {
  const out = [];
  for (const y of [BIN.y, BIN.y + BIN.d]) {
    out.push(S(k.slabOf({ x: BIN.x, y, w: BIN.w, d: 2.6, r: 0.8 }, 0, 9, P, 2, 0.4), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y, w: 2.6, d: BIN.d, r: 0.8 }, 0, 9, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: BIN.x, y: BIN.y, w: BIN.w, d: BIN.d, r: 2 }, 6, P, 2), { tone: "faint" }));
  return out.join("");
}

function tokenSvg(x, text, lit) {
  const out = [];
  out.push(S(k.slabOf({ x: x - 5, y: BELT.y + BELT.d / 2 - 4, w: 10, d: 8, r: 1 }, TOKEN_Z, 6, P, 2, 0.4), { tone: "hi", crease: "lo", lit }));
  out.push(k.faceTextSvg(k.topMatrix([x, BELT.y + BELT.d / 2 + 1.2], TOKEN_Z + 6.05, P), text, { size: 1.9, tone: "mid", anchor: "middle" }));
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -96, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("belt.frame", [BELT.x + BELT.w / 2, BELT.y + BELT.d / 2, 5], beltFrameSvg(), rec([
  A.slab({ x: BELT.x - 3, y: BELT.y - 2, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, { name: "belt.railback" }),
  A.slab({ x: BELT.x - 3, y: BELT.y + BELT.d, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, { name: "belt.railfront" }),
  ...[[-140, 19], [-60, 19], [20, 19], [100, 19], [DRUM_X[0], 29], [60, 29], [113.4, 29], [-140, 39.4], [-60, 39.4], [20, 39.4], [100, 39.4]].map(([x, y], i) => A.slab({ x: x - 1.6, y: y - 1.4, w: 3.2, d: 2.8, r: 0.6 }, 0, 4, { name: `belt.leg${i}` })),
]));
put("belt.surface", [BELT.x + BELT.w / 2, BELT.y + BELT.d / 2, 9], beltSurfaceSvg(), rec([A.slab(BELT, 8, 2, { name: "belt.surface" })]));
put("belt.drums", [DRUM_X[1], BELT.y + BELT.d / 2, BELT_TOP - 2.4], drumsSvg(), rec(
  DRUM_X.flatMap((x, i) => [A.disc(G.frameAlong([x, BELT.y + BELT.d / 2, BELT_TOP - 2.4], [0, 1, 0]), -3, 3, 2.4, { name: `belt.drum${i}` }), A.slab({ x: x - 1.6, y: 25.5, w: 3.2, d: 7, r: 0.8 }, 4, 1.4, { name: `belt.bearing${i}` })]),
));
put("arch.back", [ARCH_X, BELT.y - 6, 13], archBackSvg(), rec([
  A.slab({ x: ARCH_X - 2.4, y: BELT.y - 9, w: 4.8, d: 6, r: 1 }, 0, ARCH_Z, { name: "arch.postback" }),
]));
put("arch", [ARCH_X, BELT.y + BELT.d / 2, 14], archSvg(), rec([
  A.slab({ x: ARCH_X - 2.4, y: BELT.y + BELT.d + 3, w: 4.8, d: 6, r: 1 }, 0, ARCH_Z, { name: "arch.post" }),
  A.slab({ x: ARCH_X - 6, y: BELT.y - 11, w: 12, d: BELT.d + 16, r: 2 }, ARCH_Z, 4, { name: "arch.beam" }),
  A.cylinder(ARCH_X, BELT.y + BELT.d / 2, 4.6, ARCH_Z + 4, 3.5, { name: "arch.dial" }),
]));
put("panel", [PANEL.x + PANEL.w / 2, SLOT_Y, PANEL_Z - 1], panelSvg(), rec([
  A.slab(PANEL, PANEL_Z - 2, 2, { name: "panel.deck" }),
  ...k.corners({ x: PANEL.x - 2, y: PANEL.y - 2, w: PANEL.w + 4, d: PANEL.d + 4 }, 4).map(([x, y], i) => A.slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, 0, PANEL_Z - 2, { name: `panel.leg${i}` })),
]));
SLOTS.forEach((slot, index) => {
  put(`tube${index}`, [slot.x, SLOT_Y, PANEL_Z + TUBE_H / 2], tubeSvg(index).replace(`<g data-part="plunger${index}"></g>`, ""), rec([
    A.cylinder(slot.x, SLOT_Y, TUBE_R, PANEL_Z, TUBE_H, { name: `tube${index}`, owner: `tube${index}` }),
    A.slab({ x: slot.x - 10.5, y: SLOT_Y - 10, w: 21, d: 5.6, r: 1 }, PANEL_Z, 0.8, { name: `plate${index}` }),
  ]));
  put(`plunger${index}`, [slot.x, SLOT_Y, PANEL_Z + 1.8], `<g data-part="plunger${index}">${plungerAt(index, 0)}</g>`, rec([
    A.cylinder(slot.x, SLOT_Y, TUBE_R - 1.1, PANEL_Z + 1, 1.6, { name: `plunger${index}`, owner: `tube${index}` }),
  ]));
});
put("divider", [DIVIDER_X, BELT.y + BELT.d + 5, 9], dividerSvg(), rec([
  A.slab({ x: DIVIDER_X - 3, y: BELT.y + BELT.d + 2, w: 6, d: 6, r: 1 }, 0, 14, { name: "divider.base" }),
  A.cylinder(DIVIDER_X, BELT.y + BELT.d + 5, 1.4, 14, 4, { name: "divider.post" }),
]));
put("chute", [CHUTE.x + CHUTE.w / 2, CHUTE.y + CHUTE.d / 2, 1.5], chuteSvg(), rec([
  A.slab(CHUTE, 0, 0.6, { name: "chute.floor" }),
  A.slab({ x: CHUTE.x, y: CHUTE.y - 2, w: CHUTE.w, d: 2.4, r: 0.8 }, 0, 2.6, { name: "chute.rail" }),
  A.slab({ x: CHUTE.x, y: CHUTE.y + CHUTE.d, w: CHUTE.w, d: 2.4, r: 0.8 }, 0, 2.6, { name: "chute.rail" }),
]));
put("bin", [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2, 4.5], binSvg(), rec([
  A.slab({ x: BIN.x, y: BIN.y, w: BIN.w, d: 2.6, r: 0.8 }, 0, 9, { name: "bin.wall", owner: "bin" }),
  A.slab({ x: BIN.x, y: BIN.y + BIN.d, w: BIN.w, d: 2.6, r: 0.8 }, 0, 9, { name: "bin.wall", owner: "bin" }),
  A.slab({ x: BIN.x, y: BIN.y, w: 2.6, d: BIN.d, r: 0.8 }, 0, 9, { name: "bin.wall", owner: "bin" }),
]));
TOKENS.forEach((token, index) => {
  const x = TOKEN_X0 + index * TOKEN_STEP;
  put(`token${index}`, [x, BELT.y + BELT.d / 2, TOKEN_Z + 3], `<g data-part="token${index}">${tokenSvg(x, token.text, index === 0)}</g>`, rec([
    A.slab({ x: x - 5, y: BELT.y + BELT.d / 2 - 4, w: 10, d: 8, r: 1 }, TOKEN_Z, 6, { name: `token${index}` }),
  ]));
});

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "belt.surface", "tube0", "tube1", "tube2", "tube3", "divider", "chute"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A parsing station: arg tokens ride a belt under a reader arch, each option name fills its typed slot tube on the panel behind, a divider flag diverts everything after the double-dash into the escape chute, and consumed tokens drop into the bin.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const TOKENS = ${JSON.stringify(TOKENS)};
const SLOTS = ${JSON.stringify(SLOTS.map((s) => ({ x: s.x, label: s.label })))};
const TOKEN_X0 = ${TOKEN_X0}, TOKEN_STEP = ${TOKEN_STEP}, TOKEN_Z = ${TOKEN_Z};
const BELT = ${JSON.stringify(BELT)}, LANE_Y = ${BELT.y + BELT.d / 2};
const ARCH_X = ${ARCH_X}, DIVIDER_X = ${DIVIDER_X};
const CHUTE = ${JSON.stringify(CHUTE)};
const PANEL_Z = ${PANEL_Z}, TUBE_R = ${TUBE_R};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const tokenEls = TOKENS.map((_, index) => svg.querySelector('[data-part="token' + index + '"]'));
const plungerEls = SLOTS.map((_, index) => svg.querySelector('[data-part="plunger' + index + '"]'));
const flagEl = svg.querySelector('[data-part="flag"]');
const needleEl = svg.querySelector('[data-part="archneedle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const burst = (age, rise, fall) => (age <= 0 ? 0 : smooth(0, rise, age) * Math.exp(-(age - rise) / fall));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const plungerAt = (index, rise) => {
  const z = PANEL_Z + 1 + rise;
  return solidSvg(cylinder(SLOTS[index].x, ${SLOT_Y}, TUBE_R - 1.1, z, 1.6, P, 24), { tone: "hi", crease: "none", lit: rise > 0.5 });
};
const flagAt = (swing) => {
  const pivot = [DIVIDER_X, ${BELT.y + BELT.d + 5}, 18];
  const a = -2.2 + swing;
  const tip = [pivot[0] + Math.cos(a) * 9, pivot[1], pivot[2] + Math.sin(a) * 9];
  return solidSvg(slabOf({ x: Math.min(pivot[0], tip[0]) - 1, y: pivot[1] - 2.6, w: Math.abs(tip[0] - pivot[0]) + 2, d: 5.2, r: 1 }, Math.min(pivot[2], tip[2]) - 1, 2, P, 2), { tone: "hi", crease: "none", lit: swing > 0.3 }) +
    lineSvg(segment(pivot, [tip[0], pivot[1], tip[2] - 1], P), { tone: "lo", free: "start" });
};
const STEP = 0.62;
let steps = 0, stepAt = 0, belt = 0, beltFrom = 0, beltTo = 0;
let fills = [0, 0, 0, 0], fillTargets = [0, 0, 0, 0];
let escapeAt = -9, escaped = TOKENS.map(() => false), dropAt = TOKENS.map(() => -9), done = false, doneAt = 0;
let frame = 0, last = 0, clock = 0, visible = false, touring = true, nextAt = 0.8;
function advance() {
  if (steps >= TOKENS.length) return;
  const token = TOKENS[steps];
  beltFrom = belt;
  beltTo = belt + TOKEN_STEP;
  stepAt = clock;
  if (token.kind === "escape") escapeAt = clock + 0.35;
  if (token.kind === "name" && token.slot >= 0) fillTargets[token.slot] = 1;
  if (token.kind === "escaped") { escaped[steps] = true; dropAt[steps] = clock + 0.25; }
  steps++;
  if (steps === TOKENS.length) { done = true; doneAt = clock + 0.5; }
}
function draw() {
  const t = still.matches ? 1 : ease(clamp((clock - stepAt) / STEP, 0, 1));
  belt = beltFrom + (beltTo - beltFrom) * t;
  TOKENS.forEach((token, index) => {
    const x = TOKEN_X0 + index * TOKEN_STEP + belt;
    if (escaped[index]) {
      const k = still.matches ? 1 : clamp((clock - dropAt[index]) / 0.8, 0, 1);
      const cx = ${DIVIDER_X} + 6 + k * 42;
      const cy = ${BELT.y + BELT.d / 2} + k * 20;
      tokenEls[index].setAttribute("transform", translateAlong(P, [cx - (TOKEN_X0 + index * TOKEN_STEP), cy - LANE_Y, -k * ${TOKEN_Z}]));
      tokenEls[index].setAttribute("opacity", String(1 - k * 0.85));
      return;
    }
    const gone = x > ${BIN.x} - 4;
    tokenEls[index].setAttribute("opacity", gone ? "0" : "1");
    if (!gone) tokenEls[index].setAttribute("transform", translateAlong(P, [belt, 0, 0]));
  });
  fills.forEach((_, index) => {
    fills[index] += (fillTargets[index] - fills[index]) * 0.1;
    plungerEls[index].innerHTML = plungerAt(index, fills[index] * 9.5);
  });
  flagEl.innerHTML = flagAt(burst(clock - escapeAt, 0.1, 0.4) * 2.0);
  needleEl.setAttribute("d", archNeedle(belt));
  const token = TOKENS[Math.min(steps, TOKENS.length - 1)];
  let text;
  if (done && clock > doneAt) text = "required: 0 missing · invoke command(foo = 10, bar = 20)";
  else if (token.kind === "name") text = "read " + token.text + " · fill " + SLOTS[token.slot].label;
  else if (token.kind === "escape") text = "-- reached · the rest is escaped";
  else if (token.kind === "escaped") text = "escape chute · " + token.text + " bypasses parsing";
  else text = "value " + token.text + " · bound into its slot";
  if (readout.textContent !== text) readout.textContent = text;
}
const archNeedle = (b) => {
  const wobble = still.matches ? 0 : Math.sin(clock * 9) * burst(clock - stepAt, 0.06, 0.3) * 0.35;
  const angle = -1.4 + wobble;
  return lineOnTop([${ARCH_X} - Math.sin(angle) * 0.4, ${BELT.y + BELT.d / 2} + Math.cos(angle) * 0.4], [${ARCH_X} + Math.sin(angle) * 2.2, ${BELT.y + BELT.d / 2} - Math.cos(angle) * 2.2], ${ARCH_Z + 7.7}, P);
};
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && clock >= nextAt && steps < TOKENS.length) { nextAt = clock + STEP + 0.55; advance(); }
  draw();
  const idle = done && clock > doneAt + 1.2 && !touring;
  frame = visible && !idle ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (steps < TOKENS.length) { advance(); run(); return; }
  steps = 0; belt = 0; beltFrom = 0; beltTo = 0; fillTargets = [0, 0, 0, 0]; escapeAt = -9; escaped = TOKENS.map(() => false); done = false;
  tokenEls.forEach((el) => el.setAttribute("opacity", "1"));
  nextAt = clock + 0.3;
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
  fig: "Fig 4",
  title: "The parsing station",
  hint: "Click or press Space to advance the belt",
  readout: "read --foo · fill --foo <int>",
  keys: [
    { mark: "lit", label: "Slot plungers: filled values" },
    { mark: "raised", label: "Reader arch: the option switch" },
    { mark: "flat", label: "Divider flag at the -- escape" },
  ],
  caption:
    "One pass, no regex: the emitted loop switches on each token — an exact match fast path, then a case-insensitive fallback — grabs the value with TryIncrementIndex and calls int.TryParse, ISpanParsable<T> or Enum.TryParse directly into a typed local. bool is a flag, params swallows the tail, and after -- every token bypasses parsing into EscapedArguments.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Parsing station: press Space to advance the belt one token">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "parsing-station-light.html" : "parsing-station.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the parsing station", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "parsing-station-light.html" : "parsing-station.html");
