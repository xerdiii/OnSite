import {
  BufferGeometry, Float32BufferAttribute, Group, Mesh, ShaderMaterial, Color,
  Vector3, Quaternion, Matrix4, InstancedMesh, SphereGeometry, CylinderGeometry,
  CatmullRomCurve3, DoubleSide
} from 'three';
import { SURFACE_VERT, PETAL_FRAG, SOLID_FRAG } from './shaders.js';

/* ── Deterministic randomness ──────────────────────────────────────
   Every flower is built from a seed, so the composition is identical on
   every visit. Art direction should not reshuffle on reload. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ── Surfaces ───────────────────────────────────────────────────────
   A petal is a grid in (s, t): s runs across the blade from -1 to 1, t from
   the claw at the base (0) to the rim (1). The outline is shaped in x/y and
   the form in z, so no alpha cut-out is ever needed: edges are real geometry,
   antialiased by the renderer instead of fringed by a texture. */
function surface(cols, rows, fn) {
  const pos = [], st = [], idx = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const s = (i / cols) * 2 - 1, t = j / rows;
      const p = fn(s, t);
      pos.push(p[0], p[1], p[2]);
      st.push(s, t);
    }
  }
  const w = cols + 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aSt', new Float32BufferAttribute(st, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Cherry-blossom petal: narrow claw, broad rounded blade, a shallow notch
   at the tip, cupped across its width, the rim curling back, and a slight
   ruffle and asymmetry so no two read as copies. */
export function petalGeometry(r, opts = {}) {
  const len = opts.len ?? 1;
  const wid = lerp(0.46, 0.56, r()) * (opts.wide ?? 1);
  const notch = lerp(0.05, 0.11, r());
  const cup = lerp(0.10, 0.20, r()) * (opts.cup ?? 1);
  const curl = lerp(0.04, 0.12, r());
  const asym = lerp(-0.08, 0.08, r());
  const ph1 = r() * 6.28, ph2 = r() * 6.28;
  const ruffle = lerp(0.008, 0.022, r());

  return surface(18, 22, (s, t) => {
    const half = len * (wid * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, t / 0.78)), 0.72) *
      (t > 0.78 ? lerp(1, 0.9, (t - 0.78) / 0.22) : 1) + 0.035 * (1 - t));
    const round = 0.80 + 0.20 * Math.sqrt(Math.max(0, 1 - s * s));
    const nch = notch * Math.exp(-(s * s) / 0.018);
    const tipLen = len * (round - nch);
    const y = t * tipLen;
    let x = s * half + asym * t * t * len;
    const wave = Math.sin(s * 5.0 + ph1) * Math.sin(t * 7.0 + ph2);
    let z = cup * s * s * Math.sin(Math.PI * Math.min(1, t * 0.95)) * len;
    z -= curl * Math.pow(t, 2.6) * len;
    z += ruffle * wave * t * len;
    return [x, y, z];
  });
}

/* A slim, pointed leaf with a fold along its midrib. */
export function leafGeometry(r, len = 1) {
  const wid = lerp(0.16, 0.22, r());
  const fold = lerp(0.04, 0.08, r());
  const bend = lerp(-0.12, 0.12, r());
  return surface(10, 16, (s, t) => {
    const half = len * wid * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9);
    const y = t * len;
    const x = s * half + bend * t * t * len;
    const z = -fold * Math.abs(s) * len + 0.06 * Math.sin(t * 3.1) * len;
    return [x, y, z];
  });
}

/* A tapered stem along a curve. aSt.y carries position along the stem so the
   bark can shade from base to tip. */
export function stemGeometry(points, r0, r1) {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const segs = Math.max(8, Math.round(curve.getLength() * 40));
  const radial = 7;
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], st = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    const rad = lerp(r0, r1, Math.pow(t, 0.8));
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a))
        .add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + n.x * rad, p.y + n.y * rad, p.z + n.z * rad);
      st.push(k / radial, t);
    }
  }
  const w = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * w + k, b = a + 1, c = a + w, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aSt', new Float32BufferAttribute(st, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g, curve };
}

/* ── Materials ─────────────────────────────────────────────────────── */
export function makeMaterials(shared) {
  const petal = (seed, tone, side) => new ShaderMaterial({
    uniforms: {
      ...shared,
      uBase: { value: tone.base }, uMid: { value: tone.mid },
      uEdge: { value: tone.edge }, uGlow: { value: tone.glow },
      uSeed: { value: seed }, uSide: { value: side }
    },
    vertexShader: SURFACE_VERT, fragmentShader: PETAL_FRAG, side: DoubleSide
  });
  const solid = (c1, c2, gloss = 0.1) => new ShaderMaterial({
    uniforms: { ...shared, uColor: { value: new Color(c1) }, uColor2: { value: new Color(c2) }, uGloss: { value: gloss } },
    vertexShader: SURFACE_VERT, fragmentShader: SOLID_FRAG, side: DoubleSide
  });
  return { petal, solid };
}

/* Coral tones, with a little variation between blossoms so a cluster reads
   as grown rather than stamped. */
