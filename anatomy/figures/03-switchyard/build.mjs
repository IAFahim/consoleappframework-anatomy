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
const HEIGHT = 420;

const PLATE = { x: -204, y: -88, w: 374, d: 136, r: 8 };
const PLATE_Z = -14;

const MAIN_Y = 2;
const MAIN_X0 = -168;
const MAIN_X1 = 102;
const TOWER_X = [-60, -20, 20, 60];
const STALL_Y = [-12, -32, -52, -72];
const STALL_JOIN = 40;
const STALL_END = 112;

const WAGON = { w: 18, d: 11, h: 7 };
const QUEUE_X = [-158, -137, -116, -95, -74];
const COUPLER = [
  { w: 10, d: 10, h: 7, label: "Action" },
  { w: 14, d: 11, h: 9, label: "Action<int,int>" },
  { w: 16, d: 12, h: 10, label: "Action<DateTime>" },
  { w: 20, d: 13, h: 12, label: "Func<string,CT,Task>" },
];
const WAGONS = [
  { label: "foo", stall: 0, route: ["foo"], field: "command0 (Action)" },
  { label: "foo bar", stall: 1, route: ["foo", "bar"], field: "command1 (Action<int,int>)" },
  { label: "foo bar barbaz", stall: 2, route: ["foo", "bar", "barbaz"], field: "command2 (Action<DateTime>)" },
  { label: "foo baz", stall: 3, route: ["foo", "baz"], field: "command3 (Func<string,CT,Task>)" },
  { label: "bogus", stall: -1, route: [], field: "ShowHelp(-1)" },
];

