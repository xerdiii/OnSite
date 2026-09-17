/* ───────────────────────────────────────────────────────────────
   Xovah — the botanical hero
   Coral cherry blossoms, a ribbon of liquid glass, drifting petals, drawn
   live in WebGL behind the headline.

   Three depths, rendered separately and composited:
     BG   small, far blossoms and petals — blurred a little, faded to paper
     MID  the art-directed blossoms and the glass — sharp
     FG   huge blossoms at the frame edge — heavily blurred
   That is the depth of field. It is done with layers rather than a depth-
   based post pass because every blossom sits on a known plane; the result
   is cleaner and costs a fraction.

   Composition is written in screen space (-1..1 on both axes), measured off
   the art direction, and converted to world space at each element's depth
   on every resize — so the frame edges hold the flowers at any aspect.

   Motion is a breeze, not an animation: every branch and blossom has its
   own slow, incommensurate sway, scaled by depth, leaning with the pointer.
   Reduced motion gets a single still frame. Nothing runs off screen or in a
   background tab.
   ─────────────────────────────────────────────────────────────── */
import {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Group, Vector3, Vector2,
  WebGLRenderTarget, ShaderMaterial, Mesh, PlaneGeometry, Color, LinearSRGBColorSpace,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor
} from 'three';
import { rng, makeMaterials, blossom, bud, leafGeometry, stemGeometry, petalGeometry, coralTone } from './botany.js';
import { ribbon } from './ribbon.js';

const BG = 1, MID = 2, FG = 3;
const CAM_Z = 10, FOV = 30;
const TAU = Math.PI * 2;
const DEPTH = { [BG]: 0.45, [MID]: 1, [FG]: 1.7 };
/* Blossom scale per depth, matched to the art direction: a sharp blossom is
   about an eighth of the frame height across. */
const SCALE = { [BG]: 0.8, [MID]: 0.8, [FG]: 1.0 };
const lerp = (a, b, t) => a + (b - a) * t;

/* ── The art direction ─────────────────────────────────────────────
   Each branch: its layer and depth, the stem path, and what grows on it.
   Sizes are in blossom units (1 ≈ 8% of the frame height at MID). */
