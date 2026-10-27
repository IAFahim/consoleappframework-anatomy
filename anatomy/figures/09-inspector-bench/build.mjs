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
const HEIGHT = 380;

const PLATE = { x: -150, y: -64, w: 300, d: 128, r: 8 };
const PLATE_Z = -14;

const RAIL_Y = [-11, -3];
const RAIL_X = [-146, 78];
const RAIL_TOP = 9;
const PAD = { x: -128, y: -12, w: 22, d: 12, r: 1 };
const FEEDER = { x: -136, y: -28, w: 28, d: 14, r: 2 };

const GX = -62;
const SX = [-8, 28];
const GATE_X = 84;
const KICK = [74, -26];
const HEAD_REST = 24.5;
const ARM_Z = [30, 34];

const TRAY = { x: -8, y: 20, w: 98, d: 20, r: 1 };
const DIVIDERS = [26, 60];
const SECTION_LABELS = [[8, "CAF020"], [43, "CAF019"], [74, "runtime"]];
const OUT = { x: 78, y: -16, w: 40, d: 20, r: 2 };
const PLAQUE = { x: 108, y: -15, w: 10, d: 10, r: 1 };

const BLOCKS = [
  { h: 8, kind: "pass", dev: 0.5, name: "Add(int a, int b)" },
  { h: 12, kind: "caf020", dev: 3.1, name: "Echo(--msg, --msg)" },
  { h: 8, kind: "caf019", dev: 2.2, name: "Backup(--help)" },
  { h: 14, kind: "runtime", dev: 0.5, name: "Move([Range(1,10)] int count)" },
];
const PAD_X = -117;
const PARK_Z = [9, 9.5, 10, 10.5];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z - 7, 0),
    [GX, 18, 54],
    [SX[0], 18, 35],
    [SX[1], 18, 35],
    [GATE_X, -20, 26],
    [GATE_X, 14, 26],
    [FEEDER.x, FEEDER.y, 15],
    [TRAY.x + TRAY.w, TRAY.y + TRAY.d, 9],
    [PLAQUE.x + PLAQUE.w, PLAQUE.y, 10],
    [OUT.x + OUT.w, OUT.y, 11],
    [PAD_X, -6, 24],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 40 },
);
const PL = { ...P, origin: [0, 0] };

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
  const label = { x: -96, y: 47, w: 84, d: 8, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.4], [label.x + label.w - 4, label.y + 2.4], 1, P), k.lineOnTop([label.x + 4, label.y + 4.4], [label.x + label.w - 20, label.y + 4.4], 1, P), k.lineOnTop([label.x + 4, label.y + 6.4], [label.x + label.w - 10, label.y + 6.4], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2, label.y + 5.8], 1.05, P), "the inspector's bench", { size: 2.2, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4, 1], [label.x + label.w - 2.4, label.y + 4, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function railSvg() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y, w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 6, 3, P, 3, 0.3), { tone: "mid" }));
  }
  const ties = [];
  for (let x = RAIL_X[0] + 6; x <= RAIL_X[1] - 6; x += 12) ties.push([x, RAIL_Y[0] + 0.2], [x, RAIL_Y[1] + 1.8]);
  out.push(L(k.onTop(ties, RAIL_TOP + 0.02, P), { tone: "faint" }));
  for (const x of [-140, -80, -10, 50, 74]) {
    out.push(S(k.slabOf({ x: x - 2, y: RAIL_Y[0] - 1, w: 4, d: 10, r: 0.8 }, 0, 6, P, 3, 0.3), { tone: "lo" }));
  }
  out.push(S(k.slabOf(PAD, 8, 1, P, 3, 0.2), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 1.5), 9, P, 3), { tone: "faint" }));
  return out.join("");
}

