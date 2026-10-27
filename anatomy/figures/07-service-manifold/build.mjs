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

const PLATE = { x: -172, y: -66, w: 344, d: 132, r: 8 };
const PLATE_Z = -14;

const TANK = [-122, -20];
const TANK_R = 15;
const TANK_Z0 = 7;
const TANK_H = 40;
const GLASS = [-96, -2];
const GLASS_H = 34;

const VALVE = [-64, -20];
const CAM = [-64, 40];
const PIPE_Z = 15;

const MANIFOLD_Y = -20;
const MANIFOLD_X = [-46, 72];
const STATIONS = [
  { x: -28, label: "engine" },
  { x: 0, label: "logger" },
  { x: 28, label: "options" },
];
const STATION_Y = -20;
const STATION_R = 6.5;
const STATION_H = 8;

const GAUGE = [62, MANIFOLD_Y];
const DRAIN = [52, MANIFOLD_Y];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z, 0),
    [TANK[0], TANK[1], TANK_Z0 + TANK_H + 4],
    [GLASS[0] + 3, GLASS[1], TANK_Z0 + GLASS_H + 3],
    [VALVE[0], VALVE[1], 30],
    [MANIFOLD_X[1] + 4, MANIFOLD_Y, 24],
    [STATIONS[2].x + STATION_R + 2, STATION_Y, STATION_H + 6],
    [GAUGE[0] + 7, GAUGE[1], 26],
    [DRAIN[0] + 4, DRAIN[1], 14],
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
  const label = { x: -122, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.6], [label.x + label.w - 4, label.y + 2.6], 1, P), k.lineOnTop([label.x + 4, label.y + 4.8], [label.x + label.w - 20, label.y + 4.8], 1, P), k.lineOnTop([label.x + 4, label.y + 7], [label.x + label.w - 10, label.y + 7], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 31, label.y + 6.2], 1.05, P), "the service manifold", { size: 2.2, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4.5, 1], [label.x + label.w - 2.4, label.y + 4.5, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function tankSvg() {
  const out = [];
  out.push(S(k.cylinder(TANK[0], TANK[1], TANK_R + 3, 0, TANK_Z0, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.ring(TANK[0], TANK[1], TANK_R + 2, TANK_Z0, P, 40), { tone: "lo" }));
  const F = G.frameAlong([TANK[0], TANK[1], 0], [0, 0, 1]);
  out.push(S(G.disc(TANK_Z0, TANK_Z0 + TANK_H, TANK_R, F, P), { tone: "hi", crease: "lo" }));
  out.push(L([TANK_Z0 + 10, TANK_Z0 + 24, TANK_Z0 + TANK_H - 3].map((z) => G.arcOf(F, z, TANK_R, P)).join(""), { tone: "faint" }));
  out.push(S(G.disc(TANK_Z0 + TANK_H, TANK_Z0 + TANK_H + 2.5, TANK_R + 2, F, P), { tone: "mid" }));
  out.push(L(G.arcOf(F, TANK_Z0 + TANK_H + 2.5, TANK_R + 2, P), { tone: "lo" }));
  out.push(L(G.ribsOf(F, TANK_Z0 + 10, TANK_Z0 + 24, TANK_R + 0.05, 6, P, { phase: 0.9, least: 0.2 }), { tone: "faint" }));
  return out.join("");
}

function glassSvg(level) {
  const out = [];
  out.push(S(k.cylinder(GLASS[0], GLASS[1], 2.4, 0, 8, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(GLASS[0], GLASS[1], 2.2, 8, GLASS_H, P, 20), { tone: "hi", crease: "lo" }));
  out.push(L([16, 24, 32].map((z) => k.sideArc(GLASS[0], GLASS[1], 2.25, z, P, 16)).join(""), { tone: "faint" }));
  const fill = 3 + level * (GLASS_H - 6);
  if (fill > 3.2) {
    out.push(S(k.cylinder(GLASS[0], GLASS[1], 1.5, 8.2, fill, P, 18), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.cylinder(GLASS[0], GLASS[1], 2.8, 8 + GLASS_H, 1.6, P, 20), { tone: "mid" }));
  return out.join("");
}

function pipeSvg() {
  const out = [];
  const seg = (a, b, r, tone = "mid") => {
    const axis = G.unit3(G.sub3(b, a));
    const F = G.frameAlong([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], axis);
    const len = G.len3(G.sub3(b, a));
    return S(G.disc(-len / 2 - 0.4, len / 2 + 0.4, r, F, P), { tone, crease: "none" });
  };
  out.push(seg([TANK[0] + TANK_R, TANK[1], PIPE_Z], [VALVE[0] - 4.6, TANK[1], PIPE_Z], 3));
  out.push(S(G.disc(-0.6, 0.6, 4.6, G.frameAlong([VALVE[0], TANK[1] + 6.1, PIPE_Z], [0, 1, 0]), P), { tone: "mid" }));
  out.push(seg([VALVE[0] + 6.5, MANIFOLD_Y, PIPE_Z], [MANIFOLD_X[1], MANIFOLD_Y, PIPE_Z], 3.5));
  for (const [x, y] of [[VALVE[0] - 7.6, TANK[1]], [MANIFOLD_X[1], MANIFOLD_Y]]) {
    out.push(D([at([x, y, PIPE_Z + 3.6])], { size: 0.45 }));
  }
  return out.join("");
}

function valveWheelSvg(wheelAngle) {
  const F = G.frameAlong([VALVE[0], TANK[1], PIPE_Z + 10.9], [0, 0, 1]);
  return S(G.disc(-1.1, 1.1, 6.5, F, P), { tone: "hi", crease: "lo", lit: true }) +
    L(G.circleOf(F, 1.1, 1.4, P), { tone: "faint" }) +
    L(G.spokesOf(F, 1.1, 1.4, 6.2, 5, P, { phase: wheelAngle }), { tone: "lo" }) +
    L(G.arcOf(F, 1.1, 6.5, P), { tone: "faint" }) +
    D([at([VALVE[0], TANK[1], PIPE_Z + 13.5])], { size: 0.5 });
}

function valveSvg(wheelAngle) {
  const out = [];
  out.push(S(k.cylinder(VALVE[0], TANK[1], 5.5, PIPE_Z - 4, 8, P, 32, 0.5), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(VALVE[0], TANK[1], 1.8, PIPE_Z + 4, 5.4, P, 16), { tone: "mid" }));
  out.push(`<g data-part="valvewheel">${valveWheelSvg(wheelAngle)}</g>`);
  return out.join("");
}

function camArmSvg(angle) {
  return S(k.slabOf({ x: CAM[0] - 2, y: CAM[1] - 1.2, w: 15, d: 2.4, r: 1 }, 11, 1.6, P, 2), { tone: "hi", crease: "none", lit: true }) +
    L(k.lineOnTop([CAM[0] + 13 * Math.cos(angle) - 2, CAM[1] + 13 * Math.sin(angle)], [CAM[0] + 13 * Math.cos(angle) + 15, CAM[1] + 13 * Math.sin(angle)], 12.6, P), { tone: "lo", free: true });
}

function camSvg(angle) {
  const out = [];
  out.push(S(k.slabOf({ x: CAM[0] - 11, y: CAM[1] - 7, w: 22, d: 14, r: 2 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(CAM[0], CAM[1], 1.5, 3, 12, P, 14), { tone: "mid" }));
  out.push(`<g data-part="camarm">${camArmSvg(angle)}</g>`);
  out.push(k.faceTextSvg(k.topMatrix([CAM[0] - 6, CAM[1] - 4.6], 3.05, P), "route", { size: 1.7, tone: "lo", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([CAM[0] + 6, CAM[1] - 4.6], 3.05, P), "configure", { size: 1.7, tone: "mid", anchor: "middle" }));
  return out.join("");
}

function stationSvg(index, fill) {
  const out = [];
  const st = STATIONS[index];
  out.push(S(k.cylinder(st.x, STATION_Y, STATION_R + 1.5, 0, 1.2, P, 30, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(st.x, STATION_Y, STATION_R, 1.2, STATION_H, P, 32), { tone: "hi", crease: "lo" }));
  out.push(L([4, 6.5].map((z) => k.sideArc(st.x, STATION_Y, STATION_R + 0.05, z, P, 24)).join(""), { tone: "faint" }));
  const fillH = fill * (STATION_H - 2.6);
  out.push(`<g data-part="fill${index}">` + (fillH > 0.3 ? S(k.cylinder(st.x, STATION_Y, STATION_R - 1.2, 2, fillH, P, 24), { tone: "lo", crease: "none" }) : "") + `</g>`);
  out.push(S(k.cylinder(st.x, STATION_Y, STATION_R + 0.8, STATION_H + 1.2, 1, P, 30), { tone: "mid" }));
  out.push(S(k.cylinder(st.x, STATION_Y, 1.3, STATION_H + 2.2, 1.4, P, 14), { tone: "mid", crease: "none" }));
  const plate = { x: st.x - 8, y: STATION_Y + STATION_R + 3, w: 16, d: 5, r: 1 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([st.x, STATION_Y + STATION_R + 6.6], 0.85, P), st.label, { size: 1.8, tone: "mid", anchor: "middle" }));
  return out.join("");
}

function gaugeSvg(pressure) {
  const out = [];
  out.push(S(k.cylinder(GAUGE[0], GAUGE[1], 1.4, PIPE_Z + 3.4, 4, P, 12), { tone: "mid" }));
  out.push(S(k.cylinder(GAUGE[0], GAUGE[1], 5.6, PIPE_Z + 7.4, 9, P, 40, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(GAUGE[0], GAUGE[1], 4.2, PIPE_Z + 16.4, P, 36), { tone: "lo" }));
  const ticks = k.radialTicks(GAUGE[0], GAUGE[1], 3.4, 24, 6, PIPE_Z + 16.4, [0.9, 2], P, -2, 2.4);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));
  const angle = -2 + pressure * 2.4;
  out.push(`<path data-part="gauge Needle" class="iso-line" data-tone="lit" data-free="start" d="${k.lineOnTop([GAUGE[0] - Math.sin(angle) * 1.2, GAUGE[1] + Math.cos(angle) * 1.2], [GAUGE[0] + Math.sin(angle) * 3.6, GAUGE[1] - Math.cos(angle) * 3.6], PIPE_Z + 16.6, P)}" style="stroke-width:0.9"/>`);
  return out.join("");
}

function drainSvg(open) {
  const out = [];
  out.push(S(k.cylinder(DRAIN[0], DRAIN[1], 1.6, 0, 9.4, P, 14), { tone: "mid" }));
  out.push(S(k.cylinder(DRAIN[0], DRAIN[1], 3, 9.4, 2.4, P, 22), { tone: "hi", crease: "lo" }));
  out.push(`<g data-part="drainlever">` + S(k.slabOf({ x: DRAIN[0] - 1, y: DRAIN[1] - 4.6, w: 2, d: 4 + open * 5, r: 0.8 }, 3, 1.4, P, 2), { tone: "hi", crease: "none", lit: open > 0.3 }) + `</g>`);
  out.push(L(k.ring(DRAIN[0], DRAIN[1], 1.7, 4.2, P, 16), { tone: "lo" }));
  return out.join("");
}

const pipeShapes = () => {
  const segShape = (a, b, r, name, owner) => {
    const axis = G.unit3(G.sub3(b, a));
    const F = G.frameAlong([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], axis);
    const len = G.len3(G.sub3(b, a));
    return A.disc(F, -len / 2, len / 2, r, { name, owner });
  };
  return rec([
    segShape([TANK[0] + TANK_R, TANK[1], PIPE_Z], [VALVE[0] - 4.6, TANK[1], PIPE_Z], 3, "pipe.inlet", "pipe"),
    A.disc(G.frameAlong([VALVE[0] - 7.6, TANK[1], PIPE_Z], [1, 0, 0]), -0.6, 0.6, 4.6, { name: "pipe.flange", owner: "pipe" }),
    segShape([VALVE[0] + 6.5, MANIFOLD_Y, PIPE_Z], [MANIFOLD_X[1], MANIFOLD_Y, PIPE_Z], 3.5, "pipe.manifold", "pipe"),
    ...STATIONS.map((st) => A.cylinder(st.x, STATION_Y, 1.3, STATION_H + 2.2, 1.4, { name: "pipe.drop", owner: "pipe" })),
  ]);
};

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 22).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -122, y: PLATE.y + PLATE.d - 16, w: 62, d: 9, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
put("tank", [TANK[0], TANK[1], TANK_Z0 + TANK_H / 2], tankSvg(), rec([
  A.cylinder(TANK[0], TANK[1], TANK_R + 3, 0, TANK_Z0, { name: "tank.base" }),
  A.solid(G.frameAlong([TANK[0], TANK[1], 0], [0, 0, 1]), [[TANK_Z0, 0], [TANK_Z0, TANK_R], [TANK_Z0 + TANK_H, TANK_R], [TANK_Z0 + TANK_H, 0]], { name: "tank.body" }),
  A.cylinder(GLASS[0], GLASS[1], 2.4, 0, 8, { name: "tank.glasspost" }),
  A.cylinder(GLASS[0], GLASS[1], 2.2, 8, GLASS_H, { name: "tank.glass" }),
]));
put("pipe", [0, MANIFOLD_Y, PIPE_Z], pipeSvg(), pipeShapes());
put("valve", [VALVE[0], TANK[1], PIPE_Z], `<g data-part="valve">${valveSvg(0.3)}</g>`, rec([
  A.cylinder(VALVE[0], TANK[1], 5.5, PIPE_Z - 4, 8, { name: "valve.body", owner: "pipe" }),
  A.cylinder(VALVE[0], TANK[1], 1.8, PIPE_Z + 4, 5.4, { name: "valve.stem" }),
]));
put("cam", [CAM[0], CAM[1], 7], `<g data-part="cam">${camSvg(2.6)}</g>`, rec([
  A.slab({ x: CAM[0] - 11, y: CAM[1] - 7, w: 22, d: 14, r: 2 }, 0, 3, { name: "cam.base" }),
  A.cylinder(CAM[0], CAM[1], 1.5, 3, 12, { name: "cam.post" }),
]));
STATIONS.forEach((st, index) => {
  put(`station${index}`, [st.x, STATION_Y, STATION_H / 2], `<g data-part="station${index}">${stationSvg(index, 0)}</g>`, rec([
    A.cylinder(st.x, STATION_Y, STATION_R + 1.5, 0, 1.2, { name: `station${index}.base` }),
    A.cylinder(st.x, STATION_Y, STATION_R, 1.2, STATION_H, { name: `station${index}.glass` }),
    A.slab({ x: st.x - 8, y: STATION_Y + STATION_R + 3, w: 16, d: 5, r: 1 }, 0, 0.8, { name: `station${index}.plate` }),
    A.cylinder(st.x, STATION_Y, 1.3, STATION_H + 2.2, 1.4, { name: `station${index}.drop`, owner: "pipe" }),
  ]));
});
put("gauge", [GAUGE[0], GAUGE[1], PIPE_Z + 13], gaugeSvg(0), rec([
  A.cylinder(GAUGE[0], GAUGE[1], 1.4, PIPE_Z + 3.4, 6, { name: "gauge.stem" }),
  A.cylinder(GAUGE[0], GAUGE[1], 5.6, PIPE_Z + 9.4, 9, { name: "gauge.puck" }),
]));
put("drain", [DRAIN[0], DRAIN[1], 8], `<g data-part="drain">${drainSvg(0)}</g>`, rec([
  A.cylinder(DRAIN[0], DRAIN[1], 1.6, 0, 9.4, { name: "drain.pipe", owner: "pipe" }),
  A.cylinder(DRAIN[0], DRAIN[1], 3, 9.4, 2.4, { name: "drain.cap", owner: "pipe" }),
]));

A.settle(R, P);
if (process.argv.includes("--probe2")) {
  const A2 = await import("./../../../anatomy/kit/audit.mjs");
}
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { cover: ["stand.plate", "tank", "pipe", "cam"], allow: [["valve", "pipe"]] });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A pump room: the service collection tank feeds a pipe through a valve that only opens once the cam has turned from route to configure; the manifold then pressurizes and three labelled accumulators (engine, logger, options) fill through downpipes. A drain valve empties the manifold afterwards.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const TANK = ${JSON.stringify(TANK)}, TANK_R = ${TANK_R}, TANK_Z0 = ${TANK_Z0}, TANK_H = ${TANK_H};
const GLASS = ${JSON.stringify(GLASS)}, GLASS_H = ${GLASS_H};
const VALVE = ${JSON.stringify(VALVE)}, CAM = ${JSON.stringify(CAM)}, PIPE_Z = ${PIPE_Z};
const MANIFOLD_Y = ${MANIFOLD_Y};
const STATIONS = ${JSON.stringify(STATIONS)}, STATION_Y = ${STATION_Y}, STATION_R = ${STATION_R}, STATION_H = ${STATION_H};
const GAUGE = ${JSON.stringify(GAUGE)};
const DRAIN = ${JSON.stringify(DRAIN)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const valveEl = svg.querySelector('[data-part="valvewheel"]');
const camEl2 = svg.querySelector('[data-part="camarm"]');
const stationEls = STATIONS.map((_, index) => svg.querySelector('[data-part="fill' + index + '"]'));
const drainEl = svg.querySelector('[data-part="drainlever"]');
const needleEl = svg.querySelector('[data-part="gauge Needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const valveWheelSvg = (wheelAngle) => {
  const F = { o: [VALVE[0], TANK[1], PIPE_Z + 12.4], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  return solidSvg(disc(-1.1, 1.1, 5.2, F, P), { tone: "hi", crease: "lo", lit: true }) +
    lineSvg(circleOf(F, 1.1, 1.4, P), { tone: "faint" }) +
    lineSvg(spokesOf(F, 1.1, 1.4, 4.9, 5, P, { phase: wheelAngle }), { tone: "lo" }) +
    lineSvg(arcOf(F, 1.1, 5.2, P), { tone: "faint" }) +
    dotsSvg([iso([VALVE[0], TANK[1], PIPE_Z + 12], P)], { size: 0.5 });
};
const camArmSvg = (angle) => {
  return solidSvg(slabOf({ x: CAM[0] - 2, y: CAM[1] - 1.2, w: 15, d: 2.4, r: 1 }, 11, 1.6, P, 2), { tone: "hi", crease: "none", lit: true }) +
    lineSvg(lineOnTop([CAM[0] + 13 * Math.cos(angle) - 2, CAM[1] + 13 * Math.sin(angle)], [CAM[0] + 13 * Math.cos(angle) + 15, CAM[1] + 13 * Math.sin(angle)], 12.6, P), { tone: "lo", free: true });
};
const stationFillSvg = (index, fill) => {
  const st = STATIONS[index];
  const fillH = fill * (STATION_H - 2.6);
  return fillH > 0.3 ? solidSvg(cylinder(st.x, STATION_Y, STATION_R - 1.2, 2, fillH, P, 24), { tone: "lo", crease: "none" }) : "";
};
const drainLeverSvg = (open) => {
  return solidSvg(slabOf({ x: DRAIN[0] - 1, y: DRAIN[1] - 4.6, w: 2, d: 4 + open * 5, r: 0.8 }, 3, 1.4, P, 2), { tone: "hi", crease: "none", lit: open > 0.3 });
};

const NAMES = ["routing · the wheel picks the command first", "configure: the valve opens, the provider builds", "injection: engine · logger · options filled", "run: the command executes with services", "dispose: the provider drains after the run"];
let phase = 0, phaseAt = 0, clock = 0, pressure = 0;
let fills = [0, 0, 0], frame = 0, last = 0, visible = false, touring = true, nextAt = 1;
const HOLDS = [1.4, 1.6, 1.4, 1.4, 1.8];
function draw() {
  const t = still.matches ? 1 : ease(clamp((clock - phaseAt) / HOLDS[phase], 0, 1));
  const camAngle = phase === 0 ? 2.6 : 2.6 - (phase >= 1 ? 1.4 : 0) * (phase === 1 ? t : 1);
  camEl2.innerHTML = camArmSvg(camAngle);
  const wheelAngle = phase === 1 ? 0.3 + t * 4.2 : 4.5;
  valveEl.innerHTML = valveWheelSvg(wheelAngle);
  pressure = phase >= 2 && phase <= 3 ? 1 : phase === 4 ? 1 - t : 0;
  needleEl.setAttribute("d", needleAt(still.matches ? pressure : pressure * (0.85 + 0.15 * Math.sin(clock * 7))));
  const target = phase >= 2 && phase <= 3 ? [1, 1, 1] : [0, 0, 0];
  fills.forEach((_, index) => {
    const want = still.matches ? target[index] : target[index] * clamp((clock - phaseAt) * 1.6 - index * 0.5, 0, 1);
    fills[index] += (want - fills[index]) * 0.12;
    stationEls[index].innerHTML = stationFillSvg(index, fills[index]);
  });
  drainEl.innerHTML = drainLeverSvg(phase === 4 ? t : 0);
  const text = NAMES[phase];
  if (readout.textContent !== text) readout.textContent = text;
}
const needleAt = (p) => {
  const angle = -2 + p * 2.4;
  return lineOnTop([GAUGE[0] - Math.sin(angle) * 1.2, GAUGE[1] + Math.cos(angle) * 1.2], [GAUGE[0] + Math.sin(angle) * 3.6, GAUGE[1] - Math.cos(angle) * 3.6], ${PIPE_Z + 18.6}, P);
};
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && clock - phaseAt >= HOLDS[phase]) { phaseAt = clock; phase = (phase + 1) % 5; }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const start = () => {
  touring = false;
  if (phase === 0 || phase === 4) { phaseAt = clock; phase = 1; fills = [0, 0, 0]; }
  else if (phase >= 1) { phaseAt = clock; phase = 4; }
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
  fig: "Fig 7",
  title: "The service manifold",
  hint: "Click or press Space to build the provider",
  readout: "routing · the wheel picks the command first",
  keys: [
    { mark: "lit", label: "The valve wheel and the cam" },
    { mark: "raised", label: "Accumulators: engine · logger · options" },
    { mark: "flat", label: "Drain: the provider disposes after the run" },
  ],
  caption:
    "DI is opt-in by reference: only when Microsoft.Extensions.DependencyInjection is in the project does the generator add ConfigureServices. It runs after routing and before parsing — the cam must turn first — and the provider lands in the static ConsoleApp.ServiceProvider. [FromServices] feeds lambdas, constructors feed classes, and the provider is disposed after the run.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Service manifold: press Space to turn the cam and build the provider">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "service-manifold-light.html" : "service-manifold.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the service manifold", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "service-manifold-light.html" : "service-manifold.html");
