import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 420;

const PLATE = { x: -196, y: -76, w: 300, d: 152, r: 8 };
const PLATE_Z = -14;

const LANE_Y = 32;
const STRIP_HEAD = -107;
const STRIP_MAX = 188;
const STRIP_Z = 8;
const LINE_AT = (i) => STRIP_HEAD + 14 + i * 28;

const MAG = { x: -186, y: 10, w: 38, d: 44, r: 2 };
const BLANK = { x: -148, y: LANE_Y - 12, w: 36, d: 24, r: 1 };
const BLANK_TARGET_X = -129;

const PRESS = { x: -140, y: -60, w: 68, d: 42, r: 3 };
const PRESS_COL = [-107, -40];
const ARM = { x: -114, y: -62, w: 14, d: 104, r: 2 };
const ARM_Z = 48;
const ARM_TOP = 58;
const RAM_X = -107;
const DIE = { x: -129, y: LANE_Y - 14, w: 44, d: 28, r: 2 };
const DIE_BOTTOM = 30;
const RAM_DROP = 21.2;

const ROLLER_X = -10;
const ROLLER_R = 2.2;
const ROLLER_BRIDGE = { x: ROLLER_X - 5, y: 12, w: 10, d: 40, r: 1 };

const TRAY = { x: 68, y: 16, w: 14, d: 32, r: 1 };

const GAUGE = [-30, -56];
const GAUGE_Z = 12;

const LEVER = [-170, 62];

const LINES = [
  "void Run(string[] a,",
  "  Action<int,int> c)",
  "case \"--foo\":",
  "  int.TryParse(a[i],",
  "    out arg0);",
  "command(arg0, arg1);",
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    ...k.boxCorners(ARM, ARM_Z, ARM_TOP),
    [GAUGE[0] + 9, GAUGE[1], GAUGE_Z + 14],
    [MAG.x - 4, MAG.y, 17],
    [TRAY.x + TRAY.w + 2, TRAY.y + TRAY.d, 13],
    [LEVER[0] - 3, LEVER[1] + 3, 14],
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
  const label = { x: -138, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 31, label.y + 6.2], 1.05, P), "the code press", { size: 2.4, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function magazineSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: MAG.x - 3, y: MAG.y - 3, w: MAG.w + 6, d: MAG.d + 6, r: 2 }, 6, 2, P, 4, 0.4), { tone: "mid" }));
  for (const [x, y] of byDepth(k.corners({ x: MAG.x - 1, y: MAG.y - 1, w: MAG.w + 2, d: MAG.d + 2 }, 6))) {
    out.push(S(k.slabOf({ x: x - 1.4, y: y - 1.4, w: 2.8, d: 2.8, r: 0.5 }, 0, 6, P, 2), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.slabOf(MAG, 7.9, 0.4, P, 4, 0.2), { tone: "lo", crease: "none" }));
  const walls = [
    { x: MAG.x, y: MAG.y, w: MAG.w, d: 3, r: 1 },
    { x: MAG.x, y: MAG.y, w: 3, d: MAG.d, r: 1 },
    { x: MAG.x, y: MAG.y + MAG.d - 3, w: MAG.w, d: 3, r: 1 },
  ];
  for (const wall of walls) {
    out.push(S(k.slabOf(wall, 8.3, 6.7, P, 3, 0.4), { tone: "mid" }));
    out.push(L(k.sideSeam(wall, 12, P, 3), { tone: "faint" }));
  }
  const stack = [
    { x: MAG.x + 4, y: MAG.y + 6, w: 26, d: BLANK.d, r: 1 },
    { x: MAG.x + 4, y: MAG.y + 13, w: 26, d: BLANK.d, r: 1 },
  ];
  stack.forEach((plan, index) => {
    out.push(S(k.slabOf(plan, 8.4 + index * 0.6, 0.8, P, 3, 0.2), { tone: "hi", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2), 9.2 + index * 0.6, P, 3), { tone: "faint" }));
    out.push(L([k.lineOnTop([plan.x + 3, plan.y + 8], [plan.x + 19, plan.y + 8], 9.2 + index * 0.6, P), k.lineOnTop([plan.x + 3, plan.y + 12], [plan.x + 15, plan.y + 12], 9.2 + index * 0.6, P)].join(""), { tone: "lo", free: true }));
  });
  return out.join("");
}