const BRANCHES = [
  { /* left, the main spray */
    layer: MID, z: 0.4, pivot: [-1.08, 0.05],
    stems: [
      { pts: [[-1.08, 0.05], [-0.9, 0.16], [-0.74, 0.24], [-0.62, 0.34], [-0.55, 0.47]], r0: 0.034, r1: 0.01 },
      { pts: [[-0.9, 0.16], [-0.84, 0.06], [-0.76, -0.01]], r0: 0.018, r1: 0.007 },
      { pts: [[-0.74, 0.24], [-0.79, 0.33], [-0.8, 0.4]], r0: 0.016, r1: 0.006 }
    ],
    blossoms: [
      { at: [-0.88, 0.2], size: 1.0, face: [0.2, 0.35, 0.5], seed: 101 },
      { at: [-0.8, 0.27], size: 1.08, face: [-0.15, 0.1, 1.3], seed: 102 },
      { at: [-0.69, 0.23], size: 1.02, face: [0.3, -0.25, 2.2], seed: 103 },
      { at: [-0.6, 0.37], size: 0.84, face: [0.2, 0.9, 4.1], seed: 104 },
      { at: [-0.75, -0.01], size: 0.94, face: [-0.35, 0.3, 0.9], seed: 105 }
    ],
    buds: [{ at: [-0.55, 0.48], rot: -0.4, seed: 151 }, { at: [-0.8, 0.41], rot: 0.3, seed: 152 }, { at: [-0.62, 0.05], rot: -1.2, seed: 153 }],
    leaves: [{ at: [-0.84, 0.12], rz: 2.2, seed: 161 }, { at: [-0.66, 0.29], rz: -0.8, seed: 162 }]
  },
  { /* left, low */
    layer: MID, z: 0.9, pivot: [-0.8, -1.05],
    stems: [
      { pts: [[-0.8, -1.05], [-0.72, -0.8], [-0.65, -0.56], [-0.6, -0.4]], r0: 0.03, r1: 0.009 },
      { pts: [[-0.72, -0.8], [-0.6, -0.72], [-0.52, -0.6]], r0: 0.016, r1: 0.006 }
    ],
    blossoms: [
      { at: [-0.64, -0.41], size: 0.9, face: [0.45, 0.25, 0.3], seed: 201 },
      { at: [-0.53, -0.59], size: 0.8, face: [0.25, -0.4, 2.7], seed: 202 },
      { at: [-0.72, -0.52], size: 0.7, face: [0.5, 0.6, 4.4], seed: 203 }
    ],
    buds: [{ at: [-0.58, -0.39], rot: -0.6, seed: 251 }],
    leaves: [{ at: [-0.69, -0.66], rz: -0.9, seed: 261 }]
  },
  { /* right, the upper spray, cropped by the frame */
    layer: MID, z: 0.2, pivot: [1.1, 0.95],
    stems: [
      { pts: [[1.1, 0.95], [0.96, 0.66], [0.9, 0.42], [0.84, 0.16], [0.72, -0.05]], r0: 0.036, r1: 0.01 },
      { pts: [[0.96, 0.66], [0.84, 0.52], [0.76, 0.34]], r0: 0.018, r1: 0.007 }
    ],
    blossoms: [
      { at: [0.9, 0.7], size: 1.25, face: [0.1, -0.2, 0.6], seed: 301 },
      { at: [0.96, 0.46], size: 1.08, face: [-0.2, -0.45, 2.0], seed: 302 },
      { at: [0.76, 0.33], size: 0.98, face: [0.3, 0.25, 4.2], seed: 303 },
      { at: [0.86, 0.1], size: 1.18, face: [0.05, -0.2, 1.1], seed: 304 },
      { at: [0.71, -0.06], size: 0.86, face: [0.25, 0.55, 3.3], seed: 305 }
    ],
    buds: [{ at: [0.82, 0.55], rot: 1.1, seed: 351 }, { at: [0.64, -0.1], rot: 2.0, seed: 352 }],
    leaves: [{ at: [0.92, 0.3], rz: 2.6, seed: 361 }, { at: [0.8, 0.02], rz: -2.2, seed: 362 }]
  },
  { /* right, low */
    layer: MID, z: 0.7, pivot: [0.62, -1.08], portraitShift: true,
    stems: [
      { pts: [[0.62, -1.08], [0.56, -0.82], [0.5, -0.55], [0.47, -0.32]], r0: 0.032, r1: 0.009 },
      { pts: [[0.56, -0.82], [0.66, -0.64], [0.68, -0.44]], r0: 0.018, r1: 0.007 }
    ],
    blossoms: [
      { at: [0.46, -0.29], size: 0.96, face: [0.35, 0.3, 0.4], seed: 401 },
      { at: [0.53, -0.44], size: 1.05, face: [0.1, -0.3, 2.8], seed: 402 },
      { at: [0.67, -0.42], size: 0.9, face: [-0.3, -0.5, 1.6], seed: 403 },
      { at: [0.44, -0.66], size: 0.92, face: [0.3, 0.4, 5.0], seed: 404 },
      { at: [0.58, -0.74], size: 0.84, face: [0.5, -0.1, 0.9], seed: 405 }
    ],
    buds: [{ at: [0.4, -0.2], rot: 0.5, seed: 451 }],
    leaves: [{ at: [0.5, -0.9], rz: 0.6, seed: 461 }, { at: [0.62, -0.6], rz: -1.9, seed: 462 }]
  }
];

/* Out of focus and larger than life, cropped by the frame. */
const FOREGROUND = [
  { at: [-0.92, -0.3], size: 2.3, face: [0.3, 0.5, 0.6], seed: 211 },
  { at: [-0.66, -0.88], size: 2.1, face: [0.5, 0.2, 2.1], seed: 221 },
  { at: [-1.0, 0.72], size: 1.5, face: [0.2, -0.4, 3.4], seed: 231 },
  { at: [0.88, -0.66], size: 2.8, face: [0.4, -0.3, 1.2], seed: 241 },
  { at: [1.0, -0.14], size: 1.7, face: [0.1, -0.6, 4.0], seed: 251 }
];

