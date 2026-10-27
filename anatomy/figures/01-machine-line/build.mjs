import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 400;

const PLATE = { x: -256, y: -84, w: 516, d: 164, r: 10 };
const PLATE_Z = -16;

const BELT = { x: -160, y: 22.4, w: 332, d: 17.2, r: 1 };
const BELT_TOP = 10;
const DRUM_X = [BELT.x - 3.4, BELT.x + BELT.w + 3.4];

const POSTS = [-220, -198];
const BOARD = { x: -224, y: -30, w: 30, d: 3.5, r: 1 };
const CROSSBAR = { x: -223, y: -36, w: 28, d: 6, r: 1 };
const BOARD_Z0 = 14;
const BOARD_Z1 = 46;

const PRESS = { x: -128, y: -46, w: 54, d: 32, r: 3 };
const PRESS_COL = [-121, -30];
const ARM = { x: -128, y: -40, w: 54, d: 16, r: 2 };
const ARM_Z = 52;
const ARM_TOP = 62;
const RAM = { x: -114, y: -36, w: 26, d: 18, r: 2 };
const RAM_UP = 42;
const RAM_DROP = 28;
const DIE = { x: -114, y: -22, w: 26, d: 10, r: 1.5 };

const RAIL = { x: -44, y: -12, w: 78, d: 5, r: 1 };
const BLADE = { x: 26, y: -10.2, w: 16, d: 1.4, r: 0.4 };
const DIVERGE = [[34, -10], [34, -14.5], [68, -38.5], [68, -34]];
const LEVER = [12, 2];

const ENGINE = [142, -22];
const WHEEL_Z = 25;
const WHEEL_R = 16;

const BELL = [210, -18];
const BELL_Z = 26;
const DOME_Y = BELL[1] - 11;
const DOME_PROFILE = [[0, 5.8], [0.7, 5.7], [2.2, 4.1, 1], [4.1, 2, 1], [5.4, 1.5, 1]];
const DOME_H = 5.4;
const DOME_TOP = BELL_Z + DOME_H;
const domeFrame = (tilt) => G.frameAlong([BELL[0] - Math.sin(tilt) * DOME_H, DOME_Y, DOME_TOP - Math.cos(tilt) * DOME_H], [Math.sin(tilt), 0, Math.cos(tilt)]);

