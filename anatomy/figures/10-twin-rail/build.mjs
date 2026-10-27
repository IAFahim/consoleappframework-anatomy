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
const HEIGHT = 360;

const PLATE = { x: -160, y: -50, w: 320, d: 100, r: 8 };
const PLATE_Z = -14;

const TRACKS = [
  { y: -22, name: "hand-written", label: "switch you would write" },
  { y: 8, name: "generated", label: "generated Run body" },
];
const RAIL_X = [-124, 112];
const RAIL_TOP = 8;
const GATE_X = -120;
const GATE_TOP = 24;
const CHECKS = [-60, -10, 40];
const START_X = -104;
const FINISH_X = 92;

const SCALE = { x: 104, y: -7 };
const BEAM_Z = 26;
const PAN_DX = 10;
const PAN_Z = 12;
const LAMP = [126, -7];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z - 7, 0),
    [GATE_X, -22, GATE_TOP],
    [GATE_X, 8, GATE_TOP],
    ...CHECKS.map((x) => [x, 8, 22]),
    [SCALE.x, SCALE.y, BEAM_Z + 5],
    [LAMP[0], LAMP[1], 24],
    [RAIL_X[1], 8, RAIL_TOP + 3],
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
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, PLATE_Z - 7, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, PLATE_Z - 5.4, 5.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, PLATE_Z, 14, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 10), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: -40, y: 33, w: 80, d: 8, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), 1, P, 4), { tone: "faint" }));
  out.push(L([k.lineOnTop([label.x + 4, label.y + 2.4], [label.x + label.w - 4, label.y + 2.4], 1, P), k.lineOnTop([label.x + 4, label.y + 4.4], [label.x + label.w - 18, label.y + 4.4], 1, P), k.lineOnTop([label.x + 4, label.y + 6.4], [label.x + label.w - 10, label.y + 6.4], 1, P)].join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2, label.y + 5.8], 1.05, P), "the twin launch rail", { size: 2.2, tone: "mid", anchor: "middle" }));
  out.push(D([[label.x + 2.4, label.y + 4, 1], [label.x + label.w - 2.4, label.y + 4, 1]].map(at), { size: 0.4 }));
  return out.join("");
}

function trackSvg(track) {
  const out = [];
  for (const dy of [-2.2, 2.2]) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y: track.y + dy - 1, w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 5, 3, P, 3, 0.3), { tone: "mid" }));
  }
  const ties = [];
  for (let x = RAIL_X[0] + 5; x <= RAIL_X[1] - 5; x += 11) ties.push([x, track.y - 2.4], [x, track.y + 3.4]);
  out.push(L(k.onTop(ties, RAIL_TOP + 0.02, P), { tone: "faint" }));
  for (const x of [-116, -62, -8, 46, 104]) {
    out.push(S(k.slabOf({ x: x - 1.8, y: track.y - 3.4, w: 3.6, d: 7.8, r: 0.7 }, 0, 5, P, 3, 0.3), { tone: "lo" }));
  }
  const plate = { x: START_X - 6, y: track.y + 5, w: 34, d: 6, r: 1 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([plate.x + plate.w / 2, plate.y + 3.4], 0.85, P), track.label, { size: 1.5, tone: "mid", anchor: "middle" }));
  out.push(D([[plate.x + 1.4, plate.y + 3, 0.8], [plate.x + plate.w - 1.4, plate.y + 3, 0.8]].map(at), { size: 0.35 }));
  return out.join("");
}

function gateSvg() {
  const out = [];
  for (const track of TRACKS) {
    out.push(S(k.cylinder(GATE_X, track.y + 6.5, 2.6, 0, GATE_TOP, P, 16, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: GATE_X - 2, y: -28, w: 4, d: 44, r: 1.5 }, GATE_TOP - 4, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: GATE_X - 2, y: -28, w: 4, d: 44, r: 1.5 }, 1), GATE_TOP, P, 3), { tone: "faint" }));
  for (const track of TRACKS) {
    out.push(`<g data-part="gateleaf${track.name}">` +
      S(k.slabOf({ x: GATE_X - 1.4, y: track.y - 3, w: 2.8, d: 7, r: 0.8 }, RAIL_TOP + 3, 2.4, P, 2, 0.3), { tone: "hi", crease: "none", lit: true }) +
      `</g>`);
  }
  out.push(S(k.cylinder(GATE_X, -7, 1.8, GATE_TOP, 4, P, 12), { tone: "mid" }));
  out.push(D([at([GATE_X, -7, GATE_TOP + 4])], { size: 0.5 }));
  return out.join("");
}