function blankSvg() {
  const out = [];
  out.push(S(k.slabOf(BLANK, 8, 0.8, P, 3, 0.2), { tone: "hi", crease: "none", lit: true }));
  out.push(L(k.planOutline(k.insetPlan(BLANK, 2), 8.8, P, 3), { tone: "faint" }));
  out.push(L([k.lineOnTop([BLANK.x + 5, BLANK.y + 8], [BLANK.x + 22, BLANK.y + 8], 8.8, P), k.lineOnTop([BLANK.x + 5, BLANK.y + 12], [BLANK.x + 26, BLANK.y + 12], 8.8, P), k.lineOnTop([BLANK.x + 5, BLANK.y + 16], [BLANK.x + 14, BLANK.y + 16], 8.8, P)].join(""), { tone: "lo", free: true }));
  return out.join("");
}

function pressBaseSvg() {
  const out = [];
  out.push(S(k.slabOf(PRESS, 0, 10, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PRESS, 4), 10, P, 6), { tone: "faint" }));
  const screws = k.corners(PRESS, 7);
  out.push(D(screws.map(([x, y]) => at([x, y, 10])), { size: 0.45 }));
  out.push(S(k.slabOf({ x: PRESS.x + 8, y: PRESS.y + 30, w: 52, d: 10, r: 1.5 }, 10, 1, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([PRESS.x + 12, PRESS.y + 35], [PRESS.x + 44, PRESS.y + 35], 11, P), { tone: "lo", free: true }));
  return out.join("");
}

function columnSvg() {
  const out = [];
  out.push(S(k.cylinder(PRESS_COL[0], PRESS_COL[1], 5, 10, ARM_Z - 10, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([24, 42].map((z) => k.sideArc(PRESS_COL[0], PRESS_COL[1], 5, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(ARM, ARM_Z, ARM_TOP - ARM_Z, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.sideSeam(ARM, ARM_Z + 4.5, P, 5), { tone: "faint" }));
  out.push(S(k.cylinder(PRESS_COL[0], PRESS_COL[1], 6.4, ARM_Z - 2.5, 2.5, P, 28), { tone: "mid" }));
  return out.join("");
}

const ramSvg = (drop) => {
  const z = DIE_BOTTOM - drop;
  return S(k.cylinder(RAM_X, LANE_Y, 2.6, z + 16, ARM_Z - z - 16, P, 16), { tone: "mid", crease: "none" }) +
    S(k.slabOf({ x: DIE.x, y: DIE.y, w: DIE.w, d: DIE.d, r: DIE.r }, z + 10, 6, P, 4, 0.5), { tone: "mid" }) +
    S(k.slabOf({ x: DIE.x + 3, y: DIE.y + 3, w: DIE.w - 6, d: DIE.d - 6, r: 1.5 }, z, 10, P, 3, 0.4), { tone: "hi", crease: "lo", lit: drop > 2 });
};

function rollerBackSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: ROLLER_X - 2, y: 12, w: 4, d: 6, r: 1 }, 0, 16, P, 2, 0.4), { tone: "mid" }));
  out.push(D([[ROLLER_X, 13, 16], [ROLLER_X, 17, 16]].map(at), { size: 0.4 }));
  out.push(S(k.slabOf({ x: ROLLER_X - 1, y: LANE_Y - 2.4, w: 2, d: 4.8, r: 0.8 }, 0, 3.8, P, 2), { tone: "mid", crease: "none" }));
  const FB = G.frameAlong([ROLLER_X, LANE_Y, 5.9], [0, 1, 0]);
  out.push(S(G.disc(-2.2, 2.2, ROLLER_R, FB, P), { tone: "hi", crease: "lo" }));
  out.push(D([at([ROLLER_X, LANE_Y + 2.3, 5.9])], { size: 0.45 }));
  return out.join("");
}

function rollerFrontSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: ROLLER_X - 2, y: 52, w: 4, d: 6, r: 1 }, 0, 16, P, 2, 0.4), { tone: "mid" }));
  out.push(D([[ROLLER_X, 53, 16], [ROLLER_X, 57, 16]].map(at), { size: 0.4 }));
  out.push(S(k.slabOf(ROLLER_BRIDGE, 16, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ROLLER_BRIDGE, 1.5), 19, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: ROLLER_X - 1, y: LANE_Y - 2.4, w: 2, d: 4.8, r: 0.8 }, 13.2, 2.8, P, 2), { tone: "mid", crease: "none" }));
  const FT = G.frameAlong([ROLLER_X, LANE_Y, 12.2], [0, 1, 0]);
  out.push(S(G.disc(-2.2, 2.2, ROLLER_R, FT, P), { tone: "hi", crease: "lo" }));
  out.push(D([at([ROLLER_X, LANE_Y - 2.3, 12.2])], { size: 0.45 }));
  return out.join("");
}

function gaugeSvg() {
  const out = [];
  out.push(S(k.cylinder(GAUGE[0], GAUGE[1], 2.6, 0, GAUGE_Z - 6, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(GAUGE[0], GAUGE[1], 7.5, GAUGE_Z - 6, 12, P, 56, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(GAUGE[0], GAUGE[1], 7.5, GAUGE_Z + 4.6, GAUGE_Z + 6, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(GAUGE[0], GAUGE[1], 5.6, GAUGE_Z + 6, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(GAUGE[0], GAUGE[1], 4.6, 36, 6, GAUGE_Z + 6, [1.2, 2.6], P, -2.2, 2.6);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(GAUGE[0], GAUGE[1], 1.4, GAUGE_Z + 6, P, 16), { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1"/>`);
  return out.join("");
}

const needleAt = (value) => {
  const angle = -2.2 + value * 2.6;
  const [x, y] = GAUGE;
  return k.lineOnTop([x - Math.sin(angle) * 1.6, y + Math.cos(angle) * 1.6], [x + Math.sin(angle) * 4.4, y - Math.cos(angle) * 4.4], GAUGE_Z + 6.2, P);
};

function traySvg() {
  const out = [];
  const legs = [[70, 13.5], [75, 13.5], [80, 13.5], [70, 50.5], [75, 50.5], [80, 50.5], [79.5, 26], [79.5, 38]];
  for (const [x, y] of byDepth(legs)) {
    out.push(S(k.slabOf({ x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.5 }, 0, 8, P, 2), { tone: "lo", crease: "none" }));
  }
  for (const y of [TRAY.y - 4, TRAY.y + TRAY.d]) {
    out.push(S(k.slabOf({ x: TRAY.x, y, w: TRAY.w, d: 4, r: 1 }, 8, 3.5, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: TRAY.x + TRAY.w - 3, y: TRAY.y, w: 3, d: TRAY.d, r: 1 }, 8, 3.5, P, 2, 0.3), { tone: "mid" }));
  out.push(D([[TRAY.x + 2, TRAY.y - 2, 11.5], [TRAY.x + 2, TRAY.y + TRAY.d - 2, 11.5], [TRAY.x + TRAY.w - 1.5, LANE_Y, 11.5]].map(at), { size: 0.4 }));
  return out.join("");
}

function leverSvg(angle) {
  const out = [];
  out.push(S(k.slabOf({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 5, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 1.8, 5, 6, P, 18), { tone: "mid" }));
  const tip = [LEVER[0] + Math.cos(angle) * 13, LEVER[1] + Math.sin(angle) * 13];
  out.push(L(k.lineOnTop([LEVER[0] + Math.cos(angle) * 1.8, LEVER[1] + Math.sin(angle) * 1.8], tip, 11.2, P), { tone: "hi" }));
  out.push(S(k.cylinder(tip[0], tip[1], 2.2, 9.4, 3.6, P, 20), { tone: "hi", crease: "lo", lit: true }));
  out.push(L(k.knurl(tip[0], tip[1], 2.2, 9.4, 13, 18, P), { tone: "lo" }));
  return out.join("");
}

const stripSlab = (feed) => (feed <= 0.2 ? "" : S(k.slabOf({ x: STRIP_HEAD, y: LANE_Y - 12, w: feed, d: 24, r: 1 }, STRIP_Z, 2, P, 2, 0.3), { tone: "hi", crease: "none" }));

function stripSvg() {
  const out = [`<g data-part="stripslab">${stripSlab(6)}</g>`];
  LINES.forEach((line, index) => {
    const x = LINE_AT(index);
    out.push(`<g data-line="${index}" opacity="0">`);
    out.push(k.faceTextSvg(k.topMatrix([x, LANE_Y + 3.4], STRIP_Z + 2.05, P), line, { size: 2.3, tone: "mid", anchor: "start" }));
    out.push(L(k.lineOnTop([x - 3, LANE_Y - 6.5], [x + 25, LANE_Y - 6.5], STRIP_Z + 2.05, P), { tone: "faint", free: true }));
    out.push(`</g>`);
  });
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -138, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("magazine", [MAG.x + 19, MAG.y + 22, 8], magazineSvg(), rec([
  A.slab({ x: MAG.x - 3, y: MAG.y - 3, w: MAG.w + 6, d: MAG.d + 6, r: 2 }, 6, 2, { name: "mag.riser" }),
  ...k.corners({ x: MAG.x - 1, y: MAG.y - 1, w: MAG.w + 2, d: MAG.d + 2 }, 6).map(([x, y], i) => A.slab({ x: x - 1.4, y: y - 1.4, w: 2.8, d: 2.8, r: 0.5 }, 0, 6, { name: `mag.leg${i}` })),
  A.slab(MAG, 7.9, 0.4, { name: "mag.floor" }),
  A.slab({ x: MAG.x, y: MAG.y, w: MAG.w, d: 3, r: 1 }, 8.3, 6.7, { name: "mag.wall", owner: "mag" }),
  A.slab({ x: MAG.x, y: MAG.y, w: 3, d: MAG.d, r: 1 }, 8.3, 6.7, { name: "mag.wall", owner: "mag" }),
  A.slab({ x: MAG.x, y: MAG.y + MAG.d - 3, w: MAG.w, d: 3, r: 1 }, 8.3, 6.7, { name: "mag.wall", owner: "mag" }),
  A.slab({ x: MAG.x + 4, y: MAG.y + 6, w: 26, d: BLANK.d, r: 1 }, 8.4, 0.8, { name: "mag.blank" }),
  A.slab({ x: MAG.x + 4, y: MAG.y + 13, w: 26, d: BLANK.d, r: 1 }, 9, 0.8, { name: "mag.blank" }),
]));
put("blank", [BLANK.x + 18, BLANK.y + 12, 8.4], `<g data-part="blank">${blankSvg()}</g>`, rec([A.slab(BLANK, 8, 0.8, { name: "blank" })]));
put("press.base", [PRESS.x + 34, PRESS.y + 21, 5], pressBaseSvg(), rec([A.slab(PRESS, 0, 10, { name: "press.base" }), A.slab({ x: PRESS.x + 8, y: PRESS.y + 30, w: 52, d: 10, r: 1.5 }, 10, 1, { name: "press.plate" })]));
put("press.column", [PRESS_COL[0], PRESS_COL[1], 35], columnSvg(), rec([
  A.cylinder(PRESS_COL[0], PRESS_COL[1], 5, 10, ARM_Z - 10, { name: "press.column", owner: "press.column" }),
  A.cylinder(PRESS_COL[0], PRESS_COL[1], 6.4, ARM_Z - 2.5, 2.5, { name: "press.collar", owner: "press.column" }),
  A.slab(ARM, ARM_Z, ARM_TOP - ARM_Z, { name: "press.arm" }),
]));
put("press.ram", [RAM_X, LANE_Y, DIE_BOTTOM + 8], `<g data-part="ram">${ramSvg(0)}</g>`, rec([
  A.cylinder(RAM_X, LANE_Y, 2.6, DIE_BOTTOM + 16, ARM_Z - DIE_BOTTOM - 16, { name: "press.shaft" }),
  A.slab({ x: DIE.x, y: DIE.y, w: DIE.w, d: DIE.d, r: DIE.r }, DIE_BOTTOM + 10, 6, { name: "press.ram", owner: "press.ram" }),
  A.slab({ x: DIE.x + 3, y: DIE.y + 3, w: DIE.w - 6, d: DIE.d - 6, r: 1.5 }, DIE_BOTTOM, 10, { name: "press.die", owner: "press.ram" }),
]));
put("gauge", [GAUGE[0], GAUGE[1], GAUGE_Z], gaugeSvg(), rec([
  A.cylinder(GAUGE[0], GAUGE[1], 2.6, 0, GAUGE_Z - 6, { name: "gauge.stem" }),
  A.cylinder(GAUGE[0], GAUGE[1], 7.5, GAUGE_Z - 6, 12, { name: "gauge.puck" }),
]));
put("rollers.back", [ROLLER_X, LANE_Y, 5], rollerBackSvg(), rec([
  A.slab({ x: ROLLER_X - 2, y: 12, w: 4, d: 6, r: 1 }, 0, 16, { name: "roller.postback" }),
  A.slab({ x: ROLLER_X - 1, y: LANE_Y - 2.4, w: 2, d: 4.8, r: 0.8 }, 0, 3.8, { name: "roller.stand" }),
  A.disc(G.frameAlong([ROLLER_X, LANE_Y, 5.9], [0, 1, 0]), -2.2, 2.2, ROLLER_R, { name: "roller.bottom", owner: "rollers.back" }),
]));
put("rollers.front", [ROLLER_X, LANE_Y, 15], rollerFrontSvg(), rec([
  A.slab({ x: ROLLER_X - 2, y: 52, w: 4, d: 6, r: 1 }, 0, 16, { name: "roller.postfront" }),
  A.slab(ROLLER_BRIDGE, 16, 3, { name: "roller.bridge" }),
  A.slab({ x: ROLLER_X - 1, y: LANE_Y - 2.4, w: 2, d: 4.8, r: 0.8 }, 13.2, 2.8, { name: "roller.hanger", owner: "rollers.front" }),
  A.disc(G.frameAlong([ROLLER_X, LANE_Y, 12.2], [0, 1, 0]), -2.2, 2.2, ROLLER_R, { name: "roller.top", owner: "rollers.front" }),
]));
put("tray", [TRAY.x + 7, LANE_Y, 9.5], traySvg(), rec([
  ...[[70, 13.5], [75, 13.5], [80, 13.5], [70, 50.5], [75, 50.5], [80, 50.5], [79.5, 26], [79.5, 38]].map(([x, y], i) => A.slab({ x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.5 }, 0, 8, { name: `tray.leg${i}` })),
  A.slab({ x: TRAY.x, y: TRAY.y - 4, w: TRAY.w, d: 4, r: 1 }, 8, 3.5, { name: "tray.rail" }),
  A.slab({ x: TRAY.x, y: TRAY.y + TRAY.d, w: TRAY.w, d: 4, r: 1 }, 8, 3.5, { name: "tray.rail" }),
  A.slab({ x: TRAY.x + TRAY.w - 3, y: TRAY.y, w: 3, d: TRAY.d, r: 1 }, 8, 3.5, { name: "tray.end" }),
]));
put("lever", [LEVER[0], LEVER[1], 8], `<g data-part="lever">${leverSvg(2.4)}</g>`, rec([
  A.slab({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 5, { name: "lever.base" }),
  A.cylinder(LEVER[0], LEVER[1], 1.8, 5, 6, { name: "lever.post", owner: "lever" }),
  A.cylinder(LEVER[0] + Math.cos(2.4) * 13, LEVER[1] + Math.sin(2.4) * 13, 2.2, 9.4, 3.6, { name: "lever.knob", owner: "lever" }),
  A.box([-181, 61, 10.4], [-169, 73, 11.8], { name: "lever.rod", owner: "lever" }),
]));
put("strip", [STRIP_HEAD + 90, LANE_Y, STRIP_Z + 1], `<g data-part="strip">${stripSvg()}</g>`, rec([A.slab({ x: STRIP_HEAD, y: LANE_Y - 12, w: STRIP_MAX - 4, d: 24, r: 1 }, STRIP_Z, 2, { name: "strip" })]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "magazine", "strip", "rollers", "blank"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A code press: a magazine of blueprint blanks (the lambda), a punch press whose die stamps the emitted Run body, and the cast code strip growing out under a roller bridge into the output tray. A dial gauge registers the stroke and a start lever works the cycle.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const LINES = ${JSON.stringify(LINES)};
const BLANK = ${JSON.stringify(BLANK)}, BLANK_DX = ${BLANK_TARGET_X - BLANK.x};
const STRIP_HEAD = ${STRIP_HEAD}, STRIP_MAX = ${STRIP_MAX}, STRIP_Z = ${STRIP_Z}, LANE_Y = ${LANE_Y};
const DIE = ${JSON.stringify(DIE)};
const RAM_X = ${RAM_X}, DIE_BOTTOM = ${DIE_BOTTOM}, RAM_DROP = ${RAM_DROP}, ARM_Z = ${ARM_Z};
const GAUGE = ${JSON.stringify(GAUGE)}, GAUGE_Z = ${GAUGE_Z};
const LEVER = ${JSON.stringify(LEVER)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const blankEl = svg.querySelector('[data-part="blank"]');
const ramEl = svg.querySelector('[data-part="ram"]');
const stripEl = svg.querySelector('[data-part="strip"]');
const slabEl = stripEl.querySelector('[data-part="stripslab"]');
const lineEls = LINES.map((_, index) => stripEl.querySelector('[data-line="' + index + '"]'));
const needleEl = svg.querySelector('[data-part="needle"]');
const leverEl = svg.querySelector('[data-part="lever"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const burst = (age, rise, fall) => (age <= 0 ? 0 : smooth(0, rise, age) * Math.exp(-(age - rise) / fall));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const ramPaths = (drop) => {
  const z = DIE_BOTTOM - drop;
  return solidSvg(cylinder(RAM_X, LANE_Y, 2.6, z + 16, ARM_Z - z - 16, P, 16), { tone: "mid", crease: "none" }) +
    solidSvg(slabOf({ x: DIE.x, y: DIE.y, w: DIE.w, d: DIE.d, r: DIE.r }, z + 10, 6, P, 4, 0.5), { tone: "mid" }) +
    solidSvg(slabOf({ x: DIE.x + 3, y: DIE.y + 3, w: DIE.w - 6, d: DIE.d - 6, r: 1.5 }, z, 10, P, 3, 0.4), { tone: "hi", crease: "lo", lit: drop > 2 });
};
const needleAt = (value) => {
  const angle = -2.2 + value * 2.6;
  return lineOnTop([GAUGE[0] - Math.sin(angle) * 1.6, GAUGE[1] + Math.cos(angle) * 1.6], [GAUGE[0] + Math.sin(angle) * 4.4, GAUGE[1] - Math.cos(angle) * 4.4], GAUGE_Z + 6.2, P);
};
const leverSvg = (angle) => {
  const tip = [LEVER[0] + Math.cos(angle) * 13, LEVER[1] + Math.sin(angle) * 13];
  return solidSvg(cylinder(tip[0], tip[1], 2.2, 9.4, 3.6, P, 20), { tone: "hi", crease: "lo", lit: true }) +
    lineSvg(knurl(tip[0], tip[1], 2.2, 9.4, 13, 18, P), { tone: "lo" }) +
    lineSvg(lineOnTop([LEVER[0] + Math.cos(angle) * 1.8, LEVER[1] + Math.sin(angle) * 1.8], tip, 11.2, P), { tone: "hi" });
};
const stripSlab = (feed) => feed <= 0.2 ? "" : solidSvg(slabOf({ x: STRIP_HEAD, y: LANE_Y - 12, w: feed, d: 24, r: 1 }, STRIP_Z, 2, P, 2, 0.3), { tone: "hi", crease: "none" });
const NAMES = ["ready · magazine holds the blueprint", "feeding the blank (int foo, int bar)", "stamp: Run body emitted, zero deps", "feeding out · cast at compile time", "done · strip in the tray"];
let phase = 0, phaseAt = 0, clock = 0, stampAt = -9, feed = 0, blankShare = 0;
let frame = 0, last = 0, visible = false, touring = true;
function draw() {
  blankEl.setAttribute("transform", translateAlong(P, [blankShare * BLANK_DX, 0, 0]));
  blankEl.setAttribute("opacity", phase >= 2 ? "0" : "1");
  const drop = still.matches ? 0 : burst(clock - stampAt, 0.09, 0.16) * RAM_DROP;
  ramEl.innerHTML = ramPaths(drop);
  slabEl.innerHTML = stripSlab(feed);
  lineEls.forEach((el, index) => {
    const on = feed > 14 + index * 28 + 4;
    const want = on ? "1" : "0";
    if (el.getAttribute("opacity") !== want) el.setAttribute("opacity", want);
  });
  needleEl.setAttribute("d", needleAt(still.matches ? 0 : burst(clock - stampAt, 0.07, 0.22) * 0.92));
  leverEl.innerHTML = leverSvg(2.4 - burst(clock - stampAt - 0.12, 0.1, 0.2) * 1.5);
  const shown = clamp(Math.floor((feed - 10) / 28) + 1, 0, LINES.length);
  const text = phase === 3 && shown > 0 ? "emitted " + shown + "/" + LINES.length + " · " + NAMES[phase] : NAMES[phase];
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  const hold = PHASE_HOLD();
  if (clock - phaseAt >= hold) advance();
  if (phase === 1) blankShare = calm ? 1 : ease(clamp((clock - phaseAt) / 0.7, 0, 1));
  if (phase === 3) feed = calm ? STRIP_MAX : ease(clamp((clock - phaseAt) / 2.4, 0, 1)) * STRIP_MAX;
  draw();
  const idle = phase === 0 && !touring;
  frame = visible && !idle ? requestAnimationFrame(tick) : 0;
}
function PHASE_HOLD() {
  return [0.9, 0.7, 0.9, 2.4, 1.4][phase];
}
function advance() {
  phaseAt = clock;
  if (phase === 0) { phase = 1; }
  else if (phase === 1) { phase = 2; stampAt = clock; }
  else if (phase === 2) { phase = 3; }
  else if (phase === 3) { phase = 4; }
  else if (phase === 4) { phase = 0; feed = 0; blankShare = 0; }
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (phase === 0 || phase === 4) { if (phase === 4) { feed = 0; blankShare = 0; } phaseAt = clock; phase = 1; }
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
  fig: "Fig 2",
  title: "The code press",
  hint: "Click or press Space to stamp",
  readout: "ready · magazine holds the blueprint",
  keys: [
    { mark: "lit", label: "The die and the cast strip" },
    { mark: "raised", label: "Blueprint blanks: your lambda" },
    { mark: "flat", label: "Roller bridge on the strip lane" },
  ],
  caption:
    "The generator is a function-like macro. It reads the lambda you passed — (int foo, int bar) => … — and emits the Run method itself: the signature, the option switch, the TryParse calls and the invocation, as ordinary C# in your own assembly. Nothing is built at run time; the strip is cast before the program exists.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Code press: press Space to stamp and feed the emitted code strip">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "code-press-light.html" : "code-press.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the code press", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "code-press-light.html" : "code-press.html");
