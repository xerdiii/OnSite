/* Shared GLSL for the botanical hero.
   Everything is authored in display colour: the renderer's output colour
   space is left linear, so a value written here is the value on screen.
   That keeps the art direction in one place rather than behind a tone map. */

export const NOISE = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/* Lights shared by every lit surface. Key light high and to the left of the
   camera, warm. A cool fill from the right. A back light behind the scene
   that the petals glow against. */
export const LIGHTS = /* glsl */ `
  uniform vec3 uKey;
  uniform vec3 uFill;
  uniform vec3 uBack;
  uniform float uDark;
`;

export const SURFACE_VERT = /* glsl */ `
  attribute vec2 aSt;
  varying vec2 vSt;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vSt = aSt;
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = m * instanceMatrix;
    #endif
    vec4 wp = m * vec4(position, 1.0);
    vWP = wp.xyz;
    vN = normalize(mat3(m) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/* A petal: thin, coral, lighter and more translucent towards its rim, with
   fine radial veins, darker where it tucks under its neighbour at the base,
   glowing where the back light comes through it, and a cool cyan fresnel
   edge that ties it to the glass. */
export const PETAL_FRAG = /* glsl */ `
  ${LIGHTS}
  ${NOISE}
  uniform vec3 uBase;
  uniform vec3 uMid;
  uniform vec3 uEdge;
  uniform vec3 uGlow;
  uniform float uSeed;
  uniform float uSide;
  varying vec2 vSt;
  varying vec3 vN;
  varying vec3 vWP;

  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWP);
    float s = vSt.x, t = vSt.y;

    float side = smoothstep(0.45, 1.0, abs(s));
    float tip = smoothstep(0.72, 1.0, t);
    float rim = max(side * smoothstep(0.15, 0.6, t), tip);

    /* colour: deep at the claw, coral through the blade, peach at the rim */
    vec3 col = mix(uBase, uMid, smoothstep(0.0, 0.42, t));
    col = mix(col, uEdge, clamp(rim * 0.48 + t * 0.08, 0.0, 1.0));
    float n1 = vnoise(vec2(s * 2.1 + uSeed * 7.0, t * 2.7 + uSeed));
    float n2 = vnoise(vec2(s * 9.0 + uSeed, t * 11.0));
    col *= 0.93 + 0.10 * n1 + 0.03 * n2;

    /* veins fan from the base */
    float fan = s / (0.18 + t);
    float vein = abs(sin((fan * 2.6 + (n1 - 0.5) * 0.35) * 6.2831));
    vein = pow(1.0 - vein, 10.0) * smoothstep(0.06, 0.3, t) * (1.0 - tip * 0.8);
    col *= 1.0 - vein * 0.07;
    col += vec3(0.05, 0.02, 0.0) * pow(1.0 - vein, 1.0) * 0.0;

    /* lighting */
    vec3 L = normalize(uKey);
    float wrap = clamp((dot(N, L) + 0.6) / 1.6, 0.0, 1.0);
    float fill = clamp(dot(N, normalize(uFill)) * 0.5 + 0.5, 0.0, 1.0);

    float thin = mix(0.45, 1.0, rim);
    vec3 B = normalize(uBack);
    float through = pow(clamp(dot(V, -normalize(B + N * 0.4)), 0.0, 1.0), 2.2) * thin;

    float ao = mix(0.5, 1.0, smoothstep(0.0, 0.4, t));
    ao *= 1.0 - 0.22 * smoothstep(0.2, 1.0, s * uSide) * (1.0 - smoothstep(0.05, 0.6, t));

    vec3 lit = col * (0.30 + 0.78 * wrap) * ao;
    /* shadowed coral deepens toward rose rather than going grey */
    lit = mix(lit, lit * vec3(0.94, 0.78, 0.84), (1.0 - wrap) * 0.55);
    lit += col * vec3(0.72, 0.86, 1.0) * fill * 0.10;
    lit += uGlow * through * 0.5;
    /* the thin rim glows: light passing through the edge of the petal */
    lit += uGlow * pow(rim, 1.6) * (0.10 + 0.16 * (1.0 - wrap));

    float fres = pow(1.0 - abs(dot(N, V)), 3.0);
    lit += vec3(0.60, 0.86, 1.0) * fres * 0.20;

    vec3 H = normalize(L + V);
    lit += vec3(1.0, 0.97, 0.94) * pow(max(dot(N, H), 0.0), 26.0) * 0.08;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

/* Small solid parts: stamens, anthers, the flower's heart, stems, buds and
   leaves. Soft wrap lighting and the same cyan fresnel. */
export const SOLID_FRAG = /* glsl */ `
  ${LIGHTS}
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uGloss;
  varying vec2 vSt;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWP);
    vec3 L = normalize(uKey);
    vec3 col = mix(uColor, uColor2, clamp(vSt.y, 0.0, 1.0));
    float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
    vec3 lit = col * (0.46 + 0.6 * wrap);
    float fres = pow(1.0 - abs(dot(N, V)), 2.5);
    lit += vec3(0.60, 0.86, 1.0) * fres * 0.18;
    vec3 H = normalize(L + V);
    lit += vec3(1.0) * pow(max(dot(N, H), 0.0), 40.0) * uGloss;
    gl_FragColor = vec4(lit, 1.0);
  }
`;