const PL = { ...P, origin: [0, 0] };

function cartSvg(name) {
  return S(k.slabOf({ x: -8, y: -4, w: 16, d: 8, r: 1 }, 3, 2.5, PL, 3, 0.3), { tone: "mid" }) +
    S(k.slabOf({ x: -6, y: -3, w: 12, d: 6, r: 1 }, 5.5, 5, PL, 3, 0.5), { tone: "hi", crease: "lo" }) +
    S(k.slabOf({ x: -4.5, y: -2, w: 3.4, d: 4, r: 0.6 }, 10.5, 3, PL, 2, 0.3), { tone: "hi", crease: "none", lit: true }) +
    [[-5.5, -3.4], [5.5, -3.4], [-5.5, 3.4], [5.5, 3.4]].map(([dx, dy]) => S(k.cylinder(dx, dy, 1.9, 0.4, 2.6, PL, 14), { tone: "mid" })).join("") +
    L(k.planOutline(k.insetPlan({ x: -6, y: -3, w: 12, d: 6, r: 1 }, 1.2), 10.5, PL, 3), { tone: "faint" });
}

function checkSvg(x) {
  const out = [];
  for (const track of TRACKS) {
    out.push(S(k.cylinder(x, track.y + 6.5, 1.6, 0, 16, P, 12, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 0.8, y: track.y + 5, w: 1.6, d: 7, r: 0.5 }, 16, 0.5, P, 2, 0.2), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: x - 2, y: -18, w: 4, d: 32, r: 1 }, 16, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: x - 2, y: -18, w: 4, d: 32, r: 1 }, 0.8), 18, P, 3), { tone: "faint" }));
  for (const track of TRACKS) {
    out.push(`<g data-part="flag${track.name}${x}">` +
      S(k.slabOf({ x: x + 2.4, y: track.y + 5.2, w: 4.6, d: 0.9, r: 0.4 }, 13.4, 2.4, P, 2, 0.2), { tone: "lo", crease: "none" }) +
      `</g>`);
  }
  return out.join("");
}

function scaleSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: SCALE.x - 7, y: SCALE.y - 5, w: 14, d: 10, r: 2 }, 0, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(SCALE.x, SCALE.y, 1.6, 4, BEAM_Z - 4, P, 12), { tone: "mid" }));
  out.push(S(k.slabOf({ x: SCALE.x - PAN_DX - 4, y: SCALE.y - 2.5, w: 2 * PAN_DX + 8, d: 5, r: 1 }, BEAM_Z - 1.2, 2.4, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: SCALE.x - PAN_DX - 4, y: SCALE.y - 2.5, w: 2 * PAN_DX + 8, d: 5, r: 1 }, 1), BEAM_Z + 1.2, P, 3), { tone: "faint" }));
  for (const dx of [-PAN_DX, PAN_DX]) {
    out.push(L(k.ring(SCALE.x + dx, SCALE.y, 1.1, BEAM_Z + 1.2, P, 12), { tone: "lo" }));
    out.push(L(`M${at([SCALE.x + dx, SCALE.y, BEAM_Z + 1.2]).join(" ")}L${at([SCALE.x + dx, SCALE.y, PAN_Z + 1.6]).join(" ")}`, { tone: "lo" }));
    out.push(S(k.slabOf({ x: SCALE.x + dx - 3.4, y: SCALE.y - 3.4, w: 6.8, d: 6.8, r: 1 }, PAN_Z, 1.6, P, 3, 0.3), { tone: "mid" }));
    out.push(L(k.lineOnTop([SCALE.x + dx - 2.4, SCALE.y - 2.4], [SCALE.x + dx + 2.4, SCALE.y + 2.4], PAN_Z + 1.6, P), { tone: "faint" }));
    out.push(`<g data-part="pan${dx < 0 ? 0 : 1}" opacity="0">` +
      S(k.cylinder(SCALE.x + dx, SCALE.y, 2.4, PAN_Z + 1.6, 2.4, P, 16, 0.4), { tone: "hi", crease: "none", lit: true }) +
      `</g>`);
  }
  out.push(D([at([SCALE.x, SCALE.y, BEAM_Z + 1.4])], { size: 0.5 }));
  return out.join("");
}

