import * as THREE from "three";
import { FLAVORS, NUTRITION, SW, BH } from "./data";

function mixInk(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const ir = Math.round(r + (0x1c - r) * 0.78);
  const ig = Math.round(g + (0x1a - g) * 0.78);
  const ib = Math.round(b + (0x1f - b) * 0.78);
  return `rgb(${ir},${ig},${ib})`;
}

function seedRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function drawBarcode(ctx, W, H, y, ink, mono) {
  const cardW = W * 0.42;
  const cardH = H * 0.075;
  const x = (W - cardW) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, x, y - cardH / 2, cardW, cardH, W * 0.012);
  ctx.fill();
  const rand = seedRand(42);
  const pad = cardW * 0.08;
  let bx = x + pad;
  const by = y - cardH * 0.28;
  const bh = cardH * 0.42;
  ctx.fillStyle = ink;
  while (bx < x + cardW - pad) {
    const bw = 1 + rand() * 3.2;
    if (rand() > 0.28) ctx.fillRect(bx, by, bw, bh);
    bx += bw + 0.8 + rand();
  }
  ctx.font = `400 ${W * 0.018}px ${mono || '"DM Mono", monospace'}`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.fillText("8 40129 00112 4", W / 2, y + cardH * 0.38);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function loadSheetImage(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  return img;
}

export function buildFlavorTextures(sheetImg, flavorIndex, fonts = {}) {
  const disp = fonts.disp || '"Archivo Black", sans-serif';
  const mono = fonts.mono || '"DM Mono", monospace';
  const f = FLAVORS[flavorIndex];
  const [sx, sy, sw, sh] = f.wrap;
  const pad = 4;
  const srcX = (sx - pad) * (sheetImg.naturalWidth / SW);
  const srcY = (sy - pad) * (sheetImg.naturalHeight / 1520);
  const srcW = (sw + pad * 2) * (sheetImg.naturalWidth / SW);
  const srcH = (sh + pad * 2) * (sheetImg.naturalHeight / 1520);

  const W = Math.round((sw + 8) * 1.5 * 0.75);
  const H = Math.round(W * BH);

  // Front
  const front = document.createElement("canvas");
  front.width = W;
  front.height = H;
  const fctx = front.getContext("2d");
  fctx.drawImage(sheetImg, srcX, srcY, srcW, srcH, 0, 0, W, H);

  // Back
  const back = document.createElement("canvas");
  back.width = W;
  back.height = H;
  const ctx = back.getContext("2d");
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sheetImg, srcX, srcY, srcW, srcH, 0, 0, W, H);
  ctx.restore();

  const seal = H * 0.075;
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = hexA(f.color, 0.9);
  ctx.fillRect(0, seal, W, H - seal * 2);
  ctx.fillStyle = hexA(f.color, 0.35);
  ctx.fillRect(0, 0, W, seal);
  ctx.fillRect(0, H - seal, W, seal);

  const sheen = ctx.createLinearGradient(0, seal, 0, H - seal);
  sheen.addColorStop(0, "rgba(0,0,0,.10)");
  sheen.addColorStop(0.28, "rgba(255,255,255,.14)");
  sheen.addColorStop(0.5, "transparent");
  sheen.addColorStop(0.8, "rgba(0,0,0,.04)");
  sheen.addColorStop(1, "rgba(0,0,0,.14)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, seal, W, H - seal * 2);
  ctx.globalCompositeOperation = "source-over";

  const ink = mixInk(f.color);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = `400 ${W * 0.085}px ${disp}`;
  ctx.fillText("STRIDE", W / 2, H * 0.15);
  ctx.font = `500 ${W * 0.042}px ${mono}`;
  ctx.fillText(`${f.name.toUpperCase()} · 50 G`, W / 2, H * 0.185);

  const px = W * 0.15;
  const py = H * 0.215;
  const pw = W * 0.7;
  const ph = H * 0.36;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, px, py, pw, ph, W * 0.03);
  ctx.fill();

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = `400 ${W * 0.058}px ${disp}`;
  ctx.fillText("NUTRITION", W / 2, py + H * 0.045);
  ctx.font = `400 ${W * 0.032}px ${mono}`;
  ctx.fillText("Serving size 1 bar (50 g)", W / 2, py + H * 0.078);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.1, py + H * 0.095);
  ctx.lineTo(px + pw * 0.9, py + H * 0.095);
  ctx.stroke();

  let ry = py + H * 0.12;
  NUTRITION.forEach(([lab, val], i) => {
    ctx.font = `${i < 2 ? 500 : 400} ${W * 0.032}px ${mono}`;
    ctx.textAlign = "left";
    ctx.fillText(lab, px + pw * 0.08, ry);
    ctx.textAlign = "right";
    ctx.fillText(val, px + pw * 0.92, ry);
    ctx.strokeStyle = "rgba(28,26,31,0.18)";
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.08, ry + H * 0.012);
    ctx.lineTo(px + pw * 0.92, ry + H * 0.012);
    ctx.stroke();
    ry += H * 0.034;
  });

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = `500 ${W * 0.034}px ${mono}`;
  ctx.fillText("INGREDIENTS", W / 2, H * 0.62);
  ctx.font = `400 ${W * 0.034}px ${mono}`;
  const lines = wrapText(ctx, f.ingredients, W * 0.7);
  lines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, H * 0.645 + i * H * 0.022);
  });

  drawBarcode(ctx, W, H, H * 0.735, ink, mono);

  ctx.font = `500 ${W * 0.034}px ${mono}`;
  ctx.fillText("PRESSED, NOT BAKED", W / 2, H * 0.885);

  const mk = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  };

  return { front: mk(front), back: mk(back) };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
