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

const PLATE = { x: -112, y: -54, w: 224, d: 108, r: 8 };
const PLATE_Z = -14;

const WHEEL = [-70, -16];
const AXLE_Z = 37;
const WHEEL_R = 20;
const POST = [-70, -24];
const NUT_Y = -2;

const MAST = [-92, -30];
const JIB = { x: -97, y: -30, w: 32, d: 20, r: 2 };
const BRAKE_XY = [-70, -16];
const BLADE = { x: -76, y: -19.5, w: 12, d: 7, r: 1 };
const BLADE_REST_TOP = 67;
const BLADE_DROP = 4;

const DESK = { x: -105, y: 20, w: 160, d: 26, r: 3 };
const LEVER = [-88, 32];
const LAMP_X = [-62, -40, -18];
const LAMP_Y = 29;
const PLAQUE = { x: 26, y: 24, w: 24, d: 11, r: 1.5 };

const FUSE = [78, 0];
const FUSE_TOP = 45;

const BELL = [100, -26];
const BELL_POST = [90, -26];
const BELL_MOUTH_Z = 14;
const BELL_PROFILE = [[0, 6.2], [0.4, 6.05], [1.0, 5.4, 1], [2.2, 3.9, 1], [4.0, 1.9, 1], [5.4, 1.15, 1], [6.0, 1.05]];

const WHEEL_F = G.frameAlong([WHEEL[0], WHEEL[1], AXLE_Z], [0, 1, 0]);
const AXLE_F = G.frameAlong([WHEEL[0], WHEEL[1], AXLE_Z], [0, 1, 0]);
const BELL_F = G.frameAlong([BELL[0], BELL[1], BELL_MOUTH_Z], [0, 0, 1]);

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z - 7, 0),
    [MAST[0], MAST[1], 79],
    [-65, -30, 78],
    [-65, -10, 78],
    [WHEEL[0], WHEEL[1] - 12, AXLE_Z + WHEEL_R + 2],
    [WHEEL[0], NUT_Y, AXLE_Z + 4],
    [BELL[0] + 7, BELL[1], 27],
    [FUSE[0] + 10, FUSE[1], FUSE_TOP],
    [DESK.x + DESK.w, DESK.y + DESK.d, 15],
    [LEVER[0] + 15, LEVER[1], 26],
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

const turnPaths = (phase) => {
  const F = { o: [WHEEL[0], WHEEL[1], AXLE_Z], a: [0, 1, 0], u: [Math.cos(phase), 0, Math.sin(phase)], v: [0, 1, 0] };
  return L(G.spokesOf(WHEEL_F, 2.6, 5.6, 18.8, 5, P, { phase }), { tone: "lo" }) +
    L(k.segment(G.pointOf(F, 2.7, 5.6, 0), G.pointOf(F, 2.7, 18.8, 0), P), { tone: "lit" });
};