const lampPaths = (on) => S(k.cylinder(LAMP[0], LAMP[1], 3.4, 20.5, 3, P, 20), { tone: "lit", crease: "none" })
  .replace("<path", `<path opacity="${on ? 1 : 0}"`);

function lampSvg() {
  const out = [];
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 2, 0, 18, P, 14, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 4.4, 18, 2.5, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.ring(LAMP[0], LAMP[1], 4.6, 20.5, P, 22), { tone: "lo" }));
  out.push(`<g data-part="lampfill">${lampPaths(0)}</g>`);
  const plate = { x: LAMP[0] - 9, y: LAMP[1] + 6, w: 18, d: 6, r: 1 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([LAMP[0], LAMP[1] + 9.4], 0.85, P), "tied", { size: 1.8, tone: "mid", anchor: "middle" }));
  out.push(D([[plate.x + 1.6, plate.y + 3, 0.8], [plate.x + plate.w - 1.6, plate.y + 3, 0.8]].map(at), { size: 0.35 }));
  return out.join("");
}

put("stand.plate", [0, 0, 0], plateSvg(), rec([
  A.slab(PLATE, PLATE_Z, 14, { name: "stand.plate" }),
  ...k.corners(PLATE, 20).map(([x, y], i) => A.cylinder(x, y, 7, PLATE_Z - 7, 7, { name: `stand.foot${i}`, ground: true })),
  A.slab({ x: -40, y: 33, w: 80, d: 8, r: 1.5 }, 0, 1, { name: "stand.label" }),
]));
TRACKS.forEach((track, ti) => {
  put(`track${ti}`, [0, track.y, 5], trackSvg(track), rec([
    A.slab({ x: RAIL_X[0], y: track.y - 3.2, w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 5, 3, { name: `track${ti}.back`, owner: "track" }),
    A.slab({ x: RAIL_X[0], y: track.y + 1.2, w: RAIL_X[1] - RAIL_X[0], d: 2, r: 0.8 }, 5, 3, { name: `track${ti}.front`, owner: "track" }),
    ...[-116, -62, -8, 46, 104].map((x, i) => A.slab({ x: x - 1.8, y: track.y - 3.4, w: 3.6, d: 7.8, r: 0.7 }, 0, 5, { name: `track${ti}.leg${i}` })),
    A.slab({ x: START_X - 6, y: track.y + 5, w: 34, d: 6, r: 1 }, 0, 0.8, { name: `track${ti}.plate` }),
  ]));
});
put("gate", [GATE_X, -7, 14], gateSvg(), rec([
  A.cylinder(GATE_X, TRACKS[0].y + 6.5, 2.6, 0, GATE_TOP, { name: "gate.post0", owner: "gate" }),
  A.cylinder(GATE_X, TRACKS[1].y + 6.5, 2.6, 0, GATE_TOP, { name: "gate.post1", owner: "gate" }),
  A.slab({ x: GATE_X - 2, y: -28, w: 4, d: 44, r: 1.5 }, GATE_TOP - 4, 4, { name: "gate.header", owner: "gate" }),
  A.slab({ x: GATE_X - 1.4, y: TRACKS[0].y - 3, w: 2.8, d: 7, r: 0.8 }, RAIL_TOP + 3, 2.4, { name: "gate.leaf0", owner: "gate" }),
  A.slab({ x: GATE_X - 1.4, y: TRACKS[1].y - 3, w: 2.8, d: 7, r: 0.8 }, RAIL_TOP + 3, 2.4, { name: "gate.leaf1", owner: "gate" }),
  A.cylinder(GATE_X, -7, 1.8, GATE_TOP, 4, { name: "gate.stem", owner: "gate" }),
]));
TRACKS.forEach((track, ti) => {
  const off = k.iso([START_X, track.y, 7.6], P);
  const tr = "translate(" + off[0].toFixed(2) + "," + off[1].toFixed(2) + ")";
  put(`cart${ti}`, [START_X, track.y, 9], `<g data-part="cart${ti}" transform="${tr}">${cartSvg(track.name)}</g>`, rec([
    A.slab({ x: START_X - 8, y: track.y - 4, w: 16, d: 8, r: 1 }, 7.6 + 3, 2.5, { name: `cart${ti}.base`, owner: "cart" }),
    A.slab({ x: START_X - 6, y: track.y - 3, w: 12, d: 6, r: 1 }, 7.6 + 5.5, 5, { name: `cart${ti}.body`, owner: "cart" }),
    ...[[-5.5, -3.4], [5.5, -3.4], [-5.5, 3.4], [5.5, 3.4]].map(([dx, dy], wi) => A.cylinder(START_X + dx, track.y + dy, 1.9, 8, 2.6, { name: `cart${ti}.wheel${wi}`, owner: "cart" })),
  ]));
});
CHECKS.forEach((x) => {
  put(`check${x}`, [x, -7, 10], checkSvg(x), rec([
    A.cylinder(x, TRACKS[0].y + 6.5, 1.6, 0, 16, { name: `check${x}.post0` }),
    A.cylinder(x, TRACKS[1].y + 6.5, 1.6, 0, 16, { name: `check${x}.post1` }),
    A.slab({ x: x - 2, y: -18, w: 4, d: 32, r: 1 }, 16, 2, { name: `check${x}.beam` }),
  ]));
});
put("scale", [SCALE.x, SCALE.y, 16], scaleSvg(), rec([
  A.slab({ x: SCALE.x - 7, y: SCALE.y - 5, w: 14, d: 10, r: 2 }, 0, 4, { name: "scale.base" }),
  A.cylinder(SCALE.x, SCALE.y, 1.6, 4, BEAM_Z - 4, { name: "scale.post", owner: "scale" }),
  A.slab({ x: SCALE.x - PAN_DX - 4, y: SCALE.y - 2.5, w: 2 * PAN_DX + 8, d: 5, r: 1 }, BEAM_Z - 1.2, 2.4, { name: "scale.beam", owner: "scale" }),
  A.slab({ x: SCALE.x - PAN_DX - 3.4, y: SCALE.y - 3.4, w: 6.8, d: 6.8, r: 1 }, PAN_Z, 1.6, { name: "scale.pan0", owner: "scale" }),
  A.slab({ x: SCALE.x + PAN_DX - 3.4, y: SCALE.y - 3.4, w: 6.8, d: 6.8, r: 1 }, PAN_Z, 1.6, { name: "scale.pan1", owner: "scale" }),
  A.cylinder(SCALE.x - PAN_DX, SCALE.y, 0.35, PAN_Z + 1.6, BEAM_Z + 1.2 - PAN_Z - 1.6, { name: "scale.string0", owner: "scale" }),
  A.cylinder(SCALE.x + PAN_DX, SCALE.y, 0.35, PAN_Z + 1.6, BEAM_Z + 1.2 - PAN_Z - 1.6, { name: "scale.string1", owner: "scale" }),
]));
put("lamp", [LAMP[0], LAMP[1], 12], lampSvg(), rec([
  A.cylinder(LAMP[0], LAMP[1], 2, 0, 18, { name: "lamp.post" }),
  A.cylinder(LAMP[0], LAMP[1], 4.4, 18, 2.5, { name: "lamp.housing" }),
  A.slab({ x: LAMP[0] - 9, y: LAMP[1] + 6, w: 18, d: 6, r: 1 }, 0, 0.8, { name: "lamp.plate" }),
]));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, {});

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two launch rails side by side: one cart is the switch main you would write by hand, the other is the Run body the generator emits. The starting gate releases both together; they pass the same three checkpoints — route, parse, invoke — and drop equal weights on the balance at the end, which stays level: the tie is the point.",
  body: R.items.map((item) => item.svg).join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const TRACKS = ${JSON.stringify(TRACKS)};