const TROLLEY = { x: -7, y: 25, w: 14, d: 14, r: 2 };
const TROLLEY_Z = 14;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    ...k.boxCorners(ARM, ARM_Z, ARM_TOP),
    [POSTS[0] - 2, BOARD.y, BOARD_Z1 + 3],
    [BELL[0] + 9, BELL[1] - 6, BELL_Z + 15],
    [DRUM_X[0] - 3, BELT.y, 0],
    [DRUM_X[1] + 3, BELT.y + BELT.d, BELT_TOP],
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
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, PLATE_Z - 7, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, PLATE_Z - 5.4, 5.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, PLATE_Z, 16, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 10), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: -68, y: PLATE.y + PLATE.d - 16, w: 64, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 22, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 12, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 32, label.y + 6.2], 1.05, P), "ConsoleAppFramework", { size: 2.4, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function standSvg() {
  const out = [];
  for (const x of POSTS) {
    out.push(S(k.cylinder(x, -32, 2.4, 0, 26, P, 20), { tone: "mid" }));
    out.push(L(k.sideArc(x, -32, 2.4, 14, P, 14), { tone: "faint" }));
  }
  out.push(S(k.slabOf(CROSSBAR, 26, 3, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function boardSvg() {
  const out = [];
  out.push(S(k.slabOf(BOARD, BOARD_Z0, BOARD_Z1 - BOARD_Z0, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.sideSeam(BOARD, BOARD_Z0 + 22, P, 4), { tone: "faint" }));
  const face = BOARD.y + BOARD.d + 0.1;
  const rows = [[4, 14], [4, 6], [8, 10], [4, 16], [10, 4], [4, 11]];
  rows.forEach(([a, b], index) => {
    const z = BOARD_Z1 - 6.5 - index * 4.4;
    out.push(L(k.segment([BOARD.x + a, face, z], [BOARD.x + a + b, face, z], P), { tone: "lo", free: true }));
  });
  out.push(k.faceTextSvg(k.sideMatrix([BOARD.x + 15, face], BOARD_Z1 - 1.6, P, "left"), "args =>", { size: 3, tone: "hi", anchor: "middle" }));
  out.push(S(k.slabOf({ x: BOARD.x + 9, y: BOARD.y - 1.3, w: 12, d: 1.5, r: 0.6 }, BOARD_Z1, 2.4, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BOARD.x - 2, y: BOARD.y + 0.6, w: 2, d: 2.2, r: 0.5 }, BOARD_Z0 + 10, 3, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function pressBaseSvg() {
  const out = [];
  out.push(S(k.slabOf(PRESS, 0, 8, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PRESS, 3.5), 8, P, 6), { tone: "faint" }));
  out.push(S(k.slabOf(DIE, 8, 4, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(DIE, 1.5), 12, P, 3), { tone: "faint" }));
  const screws = k.corners(PRESS, 6);
  out.push(D(screws.map(([x, y]) => at([x, y, 8])), { size: 0.45 }));
  return out.join("");
}

function columnSvg() {
  const out = [];
  out.push(S(k.cylinder(PRESS_COL[0], PRESS_COL[1], 4.2, 8, ARM_Z - 8, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(PRESS_COL[0], PRESS_COL[1], 5.4, ARM_Z - 2.5, 2.5, P, 28), { tone: "mid" }));
  out.push(L([20, 34].map((z) => k.sideArc(PRESS_COL[0], PRESS_COL[1], 4.2, z, P, 16)).join(""), { tone: "faint" }));
  return out.join("");
}

function armSvg() {
  return S(k.slabOf(ARM, ARM_Z, ARM_TOP - ARM_Z, P, 5, 0.8), { tone: "mid" }) + L(k.sideSeam(ARM, ARM_Z + 5, P, 5), { tone: "faint" });
}

const ramSvg = (drop) => {
  const z = RAM_UP - drop;
  return S(k.cylinder(-101, -27, 2.2, z + 6, ARM_Z - z - 6, P, 16), { tone: "mid", crease: "none" }) +
    S(k.slabOf(RAM, z, 6, P, 4, 0.6), { tone: "hi", crease: "lo", lit: drop > 2 });
};

function railSvg() {
  const out = [];
  out.push(S(k.slabOf(RAIL, 0, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(G.prismOf(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), DIVERGE, 0, 4, P), { tone: "mid" }));
  out.push(D([[40, -13, 4], [52, -21.5, 4], [64, -32.5, 4]].map(at), { size: 0.4 }));
  return out.join("");
}

function leverSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 6, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 2.6, 6, 12, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(LEVER[0], LEVER[1], 2.6, 6, 18, 18, P), { tone: "lo" }));
  out.push(L(k.ring(LEVER[0], LEVER[1], 2.6, 18, P, 20), { tone: "lo" }));
  out.push(D([at([LEVER[0], LEVER[1], 18])], { size: 0.5 }));
  return out.join("");
}

function bladeSvg() {
  return S(k.slabOf(BLADE, 4, 1.6, P, 2, 0), { tone: "hi", crease: "none", lit: true });
}

function bedSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: ENGINE[0] - 14, y: ENGINE[1] - 12, w: 28, d: 24, r: 3 }, 0, 9, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: ENGINE[0] - 14, y: ENGINE[1] - 12, w: 28, d: 24, r: 3 }, 3), 9, P, 5), { tone: "faint" }));
  return out.join("");
}

const WHEEL_F = G.frameAlong([ENGINE[0], ENGINE[1], WHEEL_Z], [0, 1, 0]);