function feederSvg() {
  const out = [];
  out.push(S(k.slabOf(FEEDER, 0, 14, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: FEEDER.x + 1.5, y: FEEDER.y + 1.5, w: FEEDER.w - 3, d: FEEDER.d - 3, r: 1.5 }, 14, 2, P, 4, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(FEEDER, 4), 16, P, 4), { tone: "faint" }));
  for (const [x, y] of k.corners(FEEDER, 5)) {
    out.push(L(k.ring(x, y, 1.4, 16, P, 12), { tone: "lo" }));
    out.push(D([at([x, y, 16])], { size: 0.4 }));
  }
  out.push(k.faceTextSvg(k.topMatrix([FEEDER.x + FEEDER.w / 2, FEEDER.y + FEEDER.d / 2], 16.05, P), "signatures", { size: 1.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needlePath = (dev) => {
  const angle = -2 + dev * 1.4;
  return L(k.lineOnTop([GX - Math.sin(angle) * 1.2, 18 + Math.cos(angle) * 1.2], [GX + Math.sin(angle) * 6.8, 18 - Math.cos(angle) * 6.8], 53.2, P), { tone: "lit", free: "start" });
};

function gaugeSvg() {
  const out = [];
  out.push(S(k.cylinder(GX, 15, 3, 0, 44, P, 18, 0.3), { tone: "mid" }));
  out.push(L([14, 30].map((z) => k.sideArc(GX, 15, 3.05, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: GX - 6, y: -10, w: 12, d: 27, r: 1.5 }, 40, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(GX, 18, 9.5, 44, 9, P, 44, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(GX, 18, 8.4, 53, P, 40), { tone: "lo" }));
  out.push(L(k.ring(GX, 18, 7.4, 53, P, 36), { tone: "lo" }));
  const ticks = k.radialTicks(GX, 18, 6.2, 26, 6, 53, [0.9, 2], P, -2, 2.4);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(`<g data-part="needle">${needlePath(0)}</g>`);
  return out.join("");
}

function plungerSvg(bottom) {
  return S(k.cylinder(GX, -6, 2.2, 38, 2, P, 14), { tone: "mid" }) +
    S(k.cylinder(GX, -6, 1.4, bottom, 38 - bottom, P, 12), { tone: "hi", lit: true, crease: "none" }) +
    D([at([GX, -6, bottom])], { size: 0.45, tone: "hi" });
}

function stampSvg(x) {
  const out = [];
  out.push(S(k.cylinder(x, 15, 3, 0, 34, P, 18, 0.3), { tone: "mid" }));
  out.push(L([14, 26].map((z) => k.sideArc(x, 15, 3.05, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: x - 7, y: -10, w: 14, d: 27, r: 1.5 }, ARM_Z[0], 4, P, 3, 0.4), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, 8], ARM_Z[1] + 0.05, P), "reject", { size: 1.5, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const headPaths = (x, drop) => {
  const bottom = HEAD_REST - drop;
  return S(k.cylinder(x, -6, 1.2, bottom + 4, 34 - bottom - 4, P, 12), { tone: "mid", crease: "none" }) +
    S(k.slabOf({ x: x - 5, y: -9, w: 10, d: 6, r: 1 }, bottom, 4, P, 3, 0.4), { tone: "hi", crease: "none", lit: true });
};

const kickPaths = (angle) => {
  const tip = [KICK[0] + Math.sin(angle) * 12, KICK[1] - Math.cos(angle) * 12];
  return L(`M${at([KICK[0], KICK[1], 13.5]).join(" ")}L${at([tip[0], tip[1], 13.5]).join(" ")}`, { tone: "hi", lit: true }) +
    S(k.cylinder(tip[0], tip[1], 1.8, 12, 3, P, 14), { tone: "hi", lit: true, crease: "none" });
};

function gateBackSvg() {
  const out = [];
  out.push(S(k.cylinder(GATE_X, -22, 3, 0, 26, P, 18, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GATE_X - 2, y: -22, w: 4, d: 15, r: 1 }, 21, 5, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function gateFrontSvg() {
  const out = [];
  out.push(S(k.cylinder(GATE_X, 14, 3, 0, 26, P, 18, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GATE_X - 2, y: -5, w: 4, d: 19, r: 1 }, 21, 5, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: GATE_X - 2, y: -5, w: 4, d: 19, r: 1 }, 1), 26, P, 3), { tone: "faint" }));
  out.push(S(k.cylinder(KICK[0], KICK[1], 2.4, 0, 15, P, 16, 0.3), { tone: "mid" }));
  out.push(L(k.ring(KICK[0], KICK[1], 2.8, 13.5, P, 14), { tone: "lo" }));
  out.push(`<g data-part="kicker">${kickPaths(0)}</g>`);
  return out.join("");
}

function traySvg() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, 1.5, P, 4, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x - 2, y: TRAY.y - 2, w: 2, d: TRAY.d + 4, r: 0.8 }, 0, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x + TRAY.w, y: TRAY.y - 2, w: 2, d: TRAY.d + 4, r: 0.8 }, 0, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x - 2, y: TRAY.y + TRAY.d, w: TRAY.w + 4, d: 2, r: 0.8 }, 0, 8, P, 3, 0.4), { tone: "mid" }));
  for (const dx of DIVIDERS) {
    out.push(S(k.slabOf({ x: dx - 1, y: TRAY.y, w: 2, d: TRAY.d - 2, r: 0.8 }, 0, 8, P, 3, 0.4), { tone: "mid" }));
  }
  for (const [cx, text] of SECTION_LABELS) {
    const plate = { x: cx - 9, y: 37.7, w: 18, d: 2.6, r: 0.8 };
    out.push(S(k.slabOf(plate, 8, 0.7, P, 3, 0.2), { tone: "lo", crease: "none" }));
    out.push(k.faceTextSvg(k.topMatrix([cx, 39.3], 8.75, P), text, { size: 1.35, tone: "mid", anchor: "middle" }));
  }
  return out.join("");
}