export function coralTone(r) {
  const warm = r();
  return {
    base: new Color().setRGB(lerp(0.84, 0.90, warm), lerp(0.22, 0.30, warm), lerp(0.16, 0.20, r())),
    mid: new Color().setRGB(lerp(0.95, 0.99, warm), lerp(0.38, 0.46, warm), lerp(0.27, 0.33, r())),
    edge: new Color().setRGB(1.0, lerp(0.60, 0.68, warm), lerp(0.50, 0.57, r())),
    glow: new Color().setRGB(1.0, lerp(0.48, 0.55, warm), lerp(0.40, 0.47, r()))
  };
}

/* ── A blossom ─────────────────────────────────────────────────────
   Faces +Z. Five petals (sometimes a second, smaller ring), a green-gold
   heart, and a spray of cream filaments carrying deep orange anthers. */
export function blossom(seed, mats, opts = {}) {
  const r = rng(seed);
  const size = opts.size ?? 1;
  const g = new Group();
  const tone = coralTone(r);
  const open = opts.open ?? lerp(0.14, 0.34, r());
  const rings = opts.double ? 2 : 1;
  const start = r() * Math.PI * 2;

  for (let ring = 0; ring < rings; ring++) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const pr = rng(seed * 31 + ring * 7 + i * 13);
      const len = size * (ring === 0 ? lerp(0.30, 0.36, pr()) : lerp(0.21, 0.25, pr()));
      const geo = petalGeometry(pr, { len, cup: ring ? 1.3 : 1 });
      const m = new Mesh(geo, mats.petal(seed * 0.013 + i * 0.17 + ring, tone, i % 2 ? 1 : -1));
      const ang = start + (i / n) * Math.PI * 2 + (ring ? Math.PI / n : 0) + lerp(-0.1, 0.1, pr());
      /* +tilt brings the rim toward the viewer: a shallow, open cup */
      const tilt = (ring ? open + 0.3 : open) + lerp(-0.07, 0.07, pr());
      m.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), ang - Math.PI / 2)
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt));
      m.position.set(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(size * 0.045);
      m.position.z = ring * size * 0.012 + i * size * 0.0015;
      g.add(m);
    }
  }

  /* heart */
  const heartGeo = new SphereGeometry(size * 0.05, 16, 10);
  addStFromUv(heartGeo);
  const heart = new Mesh(heartGeo, mats.solid('#e7b85a', '#c7843c', 0.15));
  heart.scale.set(1, 1, 0.45);
  heart.position.z = size * 0.02;
  g.add(heart);

  /* stamens */
  const count = opts.stamens ?? Math.round(lerp(30, 42, r()));
  const filGeo = new CylinderGeometry(size * 0.0035, size * 0.0045, 1, 5, 1);
  filGeo.translate(0, 0.5, 0);
  addSt(filGeo, 0, 1);
  const antGeo = new SphereGeometry(size * 0.0068, 10, 8);
  addSt(antGeo, 0, 0);
  const fil = new InstancedMesh(filGeo, mats.solid('#f3cf8f', '#fbe6b8', 0.05), count);
  const ant = new InstancedMesh(antGeo, mats.solid('#e9962f', '#f7b84a', 0.3), count);
  const up = new Vector3(0, 1, 0), mtx = new Matrix4(), q = new Quaternion(), dir = new Vector3();
  for (let k = 0; k < count; k++) {
    const a = r() * Math.PI * 2;
    const spread = lerp(0.3, 0.95, Math.sqrt(r()));
    dir.set(Math.cos(a) * Math.sin(spread), Math.sin(a) * Math.sin(spread), Math.cos(spread)).normalize();
    const L = size * lerp(0.10, 0.17, r());
    q.setFromUnitVectors(up, dir);
    mtx.compose(new Vector3(0, 0, size * 0.02), q, new Vector3(1, L, 1));
    fil.setMatrixAt(k, mtx);
    mtx.compose(dir.clone().multiplyScalar(L).add(new Vector3(0, 0, size * 0.02)), q,
      new Vector3(1, lerp(0.8, 1.3, r()), 1));
    ant.setMatrixAt(k, mtx);
  }
  g.add(fil, ant);
  return g;
}

/* A closed bud on a short pedicel. */
export function bud(seed, mats, size = 1) {
  const r = rng(seed);
  const g = new Group();
  const tone = coralTone(r);
  const body = new Mesh(new SphereGeometry(size * 0.07, 18, 14), mats.petal(seed * 0.01, {
    base: tone.base, mid: tone.mid, edge: tone.mid, glow: tone.glow
  }, 1));
  addStFromUv(body.geometry);
  body.scale.set(0.82, 1.25, 0.82);
  body.position.y = size * 0.07;
  g.add(body);
  /* a slightly darker, pointed cap: the petals still furled */
  const cap = new Mesh(body.geometry, body.material);
  cap.scale.set(0.5, 0.62, 0.5);
  cap.position.y = size * 0.155;
  g.add(cap);
  return g;
}

function addSt(geo, s, t) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 2);
  const pos = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
  for (let i = 0; i < n; i++) { arr[i * 2] = s; arr[i * 2 + 1] = t ? (pos.getY(i) - minY) / (maxY - minY || 1) : 0; }
  geo.setAttribute('aSt', new Float32BufferAttribute(arr, 2));
}
function addStFromUv(geo) {
  const uv = geo.attributes.uv, n = uv.count;
  const arr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { arr[i * 2] = Math.cos(uv.getX(i) * Math.PI * 2) * 0.6; arr[i * 2 + 1] = 1 - uv.getY(i); }
  geo.setAttribute('aSt', new Float32BufferAttribute(arr, 2));
}
