import {
  BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, CatmullRomCurve3,
  Vector3, DoubleSide, CustomBlending, OneFactor, OneMinusSrcAlphaFactor
} from 'three';
import { LIGHTS } from './shaders.js';

/* A band of liquid glass. The geometry is a flat strip swept along a curve,
   twisting as it goes so the eye catches its face in some places and its
   edge in others. aRib.x runs along the length (0..1), aRib.y across it (-1..1).
   The vertex shader keeps it slowly flowing; the fragment shader does the
   glass: fresnel body, bright specular, travelling light bands, and a
   refraction of the soft flower layer behind it. */

const VERT = /* glsl */ `
  attribute vec2 aRib;
  attribute vec3 aSide;
  uniform float uTime;
  uniform float uFlow;
  varying vec2 vRib;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vRib = aRib;
    vec3 p = position;
    float w = sin(aRib.x * 9.0 - uTime * 0.35) * 0.5 + sin(aRib.x * 4.3 + uTime * 0.21) * 0.5;
    p += normal * w * 0.06 * uFlow;
    p += aSide * sin(aRib.x * 6.0 - uTime * 0.27) * 0.025 * uFlow * aRib.y;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  ${LIGHTS}
  uniform float uTime;
  uniform sampler2D uBehind;
  uniform vec2 uRes;
  varying vec2 vRib;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWP);
    float ndv = abs(dot(N, V));
    float F = pow(1.0 - ndv, 2.0);
    float across = abs(vRib.y);
    float along = vRib.x;
    float cap = smoothstep(0.0, 0.06, along) * smoothstep(1.0, 0.95, along);

    /* thick glass is brightest and most saturated along its two edges */
    float edge = pow(across, 4.0);
    float lip = smoothstep(0.78, 0.97, across) * (1.0 - smoothstep(0.97, 1.0, across));

    vec3 deep  = vec3(0.26, 0.55, 0.86);
    vec3 cyan  = vec3(0.52, 0.80, 0.97);
    vec3 ice   = vec3(0.90, 0.97, 1.00);
    vec3 peach = vec3(1.00, 0.66, 0.50);

    /* refraction of the soft far layer, bent by the surface */
    vec2 uv = gl_FragCoord.xy / uRes + N.xy * (0.04 + 0.06 * F);
    vec4 behind = texture2D(uBehind, uv);
    vec3 bent = behind.rgb / max(behind.a, 0.001);

    vec3 L1 = normalize(uKey), L2 = normalize(vec3(0.7, 0.25, 0.65));
    float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 140.0);
    float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 40.0);
    float spec = s1 * 1.8 + s2 * 0.5;

    /* a bright core streak riding one side of the band, as light does in a
       real glass ribbon; it wanders slowly along the length */
    float lane = 0.28 + 0.12 * sin(along * 7.0 + uTime * 0.12);
    float core = exp(-pow((vRib.y - lane) / 0.13, 2.0));
    float bands = pow(0.5 + 0.5 * sin(along * 38.0 - uTime * 0.5 + vRib.y * 2.4), 16.0);

    float warm = smoothstep(0.35, 0.8, 0.5 + 0.5 * sin(along * 7.0 + 2.2 + uTime * 0.05));
    vec3 body = mix(ice, cyan, 0.35 + 0.35 * F);
    body = mix(body, peach, warm * 0.28 * (1.0 - edge));
    vec3 rimCol = mix(deep, cyan, uDark * 0.6);
    vec3 col = mix(body, rimCol, clamp(edge * 0.85 + F * 0.25, 0.0, 1.0));
    col = mix(col, bent, behind.a * 0.5);
    col += vec3(1.0) * (spec + core * 0.55 * (0.5 + 0.5 * F) + bands * 0.35 + lip * 0.25);

    float a = 0.10 + F * 0.36 + edge * 0.5 + behind.a * 0.14;
    a += spec * 0.8 + core * 0.3 + bands * 0.12 + lip * 0.2;
    a = clamp(a, 0.0, 0.94) * cap;
    gl_FragColor = vec4(col * a, a);
  }
`;

export function ribbon(points, shared, opts = {}) {
  const width = opts.width ?? 0.3;
  const twists = opts.twists ?? 1.6;
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const segs = 520, across = 14;
  const pos = [], rib = [], side = [], idx = [];
  const up = new Vector3(0, 0, 1);
  let prevSide = null;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    /* a side vector perpendicular to the tangent, kept continuous */
    let s = new Vector3().crossVectors(tan, up);
    if (s.lengthSq() < 1e-4) s.set(1, 0, 0);
    s.normalize();
    if (prevSide && s.dot(prevSide) < 0) s.negate();
    prevSide = s.clone();
    const twist = Math.sin(t * Math.PI * twists) * 1.25 + t * 0.9;
    const n0 = new Vector3().crossVectors(s, tan).normalize();
    const sideV = s.clone().multiplyScalar(Math.cos(twist)).add(n0.clone().multiplyScalar(Math.sin(twist)));
    const wid = width * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    for (let k = 0; k <= across; k++) {
      const v = (k / across) * 2 - 1;
      /* a gentle lens profile across the strip */
      const bulge = (1 - v * v) * wid * 0.08;
      const nrm = new Vector3().crossVectors(tan, sideV).normalize();
      pos.push(
        p.x + sideV.x * v * wid + nrm.x * bulge,
        p.y + sideV.y * v * wid + nrm.y * bulge,
        p.z + sideV.z * v * wid + nrm.z * bulge
      );
      rib.push(t, v);
      side.push(sideV.x, sideV.y, sideV.z);
    }
  }
  const w = across + 1;
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < across; k++) {
      const a = i * w + k, b = a + 1, c = a + w, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aRib', new Float32BufferAttribute(rib, 2));
  g.setAttribute('aSide', new Float32BufferAttribute(side, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  const mat = new ShaderMaterial({
    uniforms: {
      ...shared,
      uTime: { value: 0 }, uFlow: { value: 1 },
      uBehind: { value: null }, uRes: { value: [1, 1] }
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: DoubleSide,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor
  });
  const mesh = new Mesh(g, mat);
  mesh.renderOrder = 10;
  return mesh;
}