const exitPaths = (text) => k.faceTextSvg(k.topMatrix([PLAQUE.x + PLAQUE.w / 2, PLAQUE.y + PLAQUE.d / 2 + 0.8], 9.25, P), text, { size: 1.7, tone: "mid", anchor: "middle" });

function outSvg() {
  const out = [];
  out.push(S(k.slabOf(OUT, 6, 2, P, 4, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: OUT.x, y: OUT.y + OUT.d - 2, w: OUT.w, d: 2, r: 0.8 }, 8, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: OUT.x + OUT.w - 2, y: OUT.y, w: 2, d: OUT.d, r: 0.8 }, 8, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(PLAQUE, 8, 1.2, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(PLAQUE, 1.2), 9.2, P, 4), { tone: "faint" }));
  out.push(`<g data-part="exitface">${exitPaths("exit —")}</g>`);
  out.push(D([[PLAQUE.x + 1.8, PLAQUE.y + 1.8, 9.2], [PLAQUE.x + PLAQUE.w - 1.8, PLAQUE.y + PLAQUE.d - 1.8, 9.2]].map(at), { size: 0.4 }));
  return out.join("");
}

function blockSvg(index) {
  const b = BLOCKS[index];
  const out = [];
  out.push(S(k.slabOf({ x: -11, y: -6, w: 22, d: 12, r: 1 }, 0, b.h, PL, 4, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -11, y: -6, w: 22, d: 12, r: 1 }, 2), b.h, PL, 4), { tone: "faint" }));
  const pins = index === 1 ? [-6, -2, 6] : [-6, 0, 6];
  pins.forEach((px, pi) => {
    const dup = index === 1 && pi < 2;
    out.push(S(k.slabOf({ x: px - 1.2, y: -3, w: 2.4, d: 3, r: 0.5 }, b.h, 1, PL, 2, 0.2), { tone: dup ? "lit" : "lo", crease: "none" }));
  });
  if (index === 2) {
    out.push(S(k.slabOf({ x: 4.5, y: -4.6, w: 4.6, d: 1.4, r: 0.5 }, b.h + 1, 0.7, PL, 2, 0.2), { tone: "lit", crease: "none" }));
  }
  if (index === 3) {
    out.push(D([-4, 4].map((dx) => k.iso([dx, -1.5, b.h + 0.6], PL)), { size: 0.7, tone: "lit" }));
  }
  if (index === 1 || index === 2) {
    out.push(`<g data-part="ink${index}" opacity="0">` +
      S(k.slabOf({ x: -7, y: 1.5, w: 14, d: 3.4, r: 0.6 }, b.h, 0.4, PL, 2, 0.1), { tone: "lit", crease: "none" }) +
      L([k.lineOnTop([-5, 2.4], [5, 2.4], b.h + 0.45, PL), k.lineOnTop([-5, 4], [2, 4], b.h + 0.45, PL)].join(""), { tone: "lo", free: true }) +
      `</g>`);
  }
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -96, y: 47, w: 84, d: 8, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("rail", [0, -6, 6], railSvg(), rec([
  A.slab({ x: RAIL_X[0], y: RAIL_Y[0], w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 6, 3, { name: "rail.back", owner: "rail" }),
  A.slab({ x: RAIL_X[0], y: RAIL_Y[1], w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 6, 3, { name: "rail.front", owner: "rail" }),
  A.slab(PAD, 8, 1, { name: "rail.pad", owner: "rail" }),
  ...[-140, -80, -10, 50, 74].map((x, i) => A.slab({ x: x - 2, y: RAIL_Y[0] - 1, w: 4, d: 10, r: 0.8 }, 0, 6, { name: `rail.leg${i}`, owner: "rail" })),
]));
put("feeder", [FEEDER.x + FEEDER.w / 2, FEEDER.y + FEEDER.d / 2, 8], feederSvg(), rec([
  A.slab(FEEDER, 0, 14, { name: "feeder.box" }),
  A.slab({ x: FEEDER.x + 1.5, y: FEEDER.y + 1.5, w: FEEDER.w - 3, d: FEEDER.d - 3, r: 1.5 }, 14, 2, { name: "feeder.lid" }),
]));
put("gauge", [GX, 18, 30], gaugeSvg(), rec([
  A.cylinder(GX, 15, 3, 0, 44, { name: "gauge.post", owner: "gauge" }),
  A.slab({ x: GX - 6, y: -10, w: 12, d: 27, r: 1.5 }, 40, 4, { name: "gauge.arm", owner: "gauge" }),
  A.cylinder(GX, 18, 9.5, 44, 9, { name: "gauge.puck" }),
]));
put("plunger", [GX, -6, 32], `<g data-part="plunger">${plungerSvg(26)}</g>`, rec([
  A.cylinder(GX, -6, 1.4, 26, 12, { name: "gauge.rod", owner: "gauge" }),
  A.cylinder(GX, -6, 2.2, 38, 2, { name: "gauge.collor", owner: "gauge" }),
]));
SX.forEach((x, i) => {
  put(`stamp${i}`, [x, 18, 20], stampSvg(x), rec([
    A.cylinder(x, 15, 3, 0, 34, { name: `stamp${i}.post`, owner: "stamp" }),
    A.slab({ x: x - 7, y: -10, w: 14, d: 27, r: 1.5 }, ARM_Z[0], 4, { name: `stamp${i}.arm`, owner: "stamp" }),
  ]));
  put(`stamp${i}head`, [x, -6, 28], `<g data-part="head${i}">${headPaths(x, 0)}</g>`, rec([
    A.cylinder(x, -6, 1.2, HEAD_REST + 4, 34 - HEAD_REST - 4, { name: `stamp${i}.rod`, owner: "stamp" }),
    A.slab({ x: x - 5, y: -9, w: 10, d: 6, r: 1 }, HEAD_REST, 4, { name: `stamp${i}.head` }),
  ]));
});
put("gate.back", [GATE_X, -20, 14], gateBackSvg(), rec([
  A.cylinder(GATE_X, -22, 3, 0, 26, { name: "gate.backpost", owner: "gateback" }),
  A.slab({ x: GATE_X - 2, y: -22, w: 4, d: 15, r: 1 }, 21, 5, { name: "gate.headerback", owner: "gateback" }),
]));
put("gate.front", [GATE_X, 12, 14], gateFrontSvg(), rec([
  A.cylinder(GATE_X, 14, 3, 0, 26, { name: "gate.frontpost", owner: "gatefront" }),
  A.slab({ x: GATE_X - 2, y: -5, w: 4, d: 19, r: 1 }, 21, 5, { name: "gate.headerfront", owner: "gatefront" }),
  A.cylinder(KICK[0], KICK[1], 2.4, 0, 15, { name: "kicker.post", owner: "kicker" }),
  A.box([KICK[0] - 1, KICK[1] - 13, 12], [KICK[0] + 1.8, KICK[1] + 1, 15], { name: "kicker.arm", owner: "kicker" }),
  A.cylinder(KICK[0], KICK[1] - 12, 1.8, 12, 3, { name: "kicker.pad", owner: "kicker" }),
]));
put("reject.tray", [40, 30, 4], traySvg(), rec([
  A.slab(TRAY, 0, 1.5, { name: "tray.floor", owner: "tray" }),
  A.slab({ x: TRAY.x - 2, y: TRAY.y - 2, w: 2, d: TRAY.d + 4, r: 0.8 }, 0, 8, { name: "tray.left", owner: "tray" }),
  A.slab({ x: TRAY.x + TRAY.w, y: TRAY.y - 2, w: 2, d: TRAY.d + 4, r: 0.8 }, 0, 8, { name: "tray.right", owner: "tray" }),
  A.slab({ x: TRAY.x - 2, y: TRAY.y + TRAY.d, w: TRAY.w + 4, d: 2, r: 0.8 }, 0, 8, { name: "tray.front", owner: "tray" }),
  ...DIVIDERS.map((dx, i) => A.slab({ x: dx - 1, y: TRAY.y, w: 2, d: TRAY.d - 2, r: 0.8 }, 0, 8, { name: `tray.div${i}`, owner: "tray" })),
  ...SECTION_LABELS.map(([cx], i) => A.slab({ x: cx - 9, y: 37.7, w: 18, d: 2.6, r: 0.8 }, 8, 0.7, { name: `tray.label${i}`, owner: "tray" })),
]));
put("out.tray", [104, -6, 7], outSvg(), rec([
  A.slab(OUT, 6, 2, { name: "out.platform", owner: "out" }),
  A.slab({ x: OUT.x, y: OUT.y + OUT.d - 2, w: OUT.w, d: 2, r: 0.8 }, 8, 3, { name: "out.lip", owner: "out" }),
  A.slab({ x: OUT.x + OUT.w - 2, y: OUT.y, w: 2, d: OUT.d, r: 0.8 }, 8, 3, { name: "out.stop", owner: "out" }),
  A.slab(PLAQUE, 8, 1.2, { name: "out.plaque", owner: "out" }),
]));
BLOCKS.forEach((b, i) => {
  const seat = PARK_Z[i];
  const off = k.iso([PAD_X, -6, seat], P);
  const tr = "translate(" + off[0].toFixed(2) + "," + off[1].toFixed(2) + ")";
  put(`block${i}`, [PAD_X, -6, seat], `<g data-part="block${i}" transform="${tr}" opacity="${i === 0 ? 1 : 0}">${blockSvg(i)}</g>`, rec([
    A.slab({ x: PAD_X - 11, y: -12, w: 22, d: 12, r: 1 }, seat, b.h, { name: `block${i}.body`, owner: "block" }),
    ...(i === 1 ? [-6, -2, 6] : [-6, 0, 6]).map((px, pi) => A.slab({ x: PAD_X + px - 1.2, y: -9, w: 2.4, d: 3, r: 0.5 }, seat + b.h, 1, { name: `block${i}.pin${pi}`, owner: "block" })),
  ]));
});

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, {});

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An inspection bench for command signatures. Each block rolls from the feeder under a dial gauge that reads its option pins; a duplicate pair or a reserved -h pin is over-stamped CAF020 or CAF019 and dumped into its reject section, a clean block rolls under the height gate into the out tray marked exit 0, and a block that compiles clean but carries an out-of-range value is kicked into the runtime section at exit 1.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const GX = ${GX}, PAD_X = ${PAD_X}, HEAD_REST = ${HEAD_REST};
const SX = ${JSON.stringify(SX)}, GATE_X = ${GATE_X}, KICK = ${JSON.stringify(KICK)};
const OUT_X = ${OUT.x + 18}, RAIL_END = 78, TRAY_Z = 8, BIN_Z = 1.5;
const BLOCKS = ${JSON.stringify(BLOCKS)};
const PARK_Z = ${JSON.stringify(PARK_Z)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const blockEls = BLOCKS.map((_, i) => svg.querySelector('[data-part="block' + i + '"]'));
const needleEl = svg.querySelector('[data-part="needle"]');
const plungerEl = svg.querySelector('[data-part="plunger"]');
const headEls = SX.map((_, i) => svg.querySelector('[data-part="head' + i + '"]'));
const kickerEl = svg.querySelector('[data-part="kicker"]');
const exitEl = svg.querySelector('[data-part="exitface"]');
const needlePath = (dev) => {
  const angle = -2 + dev * 1.4;
  return lineOnTop([GX - Math.sin(angle) * 1.2, 18 + Math.cos(angle) * 1.2], [GX + Math.sin(angle) * 6.8, 18 - Math.cos(angle) * 6.8], 53.2, P);
};
const plungerPaths = (bottom) => {
  return solidSvg(cylinder(GX, -6, 2.2, 38, 2, P, 14), { tone: "mid" }) +
    solidSvg(cylinder(GX, -6, 1.4, bottom, 38 - bottom, P, 12), { tone: "hi", lit: true, crease: "none" }) +
    dotsSvg([iso([GX, -6, bottom], P)], { size: 0.45, tone: "hi" });
};
const headPaths = (i, drop) => {
  const x = SX[i];
  const bottom = HEAD_REST - drop;
  return solidSvg(cylinder(x, -6, 1.2, bottom + 4, 34 - bottom - 4, P, 12), { tone: "mid", crease: "none" }) +
    solidSvg(slabOf({ x: x - 5, y: -9, w: 10, d: 6, r: 1 }, bottom, 4, P, 3, 0.4), { tone: "hi", crease: "none", lit: true });
};
const kickPaths = (angle) => {
  const tip = [KICK[0] + Math.sin(angle) * 12, KICK[1] - Math.cos(angle) * 12];
  return lineSvg("M" + iso([KICK[0], KICK[1], 13.5], P).join(" ") + "L" + iso([tip[0], tip[1], 13.5], P).join(" "), { tone: "hi", lit: true }) +
    solidSvg(cylinder(tip[0], tip[1], 1.8, 12, 3, P, 14), { tone: "hi", lit: true, crease: "none" });
};
const exitPaths = (text) => faceTextSvg(topMatrix([113, -10], 9.25, P, "x"), text, { size: 1.7, tone: "mid", anchor: "middle" });
const placeBlock = (i, x, y, z) => {
  const p = iso([x, y, z], P);
  blockEls[i].setAttribute("transform", "translate(" + p[0].toFixed(2) + "," + p[1].toFixed(2) + ")");
};
const dropPath = (t, x, entryY) => {
  if (t < 0.55) { const u = t / 0.55; return [x, -6 + u * (entryY + 6), 9]; }
  const u = (t - 0.55) / 0.45;
  return [x, entryY + u * 0, 9 - u * (9 - BIN_Z)];
};
const STAMP_MSG = ["CAF020 · option name or alias '--msg' is duplicated", "CAF019 · option name or alias '--help' is reserved for help"];
let step = 0, stepAt = 0, clock = 0, frame = 0, last = 0, visible = false, touring = true;
let bx = [PAD_X, PAD_X, PAD_X, PAD_X], by = [-6, -6, -6, -6], bz = PARK_Z.slice();
let bop = [1, 0, 0, 0], dev = 0, plunger = 26, drops = [0, 0], kick = 0;
let ink = [0, 0], plaque = "exit —", done = false;
const T = (dur, kind, data) => ({ dur, kind, data: data ?? {} });
const SEQ = [];
SEQ.push(T(1.0, "enter", { b: 0, to: GX, msg: "Add(int a, int b) · measuring" }));
SEQ.push(T(1.0, "measure", { b: 0, msg: "Add(int a, int b) · no diagnostics" }));
SEQ.push(T(1.6, "roll", { b: 0, to: 96, land: true, msg: "Add(int a, int b) · passed the gate" }));
SEQ.push(T(0.6, "plaque", { text: "exit 0", msg: "passed · exit 0" }));
SEQ.push(T(0.4, "settle", { msg: "Echo(--msg, --msg) · next" }));
SEQ.push(T(1.0, "enter", { b: 1, to: GX, msg: "Echo(--msg, --msg) · measuring" }));
SEQ.push(T(1.0, "measure", { b: 1, msg: "Echo(--msg, --msg) · over tolerance" }));
SEQ.push(T(0.5, "roll", { b: 1, to: SX[0], msg: STAMP_MSG[0] }));
SEQ.push(T(0.8, "stamp", { i: 0, b: 1, drop: 3.5, msg: STAMP_MSG[0] }));
SEQ.push(T(0.35, "roll", { b: 1, to: 8 }));
SEQ.push(T(0.85, "drop", { b: 1, x: 8, msg: "compile error · the build fails" }));
SEQ.push(T(0.4, "settle", { msg: "Backup(--help) · next" }));
SEQ.push(T(1.0, "enter", { b: 2, to: GX, msg: "Backup(--help) · measuring" }));
SEQ.push(T(1.0, "measure", { b: 2, msg: "Backup(--help) · reserved name found" }));
SEQ.push(T(0.85, "roll", { b: 2, to: SX[1], msg: STAMP_MSG[1] }));
SEQ.push(T(0.8, "stamp", { i: 1, b: 2, drop: 7.5, msg: STAMP_MSG[1] }));
SEQ.push(T(0.35, "roll", { b: 2, to: 44 }));
SEQ.push(T(0.85, "drop", { b: 2, x: 44, msg: "compile error · the build fails" }));
SEQ.push(T(0.4, "settle", { msg: "Move([Range(1,10)] int count) · next" }));
SEQ.push(T(1.0, "enter", { b: 3, to: GX, msg: "Move([Range(1,10)] int count) · measuring" }));
SEQ.push(T(1.0, "measure", { b: 3, msg: "Move([Range(1,10)] int count) · compiles clean" }));
SEQ.push(T(1.1, "roll", { b: 3, to: 71, msg: "rolling · the height gate checks the value" }));
SEQ.push(T(0.5, "gate", { msg: "runtime validation · count must be between 1 and 10" }));
SEQ.push(T(0.9, "kick", { b: 3, msg: "ValidationException · exit 1" }));
SEQ.push(T(0.6, "plaque", { text: "exit 1", msg: "ValidationException · exit 1" }));
SEQ.push(T(0.4, "settle", { msg: "4 signatures · 1 passed · 3 rejected" }));
SEQ.push(T(2.6, "hold", { msg: "4 signatures · 1 passed · 3 rejected" }));
const RESETS = { dev: 0, plunger: 26, drops: [0, 0], kick: 0, ink: [0, 0], plaque: "exit —", bop: [1, 0, 0, 0] };
function resetBench() {
  bx = [PAD_X, PAD_X, PAD_X, PAD_X];
  by = [-6, -6, -6, -6];
  bz = PARK_Z.slice();
  bop = [1, 0, 0, 0];
  dev = 0; plunger = 26; drops = [0, 0]; kick = 0; ink = [0, 0];
  plaque = "exit —";
  done = false;
}
function draw(t) {
  const s = SEQ[step];
  const b = s.data.b ?? -1;
  if (s.kind === "enter") {
    const u = still.matches ? 1 : ease(t);
    bx[b] = PAD_X + (s.data.to - PAD_X) * u;
    bz[b] = 9 + (PARK_Z[b] - 9) * (1 - u);
    bop[b] = 1;
    plunger = 26 - 0 * u;
  }
  if (s.kind === "measure") {
    const u = still.matches ? 1 : ease(t);
    const top = 9 + BLOCKS[b].h;
    dev = BLOCKS[b].dev * u;
    plunger = 26 - (26 - (top + 0.3)) * u;
  }
  if (s.kind === "roll") {
    const u = still.matches ? 1 : ease(t);
    const from = bx[b];
    bx[b] = from + (s.data.to - from) * u;
    if (s.data.land && bx[b] > RAIL_END) bz[b] = 9 - (9 - TRAY_Z) * clamp((bx[b] - RAIL_END) / 4, 0, 1);
    dev = dev * (1 - u);
    plunger = plunger + (26 - plunger) * u;
  }
  if (s.kind === "stamp") {
    const u = still.matches ? 1 : ease(clamp(t * 1.6, 0, 1));
    drops[s.data.i] = s.data.drop * u;
    ink[s.data.i] = t > 0.55 ? 1 : 0;
    plunger = 26;
    dev = dev * (1 - u * 0.5);
  }
  if (s.kind === "drop" || s.kind === "kick") {
    const u = still.matches ? 1 : ease(t);
    if (s.kind === "drop") {
      const p = dropPath(u, s.data.x, 15);
      bx[b] = p[0]; by[b] = p[1]; bz[b] = p[2];
    } else {
      kick = u;
      if (u < 0.45) { const w = u / 0.45; bx[b] = 71; by[b] = -6 + w * 0; }
      else {
        const w = (u - 0.45) / 0.55;
        bx[b] = 71 + w * 2;
        by[b] = -6 + w * 30;
        bz[b] = 9 - w * (9 - BIN_Z);
      }
    }
    dev = 0; plunger = 26;
  }
  if (s.kind === "gate") {
    kick = still.matches ? 1 : ease(t) * 0.25;
    plunger = 26; dev = 0;
  }
  if (s.kind === "plaque") plaque = s.data.text;
  if (s.kind === "settle" || s.kind === "hold") { dev = 0; plunger = 26; kick = kick * (1 - (still.matches ? 1 : t)); }
  blockEls.forEach((el, i) => {
    placeBlock(i, bx[i], by[i], bz[i]);
    const want = bop[i] > 0 ? "1" : "0";
    if (el.getAttribute("opacity") !== want) el.setAttribute("opacity", want);
    const inkEl = el.querySelector('[data-part="ink' + i + '"]');
    if (inkEl) {
      const want = ink[i] ? "1" : "0";
      if (inkEl.getAttribute("opacity") !== want) inkEl.setAttribute("opacity", want);
    }
  });
  needleEl.setAttribute("d", needlePath(dev));
  plungerEl.innerHTML = plungerPaths(plunger);
  headEls.forEach((el, i) => {
    const drop = drops[i];
    const o = iso([0, 0, 0], P);
    const d = iso([0, 0, -drop], P);
    el.setAttribute("transform", "translate(" + (d[0] - o[0]).toFixed(2) + "," + (d[1] - o[1]).toFixed(2) + ")");
  });
  kickerEl.innerHTML = kickPaths(kick * Math.PI);
  if (!exitEl.dataset.text || exitEl.dataset.text !== plaque) {
    exitEl.dataset.text = plaque;
    exitEl.innerHTML = exitPaths(plaque);
  }
  const text = s.data.msg ?? "";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const s = SEQ[step];
  if (clock - stepAt >= s.dur) {
    stepAt = clock;
    step++;
    if (step >= SEQ.length) {
      step = 0;
      stepAt = clock;
      resetBench();
      for (const el of blockEls) { }
    }
    const b = SEQ[step].data.b;
    if (b !== undefined && SEQ[step].kind === "enter") bop[b] = 1;
  }
  draw(clamp((clock - stepAt) / SEQ[step].dur, 0, 1));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", (event) => { event.preventDefault(); touring = false; if (clock - stepAt < SEQ[step].dur * 0.9) { stepAt = clock - SEQ[step].dur; } });
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    touring = false;
    if (clock - stepAt < SEQ[step].dur * 0.9) stepAt = clock - SEQ[step].dur;
  }
});
draw(0);
`;

const body = k.plateHtml({
  fig: "Fig 9",
  title: "The inspector's bench",
  hint: "Click or press Space to skip ahead · the tour inspects on its own",
  readout: "Add(int a, int b) · on the bench",
  keys: [
    { mark: "lit", label: "Needle, plunger, stamp heads and kicker: what a verdict moves" },
    { mark: "raised", label: "Signature blocks: option pins on top" },
    { mark: "flat", label: "Reject tray: CAF020 · CAF019 · runtime exit 1" },
  ],
  caption:
    "Diagnostics are the API. At compile time the generator checks every signature: duplicate option names or aliases report CAF020, an option named -h or --help reports CAF019, and the build fails. At run time DataAnnotations attributes validate parsed values before the command runs — a failure logs the error and exits 1. A clean block rolls under the height gate to exit 0.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Inspector's bench: press Space to skip to the next inspection step">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "inspector-bench-light.html" : "inspector-bench.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the inspector's bench", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "inspector-bench-light.html" : "inspector-bench.html");