const START_X = ${START_X}, FINISH_X = ${FINISH_X};
const CHECKS = ${JSON.stringify(CHECKS)};
const GATE_X = ${GATE_X}, RAIL_TOP = ${RAIL_TOP};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const cartEls = [0, 1].map((i) => svg.querySelector('[data-part="cart' + i + '"]'));
const leafEls = TRACKS.map((t) => svg.querySelector('[data-part="gateleaf' + t.name + '"]'));
const flagEls = CHECKS.flatMap((x) => TRACKS.map((t) => svg.querySelector('[data-part="flag' + t.name + x + '"]')));
const panEls = [0, 1].map((i) => svg.querySelector('[data-part="pan' + i + '"]'));
const lampEl = svg.querySelector('[data-part="lampfill"]');
const placeCart = (i, x, trackY) => {
  const p = iso([x, trackY, 7.6], P);
  cartEls[i].setAttribute("transform", "translate(" + p[0].toFixed(2) + "," + p[1].toFixed(2) + ")");
};
const stage_set = (el, on) => { const want = on ? "1" : "0"; if (el.getAttribute("opacity") !== want) el.setAttribute("opacity", want); };
const NAMES = ["ready · two mains, one course", "route: switch on args[0]", "parse: single pass, no boxing", "invoke: direct call, no reflection", "finish: equal weights, level beam · tie"];
let phase = 0, phaseAt = 0, clock = 0, frame = 0, last = 0, visible = false, touring = true;
const HOLDS = [2.2, 0.55, 0.55, 0.55, 2.0];
let cartX = START_X, gate = 1, flags = [0, 0, 0], pans = [0, 0], lamp = 0;
function draw(t) {
  const u = still.matches ? 1 : ease(t);
  if (phase === 0) { cartX = START_X; gate = 1 - u; flags = [0, 0, 0]; pans = [0, 0]; lamp = 0; }
  if (phase >= 1 && phase <= 3) { cartX = START_X + (FINISH_X - START_X) * (phase - 1 + u) / 3; flags = [phase > 1 ? 1 : 0, phase > 2 ? 1 : 0, phase > 3 ? 1 : 0]; }
  if (phase === 4) { cartX = FINISH_X; flags = [1, 1, 1]; pans = [u, u]; lamp = u > 0.9 ? 1 : 0; }
  cartEls.forEach((_, i) => placeCart(i, cartX, TRACKS[i].y));
  leafEls.forEach((el) => {
    const o = iso([0, 0, 0], P);
    const d = iso([0, 0, gate * 6], P);
    el.setAttribute("transform", "translate(" + (d[0] - o[0]).toFixed(2) + "," + (d[1] - o[1]).toFixed(2) + ")");
  });
  flagEls.forEach((el, i) => stage_set(el, flags[Math.floor(i / 2)] === 1));
  panEls.forEach((el, i) => stage_set(el, pans[i] > 0.5));
  const lampChild = lampEl.firstChild;
  if (lampChild && lampChild.getAttribute) {
    const want = lamp ? "1" : "0";
    if (lampChild.getAttribute("opacity") !== want) lampChild.setAttribute("opacity", want);
  }
  const text = NAMES[phase];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && clock - phaseAt >= HOLDS[phase]) { phaseAt = clock; phase = (phase + 1) % 5; }
  draw(clamp((clock - phaseAt) / HOLDS[phase], 0, 1));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const launch = () => {
  touring = false;
  if (phase === 0) { phaseAt = clock; phase = 1; }
  else if (phase === 4) { phaseAt = clock; phase = 0; }
  else { phaseAt = clock; phase = 4; }
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", (event) => { event.preventDefault(); launch(); });
stage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); launch(); } });
draw(0);
`;

const body = k.plateHtml({
  fig: "Fig 10",
  title: "The twin launch rail",
  hint: "Click or press Space to launch · again to reset",
  readout: "ready · two mains, one course",
  keys: [
    { mark: "lit", label: "Gate leaves, cart cabs, checkpoint flags and the tie lamp" },
    { mark: "raised", label: "Two carts on identical tracks: hand-written and generated" },
    { mark: "flat", label: "Balance: equal weights, beam stays level" },
  ],
  caption:
    "Performance parity by construction: the generator does not invent a framework, it emits the same switch-and-parse main you would have written by hand — no reflection, no boxing, no LINQ in the hot path, AOT-safe. Two carts, same rails, same checkpoints, same finish: the beam takes equal weights and stays level.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Twin launch rail: press Space to launch both carts">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "twin-rail-light.html" : "twin-rail.html"), k.pageHtml({ title: "ConsoleAppFramework anatomy · the twin launch rail", theme, body, script: kitScript() + latheScript() + live }));
console.log("wrote", theme === "light" ? "twin-rail-light.html" : "twin-rail.html");