/* Far away: small, soft, quiet. */
const BACKGROUND = [
  { at: [-0.4, 0.84], size: 1.5, seed: 311 }, { at: [0.36, 0.9], size: 1.3, seed: 321 },
  { at: [-0.95, -0.62], size: 1.7, seed: 331 }, { at: [0.3, -0.84], size: 1.4, seed: 341 },
  { at: [0.64, 0.62], size: 1.3, seed: 351 }, { at: [-0.22, -0.9], size: 1.2, seed: 361 }
];

/* The glass: loops high on the left, falls beneath the words, rises out right. */
const GLASS = {
  wide: [[-0.43, 0.54, -0.9], [-0.55, 0.74, -0.8], [-0.74, 0.8, -0.6], [-0.92, 0.62, -0.35], [-0.95, 0.3, -0.1],
         [-0.82, -0.02, 0.15], [-0.56, -0.3, 0.35], [-0.2, -0.5, 0.5], [0.12, -0.56, 0.5], [0.42, -0.42, 0.4],
         [0.64, -0.14, 0.25], [0.84, 0.1, 0.1], [1.15, 0.26, -0.1]],
  tall: [[0.35, 0.66, -0.8], [-0.1, 0.86, -0.7], [-0.72, 0.8, -0.5], [-1.08, 0.46, -0.3], [-1.12, 0.0, -0.1],
         [-1.06, -0.38, 0.1], [-0.6, -0.62, 0.3], [0.05, -0.74, 0.4], [0.7, -0.64, 0.3], [1.25, -0.44, 0.1]]
};

