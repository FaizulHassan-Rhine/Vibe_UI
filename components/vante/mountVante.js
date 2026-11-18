import * as THREE from "three";

const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";
const WORK = [
  ["Roadster 3D", "designs/roadster-3d-car-landing.mp4"],
  ["Living Portrait", "aaaf/living-portrait-hero.mp4"],
  ["Particle Self", "aaaf/oraciteslArea.mp4"],
  ["Robot Jellyfish", "aaaf/medusa-jellyfish-hero.mp4"],
  ["Ink Reveal", "designs/ink-reveal-hover.mp4"],
  ["Space Voyage", "designs/space-voyage-video.mp4"],
  ["Helion Dispatch", "designs/helion-dispatch-landing.mp4"],
  ["Honey Bee", "designs/honey-bee-melli-landing.mp4"],
];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const out = (t) => 1 - (1 - t) ** 3;
const span = (p, a, b) => clamp((p - a) / (b - a));

function makeRenderer(canvas) {
  const prefs = ["default", "low-power", "high-performance", null];
  for (const powerPreference of prefs) {
    const contextAttrs = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
      ...(powerPreference ? { powerPreference } : {}),
    };
    try {
      const gl =
        canvas.getContext("webgl2", contextAttrs) ||
        canvas.getContext("webgl", contextAttrs) ||
        canvas.getContext("experimental-webgl", contextAttrs);
      if (!gl) continue;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: powerPreference || "default",
      });
      return renderer;
    } catch {
      /* try next */
    }
  }
  return null;
}

/* ---------- shared rail (identical to the WebGL path, no GL needed) ---------- */
const FB_CARD_W = 2.1,
  FB_CARD_H = 1.32,
  FB_GAP = 0.03,
  FB_STEP = FB_CARD_W + FB_GAP,
  FB_GZ = 8,
  FB_PX_W = 420,
  FB_PX_H = Math.round(420 / (FB_CARD_W / FB_CARD_H));