function plateSvg() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, PLATE_Z - 6, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, PLATE_Z - 7, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, PLATE_Z - 5.4, 5.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, PLATE_Z, 14, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 10), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: -100, y: 47, w: 78, d: 8, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.4], [label.x + label.w - 4, label.y + 2.4], 1, P), k.lineOnTop([label.x + 4, label.y + 4.4], [label.x + label.w - 18, label.y + 4.4], 1, P), k.lineOnTop([label.x + 4, label.y + 6.4], [label.x + label.w - 10, label.y + 6.4], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2, label.y + 5.8], 1.05, P), "the signal house", { size: 2.2, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4, 1], [label.x + label.w - 2.4, label.y + 4, 1]].map(at), { size: 0.4 }));
  const ruler = { x: -12, y: 48, w: 116, d: 5, r: 1 };
  out.push(S(k.slabOf(ruler, 0, 0.6, P, 3, 0.2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 2, ruler.x + ruler.w - 2, 5, 25, ruler.y + 0.6, 0.65, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(D([[ruler.x + 2, ruler.y + 2.5, 0.65], [ruler.x + ruler.w - 2, ruler.y + 2.5, 0.65]].map(at), { size: 0.4 }));
  return out.join("");
}

function postSvg() {
  const out = [];
  const cap = { x: POST[0] - 5.5, y: POST[1] - 5.5, w: 11, d: 11, r: 2 };
  out.push(S(k.cylinder(POST[0], POST[1], 4.5, 0, 35, P, 24, 0.4), { tone: "mid" }));
  out.push(L([12, 24].map((z) => k.sideArc(POST[0], POST[1], 4.55, z, P, 20)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(cap, 35, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(cap, 1.6), 39, P, 4), { tone: "faint" }));
  out.push(D([[cap.x + 2, cap.y + 2, 39], [cap.x + cap.w - 2, cap.y + cap.d - 2, 39]].map(at), { size: 0.4 }));
  return out.join("");
}

function wheelSvg(phase) {
  const out = [];
  out.push(S(G.disc(-10.5, 13.8, 2, AXLE_F, P), { tone: "mid", crease: "none" }));
  out.push(S(G.disc(12, 13.6, 3.4, AXLE_F, P), { tone: "mid" }));
  out.push(S(G.disc(-2.2, 2.2, WHEEL_R, WHEEL_F, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(-3.2, 3.2, 5.5, WHEEL_F, P), { tone: "mid" }));
  out.push(L(G.circleOf(WHEEL_F, 2.4, 5.6, P), { tone: "lo" }));
  out.push(L(G.circleOf(WHEEL_F, 2.4, 12.5, P), { tone: "faint" }));
  out.push(L(G.circleOf(WHEEL_F, 2.4, 18.8, P), { tone: "lo" }));
  out.push(L(G.arcOf(WHEEL_F, 2.4, WHEEL_R - 0.4, P), { tone: "faint" }));
  out.push(D(G.dotsOf(WHEEL_F, 2.5, 15.5, 10, P), { size: 0.4 }));
  out.push(`<g data-part="wheelturn">${turnPaths(phase)}</g>`);
  return out.join("");
}

const bladePaths = (drop) => {
  const top = BLADE_REST_TOP - drop;
  return S(k.cylinder(BRAKE_XY[0], BRAKE_XY[1], 1.2, top, 7 + drop, P, 12), { tone: "mid", crease: "none" }) +
    S(k.slabOf(BLADE, top - 6, 6, P, 3, 0.4), { tone: "hi", crease: "none", lit: true }) +
    D([at([BRAKE_XY[0], BRAKE_XY[1], top + 7 + drop])], { size: 0.45 });
};

function mastSvg() {
  const out = [];
  out.push(S(k.cylinder(MAST[0], MAST[1], 4.5, 0, 78, P, 24, 0.5), { tone: "mid" }));
  out.push(L([26, 52, 72].map((z) => k.sideArc(MAST[0], MAST[1], 4.55, z, P, 20)).join(""), { tone: "faint" }));
  return out.join("");
}

function gateSvg() {
  const out = [];
  out.push(S(k.slabOf(JIB, 74, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(JIB, 3), 78, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([JIB.x + JIB.w / 2, JIB.y + 20], 78.05, P, "y"), "force exit", { size: 1.6, tone: "lo", anchor: "middle" }));
  out.push(S(k.slabOf({ x: -73, y: -19, w: 6, d: 6, r: 1 }, 72, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(`<g data-part="brakeblade">${bladePaths(0)}</g>`);
  return out.join("");
}

function deskSvg() {
  const out = [];
  out.push(S(k.slabOf(DESK, 0, 14, P, 8, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 4), 14, P, 8), { tone: "faint" }));
  out.push(L([k.lineOnTop([DESK.x, 25], [DESK.x + DESK.w, 25], 14.02, P), k.lineOnTop([DESK.x, 41], [DESK.x + DESK.w, 41], 14.02, P)].join(""), { tone: "faint" }));
  for (const [x, y] of k.corners(DESK, 7)) {
    out.push(L(k.ring(x, y, 1.6, 14, P, 14), { tone: "lo" }));
    out.push(D([at([x, y, 14])], { size: 0.45 }));
  }
  return out.join("");
}

const leverPaths = (angle) => {
  const tip = [LEVER[0] + Math.cos(angle) * 15, LEVER[1] + Math.sin(angle) * 15];
  return L(k.lineOnTop([LEVER[0] + Math.cos(angle) * 1.7, LEVER[1] + Math.sin(angle) * 1.7], [tip[0], tip[1]], 23.2, P), { tone: "hi", lit: true }) +
    S(k.cylinder(tip[0], tip[1], 2.3, 21.4, 3.6, P, 16), { tone: "hi", lit: true, crease: "none" }) +
    D([at([tip[0], tip[1], 25.2])], { size: 0.5 });
};

function leverSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 14, 4, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 1.7, 18, 5, P, 14), { tone: "mid" }));
  out.push(L(k.ring(LEVER[0], LEVER[1], 2.6, 23, P, 20), { tone: "lo" }));
  out.push(D([at([LEVER[0], LEVER[1], 23])], { size: 0.5 }));
  const arc = [];
  for (let i = 0; i <= 16; i++) {
    const a = -0.5 + (1.4 * i) / 16;
    arc.push([LEVER[0] + Math.cos(a) * 15, LEVER[1] + Math.sin(a) * 15]);
  }
  out.push(L(k.onTop(arc, 14.05, P), { tone: "lo" }));
  out.push(D([at([arc[0][0], arc[0][1], 14.05]), at([arc[16][0], arc[16][1], 14.05])], { size: 0.45 }));
  out.push(`<g data-part="leverarm">${leverPaths(-0.5)}</g>`);
  return out.join("");
}

const capPaths = (x) => S(k.cylinder(x, LAMP_Y, 3.2, 22.5, 3, P, 20), { tone: "lit", crease: "none" });

function lampSvg(index) {
  const x = LAMP_X[index];
  const out = [];
  out.push(S(k.cylinder(x, LAMP_Y, 5.2, 14, 2, P, 26, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, LAMP_Y, 4.2, 16, 6.5, P, 26), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, LAMP_Y, 4.4, 22.5, P, 24), { tone: "lo" }));
  out.push(`<g data-part="lampfill${index}" opacity="0">${capPaths(x)}</g>`);
  const plate = { x: x - 8, y: LAMP_Y + 6, w: 16, d: 6, r: 1 };
  out.push(S(k.slabOf(plate, 14, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([x, LAMP_Y + 9.4], 14.85, P), ["SIGINT", "SIGTERM", "SIGQUIT"][index], { size: 1.5, tone: "mid", anchor: "middle" }));
  out.push(D([[plate.x + 1.6, plate.y + 3, 14.8], [plate.x + plate.w - 1.6, plate.y + 3, 14.8]].map(at), { size: 0.35 }));
  return out.join("");
}

function plaqueSvg() {
  const out = [];
  out.push(S(k.slabOf(PLAQUE, 14, 1.2, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(PLAQUE, 1.6), 15.2, P, 4), { tone: "faint" }));
  out.push(`<g data-part="exitface">${k.faceTextSvg(k.topMatrix([PLAQUE.x + PLAQUE.w / 2, PLAQUE.y + PLAQUE.d / 2 + 1.4], 15.25, P), "exit —", { size: 2.2, tone: "mid", anchor: "middle" })}</g>`);
  out.push(D([[PLAQUE.x + 2, PLAQUE.y + 2, 15.2], [PLAQUE.x + PLAQUE.w - 2, PLAQUE.y + PLAQUE.d - 2, 15.2]].map(at), { size: 0.4 }));
  return out.join("");
}

const fuseNeedlePath = (burn) => {
  const angle = -2 + burn * 2.4;
  return L(k.lineOnTop([FUSE[0] - Math.sin(angle) * 1.2, FUSE[1] + Math.cos(angle) * 1.2], [FUSE[0] + Math.sin(angle) * 6.8, FUSE[1] - Math.cos(angle) * 6.8], FUSE_TOP + 0.2, P), { tone: "lit", free: "start" });
};

function fuseSvg() {
  const out = [];
  out.push(S(k.cylinder(FUSE[0], FUSE[1], 2.6, 0, 36, P, 16, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(FUSE[0], FUSE[1], 9.5, 36, 9, P, 44, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(FUSE[0], FUSE[1], 8.6, FUSE_TOP, P, 40), { tone: "lo" }));
  out.push(L(k.ring(FUSE[0], FUSE[1], 7.6, FUSE_TOP, P, 36), { tone: "lo" }));
  const ticks = k.radialTicks(FUSE[0], FUSE[1], 6.4, 26, 6, FUSE_TOP, [0.9, 2], P, -2, 2.4);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(`<g data-part="fuseneedle">${fuseNeedlePath(0)}</g>`);
  const plate = { x: 66, y: 10, w: 21, d: 6, r: 1 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([plate.x + plate.w / 2, plate.y + 4.4], 0.85, P), "timeout · 5 s", { size: 1.6, tone: "mid", anchor: "middle" }));
  out.push(D([[plate.x + 1.6, plate.y + 3, 0.8], [plate.x + plate.w - 1.6, plate.y + 3, 0.8]].map(at), { size: 0.35 }));
  return out.join("");
}

const clapPaths = (swing) => {
  const ball = [BELL[0] + Math.sin(swing) * 3.6, BELL[1], 11.8];
  return L(`M${at([BELL[0], BELL[1], 14.4]).join(" ")}L${at(ball).join(" ")}`, { tone: "lo", free: "start" }) +
    D([at(ball)], { size: 1.1, tone: "hi" });
};

function bellSvg() {
  const out = [];
  out.push(S(k.cylinder(BELL_POST[0], BELL_POST[1], 2.2, 0, 26, P, 16, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 87.8, y: -28.4, w: 12.4, d: 4.8, r: 1 }, 23, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(BELL[0], BELL[1], 1, 18, 5, P, 12), { tone: "mid", crease: "none" }));
  out.push(L(k.ring(BELL[0], BELL[1], 1.2, 21, P, 12), { tone: "lo" }));
  out.push(S(G.solidOf(BELL_PROFILE, BELL_F, P), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(BELL_F, 0, 6.2, P), { tone: "lo" }));
  out.push(`<g data-part="clapper">${clapPaths(0)}</g>`);
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 20).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -100, y: 47, w: 78, d: 8, r: 1.5 }, 0, 1, { name: "stand.label" }),
  A.slab({ x: -12, y: 48, w: 116, d: 5, r: 1 }, 0, 0.6, { name: "stand.ruler" }),
]));
put("wheel.post", [POST[0], POST[1], 20], postSvg(), rec([
  A.cylinder(POST[0], POST[1], 4.5, 0, 35, { name: "wheel.post", owner: "wheel" }),
  A.slab({ x: POST[0] - 5.5, y: POST[1] - 5.5, w: 11, d: 11, r: 2 }, 35, 4, { name: "wheel.cap", owner: "wheel" }),
]));
put("wheel", [WHEEL[0], WHEEL[1], AXLE_Z], wheelSvg(0.26), rec([
  A.disc(AXLE_F, -10.5, 12, 2, { name: "wheel.axle", owner: "wheel" }),
  A.disc(AXLE_F, 12, 13.6, 3.4, { name: "wheel.nut", owner: "wheel" }),
  A.disc(WHEEL_F, -2.2, 2.2, WHEEL_R, { name: "wheel.rim", owner: "wheel" }),
  A.disc(WHEEL_F, -3.2, 3.2, 5.5, { name: "wheel.hub", owner: "wheel" }),
]));
put("brake.mast", [MAST[0], MAST[1], 60], mastSvg(), rec([
  A.cylinder(MAST[0], MAST[1], 4.5, 0, 78, { name: "brake.mast", owner: "brake" }),
]));
put("brake.gate", [-70, -20, 76], gateSvg(), rec([
  A.slab(JIB, 74, 4, { name: "brake.jib", owner: "brake" }),
  A.slab({ x: -73, y: -19, w: 6, d: 6, r: 1 }, 72, 2, { name: "brake.collar", owner: "brake" }),
  A.cylinder(BRAKE_XY[0], BRAKE_XY[1], 1.2, BLADE_REST_TOP, 7, { name: "brake.rod", owner: "brake" }),
  A.slab(BLADE, BLADE_REST_TOP - 6, 6, { name: "brake.blade", owner: "brake" }),
]));
put("desk", [DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, 7], deskSvg(), rec([
  A.slab(DESK, 0, 14, { name: "desk.body" }),
]));
put("lever", [LEVER[0], LEVER[1], 20], leverSvg(), rec([
  A.slab({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 14, 4, { name: "lever.base" }),
  A.cylinder(LEVER[0], LEVER[1], 1.7, 18, 5, { name: "lever.post" }),
  A.box([LEVER[0] - 1, LEVER[1] - 8, 22.6], [LEVER[0] + Math.cos(-0.5) * 15 + 2, LEVER[1] + 2, 23.8], { name: "lever.rod", owner: "lever" }),
  A.cylinder(LEVER[0] + Math.cos(-0.5) * 15, LEVER[1] + Math.sin(-0.5) * 15, 2.3, 21.4, 3.6, { name: "lever.knob", owner: "lever" }),
]));
LAMP_X.forEach((x, index) => {
  put(`lamp${index}`, [x, LAMP_Y, 19], lampSvg(index), rec([
    A.cylinder(x, LAMP_Y, 5.2, 14, 2, { name: `lamp${index}.base` }),
    A.cylinder(x, LAMP_Y, 4.2, 16, 6.5, { name: `lamp${index}.glass` }),
    A.cylinder(x, LAMP_Y, 3.2, 22.5, 3, { name: `lamp${index}.cap` }),
    A.slab({ x: x - 8, y: LAMP_Y + 6, w: 16, d: 6, r: 1 }, 14, 0.8, { name: `lamp${index}.plate` }),
  ]));
});
put("plaque", [PLAQUE.x + PLAQUE.w / 2, PLAQUE.y + PLAQUE.d / 2, 15], plaqueSvg(), rec([
  A.slab(PLAQUE, 14, 1.2, { name: "exit.plaque" }),
]));
put("fuse", [FUSE[0], FUSE[1], 26], fuseSvg(), rec([
  A.cylinder(FUSE[0], FUSE[1], 2.6, 0, 36, { name: "fuse.stem" }),
  A.cylinder(FUSE[0], FUSE[1], 9.5, 36, 9, { name: "fuse.puck" }),
  A.slab({ x: 66, y: 10, w: 21, d: 6, r: 1 }, 0, 0.8, { name: "fuse.plate" }),
]));
function junctionSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: 60, y: -24, w: 20, d: 12, r: 2 }, 0, 4.5, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: 60, y: -24, w: 20, d: 12, r: 2 }, 2), 4.5, P, 4), { tone: "faint" }));
  out.push(D([66, 72, 78].map((x) => at([x, -18, 4.5])), { size: 0.5, tone: "hi" }));
  out.push(S(k.slabOf({ x: 80, y: -27, w: 7.8, d: 3, r: 1 }, 0, 1.2, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: 52, y: -12, w: 3, d: 32, r: 1 }, 0, 1.2, P, 3, 0.2), { tone: "lo", crease: "none" }));
  return out.join("");
}

