import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

const MODEL_URL = "/models/bust.glb";
const DOT_COUNT = 66000;
const CANDIDATE_COUNT = 330000;
export function mountHero(root) {
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const page = root;
const stage = root.querySelector("[data-stage]");
const loaderEl = root.querySelector("[data-loader]");
const counterEl = root.querySelector("[data-counter]");
const labelEl = root.querySelector("[data-label]");
const ringSvg = loaderEl?.querySelector("svg");
if (!stage || !loaderEl || !counterEl || !labelEl || !ringSvg) {
  console.error("[hero] missing required DOM nodes");
  return () => {};
}
let disposed = false;
let raf = 0;
const cleanups = [];

const RING_N = 96;
const ringCircles = [];
ringSvg.replaceChildren();
for (let i = 0; i < RING_N; i++) {
  const a = (i / RING_N) * Math.PI * 2 - Math.PI / 2;
  const cx = (92 * Math.cos(a)).toFixed(2);
  const cy = (92 * Math.sin(a)).toFixed(2);
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", cx);
  c.setAttribute("cy", cy);
  c.setAttribute("r", "1.6");
  ringSvg.appendChild(c);
  ringCircles.push(c);
}

function setProgress(p) {
  const clamped = Math.max(0, Math.min(1, p));
  const pct = Math.round(clamped * 100);
  counterEl.textContent = String(pct).padStart(3, "0");
  loaderEl.setAttribute("aria-valuenow", String(pct));
  for (let i = 0; i < RING_N; i++) {
    if (i / RING_N < clamped) ringCircles[i].setAttribute("data-on", "");
    else ringCircles[i].removeAttribute("data-on");
  }
}

function easeToward(value, target, dt, rate) {
  const k = 1 - Math.exp(-dt * rate);
  return value + (target - value) * k;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x6e0a);

function shuffleInPlace(arr, rng = rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function isLeaf(x, y, z) {
  return x > 0.13 && y > 0.6 && (x - 0.02) ** 2 + (z + 0.06) ** 2 > 0.035;
}

function toWorld(x, y, z, out) {
  out[0] = x * 2.8;
  out[1] = y * 2.8 - 0.68;
  out[2] = z * 2.8;
}

function buildVisor(faceHeights, frontZ) {
  const W = 0.215;
  const clearance = 0.028;
  const topY = (x) => 0.378 - 0.022 * (x / W) ** 2;
  const lowY = (x) => 0.282 + 0.032 * Math.exp(-((x / 0.034) ** 2)) + 0.026 * (x / W) ** 4;

  function faceAt(x, y) {
    const ix = Math.round(x / 0.01);
    const iy = Math.round(y / 0.01);
    let best = -Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${ix + dx},${iy + dy}`;
        const v = faceHeights.get(key);
        if (v !== undefined && v > best) best = v;
      }
    }
    return best === -Infinity ? 0 : best;
  }

  let front = -Infinity;
  for (let x = -0.06; x <= 0.06 + 1e-9; x += 0.01) {
    for (let y = 0.30; y <= 0.36 + 1e-9; y += 0.01) {
      front = Math.max(front, faceAt(x, y));
    }
  }
  front += clearance;

  let wrap = Infinity;
  for (let x = -W; x <= W + 1e-9; x += 0.01) {
    if (Math.abs(x) < 0.05) continue;
    let need = -Infinity;
    const y0 = lowY(x), y1 = topY(x);
    for (let y = y0; y <= y1 + 1e-9; y += 0.01) need = Math.max(need, faceAt(x, y));
    const w = (front - need - 0.7 * clearance) / (x * x);
    if (w < wrap) wrap = w;
  }
  if (!Number.isFinite(wrap) || wrap <= 0) wrap = 2.4;

  const lensZ = (x) => front - wrap * x * x;
  const normalAt = (x, out) => {
    const nx = 2 * wrap * x, ny = 0, nz = 1;
    const len = Math.hypot(nx, ny, nz) || 1;
    out[0] = nx / len; out[1] = ny / len; out[2] = nz / len;
  };

  const dots = [];
  const n = [0, 0, 0];
  const push = (x, y, z, part) => {
    normalAt(x, n);
    dots.push({ x, y, z, nx: n[0], ny: n[1], nz: n[2], part });
  };

  // top bar: 950
  for (let i = 0; i < 950; i++) {
    const x = -W + rand() * (2 * W);
    const y = topY(x) - Math.pow(rand(), 2) * 0.016;
    push(x, y, lensZ(x) + 0.004, 3);
  }
  // lower edge: 380
  for (let i = 0; i < 380; i++) {
    const x = -W + rand() * (2 * W);
    const y = lowY(x) + (rand() - 0.5) * 0.004;
    push(x, y, lensZ(x) + 0.002, 3);
  }
  // ends: 70 each
  for (const side of [-1, 1]) {
    const x = side * W;
    for (let i = 0; i < 70; i++) {
      const y = lowY(x) + rand() * (topY(x) - lowY(x));
      push(x, y, lensZ(x), 3);
    }
  }
  // lens fill: 1500 (part 4)
  for (let i = 0; i < 1500; i++) {
    const x = -W + rand() * (2 * W);
    const y0 = lowY(x), y1 = topY(x);
    const y = y0 + rand() * (y1 - y0);
    push(x, y, lensZ(x), 4);
  }
  // arms: 70 per side
  for (const side of [-1, 1]) {
    for (let i = 0; i < 70; i++) {
      const t = rand();
      const x = side * (W + t * 0.03);
      const z = lensZ(side * W) - t * 0.15;
      const y = topY(side * W) - 0.008 + (rand() - 0.5) * 0.01;
      push(x, y, z, 3);
    }
  }
  return { dots, wrap, front };
}

function computeShade(finalDots, candidates) {
  const R = 0.03;
  const cell = R;
  const half = (candidates.length / 2) | 0;
  const grid = new Map();
  const keyOf = (ix, iy, iz) => `${ix},${iy},${iz}`;
  for (let i = 0; i < half; i++) {
    const c = candidates[i];
    const ix = Math.floor(c.x / cell);
    const iy = Math.floor(c.y / cell);
    const iz = Math.floor(c.z / cell);
    const k = keyOf(ix, iy, iz);
    let arr = grid.get(k);
    if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(c);
  }

  const ridges = new Float32Array(finalDots.length);
  const counts = new Float32Array(finalDots.length);
  const R2 = R * R;

  for (let i = 0; i < finalDots.length; i++) {
    const d = finalDots[i];
    const ix = Math.floor(d.x / cell);
    const iy = Math.floor(d.y / cell);
    const iz = Math.floor(d.z / cell);
    let sum = 0, n = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const arr = grid.get(keyOf(ix + dx, iy + dy, iz + dz));
          if (!arr) continue;
          for (const c of arr) {
            const ox = c.x - d.x, oy = c.y - d.y, oz = c.z - d.z;
            if (ox * ox + oy * oy + oz * oz > R2) continue;
            sum += ox * d.nx + oy * d.ny + oz * d.nz;
            n++;
          }
        }
      }
    }
    counts[i] = n;
    ridges[i] = n > 0 ? -(sum / n) / R : 0;
  }

  const absR = Array.from(ridges, (v) => Math.abs(v)).sort((a, b) => a - b);
  const p90 = absR[Math.min(absR.length - 1, Math.floor(absR.length * 0.9))] || 1;
  const sortedCounts = Array.from(counts).sort((a, b) => a - b);
  const median = sortedCounts[(sortedCounts.length / 2) | 0] || 1;

  for (let i = 0; i < finalDots.length; i++) {
    let ridge = ridges[i] / p90;
    if (ridge > 1) ridge = 1;
    if (ridge < -1) ridge = -1;
    let thin = 1 - counts[i] / (0.55 * median);
    if (thin < 0) thin = 0;
    if (thin > 1) thin = 1;
    finalDots[i].ridge = ridge;
    finalDots[i].thin = thin;
  }
}

function buildDotsFromMesh(mesh) {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.attributes.normal) geo.computeVertexNormals();

  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build();
  const pos = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const candidates = new Array(CANDIDATE_COUNT);
  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    sampler.sample(pos, nrm);
    candidates[i] = {
      x: pos.x, y: pos.y, z: pos.z,
      nx: nrm.x, ny: nrm.y, nz: nrm.z
    };
  }

  // Face height map for visor
  const faceHeights = new Map();
  for (const c of candidates) {
    if (c.nz < 0.2) continue;
    if (c.x < -0.32 || c.x > 0.32 || c.y < 0.2 || c.y > 0.45) continue;
    const ix = Math.round(c.x / 0.01);
    const iy = Math.round(c.y / 0.01);
    const key = `${ix},${iy}`;
    const prev = faceHeights.get(key);
    if (prev === undefined || c.z > prev) faceHeights.set(key, c.z);
  }
  const visor = buildVisor(faceHeights);

  const leafAll = [];
  const nonLeaf = [];
  for (const c of candidates) {
    if (isLeaf(c.x, c.y, c.z)) leafAll.push(c);
    else nonLeaf.push(c);
  }
  const leafKeep = leafAll.slice(0, Math.floor(leafAll.length * 0.6));
  for (const d of leafKeep) d.part = 2;
  for (const d of visor.dots) {/* already have part */}

  const visorCount = visor.dots.length;
  const leafCount = leafKeep.length;
  const bustNeeded = DOT_COUNT - visorCount - leafCount;
  if (bustNeeded <= 0) throw new Error("Too many specialty dots");

  // Voxel thinning
  const VOX = 0.022;
  const voxels = new Map();
  for (const c of nonLeaf) {
    const ix = Math.floor(c.x / VOX);
    const iy = Math.floor(c.y / VOX);
    const iz = Math.floor(c.z / VOX);
    const k = `${ix},${iy},${iz}`;
    let arr = voxels.get(k);
    if (!arr) { arr = []; voxels.set(k, arr); }
    arr.push(c);
  }
  const counts = [];
  for (const arr of voxels.values()) counts.push(arr.length);
  counts.sort((a, b) => a - b);
  const target = 1.8 * bustNeeded;
  let lo = 1, hi = counts[counts.length - 1] || 1, cap = hi;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    let sum = 0;
    for (const n of counts) sum += Math.min(n, mid);
    if (sum >= target) { cap = mid; hi = mid - 1; }
    else lo = mid + 1;
  }

  const pool = [];
  for (const arr of voxels.values()) {
    const take = Math.min(arr.length, cap);
    for (let i = 0; i < take; i++) pool.push(arr[i]);
  }
  shuffleInPlace(pool);
  const bust = pool.slice(0, bustNeeded);
  for (const d of bust) d.part = 1;

  const finalDots = bust.concat(leafKeep, visor.dots);
  if (finalDots.length !== DOT_COUNT) {
    // pad or trim edge case
    while (finalDots.length < DOT_COUNT) {
      const s = pool[finalDots.length % pool.length];
      finalDots.push({ ...s, part: 1, x: s.x + (rand() - 0.5) * 0.001, y: s.y + (rand() - 0.5) * 0.001, z: s.z + (rand() - 0.5) * 0.001 });
    }
    finalDots.length = DOT_COUNT;
  }

  for (const d of finalDots) d.aRand = rand();
  computeShade(finalDots, candidates);

  let minX = Infinity, maxX = -Infinity;
  const w = [0, 0, 0];
  for (const d of finalDots) {
    toWorld(d.x, d.y, d.z, w);
    d.wx = w[0]; d.wy = w[1]; d.wz = w[2];
    if (d.part >= 2) {
      if (d.wx < minX) minX = d.wx;
      if (d.wx > maxX) maxX = d.wx;
    }
  }

  return { dots: finalDots, glintMin: minX, glintMax: maxX };
}

const bustVert = /* glsl */`
uniform float uTime, uAssemble, uSize, uGlint, uShine;
uniform vec2 uHead;
uniform vec3 uLight, uRingCenter;
uniform float uRingRadius;
attribute float aRand, aPart;
attribute vec2 aShade;
attribute vec3 aNormal;
varying float vAlpha, vBright, vGlint, vShine, vPart, vR2;

mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}

void main(){
  vec3 home = position;
  vec3 n = normalize(aNormal);
  float head = smoothstep(-1.3, -0.6, home.y);
  vec3 pivot = vec3(0., -1., 0.);
  mat3 R = rotY(uHead.x * (0.25 + 0.75 * head)) * rotX(uHead.y * head);
  vec3 turnedHome = R * (home - pivot) + pivot;
  n = R * n;

  vec3 rested = turnedHome + n * sin(uTime * 1.4 + aRand * 60.0) * 0.006;

  float r2 = fract(sin(aRand * 91.7) * 43758.5453);
  float t = clamp((uAssemble - aRand * 0.45) / 0.55, 0.0, 1.0);
  float e = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  float ang = aRand * 6.28318530718;
  float rad = uRingRadius * (1.0 + (r2 - 0.5) * 0.06);
  vec3 start = uRingCenter + vec3(cos(ang) * rad, sin(ang) * rad, 0.0);
  vec3 arc = vec3(
    sin(aRand * 40.0 + uTime * 0.3),
    cos(aRand * 31.0),
    0.9 + r2 * 1.4
  ) * sin(e * 3.14159265) * 0.45;
  vec3 pos = mix(start, rested, e) + arc;

  vec3 toLight = uLight - pos;
  float lit = max(dot(n, normalize(toLight)), 0.0) / (1.0 + dot(toLight, toLight) * 0.32);
  float key = max(dot(n, normalize(vec3(-0.5, 0.6, 0.7))), 0.0);
  vec3 viewN = normalize((modelViewMatrix * vec4(n, 0.0)).xyz);
  float facing = viewN.z;
  float rim = pow(1.0 - abs(facing), 3.0);

  float b = 0.3 + key * 0.22 + lit * 1.5 + rim * 0.14;
  b *= mix(0.55, 1.0, smoothstep(-0.3, 0.25, facing));

  float ridge = aShade.x;
  float thin = aShade.y;
  b *= ridge > 0.0 ? (1.0 + ridge * 0.7) : (1.0 + ridge * 0.5);
  b += thin * (0.26 + key * 0.3);

  if (aPart > 1.5 && aPart < 2.5) b *= 0.9;
  if (aPart > 2.5) b *= 0.78;
  if (aPart > 3.5) b *= 0.7;
  b *= 0.7 + r2 * 0.5;

  float glint = 0.0;
  if (aPart > 1.5) {
    glint = smoothstep(0.09, 0.0, abs(home.x - uGlint));
    b += glint * 1.2;
  }

  float band = turnedHome.y - turnedHome.x * 0.5 - uShine;
  float shine = exp(-band * band * 4.0);
  b += shine * 1.3;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);
  gl_PointSize = uSize * (0.45 + r2 * r2 * 1.3) * (1.0 + shine * 0.6) / depth;

  vAlpha = mix(0.75, 1.0, e);
  vBright = b;
  vGlint = glint;
  vShine = shine;
  vPart = aPart;
  vR2 = r2;
}
`;

const bustFrag = /* glsl */`
uniform vec3 uInk, uBlue, uCream;
varying float vAlpha, vBright, vGlint, vShine, vPart, vR2;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float r2 = dot(p, p);
  if (r2 > 0.25) discard;
  float a = exp(-16.0 * r2) * vAlpha;
  vec3 ink = uInk;
  ink = mix(ink, uCream, vShine * 0.6);
  if (vPart > 3.5) ink = mix(ink, uBlue, 0.6);
  ink = mix(ink, uBlue, vGlint * 0.7);
  gl_FragColor = vec4(ink * vBright * a, a);
}
`;

const lightVert = /* glsl */`
uniform float uSize, uOn;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);
  gl_PointSize = uSize * uOn / depth;
}
`;

const lightFrag = /* glsl */`
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p) * 2.0;
  float core = smoothstep(0.14, 0.08, r);
  float glow = exp(-4.0 * r) * 0.45 + exp(-12.0 * r) * 0.7;
  float a = core + glow;
  gl_FragColor = vec4(vec3(1.0) * a, a);
}
`;

const dustVert = /* glsl */`
uniform float uTime, uSize, uOn;
attribute float aRand;
varying float vA, vR;
void main(){
  vec3 p = position;
  float rise = 0.03 + aRand * 0.05;
  p.y = mod(p.y + uTime * rise + 6.0, 12.0) - 6.0;
  p.x += sin(uTime * 0.2 + aRand * 40.0) * 0.15;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);
  gl_PointSize = uSize * (0.5 + aRand) / depth;
  vA = (0.1 + aRand * 0.18) * uOn;
  vR = aRand;
}
`;

const dustFrag = /* glsl */`
uniform vec3 uInk;
varying float vA;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float r2 = dot(p, p);
  if (r2 > 0.25) discard;
  float a = exp(-16.0 * r2) * vA;
  gl_FragColor = vec4(uInk * a, a);
}
`;

async function fetchModel(onProgress, signal) {
  const res = await fetch(MODEL_URL, { signal });
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  const total = Number(res.headers.get("Content-Length")) || 0;
  if (!res.body) {
    const buf = await res.arrayBuffer();
    onProgress(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(received / total);
    else onProgress(Math.min(0.95, received / (1.5 * 1024 * 1024)));
  }
  const buf = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }
  onProgress(1);
  return buf.buffer;
}

const abort = new AbortController();
cleanups.push(() => abort.abort());

function showNoWebGLFallback() {
  stage.dataset.fallback = "1";
  page.dataset.phase = "ready";
  counterEl.textContent = "";
  labelEl.textContent = "";
}

/**
 * Software renderer for browsers/GPUs where WebGL cannot be created.
 * Draws the same 66,000 sampled dots with Canvas 2D: same camera, same
 * light/head response, same assemble-from-ring entrance.
 */
function runCanvas2D(dots) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    showNoWebGLFallback();
    return;
  }
  stage.appendChild(canvas);
  stage.dataset.canvas2d = "1";

  const N = dots.length;
  const hx = new Float32Array(N), hy = new Float32Array(N), hz = new Float32Array(N);
  const nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N);
  const rnd = new Float32Array(N), r2a = new Float32Array(N);
  const part = new Uint8Array(N);
  const ridge = new Float32Array(N), thin = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const d = dots[i];
    hx[i] = d.wx; hy[i] = d.wy; hz[i] = d.wz;
    nx[i] = d.nx; ny[i] = d.ny; nz[i] = d.nz;
    rnd[i] = d.aRand;
    const s = Math.sin(d.aRand * 91.7) * 43758.5453;
    r2a[i] = s - Math.floor(s);
    part[i] = d.part;
    ridge[i] = d.ridge || 0;
    thin[i] = d.thin || 0;
  }

  const NB = 16;
  const bx = [], by = [], bs = [], bn = [];
  for (let c = 0; c < 2 * NB; c++) {
    bx.push(new Float32Array(N));
    by.push(new Float32Array(N));
    bs.push(new Float32Array(N));
    bn.push(0);
  }

  const tan15 = Math.tan((15 * Math.PI) / 180);
  const INK = "#c9d4b8";
  const BLUE = "#7fa8a3";
  const CREAM = "#f0e5c8";
  const pointer = { x: 0, y: 0, has: false, px: 0, py: 0, t: 0 };
  let W = 0, H = 0, dpr = 1;
  let visible = true;
  let stride = 1;
  let costAvg = 0;
  const start = performance.now();
  let last = start;
  let readySet = false;
  const lightPos = { x: -1.4, y: 1.2, z: 1.6 };
  const head = { x: 0, y: 0 };

  function resize() {
    W = root.clientWidth || window.innerWidth;
    H = root.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);
  cleanups.push(() => window.removeEventListener("resize", resize));

  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.px = e.clientX - rect.left;
    pointer.py = e.clientY - rect.top;
    pointer.has = true;
    if (e.pointerType === "touch") pointer.t = performance.now();
  };
  const onLeave = () => { pointer.has = false; };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onMove);
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  cleanups.push(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  });

  const io = new IntersectionObserver(
    ([entry]) => { visible = !!entry?.isIntersecting; },
    { threshold: 0.05, rootMargin: "10% 0px" },
  );
  io.observe(page);
  cleanups.push(() => io.disconnect());

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!visible) { last = now; return; }

    const t0 = performance.now();
    let dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05;
    last = now;
    const t = reduced ? 99 : (now - start) / 1000;
    const assemble = reduced ? 1 : Math.min(1, t / 2.6);

    if (!readySet && assemble > 0.55) {
      readySet = true;
      page.dataset.phase = "ready";
    }

    const aspect = W / H;
    const distance = Math.max(2.35 / tan15, 1.7 / (tan15 * aspect));
    const scale = (H / 2) / tan15;
    const cxp = W / 2;
    const cyp = H / 2;
    const ringR = 92 / (scale / distance);

    // Light + head targets (mirrors the WebGL path)
    const usePointer = pointer.has || (pointer.t && now - pointer.t < 1500);
    let lx, ly, lz = 2.6, htx, hty;
    if (usePointer && !reduced) {
      const span = tan15 * (distance - 2.6);
      lx = pointer.x * span * aspect;
      ly = -0.15 + pointer.y * span;
      htx = pointer.x * 0.35;
      hty = -pointer.y * 0.12;
    } else {
      const tt = reduced ? 0 : t;
      lx = 1.2 * Math.sin(0.45 * tt);
      ly = 0.5 + 0.8 * Math.cos(0.33 * tt);
      htx = 0.35 * Math.sin(0.45 * tt);
      hty = 0.12 * Math.cos(0.33 * tt);
    }
    const k = (rate) => 1 - Math.exp(-rate * dt);
    lightPos.x += (lx - lightPos.x) * k(5);
    lightPos.y += (ly - lightPos.y) * k(5);
    lightPos.z += (lz - lightPos.z) * k(5);
    head.x += (htx - head.x) * k(usePointer ? 3 : 1.5);
    head.y += (hty - head.y) * k(usePointer ? 3 : 1.5);

    const hyaw = head.x;
    const hpit = -head.y;
    const cY = Math.cos(hyaw), sY = Math.sin(hyaw);
    const cX = Math.cos(hpit), sX = Math.sin(hpit);

    // Shine sweep (same timing as shader path)
    let shine = 99;
    if (!reduced && t >= 2.34 && t <= 4.54) {
      const s = (t - 2.34) / 2.2;
      shine = 2.8 - (1 - (1 - s) * (1 - s)) * 7.4;
    }

    for (let c = 0; c < 2 * NB; c++) bn[c] = 0;

    const sizeBase = Math.max(1.1, H / 640);
    for (let i = 0; i < N; i += stride) {
      const aR = rnd[i];
      let x = hx[i], y = hy[i], z = hz[i];
      let nxx = nx[i], nyy = ny[i], nzz = nz[i];

      // Head turn about pivot (0,-1,0)
      const hd = y <= -1.3 ? 0 : y >= -0.6 ? 1 : (() => { const u = (y + 1.3) / 0.7; return u * u * (3 - 2 * u); })();
      if (hd > 0.001) {
        const yaw = hyaw * (0.25 + 0.75 * hd);
        const pit = hpit * hd;
        const cy2 = Math.cos(yaw), sy2 = Math.sin(yaw);
        const cx2 = Math.cos(pit), sx2 = Math.sin(pit);
        // rotY
        let px = x * cy2 + z * sy2;
        let pz = -x * sy2 + z * cy2;
        let py = y + 1;
        // rotX about pivot
        const py2 = py * cx2 - pz * sx2;
        const pz2 = py * sx2 + pz * cx2;
        x = px; y = py2 - 1; z = pz2;
        const n1x = nxx * cy2 + nzz * sy2;
        const n1z = -nxx * sy2 + nzz * cy2;
        const n2y = nyy * cx2 - n1z * sx2;
        const n2z = nyy * sx2 + n1z * cx2;
        nxx = n1x; nyy = n2y; nzz = n2z;
      }

      const home_y = hy[i];
      const homeX = hx[i];

      // Assemble from ring
      const tt = Math.min(1, Math.max(0, (assemble - aR * 0.45) / 0.55));
      const e = tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2;
      if (e < 1) {
        const ang = aR * 6.28318530718;
        const rad = ringR * (1 + (r2a[i] - 0.5) * 0.06);
        const sx0 = Math.cos(ang) * rad;
        const sy0 = -0.15 + Math.sin(ang) * rad;
        const arcA = Math.sin(e * Math.PI) * 0.45;
        x = sx0 + (x - sx0) * e + Math.sin(aR * 40 + t * 0.3) * arcA;
        y = sy0 + (y - sy0) * e + Math.cos(aR * 31) * arcA;
        z = z * e + (0.9 + r2a[i] * 1.4) * arcA;
      } else {
        const wob = Math.sin(t * 1.4 + aR * 60) * 0.006;
        x += nxx * wob; y += nyy * wob; z += nzz * wob;
      }

      const depth = distance - z;
      if (depth < 0.2) continue;
      const inv = scale / depth;
      const sx = cxp + x * inv;
      const sy = cyp - (y + 0.15) * inv;
      if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;

      // Lighting
      const tlx = lightPos.x - x, tly = lightPos.y - y, tlz = lightPos.z - z;
      const tl2 = tlx * tlx + tly * tly + tlz * tlz;
      const tl = Math.sqrt(tl2) || 1;
      const ndl = Math.max(0, (nxx * tlx + nyy * tly + nzz * tlz) / tl);
      const lit = ndl / (1 + tl2 * 0.32);
      const kd = Math.max(0, (nxx * -0.5 + nyy * 0.6 + nzz * 0.7) / 1.0488);
      const facing = nzz;
      const rim = Math.pow(1 - Math.abs(facing), 3);
      let b = 0.3 + kd * 0.22 + lit * 1.5 + rim * 0.14;
      const fs = Math.min(1, Math.max(0, (facing + 0.3) / 0.55));
      b *= 0.55 + 0.45 * (fs * fs * (3 - 2 * fs));

      const rg = ridge[i];
      b *= rg > 0 ? 1 + rg * 0.7 : 1 + rg * 0.5;
      b += thin[i] * (0.26 + kd * 0.3);

      const p = part[i];
      if (p > 1.5 && p < 2.5) b *= 0.9;
      if (p > 2.5) b *= 0.78;
      if (p > 3.5) b *= 0.7;
      b *= 0.7 + r2a[i] * 0.5;

      if (shine < 90) {
        const band = (home_y - homeX * 0.5) - shine;
        b += Math.exp(-band * band * 4) * 1.3;
      }

      const a = Math.min(1, b * 1.25) * (0.75 + 0.25 * e);
      if (a < 0.04) continue;
      const bi = Math.min(NB - 1, (a * NB) | 0);
      const ci = (p > 3.5 ? NB : 0) + bi;
      const s = sizeBase * (0.7 + r2a[i] * r2a[i] * 1.1) * (distance / depth);
      const n = bn[ci]++;
      bx[ci][n] = sx - s * 0.5;
      by[ci][n] = sy - s * 0.5;
      bs[ci][n] = s;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0f110d";
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    for (let c = 0; c < 2 * NB; c++) {
      const cnt = bn[c];
      if (!cnt) continue;
      ctx.globalAlpha = ((c % NB) + 0.5) / NB;
      ctx.fillStyle = c >= NB ? BLUE : INK;
      ctx.beginPath();
      const X = bx[c], Y = by[c], S = bs[c];
      for (let j = 0; j < cnt; j++) ctx.rect(X[j], Y[j], S[j], S[j]);
      ctx.fill();
    }

    // Cursor light glow
    if (usePointer && !reduced) {
      const gx = pointer.px, gy = pointer.py;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 120);
      g.addColorStop(0, "rgba(240,229,200,0.55)");
      g.addColorStop(0.15, "rgba(240,229,200,0.18)");
      g.addColorStop(1, "rgba(240,229,200,0)");
      ctx.globalAlpha = Math.min(1, assemble * 1.6);
      ctx.fillStyle = g;
      ctx.fillRect(gx - 120, gy - 120, 240, 240);
      ctx.globalAlpha = 1;
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Adaptive density: keep ~30fps+ on slow software paths
    const cost = performance.now() - t0;
    costAvg = costAvg ? costAvg * 0.9 + cost * 0.1 : cost;
    if (costAvg > 26 && stride < 4) { stride++; costAvg = 0; }
  }
  raf = requestAnimationFrame(frame);
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  });
}

async function main() {
  let buffer;
  try {
    buffer = await fetchModel(setProgress, abort.signal);
  } catch (e) {
    if (disposed || abort.signal.aborted) return;
    console.error("[hero] model fetch failed", e);
    counterEl.textContent = "Could not load";
    labelEl.textContent = "Refresh to try again";
    return;
  }

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buffer, "", resolve, reject);
  });

  let mesh = null;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!mesh && o.isMesh) mesh = o;
  });
  if (!mesh) {
    counterEl.textContent = "Could not load";
    labelEl.textContent = "Refresh to try again";
    return;
  }

  if (disposed) return;
  const { dots, glintMin, glintMax } = buildDotsFromMesh(mesh);
  setProgress(1);

  if (!reduced) await new Promise((r) => setTimeout(r, 380));
  if (disposed) return;

  // Renderer — try several context options; some GPUs/sandboxes reject high-performance.
  function makeRenderer() {
    const attrs = [
      { powerPreference: "default" },
      { powerPreference: "low-power" },
      { powerPreference: "high-performance" },
      {},
    ];
    for (const opts of attrs) {
      const canvas = document.createElement("canvas");
      const contextAttrs = {
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
        failIfMajorPerformanceCaveat: false,
        ...opts,
      };
      try {
        const gl =
          canvas.getContext("webgl2", contextAttrs) ||
          canvas.getContext("webgl", contextAttrs) ||
          canvas.getContext("experimental-webgl", contextAttrs);
        if (!gl) continue;
        return new THREE.WebGLRenderer({
          canvas,
          context: gl,
          antialias: false,
          powerPreference: opts.powerPreference || "default",
          failIfMajorPerformanceCaveat: false,
        });
      } catch {
        /* try next */
      }
    }
    return null;
  }

  const renderer = makeRenderer();
  if (!renderer) {
    // WebGL blocked (GPU blocklist / sandbox): draw the same dots in software.
    console.warn("[hero] WebGL unavailable, using Canvas 2D renderer.");
    runCanvas2D(dots);
    return;
  }
  renderer.setClearColor(0x0f110d, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const lookTarget = new THREE.Vector3(0, -0.15, 0);

  const positions = new Float32Array(DOT_COUNT * 3);
  const normals = new Float32Array(DOT_COUNT * 3);
  const aRand = new Float32Array(DOT_COUNT);
  const aPart = new Float32Array(DOT_COUNT);
  const aShade = new Float32Array(DOT_COUNT * 2);
  for (let i = 0; i < DOT_COUNT; i++) {
    const d = dots[i];
    positions[i * 3] = d.wx;
    positions[i * 3 + 1] = d.wy;
    positions[i * 3 + 2] = d.wz;
    // normals also scaled? Spec says normal is rotated with position; keep model-space direction
    normals[i * 3] = d.nx;
    normals[i * 3 + 1] = d.ny;
    normals[i * 3 + 2] = d.nz;
    aRand[i] = d.aRand;
    aPart[i] = d.part;
    aShade[i * 2] = d.ridge;
    aShade[i * 2 + 1] = d.thin;
  }

  const bustGeo = new THREE.BufferGeometry();
  bustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  bustGeo.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
  bustGeo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  bustGeo.setAttribute("aPart", new THREE.BufferAttribute(aPart, 1));
  bustGeo.setAttribute("aShade", new THREE.BufferAttribute(aShade, 2));

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bustUniforms = {
    uTime: { value: 0 },
    uAssemble: { value: reduced ? 1 : 0 },
    uSize: { value: 26 * dpr },
    uGlint: { value: -9 },
    uShine: { value: 99 },
    uHead: { value: new THREE.Vector2(0, 0) },
    uLight: { value: new THREE.Vector3(-1.4, 1.2, 1.6) },
    uRingCenter: { value: new THREE.Vector3(0, -0.15, 0) },
    uRingRadius: { value: 1 },
    uInk: { value: new THREE.Color("#c9d4b8") },
    uBlue: { value: new THREE.Color("#7fa8a3") },
    uCream: { value: new THREE.Color("#f0e5c8") },
  };

  const bustMat = new THREE.ShaderMaterial({
    uniforms: bustUniforms,
    vertexShader: bustVert,
    fragmentShader: bustFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const bustPoints = new THREE.Points(bustGeo, bustMat);
  bustPoints.frustumCulled = false;
  scene.add(bustPoints);

  // Cursor light
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  const lightUniforms = {
    uSize: { value: 240 * dpr },
    uOn: { value: reduced ? 1 : 0 },
  };
  const lightMat = new THREE.ShaderMaterial({
    uniforms: lightUniforms,
    vertexShader: lightVert,
    fragmentShader: lightFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lightPoints = new THREE.Points(lightGeo, lightMat);
  lightPoints.frustumCulled = false;
  lightPoints.position.copy(bustUniforms.uLight.value);
  scene.add(lightPoints);

  // Dust
  const DUST_N = 900;
  const dustPos = new Float32Array(DUST_N * 3);
  const dustRand = new Float32Array(DUST_N);
  for (let i = 0; i < DUST_N; i++) {
    dustPos[i * 3] = -9 + rand() * 18;
    dustPos[i * 3 + 1] = -6 + rand() * 12;
    dustPos[i * 3 + 2] = -6 + rand() * 8;
    dustRand[i] = rand();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aRand", new THREE.BufferAttribute(dustRand, 1));
  const dustUniforms = {
    uTime: { value: 0 },
    uSize: { value: 22 * dpr },
    uOn: { value: reduced ? 1 : 0 },
    uInk: { value: new THREE.Color("#c9d4b8") },
  };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    vertexShader: dustVert,
    fragmentShader: dustFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  scene.add(dustPoints);

  const planeZ = 2.6;
  const pointerNdc = new THREE.Vector2(0, 0);
  let hasPointer = false;
  let lastTouch = 0;
  const lightPos = bustUniforms.uLight.value.clone();
  const headVec = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
  const hitPoint = new THREE.Vector3();

  function onPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    hasPointer = true;
    if (e.pointerType === "touch") lastTouch = performance.now();
  }
  function onPointerLeave(e) {
    if (e.pointerType === "touch") return;
    hasPointer = false;
  }
  const onBlur = () => { hasPointer = false; };
  const onPointerUp = (e) => {
    if (e.pointerType === "touch") {
      lastTouch = performance.now();
      hasPointer = false;
    }
  };
  window.addEventListener("pointermove", onPointer);
  window.addEventListener("pointerdown", onPointer);
  document.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pointerup", onPointerUp);
  cleanups.push(() => {
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointerdown", onPointer);
    document.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pointerup", onPointerUp);
  });

  function resize() {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan15 = Math.tan((15 * Math.PI) / 180);
    const distance = Math.max(2.35 / tan15, 1.7 / (tan15 * camera.aspect));
    camera.position.set(0, -0.15, distance);
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();

    const worldPerCssPx = (2 * distance * tan15) / h;
    bustUniforms.uRingRadius.value = 92 * worldPerCssPx;
    bustUniforms.uRingCenter.value.set(0, -0.15, 0);
    bustUniforms.uSize.value = 26 * dpr;
    lightUniforms.uSize.value = 240 * dpr;
    dustUniforms.uSize.value = 22 * dpr;
  }
  window.addEventListener("resize", resize);
  cleanups.push(() => window.removeEventListener("resize", resize));
  resize();

  let start = performance.now();
  let last = start;
  let readySet = false;
  let glintStart = -1;
  let visible = true;
  let pausedAt = 0;

  const io = new IntersectionObserver(
    ([entry]) => {
      const nowVisible = !!entry?.isIntersecting;
      if (nowVisible === visible) return;
      visible = nowVisible;
      if (visible) {
        if (pausedAt) {
          const gap = performance.now() - pausedAt;
          start += gap;
          last += gap;
          pausedAt = 0;
        }
        if (!disposed) raf = requestAnimationFrame(frame);
      } else {
        pausedAt = performance.now();
        cancelAnimationFrame(raf);
      }
    },
    { root: null, threshold: 0.05, rootMargin: "10% 0px" }
  );
  io.observe(page);
  cleanups.push(() => io.disconnect());

  function frame(now) {
    if (disposed) return;
    if (!visible) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05;
    last = now;
    const t = reduced ? 0 : (now - start) / 1000;

    if (!reduced) {
      bustUniforms.uAssemble.value = Math.min(1, t / 2.6);
      bustUniforms.uTime.value = t;
      dustUniforms.uTime.value = t;
    } else {
      bustUniforms.uAssemble.value = 1;
      bustUniforms.uTime.value = 0;
      dustUniforms.uTime.value = 0;
    }

    // Fade light/dust
    const assemble = bustUniforms.uAssemble.value;
    if (!reduced) {
      const lightTarget = Math.min(1, 1.6 * assemble);
      lightUniforms.uOn.value = easeToward(lightUniforms.uOn.value, lightTarget, dt, 4);
      dustUniforms.uOn.value = easeToward(dustUniforms.uOn.value, 1, dt, 0.8);
    }

    if (!readySet && assemble > 0.55) {
      readySet = true;
      page.dataset.phase = "ready";
    }

    // Shine
    if (!reduced && t >= 2.34 && t <= 4.54) {
      const s = (t - 2.34) / 2.2;
      const ease = 1 - (1 - s) * (1 - s);
      bustUniforms.uShine.value = 2.8 - ease * 7.4;
    } else if (reduced) {
      bustUniforms.uShine.value = 99;
    } else if (t > 4.54) {
      bustUniforms.uShine.value = 99;
    }

    // Glint
    if (!reduced) {
      if (glintStart < 0 && t >= 4.6) glintStart = t;
      if (glintStart >= 0) {
        const cycle = (t - glintStart) % 4.2;
        if (cycle <= 0.9) {
          const g = cycle / 0.9;
          const from = glintMin - 0.15;
          const to = glintMax + 0.15;
          // Glint measured on home.x which is WORLD x (position attribute)
          bustUniforms.uGlint.value = from + (to - from) * g;
        } else {
          bustUniforms.uGlint.value = -9;
        }
      }
    }

    let usePointer = hasPointer;
    if (!hasPointer && lastTouch && performance.now() - lastTouch < 1500) {
      usePointer = true;
    }

    let lightTarget3 = new THREE.Vector3();
    let headTarget = new THREE.Vector2();

    if (usePointer && !reduced) {
      raycaster.setFromCamera(pointerNdc, camera);
      raycaster.ray.intersectPlane(hitPlane, hitPoint);
      lightTarget3.copy(hitPoint);
      headTarget.set(0.5 * pointerNdc.x, 0.18 * pointerNdc.y);
    } else if (usePointer && reduced) {
      raycaster.setFromCamera(pointerNdc, camera);
      raycaster.ray.intersectPlane(hitPlane, hitPoint);
      lightTarget3.copy(hitPoint);
      headTarget.set(0, 0);
    } else {
      const tt = reduced ? 0 : t;
      lightTarget3.set(
        1.9 * Math.sin(0.45 * tt),
        0.5 + 0.8 * Math.cos(0.33 * tt),
        2.6
      );
      headTarget.set(0.35 * Math.sin(0.45 * tt), 0.12 * Math.cos(0.33 * tt));
    }

    if (reduced) {
      lightPos.copy(lightTarget3);
      headVec.set(0, 0);
    } else if (usePointer) {
      lightPos.x = easeToward(lightPos.x, lightTarget3.x, dt, 5);
      lightPos.y = easeToward(lightPos.y, lightTarget3.y, dt, 5);
      lightPos.z = easeToward(lightPos.z, lightTarget3.z, dt, 5);
      headVec.x = easeToward(headVec.x, headTarget.x, dt, 3);
      headVec.y = easeToward(headVec.y, headTarget.y, dt, 3);
    } else {
      lightPos.x = easeToward(lightPos.x, lightTarget3.x, dt, 5);
      lightPos.y = easeToward(lightPos.y, lightTarget3.y, dt, 5);
      lightPos.z = easeToward(lightPos.z, lightTarget3.z, dt, 5);
      headVec.x = easeToward(headVec.x, headTarget.x, dt, 1.5);
      headVec.y = easeToward(headVec.y, headTarget.y, dt, 1.5);
    }

    bustUniforms.uLight.value.copy(lightPos);
    lightPoints.position.copy(lightPos);
    bustUniforms.uHead.value.set(headVec.x, -headVec.y);

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    bustGeo.dispose();
    bustMat.dispose();
    lightGeo.dispose();
    lightMat.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  });
}

main().catch((err) => {
  if (disposed) return;
  console.error(err);
  counterEl.textContent = "Could not load";
  labelEl.textContent = "Refresh to try again";
});

return () => {
  disposed = true;
  cancelAnimationFrame(raf);
  for (const fn of cleanups) fn();
};
}