function makeRail() {
  const PH0 = -1.5,
    PH1 = Math.PI * 2 + 1.35,
    SAMPLES = 1200;
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160,
      ph = mix(PH0, PH1, t),
      cs = Math.cos(ph),
      u = 2 * t - 1;
    const depth = cs > 0 ? 7.6 + 16.4 * cs ** 0.9 : 7.6 + 2.2 * cs;
    const edge = 0.84 + 0.5 * span(0.14 - t, 0, 0.14) + 0.8 * span(t, 0.84, 1);
    pts.push(
      new THREE.Vector3(
        edge * Math.sin(ph) * depth * 0.561,
        0.5 * Math.sign(u) * Math.abs(u) ** 1.4 * depth * 0.63,
        -depth,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  curve.arcLengthDivisions = 1500;
  const L = curve.getLength();
  const P = [],
    T = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    P.push(curve.getPointAt(u));
    T.push(curve.getTangentAt(u));
  }
  const at = (s, op, ot) => {
    const f = clamp(s / L) * SAMPLES,
      i = Math.min(SAMPLES - 1, Math.floor(f)),
      k = f - i;
    op.lerpVectors(P[i], P[i + 1], k);
    ot.lerpVectors(T[i], T[i + 1], k).normalize();
  };
  return { L, at };
}

/** Unit square → arbitrary screen quad (Heckbert), as a CSS matrix3d for a w×h element. */
function quadMatrix(w, h, p0, p1, p2, p3) {
  const dx1 = p1[0] - p2[0],
    dx2 = p3[0] - p2[0],
    dx3 = p0[0] - p1[0] + p2[0] - p3[0],
    dy1 = p1[1] - p2[1],
    dy2 = p3[1] - p2[1],
    dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  let g = 0,
    hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    hh = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const ax = p1[0] - p0[0] + g * p1[0],
    bx = p3[0] - p0[0] + hh * p3[0],
    ay = p1[1] - p0[1] + g * p1[1],
    by = p3[1] - p0[1] + hh * p3[1];
  return `matrix3d(${ax / w},${ay / w},0,${g / w},${bx / h},${by / h},0,${hh / h},0,0,1,0,${p0[0]},${p0[1]},0,1)`;
}

/** DOM fallback when WebGL is sandboxed/blocked — same rail + grid, cards drawn as perspective quads. */
function mountFallback(root, $, track) {
  const stage = $("stage");
  const canvas = $("gl");
  if (canvas) canvas.style.display = "none";

  const layer = document.createElement("div");
  layer.className = "fx-fallback";
  layer.setAttribute("aria-hidden", "true");
  WORK.forEach(([title, src], i) => {
    const card = document.createElement("div");
    card.className = "fx-card";
    card.dataset.i = String(i);
    card.dataset.title = title;
    card.style.width = `${FB_PX_W}px`;
    card.style.height = `${FB_PX_H}px`;
    const v = document.createElement("video");
    Object.assign(v, {
      crossOrigin: "anonymous",
      muted: true,
      loop: true,
      playsInline: true,
      preload: "auto",
      src: R2 + src,
    });
    v.setAttribute("playsinline", "");
    card.appendChild(v);
    layer.appendChild(card);
  });
  stage.appendChild(layer);
  const cards = [...layer.querySelectorAll(".fx-card")];
  const videos = cards.map((c) => c.querySelector("video"));

  let target = 0,
    p = 0,
    disposed = false,
    raf = 0,
    W = innerWidth,
    H = innerHeight;

  const readScroll = () => {
    const total = Math.max(1, track.offsetHeight - innerHeight);
    target = clamp(-track.getBoundingClientRect().top / total);
  };
  addEventListener("scroll", readScroll, { passive: true });
  const onResize = () => {
    W = innerWidth;
    H = innerHeight;
  };
  addEventListener("resize", onResize);
  readScroll();

  const nameEl = $("name");
  const onPointerMove = (e) => {
    let hit = null;
    if (p > 0.86) {
      for (const c of cards) {
        if (c.style.opacity === "0") continue;
        const r = c.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) hit = c;
      }
    }
    nameEl.style.opacity = hit ? "1" : "0";
    if (hit) {
      nameEl.textContent = hit.dataset.title;
      nameEl.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 16}px)`;
    }
  };
  stage.addEventListener("pointermove", onPointerMove);

  const overlayChrome = [
    ...document.querySelectorAll(
      "[data-kolibrie] [data-nav], [data-kolibrie] [data-cursor-label], [data-kolibrie] [data-wipe], nav[aria-label='Site']",
    ),
  ];
  const hideChrome = (on) => {
    overlayChrome.forEach((el) => {
      el.style.opacity = on ? "0" : "";
      el.style.pointerEvents = on ? "none" : "";
      el.style.visibility = on ? "hidden" : "";
    });
  };
  const chromeIO = new IntersectionObserver(
    (entries) => hideChrome(entries.some((en) => en.isIntersecting)),
    { threshold: 0.02 },
  );
  chromeIO.observe(stage);

  /* ---------- camera (matches the WebGL path) ---------- */
  const rail = makeRail();
  const op = new THREE.Vector3(),
    ot = new THREE.Vector3(),
    up = new THREE.Vector3(),
    Yv = new THREE.Vector3(0, 1, 0),
    vp = new THREE.Vector3();
  const cam = () => {
    const asp = W / H;
    const tanH = asp < 16 / 9 ? 0.561 / asp : Math.tan((35 * Math.PI) / 360);
    return { asp, tanH };
  };
  const project = (x, y, z, c) => {
    const d = -z;
    return [(x / (d * c.tanH * c.asp) * 0.5 + 0.5) * W, (0.5 - (y / (d * c.tanH)) * 0.5) * H, d];
  };

  /** corners in order TL, TR, BR, BL (3D) for a card on the rail */
  function ribbonCorners(i, head) {
    const centre = head - i * FB_STEP;
    const out3 = [];
    for (const [lu, lv] of [
      [-0.5, 0.5],
      [0.5, 0.5],
      [0.5, -0.5],
      [-0.5, -0.5],
    ]) {
      rail.at(centre + lu * FB_CARD_W, op, ot);
      up.copy(Yv).addScaledVector(ot, -Yv.dot(ot)).normalize();
      vp.copy(op).addScaledVector(up, lv * FB_CARD_H);
      out3.push([vp.x, vp.y, vp.z]);
    }
    return out3;
  }

  function gridRect(i, cols, rows, c) {
    const vh = 2 * FB_GZ * c.tanH,
      vw = vh * c.asp,
      gw = vw * (cols === 3 ? 0.74 : 0.88),
      gap = gw * 0.017;
    const cw = (gw - gap * (cols - 1)) / cols,
      ch = cw / (FB_CARD_W / FB_CARD_H),
      gh = ch * rows + gap * 1.6 * (rows - 1);
    const col = i % cols,
      row = Math.floor(i / cols);
    return {
      x: -gw / 2 + cw / 2 + col * (cw + gap),
      y: gh / 2 - ch / 2 - row * (ch + gap * 1.6),
      w: cw,
      h: ch,
      vw,
      vh,
      c: col,
      r: row,
    };
  }

  function gridCorners(i, cols, rows, q, c) {
    const g = gridRect(i, cols, rows, c);
    const dx = (g.c - (cols - 1) / 2) * 1.2,
      dy = g.r < rows / 2 ? 1 : -1;
    const ox = dx * g.vw * 0.62 * (1 - q),
      oy = dy * g.vh * (g.c === 1 ? 0.95 : 0.34) * (1 - q),
      tilt = (1 - q) * 0.22 * (g.c - 1 || 0.5) * dy;
    const cs = Math.cos(tilt),
      sn = Math.sin(tilt);
    return [
      [-0.5, 0.5],
      [0.5, 0.5],
      [0.5, -0.5],
      [-0.5, -0.5],
    ].map(([lx, ly]) => {
      const x = lx * g.w,
        y = ly * g.h;
      return [g.x + ox + x * cs - y * sn, g.y + oy + x * sn + y * cs, -FB_GZ];
    });
  }

  /** place a card element on the screen quad of its 3D corners; videos never mirror */
  function place(card, c3, c) {
    let pts = c3.map(([x, y, z]) => project(x, y, z, c));
    const ex = pts[1][0] - pts[0][0],
      ey = pts[1][1] - pts[0][1],
      fx = pts[3][0] - pts[0][0],
      fy = pts[3][1] - pts[0][1];
    if (ex * fy - ey * fx < 0) pts = [pts[1], pts[0], pts[3], pts[2]];
    card.style.transform = quadMatrix(FB_PX_W, FB_PX_H, pts[0], pts[1], pts[2], pts[3]);
    const depth = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
    card.style.zIndex = String(Math.max(1, Math.round(4000 / depth)));
    card.style.opacity = "1";
  }

  const RIB_A = 0.14,
    RIB_B = 0.63;

  function render() {
    const pp = p;
    const rise = 1 - out(span(pp, 0, 0.12));
    const run = mix(-50, 76, span(pp, 0, 0.58));
    $("l1").style.transform = `translate3d(${run}vw,${rise * 34}vh,0)`;
    $("l2").style.transform = `translate3d(${-run}vw,${rise * 34}vh,0)`;
    const capA = 1 - span(pp, 0.52, 0.57);
    $("cap").style.opacity = String(capA);
    $("cap").style.transform = `translate(-50%,calc(-50% + ${rise * 34}vh))`;
    $("rule").style.transform = `scaleX(${ease(span(pp, 0.72, 0.86))})`;
    $("rule").style.top = "50%";

    const cols = W / H < 0.9 ? 2 : 3;
    const rows = W / H < 0.9 ? 3 : 2;
    const slots = cols * rows;
    const c = cam();
    const pr = span(pp, RIB_A, RIB_B),
      head = mix(0, rail.L + cards.length * FB_STEP, pr);

    cards.forEach((card, i) => {
      const v = videos[i];
      const s = head - i * FB_STEP,
        end = rail.L - FB_CARD_W;
      let visible = false;
      if (s < end) {
        // on the rail
        if (s > FB_CARD_W) {
          place(card, ribbonCorners(i, head), c);
          visible = true;
        }
      } else if (i < slots) {
        // leaves the rail → flies straight to its grid slot
        const st = mix(RIB_A, RIB_B, (end + i * FB_STEP) / (rail.L + cards.length * FB_STEP)),
          q = out(span(pp, st, st + 0.13));
        if (q > 0.001) {
          place(card, gridCorners(i, cols, rows, q, c), c);
          visible = true;
        }
      }
      if (!visible) card.style.opacity = "0";
      if (visible && v.paused) v.play().catch(() => {});
      else if (!visible && !v.paused) v.pause();
    });
  }

  function loop() {
    if (disposed) return;
    p += (target - p) * 0.09;
    if (Math.abs(target - p) < 0.00005) p = target;
    render();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    chromeIO.disconnect();
    hideChrome(false);
    removeEventListener("scroll", readScroll);
    removeEventListener("resize", onResize);
    stage.removeEventListener("pointermove", onPointerMove);
    videos.forEach((v) => {
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
    layer.remove();
  };
}

export function mountVante(root) {
  const $ = (id) => root.querySelector("#" + id);
  const track = $("track");
  const canvas = $("gl");
  if (!track || !canvas) return () => {};

  /* ---------- renderer ---------- */
  const renderer = makeRenderer(canvas);
  if (!renderer) {
    console.warn("[vante] WebGL unavailable — using DOM ribbon fallback.");
    return mountFallback(root, $, track);
  }
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene();
  const FOV = 35,
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  /* ---------- ribbon path ---------- */
  let path,
    PATH_L = 1;
  const SAMPLES = 1200,
    pathP = [],
    pathT = [];
  const PH0 = -1.5,
    PH1 = Math.PI * 2 + 1.35;
  function buildPath() {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160,
        ph = mix(PH0, PH1, t),
        cs = Math.cos(ph),
        u = 2 * t - 1;
      // a shallow arc close to the camera, then long runs far behind it
      const depth = cs > 0 ? 7.6 + 16.4 * cs ** 0.9 : 7.6 + 2.2 * cs;
      const edge = 0.84 + 0.5 * span(0.14 - t, 0, 0.14) + 0.8 * span(t, 0.84, 1);
      pts.push(
        new THREE.Vector3(
          edge * Math.sin(ph) * depth * 0.561,
          0.5 * Math.sign(u) * Math.abs(u) ** 1.4 * depth * 0.63,
          -depth,
        ),
      );
    }
    path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    path.arcLengthDivisions = 1500;
    PATH_L = path.getLength();
    pathP.length = pathT.length = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      pathP.push(path.getPointAt(u));
      pathT.push(path.getTangentAt(u));
    }
  }
  const at = (s, op, ot) => {
    const f = clamp(s / PATH_L) * SAMPLES,
      i = Math.min(SAMPLES - 1, Math.floor(f)),
      k = f - i;
    op.lerpVectors(pathP[i], pathP[i + 1], k);
    ot.lerpVectors(pathT[i], pathT[i + 1], k).normalize();
  };

  /* ---------- cards ---------- */
  const CARD_W = 2.1,
    CARD_H = 1.32,
    GAP = 0.03,
    STEP = CARD_W + GAP,
    NX = 28,
    NY = 3;
  const vs = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const fs = `uniform sampler2D map;uniform vec2 cover;uniform float aspect,ready,radius;varying vec2 vUv;
void main(){
  vec2 q=(abs(vUv-.5)-.5)*vec2(aspect,1.)+radius;
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
  float px=fwidth(d),a=1.-smoothstep(-px,px,d);
  if(a<.01)discard;
  vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;
  vec3 c=mix(vec3(.075),texture2D(map,(uv-.5)*cover+.5).rgb,ready);
  float edge=smoothstep(-.012-px,-.012,d);
  gl_FragColor=vec4(mix(c,vec3(1.),edge*.1),a);
}`;
  const cards = WORK.map(([title, src], i) => {
    const v = document.createElement("video");
    Object.assign(v, {
      crossOrigin: "anonymous",
      muted: true,
      loop: true,
      playsInline: true,
      preload: "auto",
      src: R2 + src,
    });
    v.setAttribute("playsinline", "");
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        map: { value: tex },
        cover: { value: new THREE.Vector2(1, 1) },
        aspect: { value: CARD_W / CARD_H },
        ready: { value: 0 },
        radius: { value: 0.018 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    const c = { i, title, v, tex, geo, mat, mesh, rect: null };
    v.addEventListener("loadeddata", () => {
      const va = v.videoWidth / v.videoHeight,
        ca = CARD_W / CARD_H;
      mat.uniforms.cover.value.set(va > ca ? ca / va : 1, va > ca ? 1 : va / ca);
      mat.uniforms.ready.value = 1;
    });
    return c;
  });

  /* ---------- layout ---------- */
  const GZ = 8;
  let W = 1,
    H = 1,
    asp = 1,
    cols = 3,
    rows = 2,
    tanH = 0.3153;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    asp = W / H;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    camera.aspect = asp;
    camera.fov = asp < 16 / 9 ? (Math.atan(0.561 / asp) * 360) / Math.PI : FOV;
    camera.updateProjectionMatrix();
    tanH = Math.tan((camera.fov * Math.PI) / 360);
    cols = asp < 0.9 ? 2 : 3;
    rows = asp < 0.9 ? 3 : 2;
  }
  addEventListener("resize", resize);
  resize();
  buildPath();
  function grid(i) {
    const vh = 2 * GZ * tanH,
      vw = vh * asp,
      gw = vw * (cols === 3 ? 0.74 : 0.88),
      gap = gw * 0.017;
    const cw = (gw - gap * (cols - 1)) / cols,
      ch = cw / (CARD_W / CARD_H),
      gh = ch * rows + gap * 1.6 * (rows - 1);
    const c = i % cols,
      r = Math.floor(i / cols);
    return {
      x: -gw / 2 + cw / 2 + c * (cw + gap),
      y: gh / 2 - ch / 2 - r * (ch + gap * 1.6),
      w: cw,
      h: ch,
      vw,
      vh,
      c,
      r,
    };
  }

  /* ---------- scroll (relative to #track on the Kolibrie page) ---------- */
  let target = 0,
    p = 0,
    frozen = false;
  const readScroll = () => {
    const total = Math.max(1, track.offsetHeight - innerHeight);
    target = clamp(-track.getBoundingClientRect().top / total);
  };
  addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  /* ---------- pose ---------- */
  const op = new THREE.Vector3(),
    ot = new THREE.Vector3(),
    up = new THREE.Vector3(),
    Y = new THREE.Vector3(0, 1, 0),
    vp = new THREE.Vector3();
  function poseRibbon(c, head) {
    const pos = c.geo.attributes.position,
      centre = head - c.i * STEP;
    for (let iy = 0; iy <= NY; iy++)
      for (let ix = 0; ix <= NX; ix++) {
        const k = iy * (NX + 1) + ix,
          lu = ix / NX - 0.5,
          lv = 0.5 - iy / NY;
        at(centre + lu * CARD_W, op, ot);
        // keep the sheet upright, leaning a little into the turn
        up.copy(Y).addScaledVector(ot, -Y.dot(ot)).normalize();
        vp.copy(op).addScaledVector(up, lv * CARD_H);
        pos.setXYZ(k, vp.x, vp.y, vp.z);
      }
    pos.needsUpdate = true;
  }
  function poseGrid(c, q) {
    const g = grid(c.i),
      pos = c.geo.attributes.position;
    // each card flies in from its own side: top row from above, bottom from below, outer from the sides
    const dx = (g.c - (cols - 1) / 2) * 1.2,
      dy = g.r < rows / 2 ? 1 : -1;
    const ox = dx * g.vw * 0.62 * (1 - q),
      oy = dy * g.vh * (g.c === 1 ? 0.95 : 0.34) * (1 - q),
      tilt = (1 - q) * 0.22 * (g.c - 1 || 0.5) * dy;
    const cs = Math.cos(tilt),
      sn = Math.sin(tilt);
    for (let iy = 0; iy <= NY; iy++)
      for (let ix = 0; ix <= NX; ix++) {
        const k = iy * (NX + 1) + ix,
          x = (ix / NX - 0.5) * g.w,
          y = (0.5 - iy / NY) * g.h;
        pos.setXYZ(
          k,
          g.x + ox + x * cs - y * sn,
          g.y + oy + x * sn + y * cs,
          -GZ - (1 - q) * 0.6 * Math.sin((ix / NX) * Math.PI),
        );
      }
    pos.needsUpdate = true;
    c.rect = g;
  }

  const RIB_A = 0.14,
    RIB_B = 0.63;
  function render() {
    const pp = p;
    // headline runs right across the page in opposite directions
    const rise = 1 - out(span(pp, 0, 0.12));
    const run = mix(-50, 76, span(pp, 0, 0.58));
    $("l1").style.transform = `translate3d(${run}vw,${rise * 34}vh,0)`;
    $("l2").style.transform = `translate3d(${-run}vw,${rise * 34}vh,0)`;
    const capA = 1 - span(pp, 0.52, 0.57);
    $("cap").style.opacity = capA;
    $("cap").style.transform = `translate(-50%,calc(-50% + ${rise * 34}vh))`;
    $("rule").style.transform = `scaleX(${ease(span(pp, 0.72, 0.86))})`;
    $("rule").style.top = "50%";
    // ribbon, then the grid
    const pr = span(pp, RIB_A, RIB_B),
      head = mix(0, PATH_L + cards.length * STEP, pr);
    const slots = cols * rows;
    for (const c of cards) {
      const s = head - c.i * STEP,
        end = PATH_L - CARD_W;
      if (s < end) {
        c.mesh.visible = s > CARD_W;
        c.rect = null;
        if (c.mesh.visible) poseRibbon(c, head);
      } else if (c.i < slots) {
        // each card flies to its slot the moment it leaves the rail, over .13 of scroll
        const st = mix(RIB_A, RIB_B, (end + c.i * STEP) / (PATH_L + cards.length * STEP)),
          q = out(span(pp, st, st + 0.13));
        c.mesh.visible = q > 0.001;
        if (c.mesh.visible) poseGrid(c, q);
      } else {
        c.mesh.visible = false;
        c.rect = null;
      }
    }
    renderer.render(scene, camera);
  }

  /* ---------- hover ---------- */
  const nameEl = $("name");
  const stage = $("stage");
  const onPointerMove = (e) => {
    let hit = null;
    if (p > 0.86) {
      const nx = e.clientX / W - 0.5,
        ny = 0.5 - e.clientY / H;
      for (const c of cards) {
        const g = c.rect;
        if (!g) continue;
        const x = nx * g.vw,
          y = ny * g.vh;
        if (Math.abs(x - g.x) < g.w / 2 && Math.abs(y - g.y) < g.h / 2) hit = c;
      }
    }
    nameEl.style.opacity = hit ? 1 : 0;
    if (hit) {
      nameEl.textContent = hit.title;
      nameEl.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 16}px)`;
    }
  };
  stage.addEventListener("pointermove", onPointerMove);

  // Hide Kolibrie chrome + site nav while this sticky stage is on screen
  const overlayChrome = [
    ...document.querySelectorAll(
      "[data-kolibrie] [data-nav], [data-kolibrie] [data-cursor-label], [data-kolibrie] [data-wipe], nav[aria-label='Site']",
    ),
  ];
  const hideChrome = (on) => {
    overlayChrome.forEach((el) => {
      el.style.opacity = on ? "0" : "";
      el.style.pointerEvents = on ? "none" : "";
      el.style.visibility = on ? "hidden" : "";
    });
  };
  const chromeIO = new IntersectionObserver(
    (entries) => {
      hideChrome(entries.some((en) => en.isIntersecting));
    },
    { threshold: 0.02 },
  );
  chromeIO.observe(stage);

  /* ---------- loop ---------- */
  let raf = 0;
  let disposed = false;
  function loop() {
    if (disposed) return;
    if (!frozen) {
      p += (target - p) * 0.09;
      if (Math.abs(target - p) < 0.00005) p = target;
      for (const c of cards) {
        if (c.mesh.visible && c.v.paused) c.v.play().catch(() => {});
        else if (!c.mesh.visible && !c.v.paused) c.v.pause();
      }
      render();
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    chromeIO.disconnect();
    hideChrome(false);
    removeEventListener("resize", resize);
    removeEventListener("scroll", readScroll);
    stage.removeEventListener("pointermove", onPointerMove);
    cards.forEach((c) => {
      c.v.pause();
      c.v.removeAttribute("src");
      c.v.load();
      c.tex.dispose();
      c.geo.dispose();
      c.mat.dispose();
      scene.remove(c.mesh);
    });
    renderer.dispose();
  };
}