put("junction", [70, -18, 3], junctionSvg(), rec([
  A.slab({ x: 60, y: -24, w: 20, d: 12, r: 2 }, 0, 4.5, { name: "wire.box" }),
  A.slab({ x: 80, y: -27, w: 7.8, d: 3, r: 1 }, 0, 1.2, { name: "wire.bell" }),
  A.slab({ x: 52, y: -12, w: 3, d: 32, r: 1 }, 0, 1.2, { name: "wire.desk" }),
]));
put("bell", [BELL_POST[0], BELL[1], 16], bellSvg(), rec([
  A.cylinder(BELL_POST[0], BELL_POST[1], 2.2, 0, 26, { name: "bell.post", owner: "bell" }),
  A.slab({ x: 87.8, y: -28.4, w: 12.4, d: 4.8, r: 1 }, 23, 3, { name: "bell.arm", owner: "bell" }),
  A.cylinder(BELL[0], BELL[1], 1, 18, 5, { name: "bell.hanger", owner: "bell" }),
  A.solid(BELL_F, BELL_PROFILE, { name: "bell.body", owner: "bell" }),
]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, {});

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A signal house: three lamps wired to one handler (SIGINT, SIGTERM and SIGQUIT), a lever that sends the signal, a flywheel engine that is the running command, a fuse dial sweeping the 5 second timeout allowance and a guillotine brake that drops only when the run ignores cancellation. The exit plaque reads 130 either way.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const WHEEL_F = ${JSON.stringify(WHEEL_F)};
const WHEEL = ${JSON.stringify(WHEEL)}, AXLE_Z = ${AXLE_Z};
const LEVER = ${JSON.stringify(LEVER)};
const LAMP_X = ${JSON.stringify(LAMP_X)}, LAMP_Y = ${LAMP_Y};
const FUSE = ${JSON.stringify(FUSE)}, FUSE_TOP = ${FUSE_TOP};
const BELL = ${JSON.stringify(BELL)};
const BRAKE = ${JSON.stringify(BRAKE_XY)}, BLADE = ${JSON.stringify(BLADE)}, BLADE_REST_TOP = ${BLADE_REST_TOP};
const PLAQUE_C = [${PLAQUE.x + PLAQUE.w / 2}, ${PLAQUE.y + PLAQUE.d / 2 + 1.4}];
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const turnEl = svg.querySelector('[data-part="wheelturn"]');
const leverEl = svg.querySelector('[data-part="leverarm"]');
const lampEls = LAMP_X.map((_, i) => svg.querySelector('[data-part="lampfill' + i + '"]'));
const exitEl = svg.querySelector('[data-part="exitface"]');
const fuseEl = svg.querySelector('[data-part="fuseneedle"]');
const clapEl = svg.querySelector('[data-part="clapper"]');
const bladeEl = svg.querySelector('[data-part="brakeblade"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const FUSE_MAX = 5, SPIN = 2.3, STOP_TAU = 0.5;
const LAMP_NAMES = ["SIGINT", "SIGTERM", "SIGQUIT"];
const turnPaths = (phase) => {
  const F = { o: WHEEL_F.o, a: WHEEL_F.a, u: [Math.cos(phase), 0, Math.sin(phase)], v: [0, 1, 0] };
  return lineSvg(spokesOf(WHEEL_F, 2.6, 5.6, 18.8, 5, P, { phase }), { tone: "lo" }) +
    lineSvg(segment(pointOf(F, 2.7, 5.6, 0), pointOf(F, 2.7, 18.8, 0), P), { tone: "lit" });
};
const leverPaths = (angle) => {
  const tip = [LEVER[0] + Math.cos(angle) * 15, LEVER[1] + Math.sin(angle) * 15];
  return lineSvg(lineOnTop([LEVER[0] + Math.cos(angle) * 1.7, LEVER[1] + Math.sin(angle) * 1.7], [tip[0], tip[1]], 23.2, P), { tone: "hi", lit: true }) +
    solidSvg(cylinder(tip[0], tip[1], 2.3, 21.4, 3.6, P, 16), { tone: "hi", lit: true, crease: "none" }) +
    dotsSvg([iso([tip[0], tip[1], 25.2], P)], { size: 0.5 });
};
const capPaths = (x) => solidSvg(cylinder(x, LAMP_Y, 3.2, 22.5, 3, P, 20), { tone: "lit", crease: "none" });
const exitPaths = (text) => faceTextSvg(topMatrix([PLAQUE_C[0], PLAQUE_C[1]], 15.25, P, "x"), text, { size: 2.2, tone: "mid", anchor: "middle" });
const fuseNeedlePath = (burn) => {
  const angle = -2 + burn * 2.4;
  return lineOnTop([FUSE[0] - Math.sin(angle) * 1.2, FUSE[1] + Math.cos(angle) * 1.2], [FUSE[0] + Math.sin(angle) * 6.8, FUSE[1] - Math.cos(angle) * 6.8], FUSE_TOP + 0.2, P);
};
const clapPaths = (swing) => {
  const ball = [BELL[0] + Math.sin(swing) * 3.6, BELL[1], 11.8];
  return lineSvg("M" + iso([BELL[0], BELL[1], 14.4], P).join(" ") + "L" + iso(ball, P).join(" "), { tone: "lo", free: "start" }) +
    dotsSvg([iso(ball, P)], { size: 1.1, tone: "hi" });
};
const bladePaths = (drop) => {
  const top = BLADE_REST_TOP - drop;
  return solidSvg(cylinder(BRAKE[0], BRAKE[1], 1.2, top, 7 + drop, P, 12), { tone: "mid", crease: "none" }) +
    solidSvg(slabOf(BLADE, top - 6, 6, P, 3, 0.4), { tone: "hi", crease: "none", lit: true }) +
    dotsSvg([iso([BRAKE[0], BRAKE[1], top + 7 + drop], P)], { size: 0.45 });
};
let mode = "run", stubborn = false, lamp = -1;
let omega = SPIN, phase = 0.26, fuse = FUSE_MAX, pull = 0, drop = 0;
let signalAt = -9, swingAt = -9, stopAt = 0, doneAt = -9;
let touring = true, idleAt = 0, tourCount = 0;
let frame = 0, last = 0, clock = 0, visible = false;
const swing = () => {
  const t = clock - swingAt;
  return t < 0 ? 0 : 0.18 * Math.exp(-t / 0.8) * Math.sin(t * 16);
};
function readoutText() {
  if (mode === "run") return "running · press to send SIGINT";
  if (mode === "signal") return stubborn
    ? LAMP_NAMES[lamp] + " received · the run ignores cancellation · " + fuse.toFixed(1) + " s left"
    : LAMP_NAMES[lamp] + " received · cancellation requested · " + fuse.toFixed(1) + " s left";
  if (mode === "stopped") return "cancelled in " + stopAt.toFixed(1) + " s of the 5.0 s allowance · exit 130";
  return "timeout at 5.0 s · the run was cut off · exit 130";
}
function draw() {
  turnEl.innerHTML = turnPaths(phase);
  leverEl.innerHTML = leverPaths(-0.5 + pull * 1.4);
  lampEls.forEach((el, i) => {
    const on = i === lamp && mode !== "run";
    const flash = mode === "forced" && !still.matches ? Math.sin(clock * 9) > 0 : true;
    const want = on && flash ? 1 : 0;
    if (el.getAttribute("opacity") !== String(want)) el.setAttribute("opacity", String(want));
  });
  const exitText = mode === "stopped" || mode === "forced" ? "exit 130" : "exit —";
  if (!exitEl.dataset.text || exitEl.dataset.text !== exitText) {
    exitEl.dataset.text = exitText;
    exitEl.innerHTML = exitPaths(exitText);
  }
  fuseEl.setAttribute("d", fuseNeedlePath(1 - fuse / FUSE_MAX));
  clapEl.innerHTML = clapPaths(still.matches ? 0 : swing());
  bladeEl.innerHTML = bladePaths(drop);
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function sendSignal(stub, lampIndex) {
  mode = "signal";
  stubborn = stub;
  lamp = lampIndex;
  fuse = FUSE_MAX;
  signalAt = clock;
  swingAt = clock;
  if (still.matches && !stub) { omega = 0; stopAt = 1.8; mode = "stopped"; doneAt = clock; }
}
function resetRun() {
  mode = "run";
  stubborn = false;
  lamp = -1;
  fuse = FUSE_MAX;
  idleAt = clock;
  tourCount++;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  pull += ((mode === "run" ? 0 : 1) - pull) * (1 - Math.exp(-dt / 0.12));
  if (mode === "run") omega += (SPIN - omega) * (1 - Math.exp(-dt / 0.5));
  if (mode === "signal" && !stubborn) omega *= Math.exp(-dt / STOP_TAU);
  if (mode === "stopped" || mode === "forced") omega *= Math.exp(-dt / 0.15);
  phase = (phase + omega * dt) % TAU;
  if (mode === "signal") fuse = Math.max(0, fuse - dt);
  if (mode === "run") fuse = Math.min(FUSE_MAX, fuse + dt * 4);
  if (mode === "signal" && !stubborn && omega < 0.06) {
    mode = "stopped";
    doneAt = clock;
    stopAt = clock - signalAt;
  }
  if (mode === "signal" && fuse <= 0) { mode = "forced"; doneAt = clock; }
  if (mode === "forced") drop = Math.min(4, drop + dt * 40);
  else drop = Math.max(0, drop - dt * 8);
  if (touring) {
    if (mode === "run" && clock - idleAt > 4.2) sendSignal(tourCount % 3 === 2, tourCount % 3);
    if ((mode === "stopped" || mode === "forced") && clock - doneAt > 2.4) resetRun();
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  touring = false;
  if (mode === "run") sendSignal(false, 0);
  else if (mode === "stopped" || mode === "forced") resetRun();
});
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    touring = false;
    if (mode === "run") sendSignal(false, 0);
    else if (mode === "stopped" || mode === "forced") resetRun();
  }
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 8",
  title: "The signal house",
  hint: "Click or press Space to send SIGINT · again to restart",
  readout: "running · press to send SIGINT",
  keys: [
    { mark: "lit", label: "Wheel, lever, lamps and fuse needle: what the signal moves" },
    { mark: "raised", label: "Three signals wired to one handler" },
    { mark: "flat", label: "Guillotine: the 5 s timeout force-exit" },
  ],
  caption:
    "PosixSignalRegistration hooks SIGINT, SIGTERM and SIGQUIT to one handler: it cancels the run's CancellationToken and arms a CancelAfter(ConsoleApp.Timeout) fuse — 5 s by default. A run that observes the token stops early and exits 130 (128 + SIGINT); a run that ignores cancellation is cut off by WaitAsync when the fuse burns out — also 130.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Signal house: press Space to send SIGINT, press again to restart the run">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "signal-house-light.html" : "signal-house.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the signal house", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "signal-house-light.html" : "signal-house.html");