function wheelSvg() {
  const out = [];
  out.push(S(G.disc(-3, 3, WHEEL_R, WHEEL_F, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(-4.5, 4.5, 4, WHEEL_F, P), { tone: "mid" }));
  out.push(L(G.circleOf(WHEEL_F, 3.2, 4, P), { tone: "faint" }));
  out.push(L(G.spokesOf(WHEEL_F, 3.2, 4, WHEEL_R - 0.7, 6, P, { phase: 0.26 }), { tone: "lo" }));
  out.push(D(G.dotsOf(WHEEL_F, 3.3, 12, 8, P), { size: 0.4 }));
  out.push(`<path data-part="mark" class="iso-line" data-tone="lit" d="${markPath(0.6)}" style="stroke-width:1.1"/>`);
  return out.join("");
}

const markPath = (angle) => {
  const F = { o: [ENGINE[0], ENGINE[1], WHEEL_Z], a: [0, 1, 0], u: [Math.cos(angle), 0, Math.sin(angle)], v: [0, 1, 0] };
  return k.segment(G.pointOf(F, 3.4, 4, 0), G.pointOf(F, 3.4, WHEEL_R - 2.5, 0), P);
};

function bellPostSvg() {
  const out = [];
  out.push(S(k.cylinder(BELL[0], BELL[1], 2.2, 0, BELL_Z + 12, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: BELL[0] - 4, y: BELL[1] - 16, w: 12, d: 24, r: 1 }, BELL_Z + 10, 3, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

const domeSvg = (tilt) => {
  const F = domeFrame(tilt);
  return S(G.solidOf(DOME_PROFILE, F, P), { tone: "hi", crease: "lo" });
};

function clapperSvg() {
  return S(k.cylinder(BELL[0] - 0.8, DOME_Y, 0.7, BELL_Z + 0.6, 36 - BELL_Z - 0.6, P, 12), { tone: "mid", crease: "none" }) + D([at([BELL[0] - 0.8, DOME_Y, BELL_Z + 0.4])], { size: 1, tone: "hi" });
}

const railSvgAt = (y) => S(k.slabOf({ x: BELT.x - 3, y, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, P, 2, 0.3), { tone: "mid" });

function beltLegsSvg() {
  const out = [];
  const legs = [[-150, 21.2], [-60, 21.2], [30, 21.2], [120, 21.2], [166, 21.2], [-150, 40.8], [-60, 40.8], [30, 40.8], [120, 40.8], [166, 40.8], [DRUM_X[0], 31], [DRUM_X[1], 31]];
  for (const [x, y] of byDepth(legs)) {
    out.push(S(k.slabOf({ x: x - 1.6, y: y - 1.4, w: 3.2, d: 2.8, r: 0.6 }, 0, 4, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

function beltSurfaceSvg() {
  const out = [];
  out.push(S(k.slabOf(BELT, 8, 2, P, 2, 0), { tone: "lo", crease: "none" }));
  const cleats = k.topTicks(BELT.x + 8, BELT.x + BELT.w - 8, 13, 3, BELT.y + 0.2, BELT_TOP + 0.05, [16.8, 16.8], P);
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
    out.push(S(k.slabOf({ x: x - 1.6, y: 28, w: 3.2, d: 6, r: 0.8 }, 4, 1.4, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

function trolleySvg() {
  const out = [];
  for (const x of [-4.5, 4.5]) {
    for (const y of [TROLLEY.y + 3.4, TROLLEY.y + TROLLEY.d - 3.4]) {
      const F = G.frameAlong([x, y, 12], [0, 1, 0]);
      out.push(S(G.disc(-1, 1, 2, F, P), { tone: "mid" }));
    }
  }
  out.push(S(k.slabOf(TROLLEY, TROLLEY_Z, 8, P, 4, 0.6), { tone: "hi", crease: "lo", lit: true }));
  out.push(L(k.sideSeam(TROLLEY, TROLLEY_Z + 4.5, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: TROLLEY.x + TROLLEY.w - 3, y: TROLLEY.y + TROLLEY.d - 1, w: 4, d: 3, r: 1 }, TROLLEY_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(TROLLEY.x + TROLLEY.w - 1, TROLLEY.y + TROLLEY.d + 1.8, 2.2, TROLLEY_Z, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(TROLLEY.x + TROLLEY.w - 1, TROLLEY.y + TROLLEY.d + 1.8, 2.2, TROLLEY_Z, TROLLEY_Z + 5, 16, P), { tone: "lo" }));
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 16, { name: "stand.plate" }),
  ...k.corners(PLATE, 24).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -68, y: PLATE.y + PLATE.d - 16, w: 64, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("stand.posts", [-209, -32, 14], standSvg(), rec([A.cylinder(POSTS[0], -32, 2.4, 0, 26, { name: "stand.post" }), A.cylinder(POSTS[1], -32, 2.4, 0, 26, { name: "stand.post" }), A.slab(CROSSBAR, 26, 3, { name: "stand.crossbar" })]));
put("stand.board", [BOARD.x + 15, BOARD.y, BOARD_Z0], boardSvg(), rec([A.slab(BOARD, BOARD_Z0, BOARD_Z1 - BOARD_Z0, { name: "stand.board" }), A.slab({ x: BOARD.x + 9, y: BOARD.y - 1.3, w: 12, d: 1.5, r: 0.6 }, BOARD_Z1, 2.4, { name: "stand.clip" })]));
put("press.base", [PRESS.x + 27, PRESS.y + 16, 4], pressBaseSvg(), rec([A.slab(PRESS, 0, 8, { name: "press.base" }), A.slab(DIE, 8, 4, { name: "press.die" })]));
put("press.column", [PRESS_COL[0], PRESS_COL[1], 30], columnSvg(), rec([A.cylinder(PRESS_COL[0], PRESS_COL[1], 4.2, 8, ARM_Z - 8, { name: "press.column", owner: "press" }), A.cylinder(PRESS_COL[0], PRESS_COL[1], 5.4, ARM_Z - 2.5, 2.5, { name: "press.collar", owner: "press" })]));
put("press.arm", [PRESS.x + 27, PRESS.y + 7, ARM_Z], armSvg(), rec([A.slab(ARM, ARM_Z, ARM_TOP - ARM_Z, { name: "press.arm" })]));
put("press.ram", [-101, -27, RAM_UP + 3], `<g data-part="ram">${ramSvg(0)}</g>`, rec([A.cylinder(-101, -27, 2.2, RAM_UP + 6, ARM_Z - RAM_UP - 6, { name: "press.shaft" }), A.slab(RAM, RAM_UP, 6, { name: "press.ram" })]));
put("switch.rail", [RAIL.x + 39, RAIL.y, 2], railSvg(), rec([A.slab(RAIL, 0, 4, { name: "switch.rail" }), A.prism(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), DIVERGE, 0, 4, { name: "switch.diverge" })]));
put("switch.lever", [LEVER[0], LEVER[1], 9], leverSvg(), rec([A.slab({ x: LEVER[0] - 4, y: LEVER[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 6, { name: "switch.leverstand" }), A.cylinder(LEVER[0], LEVER[1], 2.6, 6, 12, { name: "switch.lever" })]));
put("switch.blade", [BLADE.x + 8, BLADE.y, 5], `<g data-part="blade">${bladeSvg()}</g>`, rec([A.slab(BLADE, 4, 1.6, { name: "switch.blade" })]));
put("engine.bed", [ENGINE[0], ENGINE[1], 4], bedSvg(), rec([A.slab({ x: ENGINE[0] - 14, y: ENGINE[1] - 12, w: 28, d: 24, r: 3 }, 0, 9, { name: "engine.bed" })]));
put("engine.wheel", [ENGINE[0], ENGINE[1], WHEEL_Z], wheelSvg(), rec([A.disc(WHEEL_F, -3, 3, WHEEL_R, { name: "engine.wheel", owner: "engine" }), A.disc(WHEEL_F, -4.5, 4.5, 4, { name: "engine.hub", owner: "engine" })]));
put("bell.post", [BELL[0], BELL[1], 19], bellPostSvg(), rec([A.cylinder(BELL[0], BELL[1], 2.2, 0, BELL_Z + 12, { name: "bell.post", owner: "bell" }), A.slab({ x: BELL[0] - 4, y: BELL[1] - 16, w: 12, d: 24, r: 1 }, BELL_Z + 10, 3, { name: "bell.arm", owner: "bell" })]));
put("bell.clapper", [BELL[0] - 0.8, DOME_Y, BELL_Z + 2], `<g data-part="clapper">${clapperSvg()}</g>`, rec([A.cylinder(BELL[0] - 0.8, DOME_Y, 0.7, BELL_Z + 0.6, 36 - BELL_Z - 0.6, { name: "bell.clapper", owner: "bell" })]));
put("bell.dome", [BELL[0], DOME_Y, BELL_Z + 2.5], `<g data-part="dome">${domeSvg(0)}</g>`, rec([A.solid(domeFrame(0), DOME_PROFILE, { name: "bell.dome", owner: "bell" }), A.cylinder(BELL[0], DOME_Y, 1.2, DOME_TOP, 36 - DOME_TOP, { name: "bell.hanger", owner: "bell" })]));
put("belt.railback", [BELT.x + BELT.w / 2, BELT.y - 2, 7], railSvgAt(BELT.y - 2), rec([A.slab({ x: BELT.x - 3, y: BELT.y - 2, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, { name: "belt.railback" })]));
put("belt.railfront", [BELT.x + BELT.w / 2, BELT.y + BELT.d, 7], railSvgAt(BELT.y + BELT.d), rec([A.slab({ x: BELT.x - 3, y: BELT.y + BELT.d, w: BELT.w + 6, d: 2.4, r: 0.8 }, 4, 6, { name: "belt.railfront" })]));
put("belt.legs", [BELT.x + BELT.w / 2, BELT.y + BELT.d / 2, 2], beltLegsSvg(), rec(
  [[-150, 21.2], [-60, 21.2], [30, 21.2], [120, 21.2], [166, 21.2], [-150, 40.8], [-60, 40.8], [30, 40.8], [120, 40.8], [166, 40.8], [DRUM_X[0], 31], [DRUM_X[1], 31]].map(([x, y], i) => A.slab({ x: x - 1.6, y: y - 1.4, w: 3.2, d: 2.8, r: 0.6 }, 0, 4, { name: `belt.leg${i}` })),
));
put("belt.surface", [BELT.x + BELT.w / 2, BELT.y + BELT.d / 2, 9], beltSurfaceSvg(), rec([A.slab(BELT, 8, 2, { name: "belt.surface" })]));
put("belt.drums", [DRUM_X[1], BELT.y + BELT.d / 2, BELT_TOP - 2.4], drumsSvg(), rec([
  ...DRUM_X.flatMap((x, i) => [A.disc(G.frameAlong([x, BELT.y + BELT.d / 2, BELT_TOP - 2.4], [0, 1, 0]), -3, 3, 2.4, { name: `belt.drum${i}` }), A.slab({ x: x - 1.6, y: 28, w: 3.2, d: 6, r: 0.8 }, 4, 1.4, { name: `belt.bearing${i}` })]),
]));
put("trolley", [0, TROLLEY.y + TROLLEY.d / 2, TROLLEY_Z + 4], `<g data-part="trolley">${trolleySvg()}</g>`, rec([
  A.slab(TROLLEY, TROLLEY_Z, 8, { name: "trolley.body" }),
  ...[-4.5, 4.5].flatMap((x) => [TROLLEY.y + 3.4, TROLLEY.y + TROLLEY.d - 3.4].map((y) => A.disc(G.frameAlong([x, y, 12], [0, 1, 0]), -1, 1, 2, { name: "trolley.wheel" }))),
  A.cylinder(TROLLEY.x + TROLLEY.w - 1, TROLLEY.y + TROLLEY.d + 1.8, 2.2, TROLLEY_Z, 5, { name: "trolley.handle" }),
]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.board", "belt.surface", "stand.plate"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A production line for a command: a blueprint stand holds the source lambda, a stamping press emits the generated Run body, a track switch routes it, a flywheel engine runs the command and a bell reports the exit code. A trolley rides a conveyor past each station.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const STOPS = ${JSON.stringify([-150, -101, 10, 142, 185])};
const SEQ = [0, 1, 2, 3, 4, 3, 2, 1];
const NAMES = ["source", "compile: Run body emitted", "route: switch on args[0]", "invoke: command(args)", "exit: code on the bell"];
const RAM = ${JSON.stringify(RAM)}, RAM_UP = ${RAM_UP}, RAM_DROP = ${RAM_DROP}, ARM_Z = ${ARM_Z};
const TROLLEY = ${JSON.stringify(TROLLEY)}, TROLLEY_Z = ${TROLLEY_Z};
const BLADE = ${JSON.stringify(BLADE)};
const ENGINE = ${JSON.stringify(ENGINE)}, WHEEL_Z = ${WHEEL_Z}, WHEEL_R = ${WHEEL_R};
const BELL = ${JSON.stringify(BELL)}, BELL_Z = ${BELL_Z}, DOME_Y = ${DOME_Y}, DOME_TOP = ${DOME_TOP}, DOME_H = ${DOME_H}, DOME_PROFILE = ${JSON.stringify(DOME_PROFILE)};
const REACH = [STOPS[0] - 10, STOPS[4] + 6];
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const trolleyEl = svg.querySelector('[data-part="trolley"]');
const ramEl = svg.querySelector('[data-part="ram"]');
const bladeEl = svg.querySelector('[data-part="blade"]');
const markEl = svg.querySelector('[data-part="mark"]');
const domeEl = svg.querySelector('[data-part="dome"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const burst = (age, rise, fall) => (age <= 0 ? 0 : smooth(0, rise, age) * Math.exp(-(age - rise) / fall));
const ramPaths = (drop) => {
  const z = RAM_UP - drop;
  return solidSvg(cylinder(-101, -27, 2.2, z + 6, ARM_Z - z - 6, P, 16), { tone: "mid", crease: "none" }) +
    solidSvg(slabOf(RAM, z, 6, P, 4, 0.6), { tone: "hi", crease: "lo", lit: drop > 2 });
};
const markPath = (angle) => {
  const F = { o: [ENGINE[0], ENGINE[1], WHEEL_Z], a: [0, 1, 0], u: [Math.cos(angle), 0, Math.sin(angle)], v: [0, 1, 0] };
  return segment(pointOf(F, 3.4, 4, 0), pointOf(F, 3.4, WHEEL_R - 2.5, 0), P);
};
const domeFrame = (tilt) => frameAlong([BELL[0] - Math.sin(tilt) * DOME_H, DOME_Y, DOME_TOP - Math.cos(tilt) * DOME_H], [Math.sin(tilt), 0, Math.cos(tilt)]);
const domePaths = (tilt) => {
  const F = domeFrame(tilt);
  return solidSvg(solidOf(DOME_PROFILE, F, P), { tone: "hi", crease: "lo" });
};
let frame = 0;
let x = STOPS[0], target = x, wheelAngle = 0.6, wheelRate = 0;
let ramAt = -9, bellAt = -9, bladeShare = 0, bladeTarget = 0;
let fired = STOPS.map(() => -9), last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
let near = 0;
const tourAt = (t) => STOPS[SEQ[Math.floor(t / 2.4) % SEQ.length]];
function stationAction(index) {
  if (clock - fired[index] < 2.5) return;
  fired[index] = clock;
  if (index === 1) ramAt = clock;
  if (index === 2) bladeTarget = bladeTarget < 0 ? 2.3 : -2.3;
  if (index === 3) wheelRate = 13;
  if (index === 4) bellAt = clock;
}
function draw() {
  trolleyEl.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  const drop = still.matches ? 0 : burst(clock - ramAt, 0.12, 0.2) * RAM_DROP;
  ramEl.innerHTML = ramPaths(drop);
  bladeEl.setAttribute("transform", translateAlong(P, [0, bladeShare, 0]));
  markEl.setAttribute("d", markPath(wheelAngle));
  domeEl.innerHTML = still.matches || clock <= bellAt ? domePaths(0) : domePaths(0.14 * Math.exp(-(clock - bellAt) / 0.9) * Math.sin((clock - bellAt) * 18));
  let best = 0;
  STOPS.forEach((stop, index) => { if (Math.abs(x - stop) < Math.abs(x - STOPS[best])) best = index; });
  if (best !== near) {
    near = best;
    stage.setAttribute("aria-valuenow", String(best + 1));
    stage.setAttribute("aria-valuetext", NAMES[best]);
  }
  const text = (best + 1) + "/5 · " + NAMES[best];
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) { target = tourAt(clock); }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - x) < 0.02) x = target;
  STOPS.forEach((stop, index) => { if (index > 0 && Math.abs(x - stop) < 3.5) stationAction(index); });
  bladeShare += (bladeTarget - bladeShare) * (1 - Math.exp(-dt / 0.16));
  wheelAngle += wheelRate * dt;
  wheelRate *= Math.exp(-dt / 0.9);
  if (wheelRate < 0.02) wheelRate = 0;
  draw();
  const settled = !touring && x === target && wheelRate === 0 && Math.abs(bladeTarget - bladeShare) < 0.05;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, REACH[0], REACH[1]);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = STOPS.reduce((best, stop, index) => (Math.abs(stop - target) < Math.abs(STOPS[best] - target) ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(STOPS.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = STOPS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(STOPS[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "The whole machine line",
  hint: "Hover to run the line",
  readout: "1/5 · source",
  keys: [
    { mark: "lit", label: "The command trolley and the flywheel mark" },
    { mark: "raised", label: "Press ram: one stroke casts the Run body" },
    { mark: "flat", label: "Point blade: the emitted switch on args[0]" },
  ],
  caption:
    "ConsoleAppFramework is a function-like macro. Your lambda is the blueprint; at compile time the generator emits the whole Run body (parse loop, routing switch, help text) into your assembly. At run time the trolley only has to roll: switch on the name, parse the values, call the command, ring the bell with the exit code.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Machine line: arrow keys move the trolley between the five stations" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1" aria-valuetext="source · blueprint on the stand">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "machine-line-light.html" : "machine-line.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the machine line", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "machine-line-light.html" : "machine-line.html");
