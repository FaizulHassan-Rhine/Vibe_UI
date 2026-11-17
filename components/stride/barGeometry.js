import * as THREE from "three";
import { BH } from "./data";

const CR = 0.062;

function puffZ(u, v) {
  const ex = Math.abs(2 * u - 1);
  const ev = Math.min(v, 1 - v);
  if (ev < CR) {
    return 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
  }
  const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
  const along = Math.pow(THREE.MathUtils.clamp((ev - CR) / 0.11, 0, 1), 0.7);
  return 0.012 + 0.118 * across * along + 0.004 * Math.sin(23 * u + 31 * v) * across;
}

function buildSide(sign) {
  const geo = new THREE.PlaneGeometry(1, BH, 30, 64);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    let u = uv.getX(i);
    const v = uv.getY(i);
    if (sign < 0) {
      u = 1 - u;
      uv.setX(i, u);
    }
    pos.setZ(i, sign * puffZ(u, v));
  }
  if (sign < 0) {
    const idx = geo.index;
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i);
        const b = idx.getX(i + 1);
        const c = idx.getX(i + 2);
        idx.setX(i, a);
        idx.setX(i + 1, c);
        idx.setX(i + 2, b);
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

let cached = null;

export function getBarGeometries() {
  if (!cached) {
    cached = { front: buildSide(1), back: buildSide(-1) };
  }
  return cached;
}

/** Call after HMR / geometry edits so the next mount rebuilds puff thickness. */
export function resetBarGeometries() {
  if (cached) {
    cached.front.dispose();
    cached.back.dispose();
    cached = null;
  }
}

export function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(30,18,40,.55)");
  grd.addColorStop(1, "rgba(30,18,40,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