const HELP_BOARD = { x: 108, y: -6, w: 30, d: 3.5, r: 1 };
const HELP_Z0 = 10;
const HELP_Z1 = 34;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    [HELP_BOARD.x - 2, HELP_BOARD.y, HELP_Z1 + 3],
    [STALL_END + 14, STALL_Y[3] - 4, 14],
    [MAIN_X1 + 12, MAIN_Y + 6, 4],
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
  const label = { x: -120, y: PLATE.y + PLATE.d - 16, w: 60, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 30, label.y + 6.2], 1.05, P), "the switch yard", { size: 2.4, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function railsSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: MAIN_X0, y: MAIN_Y - 2.5, w: MAIN_X1 - MAIN_X0, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
  const sleepers = k.topTicks(MAIN_X0 + 8, MAIN_X1 - 8, 12, 3, MAIN_Y - 1.6, 3.05, [4.6, 4.6], P);
  out.push(L(sleepers.minor, { tone: "faint" }));
  TOWER_X.forEach((tx, index) => {
    const y = STALL_Y[index];
    out.push(S(G.prismOf(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), [[tx, MAIN_Y - 2.5], [tx + STALL_JOIN, y - 2.5], [tx + STALL_JOIN, y + 2.5], [tx, MAIN_Y + 2.5]], 0, 3, P), { tone: "mid" }));
    out.push(S(k.slabOf({ x: tx + STALL_JOIN, y: y - 2.5, w: STALL_END - STALL_JOIN - tx, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
  });
  return out.join("");
}

function towerSvg(index) {
  const out = [];
  const tx = TOWER_X[index];
  out.push(S(k.slabOf({ x: tx - 5, y: MAIN_Y + 6, w: 10, d: 8, r: 1.5 }, 0, 5, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(tx, MAIN_Y + 10, 1.7, 5, 9, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(tx, MAIN_Y + 10, 2.6, 14, 3.8, P, 20), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(tx, MAIN_Y + 10, 2.6, 14, 17.8, 18, P), { tone: "lo" }));
  out.push(D([at([tx, MAIN_Y + 10, 17.8])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

function bladeSvg(index) {
  const tx = TOWER_X[index];
  return S(k.slabOf({ x: tx + 2, y: MAIN_Y - 1.2, w: 13, d: 1.4, r: 0.4 }, 3, 1.4, P, 2, 0), { tone: "hi", crease: "none", lit: true });
}

function couplerSvg(index) {
  const out = [];
  const c = COUPLER[index];
  const y = STALL_Y[index];
  const cx = STALL_END + 6;
  out.push(S(k.slabOf({ x: cx - c.w / 2, y: y - c.d / 2, w: c.w, d: c.d, r: 1.5 }, 0, c.h, P, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: cx - c.w / 2, y: y - c.d / 2, w: c.w, d: c.d, r: 1.5 }, 1.5), c.h, P, 4), { tone: "faint" }));
  const board = { x: 136, y: y - 6, w: 30, d: 3, r: 1 };
  out.push(S(k.slabOf(board, 0, 18, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.sideSeam(board, 12, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.sideMatrix([151, board.y + board.d + 0.1], 14.5, P, "left"), c.label, { size: 1.9, tone: "hi", anchor: "middle" }));
  out.push(L([k.segment([140, board.y + board.d + 0.1, 10.2], [162, board.y + board.d + 0.1, 10.2], P)], { tone: "lo", free: true }));
  out.push(D([[board.x + 2.5, board.y + 1.5, 18], [board.x + board.w - 2.5, board.y + 1.5, 18]].map(at), { size: 0.4 }));
  const screws = k.corners({ x: cx - c.w / 2, y: y - c.d / 2, w: c.w, d: c.d, r: 1.5 }, 2.2);
  out.push(D(screws.map(([x, yy]) => at([x, yy, c.h])), { size: 0.4 }));
  return out.join("");
}

function bufferSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: MAIN_X1, y: MAIN_Y - 6, w: 4, d: 16, r: 1 }, 0, 9, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: MAIN_X1, y: MAIN_Y - 3, w: 4, d: 6, r: 1 }, 9, 1.6, P, 2, 0.3), { tone: "hi", crease: "lo", lit: true }));
  out.push(D([[MAIN_X1 + 2, MAIN_Y - 3.5, 9], [MAIN_X1 + 2, MAIN_Y + 3.5, 9], [MAIN_X1 + 2, MAIN_Y - 3.5, 0.1], [MAIN_X1 + 2, MAIN_Y + 3.5, 0.1]].map(at), { size: 0.45 }));
  return out.join("");
}

function helpBoardSvg() {
  const out = [];
  for (const x of [HELP_BOARD.x + 3, HELP_BOARD.x + HELP_BOARD.w - 3]) {
    out.push(S(k.cylinder(x, HELP_BOARD.y + 1.5, 1.8, 0, HELP_Z1 - 4, P, 16), { tone: "mid" }));
  }
  out.push(S(k.slabOf(HELP_BOARD, HELP_Z0, HELP_Z1 - HELP_Z0, P, 4, 0.5), { tone: "hi", crease: "lo" }));
  const face = HELP_BOARD.y + HELP_BOARD.d + 0.1;
  const rows = [[2, 20], [4, 12], [2, 16], [4, 8], [2, 14]];
  rows.forEach(([a, b], index) => {
    const z = HELP_Z1 - 4.5 - index * 3.6;
    out.push(L(k.segment([HELP_BOARD.x + 3 + a, face, z], [HELP_BOARD.x + 3 + a + b, face, z], P), { tone: "lo", free: true }));
  });
  out.push(k.faceTextSvg(k.sideMatrix([HELP_BOARD.x + 15, face], HELP_Z1 - 1.2, P, "left"), "Usage", { size: 2.6, tone: "hi", anchor: "middle" }));
  return out.join("");
}

function wagonSvg(x, y, label, lit) {
  const out = [];
  for (const dx of [-5.5, 5.5]) {
    for (const dy of [-3, 3]) {
      const F = G.frameAlong([x + dx, y + dy, 4.5], [0, 1, 0]);
      out.push(S(G.disc(-0.9, 0.9, 1.5, F, P), { tone: "mid" }));
    }
  }
  out.push(S(k.slabOf({ x: x - WAGON.w / 2, y: y - WAGON.d / 2, w: WAGON.w, d: WAGON.d, r: 1.5 }, 6, WAGON.h, P, 3, 0.5), { tone: "hi", crease: "lo", lit }));
  out.push(L(k.sideSeam({ x: x - WAGON.w / 2, y: y - WAGON.d / 2, w: WAGON.w, d: WAGON.d, r: 1.5 }, 9, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 3.2], 13.05, P), label, { size: 1.9, tone: "mid", anchor: "middle" }));
  out.push(S(k.slabOf({ x: x - 3, y: y + WAGON.d / 2 - 0.5, w: 6, d: 2.5, r: 0.8 }, 6.5, 2.5, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

const stallPoly = (index) => {
  const tx = TOWER_X[index];
  const y = STALL_Y[index];
  return [[QUEUE_X[0] + 9, MAIN_Y], [tx + STALL_JOIN, MAIN_Y], [tx + STALL_JOIN, y], [STALL_END - 8, y]];
};
const helpPoly = [[QUEUE_X[0] + 9, MAIN_Y], [MAIN_X1 - 8, MAIN_Y]];

const routeFor = (wagonIndex) => (WAGONS[wagonIndex].stall < 0 ? helpPoly : stallPoly(WAGONS[wagonIndex].stall));

const polyLen = (poly) => poly.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) : 0), 0);
const polyAt = (poly, dist) => {
  for (let i = 1; i < poly.length; i++) {
    const seg = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    if (dist <= seg) return [poly[i - 1][0] + ((poly[i][0] - poly[i - 1][0]) * dist) / seg, poly[i - 1][1] + ((poly[i][1] - poly[i - 1][1]) * dist) / seg];
    dist -= seg;
  }
  return poly[poly.length - 1];
};

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -120, y: PLATE.y + PLATE.d - 16, w: 60, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("rails", [-30, -20, 2], railsSvg(), rec([
  A.slab({ x: MAIN_X0, y: MAIN_Y - 2.5, w: MAIN_X1 - MAIN_X0, d: 5, r: 1 }, 0, 3, { name: "rail.main", owner: "rails" }),
  ...TOWER_X.flatMap((tx, index) => [
    A.prism(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), [[tx, MAIN_Y - 2.5], [tx + STALL_JOIN, STALL_Y[index] - 2.5], [tx + STALL_JOIN, STALL_Y[index] + 2.5], [tx, MAIN_Y + 2.5]], 0, 3, { name: `rail.diverge${index}`, owner: "rails" }),
    A.slab({ x: tx + STALL_JOIN, y: STALL_Y[index] - 2.5, w: STALL_END - STALL_JOIN - tx, d: 5, r: 1 }, 0, 3, { name: `rail.stall${index}`, owner: "rails" }),
  ]),
]));
TOWER_X.forEach((tx, index) => {
  put(`tower${index}`, [tx, MAIN_Y + 10, 9], towerSvg(index), rec([
    A.slab({ x: tx - 5, y: MAIN_Y + 6, w: 10, d: 8, r: 1.5 }, 0, 5, { name: `tower${index}.base` }),
    A.cylinder(tx, MAIN_Y + 10, 1.7, 5, 9, { name: `tower${index}.post` }),
  ]));
  put(`blade${index}`, [tx + 8, MAIN_Y - 0.5, 4], `<g data-part="blade${index}">${bladeSvg(index)}</g>`, rec([A.slab({ x: tx + 2, y: MAIN_Y - 1.2, w: 13, d: 1.4, r: 0.4 }, 3, 1.4, { name: `blade${index}` })]));
});
COUPLER.forEach((c, index) => {
  const y = STALL_Y[index];
  put(`coupler${index}`, [STALL_END + 6, y, c.h / 2], couplerSvg(index), rec([
    A.slab({ x: STALL_END, y: y - c.d / 2, w: c.w, d: c.d, r: 1.5 }, 0, c.h, { name: `coupler${index}` }),
    A.slab({ x: 136, y: y - 6, w: 30, d: 3, r: 1 }, 0, 18, { name: `board${index}` }),
  ]));
});
put("buffer", [MAIN_X1 + 2, MAIN_Y, 5], bufferSvg(), rec([
  A.slab({ x: MAIN_X1, y: MAIN_Y - 6, w: 4, d: 16, r: 1 }, 0, 9, { name: "buffer.stop" }),
  A.slab({ x: MAIN_X1, y: MAIN_Y - 3, w: 4, d: 6, r: 1 }, 9, 1.6, { name: "buffer.pad" }),
]));
put("helpboard", [HELP_BOARD.x + 15, HELP_BOARD.y, HELP_Z0], helpBoardSvg(), rec([
  A.slab(HELP_BOARD, HELP_Z0, HELP_Z1 - HELP_Z0, { name: "help.board", owner: "help" }),
  A.cylinder(HELP_BOARD.x + 3, HELP_BOARD.y + 1.5, 1.8, 0, HELP_Z1 - 4, { name: "help.post", owner: "help" }),
  A.cylinder(HELP_BOARD.x + HELP_BOARD.w - 3, HELP_BOARD.y + 1.5, 1.8, 0, HELP_Z1 - 4, { name: "help.post", owner: "help" }),
]));
WAGONS.forEach((wagon, index) => {
  put(`wagon${index}`, [QUEUE_X[index], MAIN_Y, 9], `<g data-part="wagon${index}">${wagonSvg(QUEUE_X[index], MAIN_Y, wagon.label, index === 0)}</g>`, rec([
    A.slab({ x: QUEUE_X[index] - WAGON.w / 2, y: MAIN_Y - WAGON.d / 2, w: WAGON.w, d: WAGON.d, r: 1.5 }, 6, WAGON.h, { name: `wagon${index}` }),
    ...[-5.5, 5.5].flatMap((dx) => [-3, 3].map((dy) => A.disc(G.frameAlong([QUEUE_X[index] + dx, MAIN_Y + dy, 4.5], [0, 1, 0]), -0.9, 0.9, 1.5, { name: `wagon${index}.wheel` }))),
  ]));
});

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "rails", "coupler0", "coupler1", "coupler2", "coupler3", "helpboard"] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A rail yard: labelled wagons queue on the main line, four switch towers read each token and divert wagons into stalls that end in typed couplers sized for each delegate field, and an unmatched wagon runs through to the buffer stop where the help board hangs.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const WAGONS = ${JSON.stringify(WAGONS)};
const TOWER_X = ${JSON.stringify(TOWER_X)};
const STALL_JOIN = ${STALL_JOIN}, STALL_END = ${STALL_END}, MAIN_Y = ${MAIN_Y};
const POLYS = ${JSON.stringify(WAGONS.map((w) => (w.stall < 0 ? helpPoly : stallPoly(w.stall))))};
const QUEUE_X = ${JSON.stringify(QUEUE_X)};
const WAGON_D = ${WAGON.d};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const wagonEls = WAGONS.map((_, index) => svg.querySelector('[data-part="wagon' + index + '"]'));
const bladeEls = TOWER_X.map((_, index) => svg.querySelector('[data-part="blade' + index + '"]'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const polyLen = (poly) => poly.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) : 0), 0);
const polyAt = (poly, dist) => {
  for (let i = 1; i < poly.length; i++) {
    const seg = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    if (dist <= seg) return [poly[i - 1][0] + ((poly[i][0] - poly[i - 1][0]) * dist) / seg, poly[i - 1][1] + ((poly[i][1] - poly[i - 1][1]) * dist) / seg];
    dist -= seg;
  }
  return poly[poly.length - 1];
};
const lens = POLYS.map(polyLen);
const TOTALS = 5;
const RUN = 2.4;
let dispatched = WAGONS.map(() => false);
let active = -1, activeAt = 0, clock = 0, frame = 0, last = 0, visible = false, touring = true, nextAt = 0;
let bladeShare = TOWER_X.map(() => 0), bladeTarget = TOWER_X.map(() => 0);
const tokens = (wagon) => wagon.route.map((t, i) => "args[" + i + '="' + t + '"').join(" · ");
function draw() {
  WAGONS.forEach((wagon, index) => {
    let off = [0, 0];
    if (index === active) {
      const t = still.matches ? 1 : ease(clamp((clock - activeAt) / RUN, 0, 1));
      const pos = polyAt(POLYS[index], t * lens[index]);
      off = [pos[0] - QUEUE_X[index], pos[1] - MAIN_Y, 0];
    }
    wagonEls[index].setAttribute("transform", translateAlong(P, off));
  });
  bladeEls.forEach((el, index) => {
    bladeShare[index] += (bladeTarget[index] - bladeShare[index]) * 0.12;
    el.setAttribute("transform", translateAlong(P, [0, bladeShare[index], 0]));
  });
}
function dispatch(index) {
  dispatched[index] = true;
  active = index;
  activeAt = clock;
  const wagon = WAGONS[index];
  TOWER_X.forEach((tx, ti) => {
    bladeTarget[ti] = wagon.stall === ti ? -2.2 : 0;
  });
  const detail = wagon.stall < 0 ? "no case matched · " + wagon.field : tokens(wagon) + " · stall " + (wagon.stall + 1) + " · " + wagon.field;
  stage.setAttribute("aria-valuetext", detail);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && clock >= nextAt) {
    nextAt = clock + 3.1;
    const index = dispatched.findIndex((d) => !d);
    if (index >= 0 && active < 0) dispatch(index);
  }
  if (active >= 0 && clock - activeAt >= RUN + 0.4) {
    readout.textContent = WAGONS[active].stall < 0 ? "help · " + WAGONS[active].field : "parked · " + WAGONS[active].field;
    active = -1;
    const left = dispatched.filter((d) => !d).length;
    if (left === 0) { readout.textContent = "yard full · " + TOTALS + " wagons · 0 dictionaries · 0 boxing"; touring = false; }
  } else if (active >= 0) {
    const wagon = WAGONS[active];
    const t = clamp((clock - activeAt) / RUN, 0, 1);
    const pos = polyAt(POLYS[active], ease(t) * lens[active]);
    let stage2 = "rolling";
    TOWER_X.forEach((tx, ti) => { if (pos[0] >= tx - 2 && wagon.stall >= ti) stage2 = "switch(args[" + ti + "])"; });
    readout.textContent = (wagon.stall < 0 ? "main line · " : stage2 + " · ") + wagon.label;
  }
  draw();
  const settled = active < 0 && !touring;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (active < 0) {
    const index = dispatched.findIndex((d) => !d);
    if (index >= 0) { nextAt = clock + 3.1; dispatch(index); }
    else { dispatched = WAGONS.map(() => false); bladeTarget = TOWER_X.map(() => 0); readout.textContent = "yard reset · dispatch again"; }
  }
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", (event) => { event.preventDefault(); start(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); start(); }
});
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 3",
  title: "The switch yard",
  hint: "Click or press Space to dispatch",
  readout: "yard ready · wagons queued on the main line",
  keys: [
    { mark: "lit", label: "The wagon being routed" },
    { mark: "raised", label: "Switch towers on args[0..3]" },
    { mark: "flat", label: "Typed couplers: the delegate fields" },
  ],
  caption:
    "Commands register into statically-typed delegate fields (AddCore is a switch, Unsafe.As the cast), and RunCore routes with nested string-constant switches on args[0], args[1], … — the compiler lowers them to jump tables, so dispatch is hash-free. An unmatched name falls through to ShowHelp(-1).",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Switch yard: press Space to dispatch the next wagon through the towers">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "switchyard-light.html" : "switchyard.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the switch yard", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "switchyard-light.html" : "switchyard.html");