function boot() {
  const host = document.querySelector('[data-bloom]');
  if (!host) return;
  const section = host.closest('section') || host;

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }                                   // no WebGL: the CSS ground stays
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);

  const shared = {
    uKey: { value: new Vector3(-0.55, 0.75, 0.62) },
    uFill: { value: new Vector3(0.8, -0.1, 0.5) },
    uBack: { value: new Vector3(0.25, 0.45, -1.0) },
    uDark: { value: 0 }
  };
  const mats = makeMaterials(shared);

  let width = 1, height = 1, aspect = 1, portrait = false;
  const halfH = (z) => Math.tan((FOV / 2) * Math.PI / 180) * (CAM_Z - z);

  /* Screen space to world, at a depth. On a phone the composition is
     remapped: everything is pushed into the top and bottom bands, clear of
     the headline, and pulled in from the edges a touch. */
  function place(nx, ny, z, layer) {
    if (portrait && layer !== BG) {
      nx = Math.sign(nx) * lerp(0.5, 1.02, Math.min(1, Math.abs(nx)));
      ny = ny >= 0 ? lerp(0.6, 1.0, Math.min(1, ny)) : -lerp(0.55, 1.0, Math.min(1, -ny));
    }
    const h = halfH(z);
    return new Vector3(nx * h * aspect, ny * h, z);
  }

  /* ── Build ──────────────────────────────────────────────────────── */
  const branches = [];
  const seeded = rng(4242);

  function bloomRec(obj, spec, layer) {
    return {
      obj, spec, layer,
      base: obj.rotation.clone(),
      ph: [seeded() * TAU, seeded() * TAU, seeded() * TAU, seeded() * TAU],
      w: 0.7 + seeded() * 0.6
    };
  }

  for (const spec of BRANCHES) {
    const pivot = new Group(), stems = new Group();
    pivot.add(stems);
    const items = [];
    for (const b of spec.blossoms) {
      const f = blossom(b.seed, mats, { size: b.size });
      f.rotation.set(b.face[0], b.face[1], b.face[2]);
      pivot.add(f);
      items.push(bloomRec(f, b, spec.layer));
    }
    for (const b of spec.buds || []) {
      const o = bud(b.seed, mats, 0.95);
      o.rotation.set(0.2, 0, b.rot);
      pivot.add(o);
      items.push(bloomRec(o, b, spec.layer));
    }
    for (const l of spec.leaves || []) {
      const o = new Mesh(leafGeometry(rng(l.seed), 0.26), mats.solid('#8fae9b', '#c7ded3', 0.14));
      o.rotation.set(0.5, 0, l.rz);
      pivot.add(o);
      items.push({ obj: o, spec: l, layer: spec.layer, base: o.rotation.clone(), ph: [0, 1, 2, 3], w: 1, leaf: true });
    }
    scene.add(pivot);
    branches.push({ spec, pivot, stems, items, ph: [seeded() * TAU, seeded() * TAU, seeded() * TAU], w: 0.75 + seeded() * 0.5 });
  }

  const singles = [];
  for (const [list, layer, z] of [[FOREGROUND, FG, 3.6], [BACKGROUND, BG, -5]]) {
    for (const b of list) {
      const pivot = new Group();
      const f = blossom(b.seed, mats, { size: b.size });
      f.rotation.set(b.face?.[0] ?? 0.2, b.face?.[1] ?? 0.1, b.face?.[2] ?? b.seed);
      pivot.add(f);
      scene.add(pivot);
      singles.push({ pivot, spec: { ...b, z }, layer, items: [bloomRec(f, { at: [0, 0] }, layer)], ph: [seeded() * TAU, seeded() * TAU, seeded() * TAU], w: 0.75 + seeded() * 0.5 });
    }
  }

  /* ── Drifting petals ─────────────────────────────────────────────── */
  const petals = [];
  (function drifting(count) {
    const r = rng(777);
    for (let i = 0; i < count; i++) {
      const layer = i % 6 === 0 ? FG : (i % 3 === 0 ? BG : MID);
      const z = layer === FG ? lerp(2.8, 4.4, r()) : layer === BG ? lerp(-6, -3.5, r()) : lerp(-1.4, 1.6, r());
      const len = layer === FG ? lerp(0.36, 0.6, r()) : layer === BG ? lerp(0.16, 0.24, r()) : lerp(0.08, 0.15, r());
      const pr = rng(9000 + i);
      const m = new Mesh(petalGeometry(pr, { len, cup: 0.9, wide: 1.15 }), mats.petal(i * 0.37, coralTone(pr), 1));
      m.layers.set(layer);
      scene.add(m);
      petals.push({
        m, layer, z,
        x: r() * 2 - 1, y: r() * 2 - 1,
        vx: lerp(0.025, 0.065, r()), vy: -lerp(0.03, 0.08, r()),
        ph: [r() * TAU, r() * TAU, r() * TAU], w: [lerp(0.25, 0.6, r()), lerp(0.15, 0.4, r()), lerp(0.2, 0.5, r())],
        spin: lerp(-0.3, 0.3, r())
      });
    }
  })(window.innerWidth < 768 ? 14 : 28);

  let glass = null;

  /* ── Layout ──────────────────────────────────────────────────────── */
  let quality = 1;
  function layout() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    aspect = width / height;
    portrait = aspect < 0.9;
    const small = width < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5) * quality);
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const pw = Math.max(1, Math.round(canvas.width * 0.5)), ph = Math.max(1, Math.round(canvas.height * 0.5));
    for (const k in rt) rt[k].setSize(pw, ph);

    const shrink = portrait ? 0.68 : Math.min(1, Math.max(0.78, aspect / 1.78));

    for (const br of branches) {
      const { spec } = br;
      const origin = place(spec.pivot[0], spec.pivot[1], spec.z, spec.layer);
      /* Everything on a branch is placed relative to its pivot as one rigid
         piece. On a phone only the pivot is remapped, and the branch keeps
         its landscape proportions at a smaller scale — remapping each point
         separately pulled stems apart across the whole height. */
      const refAspect = portrait ? 1.7 : aspect;
      const k = portrait ? 0.55 : 1;
      const rel = (nx, ny, z) => {
        const h = halfH(z);
        return new Vector3((nx - spec.pivot[0]) * h * refAspect * k, (ny - spec.pivot[1]) * h * k, z - spec.z);
      };
      br.basePos = origin;
      br.pivot.position.copy(origin);

      /* stems are rebuilt: their shape is a function of the frame */
      br.stems.children.forEach((m) => m.geometry.dispose());
      br.stems.clear();
      for (const st of spec.stems) {
        const pts = st.pts.map((p, i) => rel(p[0], p[1], spec.z + (i % 2 ? 0.05 : 0)));
        const { geometry } = stemGeometry(pts, st.r0 * shrink * 0.72, st.r1 * shrink * 0.8);
        br.stems.add(new Mesh(geometry, mats.solid('#7d4a3f', '#b27a69', 0.2)));
      }
      for (const it of br.items) {
        const p = rel(it.spec.at[0], it.spec.at[1], spec.z + (it.leaf ? 0 : 0.12));
        it.obj.position.copy(p);
        it.z = p.z;
        it.obj.scale.setScalar(shrink * (it.leaf ? 0.8 : SCALE[spec.layer]));
      }
      br.pivot.traverse((o) => o.layers.set(spec.layer));
    }
    for (const s of singles) {
      const p = place(s.spec.at[0], s.spec.at[1], s.spec.z, s.layer);
      s.basePos = p;
      s.pivot.position.copy(p);
      s.items[0].z = 0;
      s.pivot.scale.setScalar(shrink * SCALE[s.layer]);
      s.pivot.traverse((o) => o.layers.set(s.layer));
    }
    for (const p of petals) p.bounds = { w: halfH(p.z) * aspect * 1.12, h: halfH(p.z) * 1.12 };

    if (glass) { scene.remove(glass); glass.geometry.dispose(); glass.material.dispose(); }
    const path = (portrait ? GLASS.tall : GLASS.wide).map(([nx, ny, z]) => {
      const h = halfH(z);
      return new Vector3(nx * h * aspect, ny * h, z);
    });
    glass = ribbon(path, shared, { width: (portrait ? 0.32 : 0.54) * Math.max(0.85, shrink), twists: portrait ? 1.2 : 1.8 });
    glass.layers.set(MID);
    scene.add(glass);
  }

  /* ── Depth of field ──────────────────────────────────────────────── */
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const blurMat = new ShaderMaterial({
    uniforms: { tSrc: { value: null }, uStep: { value: new Vector2() } },
    vertexShader: QUAD_VERT,
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uStep; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tSrc, vUv) * 0.2270270270;
        c += texture2D(tSrc, vUv + uStep * 1.3846153846) * 0.3162162162;
        c += texture2D(tSrc, vUv - uStep * 1.3846153846) * 0.3162162162;
        c += texture2D(tSrc, vUv + uStep * 3.2307692308) * 0.0702702703;
        c += texture2D(tSrc, vUv - uStep * 3.2307692308) * 0.0702702703;
        gl_FragColor = c;
      }`,
    depthTest: false, depthWrite: false
  });
  const compMat = new ShaderMaterial({
    uniforms: { tSrc: { value: null }, uOpacity: { value: 1 }, uPaper: { value: new Color(1, 1, 1) }, uFog: { value: 0 } },
    vertexShader: QUAD_VERT,
    fragmentShader: `
      uniform sampler2D tSrc; uniform float uOpacity; uniform vec3 uPaper; uniform float uFog; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tSrc, vUv);
        c.rgb = mix(c.rgb, uPaper * c.a, uFog);
        gl_FragColor = c * uOpacity;
      }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), blurMat);
  const quadScene = new Scene();
  quadScene.add(quad);
  const rt = { bg: new WebGLRenderTarget(1, 1), bgTmp: new WebGLRenderTarget(1, 1), fg: new WebGLRenderTarget(1, 1), fgTmp: new WebGLRenderTarget(1, 1) };

  function blur(target, tmp, radius, passes) {
    quad.material = blurMat;
    for (let i = 0; i < passes; i++) {
      blurMat.uniforms.tSrc.value = target.texture;
      blurMat.uniforms.uStep.value.set(radius / target.width, 0);
      renderer.setRenderTarget(tmp); renderer.clear(); renderer.render(quadScene, quadCam);
      blurMat.uniforms.tSrc.value = tmp.texture;
      blurMat.uniforms.uStep.value.set(0, radius / target.height);
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(quadScene, quadCam);
    }
  }
  function composite(texture, opacity, fog) {
    quad.material = compMat;
    compMat.uniforms.tSrc.value = texture;
    compMat.uniforms.uOpacity.value = opacity;
    compMat.uniforms.uFog.value = fog;
    renderer.render(quadScene, quadCam);
  }

  let dark = false;
  function draw() {
    const blurScale = Math.max(0.8, rt.bg.width / 720);

    camera.layers.set(BG);
    renderer.setRenderTarget(rt.bg); renderer.clear(); renderer.render(scene, camera);
    blur(rt.bg, rt.bgTmp, 1.5 * blurScale, 2);

    camera.layers.set(FG);
    renderer.setRenderTarget(rt.fg); renderer.clear(); renderer.render(scene, camera);
    /* several narrow passes rather than a few wide ones: a wide step skips
       texels at half resolution and leaves a visible grid in the bokeh */
    blur(rt.fg, rt.fgTmp, 1.7 * blurScale, 5);

    renderer.setRenderTarget(null);
    renderer.clear();
    composite(rt.bg.texture, dark ? 0.6 : 0.72, dark ? 0.3 : 0.28);
    renderer.clearDepth();
    camera.layers.set(MID);
    glass.material.uniforms.uBehind.value = rt.bg.texture;
    glass.material.uniforms.uRes.value = [canvas.width, canvas.height];
    renderer.render(scene, camera);
    composite(rt.fg.texture, 0.97, 0.0);
  }

  /* ── Motion ──────────────────────────────────────────────────────── */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  function sway(group, t) {
    const d = DEPTH[group.layer ?? group.spec.layer];
    const slow = (group.layer ?? group.spec.layer) === BG ? 0.6 : 1;
    const f = group.w * slow * TAU;
    const [a, b, e] = group.ph;
    const gust = 0.72 + 0.28 * Math.sin(t * 0.11) * Math.sin(t * 0.047 + 1.3);
    const s = 0.62 * Math.sin(t * 0.075 * f + a) + 0.38 * Math.sin(t * 0.128 * f + b);
    group.pivot.rotation.z = 0.014 * d * gust * s - pointer.x * 0.016 * d;
    group.pivot.rotation.x = 0.01 * d * Math.sin(t * 0.061 * f + e) + pointer.y * 0.01 * d;
    const par = d > 1 ? 0.24 : d < 1 ? 0.03 : 0.08;
    group.pivot.position.x = group.basePos.x - pointer.x * par;
    group.pivot.position.y = group.basePos.y - pointer.y * par * 0.7;

    for (const it of group.items) {
      const w = it.w * slow * TAU;
      const amp = it.leaf ? 0.6 : 1;
      it.obj.rotation.x = it.base.x + 0.05 * d * amp * Math.sin(t * 0.09 * w + it.ph[0]);
      it.obj.rotation.y = it.base.y + 0.06 * d * amp * Math.sin(t * 0.07 * w + it.ph[1]);
      it.obj.rotation.z = it.base.z + 0.035 * d * amp * Math.sin(t * 0.05 * w + it.ph[2]);
      it.obj.position.z = it.z + 0.04 * d * Math.sin(t * 0.06 * w + it.ph[3]);
    }
  }

  function update(t, dt) {
    const k = 1 - Math.exp(-dt * 1.8);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;

    for (const br of branches) sway(br, t);
    for (const s of singles) sway(s, t);

    const gust = 0.72 + 0.28 * Math.sin(t * 0.11) * Math.sin(t * 0.047 + 1.3);
    for (const p of petals) {
      const d = DEPTH[p.layer];
      const pace = d > 1 ? 1.35 : d < 1 ? 0.6 : 1;
      p.x += (p.vx * (0.7 + 0.5 * gust) + Math.sin(t * p.w[0] + p.ph[0]) * 0.025) * dt * pace;
      p.y += (p.vy + Math.sin(t * p.w[1] + p.ph[1]) * 0.018) * dt * pace;
      if (p.x > 1.08) p.x = -1.08;
      if (p.y < -1.08) { p.y = 1.08; p.x = ((p.x + 1.6) % 2) - 1; }
      const B = p.bounds;
      p.m.position.set(p.x * B.w - pointer.x * 0.1 * d, p.y * B.h - pointer.y * 0.07 * d, p.z);
      /* A falling petal flutters and turns, but mostly shows its face: an
         edge-on petal is a sliver, and a sliver reads as a scratch. */
      p.m.rotation.set(
        0.25 + Math.sin(t * p.w[2] + p.ph[2]) * 0.55,
        Math.sin(t * p.spin + p.ph[0]) * 0.7,
        t * p.spin * 0.6 + p.ph[1]
      );
    }
    glass.material.uniforms.uTime.value = t;
  }

  /* ── Theme ───────────────────────────────────────────────────────── */
  function readTheme() {
    dark = document.documentElement.getAttribute('data-theme') === 'dark';
    shared.uDark.value = dark ? 1 : 0;
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--c-paper').trim().split(/\s+/).map(Number);
    if (paper.length === 3 && paper.every((v) => !isNaN(v))) compMat.uniforms.uPaper.value.setRGB(paper[0] / 255, paper[1] / 255, paper[2] / 255);
  }

  /* ── Lifecycle ───────────────────────────────────────────────────── */
  let running = false, visible = true, last = 0, clock = 0, raf = 0, slowFrames = 0;
  /* While the page is being scrolled the scene holds its frame: the GPU and
     the main thread go to the scroll, and the flowers pick up where they
     left off a moment after it stops. */
  let scrolledAt = 0;
  window.addEventListener('scroll', () => { scrolledAt = performance.now(); }, { passive: true });
  const STILL_T = 7.3;

  new MutationObserver(() => { readTheme(); if (!running) draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  readTheme();
  layout();
  update(STILL_T, 0.016);
  draw();
  host.classList.add('is-ready');

  function frame(now) {
    raf = 0;
    if (!running) return;
    if (now - scrolledAt < 160) { last = 0; slowFrames = 0; raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    clock += dt;
    update(STILL_T + clock, dt);
    draw();
    /* A struggling device draws fewer pixels rather than dropping frames. */
    slowFrames = dt > 0.028 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && quality > 0.6) { quality -= 0.2; slowFrames = 0; layout(); }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce.matches || !visible || document.hidden) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(section);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if (reduce.addEventListener) {
    reduce.addEventListener('change', () => { if (reduce.matches) { stop(); update(STILL_T, 0.016); draw(); } else start(); });
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); update(STILL_T + clock, 0.016); draw(); }, 120);
  });

  start();

  /* A small handle for checking composition without waiting on the clock. */
  window.XovahBloom = {
    still(t = STILL_T) { stop(); update(t, 0.016); draw(); },
    start,
    /* zoom the camera onto a screen point, to inspect detail */
    inspect(nx = 0, ny = 0, zoom = 1) {
      stop();
      camera.fov = FOV / zoom;
      const h = halfH(0);
      camera.position.set(nx * h * aspect, ny * h, CAM_Z);
      camera.updateProjectionMatrix();
      update(STILL_T, 0.016); draw();
    },
    reset() { camera.fov = FOV; camera.position.set(0, 0, CAM_Z); camera.updateProjectionMatrix(); update(STILL_T, 0.016); draw(); },
    /* debugging aids: show or hide a whole family of elements */
    show(what, on) {
      const set = what === 'petals' ? petals.map((p) => p.m)
        : what === 'glass' ? [glass]
        : what === 'fg' ? singles.filter((s) => s.layer === FG).map((s) => s.pivot)
        : what === 'bg' ? singles.filter((s) => s.layer === BG).map((s) => s.pivot)
        : branches.map((b) => b.pivot);
      set.forEach((o) => { o.visible = on; });
      update(STILL_T, 0.016); draw();
    }
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
