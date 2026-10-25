/* ═══════════════════════════════════════════════════════════════════
   DJI OSMO ACTION 4 — 3D TEARDOWN LAB
   Three.js scene, camera choreography, hit testing, annotation engine.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PARTS } from './data.js';
import { buildModel } from './model.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const ACCENT = 0x58e6ff;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('scene');

const els = {
  loader: document.getElementById('loader'),
  loaderBar: document.getElementById('loaderBar'),
  loaderPercent: document.getElementById('loaderPercent'),
  loaderTitle: document.querySelector('.loader-title'),
  loaderMeta: document.querySelector('.loader-meta span:last-child'),
  clock: document.getElementById('clock'),
  partsPanel: document.getElementById('partsPanel'),
  infoPanel: document.getElementById('infoPanel'),
  partList: document.getElementById('partList'),
  partCount: document.getElementById('partCount'),
  teardownPercent: document.getElementById('teardownPercent'),
  teardownBar: document.getElementById('teardownBar'),
  infoScroll: document.getElementById('infoScroll'),
  infoDefault: document.getElementById('infoDefault'),
  infoDetail: document.getElementById('infoDetail'),
  detailIndex: document.getElementById('detailIndex'),
  detailEn: document.getElementById('detailEn'),
  detailName: document.getElementById('detailName'),
  detailDesc: document.getElementById('detailDesc'),
  detailTags: document.getElementById('detailTags'),
  detailSpecs: document.getElementById('detailSpecs'),
  detailCoord: document.getElementById('detailCoord'),
  detailClose: document.getElementById('detailClose'),
  focusPartBtn: document.getElementById('focusPartBtn'),
  overviewBtn: document.getElementById('overviewBtn'),
  closeInfoBtn: document.getElementById('closeInfoBtn'),
  hoverTooltip: document.getElementById('hoverTooltip'),
  hoverIndex: document.querySelector('#hoverTooltip .hover-index'),
  hoverName: document.querySelector('#hoverTooltip .hover-name'),
  annotationSvg: document.getElementById('annotationSvg'),
  annotationLabels: document.getElementById('annotationLabels'),
  explodeRange: document.getElementById('explodeRange'),
  explodeValue: document.getElementById('explodeValue'),
  explodeBtn: document.getElementById('explodeBtn'),
  heroExplode: document.getElementById('heroExplode'),
  heroExplodeLabel: document.querySelector('#heroExplode .hero-cta-label'),
  heroExplodeMeta: document.querySelector('#heroExplode .hero-cta-meta'),
  assembleBtn: document.getElementById('assembleBtn'),
  rotateBtn: document.getElementById('rotateBtn'),
  labelsBtn: document.getElementById('labelsBtn'),
  resetBtn: document.getElementById('resetBtn'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  soundlessBtn: document.getElementById('soundlessBtn'),
  onboarding: document.getElementById('onboarding'),
  dismissOnboarding: document.getElementById('dismissOnboarding'),
  mobilePartsBtn: document.getElementById('mobilePartsBtn'),
  mobileInfoBtn: document.getElementById('mobileInfoBtn'),
  mobileCta: document.getElementById('mobileCta'),
  mobileCtaLabel: document.getElementById('mobileCtaLabel')
};

const state = {
  ready: false,
  explode: 0,
  target: 0,
  selected: null,
  hover: null,
  labelsOn: true,
  autoRotate: false,
  flight: null,
  pointerInside: false,
  pointerX: 0,
  pointerY: 0,
  pointerDown: null,
  dragging: false,
  sliderActive: false,
  hasInteracted: false,
  explodeScale: 1,
  lastPercent: -1,
  annoHidden: false,
  layout: { vw: 0, vh: 0, leftEdge: 0, rightEdge: 0, minY: 0, maxY: 0, mobile: false },
  hoverQueued: false,
  interacting: false,
  autoQuality: true,
  autoQualityDone: false,
  fpsStart: 0,
  fpsFrames: 0
};

let renderer, scene, camera, controls, composer;
let bloomPass;
let modelRoot, parts = [], pickables = [];
let selectionFrame = null;
let particles, floorRings = [], stageGlow;
let raycaster, ndc;
let annoEls = [];
const tmpWorld = new THREE.Vector3();
let annoAcc = 0;
let coordAcc = 0;
let interactionTimer = null;
let clock3d;
let booted = false;
let modelTextures = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad2 = (n) => String(n).padStart(2, '0');

/* ───────────────────────── boot / failure ───────────────────────── */

function fail(err) {
  console.error(err);
  if (els.loaderTitle) els.loaderTitle.textContent = 'UNABLE TO INITIALIZE WEBGL';
  if (els.loaderMeta) els.loaderMeta.textContent = '请通过本地 HTTP 服务器打开此页面，并确认浏览器支持 WebGL 2。';
  if (els.loaderPercent) els.loaderPercent.textContent = 'ERR';
  els.loaderBar.style.width = '100%';
  els.loaderBar.style.background = 'var(--hot)';
}

function setLoader(pct) {
  if (!els.loaderBar) return;
  els.loaderBar.style.width = `${pct}%`;
  els.loaderPercent.textContent = `${String(Math.round(pct)).padStart(3, '0')}%`;
}

/* ───────────────────────── camera ───────────────────────── */

function computeHome() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const mobile = aspect < 0.72;
  const fov = mobile ? 46 : aspect < 1.05 ? 42 : 34;
  let dist;
  if (mobile) dist = 23.0;
  else if (aspect < 1.05) dist = 23;
  else dist = Math.max(19.6, 8.6 / (Math.tan(fov * DEG * 0.5) * aspect) + 1.6);
  const dir = new THREE.Vector3(0.49, 0.37, 0.79).normalize();
  const target = new THREE.Vector3(mobile ? -0.42 : 0, mobile ? 0.02 : 0.15, 0);
  return { pos: dir.multiplyScalar(dist).add(target.clone()), target, fov };
}

function applyHome() {
  const home = computeHome();
  camera.fov = home.fov;
  camera.updateProjectionMatrix();
  camera.position.copy(home.pos);
  controls.target.copy(home.target);
  controls.update();
}

/* ───────────────────────── scene assembly ───────────────────────── */

function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 820 ? 1.25 : 1.4));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x04070b, 1);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070b);
  scene.fog = new THREE.FogExp2(0x04070b, 0.023);

  camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(9, 7, 15);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !prefersReduced;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 52;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.78;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.42;
  controls.target.set(0, 0.15, 0);
  controls.update();
  controls.addEventListener('start', beginInteraction);
  controls.addEventListener('end', endInteraction);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // lighting
  scene.add(new THREE.HemisphereLight(0x5a8fa2, 0x04060a, 0.74));

  const key = new THREE.DirectionalLight(0xd3f3ff, 3.4);
  key.position.set(7, 9, 8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x39d6ff, 2.3);
  rim.position.set(-8, 4.5, -7);
  scene.add(rim);

  const warm = new THREE.DirectionalLight(0xff7a45, 1.15);
  warm.position.set(8, -3.5, 2);
  scene.add(warm);

  const fill = new THREE.PointLight(0x58e6ff, 12, 22, 2);
  fill.position.set(-4, -2, 5);
  scene.add(fill);

  const backGlow = new THREE.PointLight(0x2f8fff, 16, 26, 2);
  backGlow.position.set(0, 1, -8);
  scene.add(backGlow);

  initGround();
  initParticles();

  modelRoot = new THREE.Group();
  modelRoot.position.y = 0.02;
  scene.add(modelRoot);

  const built = buildModel();
  modelTextures = built.textures;
  for (let i = 0; i < PARTS.length; i++) {
    const meta = built.map.get(PARTS[i].id);
    const p = {
      def: PARTS[i],
      index: i,
      group: meta.group,
      box: meta.box,
      center: meta.center,
      anchor: meta.anchor.clone(),
      offset: new THREE.Vector3(...PARTS[i].offset),
      baseY: 0,
      glow: null
    };
    parts.push(p);
    modelRoot.add(p.group);
  }

  collectPickables();
  initStageRing();

  raycaster = new THREE.Raycaster();
  ndc = new THREE.Vector2();

  applyHome();
}

function initGround() {
  const gridGeo = new THREE.PlaneGeometry(70, 70, 1, 1);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0x4fd8ef) },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vW;
      uniform vec3 uColor;
      uniform float uTime;
      float grid(vec2 p, float scale, float width){
        vec2 q = p * scale;
        vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(0.0001));
        float l = min(g.x, g.y);
        return 1.0 - min(l / width, 1.0);
      }
      void main(){
        vec2 p = vW.xz;
        float d = length(p);
        float minor = grid(p, 1.0, 1.0);
        float major = grid(p, 0.2, 1.35);
        float fade = smoothstep(22.0, 2.0, d);
        float pulse = 0.55 + 0.45 * sin(uTime * 0.7 - d * 0.5);
        float halo = smoothstep(7.4, 2.2, d) * 0.045 * pulse;
        vec3 col = uColor * (minor * 0.085 + major * 0.25 + halo);
        float a = (minor * 0.06 + major * 0.2 + halo) * fade;
        gl_FragColor = vec4(col, a);
      }
    `
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -3.18;
  scene.add(grid);
  scene.userData.gridMat = gridMat;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({
      map: buildTexProxy('shadow'), transparent: true, opacity: 0.92,
      depthWrite: false, color: 0x000000
    })
  );
  // texture is attached after buildModel (canvas generated there) — replaced below
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -3.17;
  scene.add(shadow);
  scene.userData.shadowPlane = shadow;

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15),
    new THREE.MeshBasicMaterial({
      map: buildTexProxy('glow'), transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, color: 0x1d778c
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -3.16;
  scene.add(halo);
  scene.userData.stageHalo = halo;
}

// placeholder material textures — filled with real canvas textures later
let texProxy = null;
function buildTexProxy(kind) {
  if (!texProxy) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    texProxy = new THREE.CanvasTexture(c);
  }
  return texProxy;
}

function initParticles() {
  const count = 460;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const r = 4 + Math.pow(Math.random(), 0.7) * 22;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = -2.5 + Math.random() * 15;
    positions[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.055,
    map: buildTexProxy('glow'),
    transparent: true,
    opacity: 0.62,
    color: 0x9befff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  particles = new THREE.Points(geo, mat);
  particles.rotation.y = 0.3;
  scene.add(particles);

  const dust = new THREE.Points(geo.clone(), new THREE.PointsMaterial({
    size: 0.11,
    map: buildTexProxy('glow'),
    transparent: true,
    opacity: 0.18,
    color: 0x58e6ff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  }));
  dust.rotation.y = 1.4;
  dust.scale.setScalar(1.15);
  scene.add(dust);
  scene.userData.dust = dust;
}

function initStageRing() {
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x58e6ff, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  [4.35, 5.9, 7.4].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, i === 0 ? 0.012 : 0.006, 4, 160), ringMat.clone());
    ring.material.opacity = i === 0 ? 0.3 : i === 1 ? 0.16 : 0.08;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -3.15;
    scene.add(ring);
    floorRings.push(ring);
  });
}

function collectPickables() {
  pickables = [];
  parts.forEach((p) => {
    p.group.traverse((o) => {
      if (o.isMesh && !o.userData.noPick) pickables.push(o);
    });
  });
}

/* ───────────────────────── post processing ───────────────────────── */

function initComposer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);

  const renderPass = new RenderPass(scene, camera);

  // half-resolution bloom: visually identical at this strength, much cheaper
  bloomPass = new UnrealBloomPass(new THREE.Vector2(Math.max(1, w * 0.5), Math.max(1, h * 0.5)), 0.5, 0.62, 0.84);

  const output = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(output);

  try {
    composer.renderTarget1.samples = 2;
    composer.renderTarget2.samples = 2;
  } catch (e) { /* older drivers */ }
}

/* ───────────────────────── explosion ───────────────────────── */

function setExplode(value) {
  const v = clamp(Math.round(value), 0, 100);
  state.target = v;
  if (v > 0) hideOnboarding();
  syncExplodeReadout();
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function updateExplosion(dt) {
  const diff = state.target - state.explode;
  if (Math.abs(diff) > 0.02) {
    const k = prefersReduced ? 1 : 1 - Math.exp(-dt * 4.6);
    state.explode += diff * k;
    if (Math.abs(state.target - state.explode) < 0.06) state.explode = state.target;
  } else {
    state.explode = state.target;
  }

  const e = state.explode / 100;
  const mobile = state.layout.mobile;
  modelRoot.scale.setScalar(1 - (mobile ? 0.32 : 0.3) * e);
  modelRoot.rotation.x = -0.16 * e * (mobile ? 0.7 : 1);

  for (const p of parts) {
    const delay = (p.index % 5) * 0.022;
    const local = e <= 0 ? 0 : clamp((e - delay) / (1 - delay), 0, 1);
    const k = easeOutCubic(local);
    const shrink = p.def.id === 'front-shell' ? 0.28 : p.def.id === 'frame' ? 0.35 : 0.07;
    const s = 1 - shrink * k * state.explodeScale;
    p.group.scale.setScalar(s);
    p.group.position.copy(p.offset).multiplyScalar(k * state.explodeScale);
    p.group.position.addScaledVector(p.center, 1 - s);
  }

  // Keep the assembly centred while it opens so nothing slides behind the HUD.
  modelRoot.updateMatrixWorld(true);

  const pct = Math.round(state.explode);
  if (pct !== state.lastPercent) {
    state.lastPercent = pct;
    els.teardownPercent.textContent = `${pad2(pct)}%`;
    els.teardownBar.style.width = `${pct}%`;
    if (!state.sliderActive) {
      els.explodeRange.value = pct;
      els.explodeRange.style.setProperty('--range-fill', `${pct}%`);
      els.explodeValue.textContent = pad2(pct);
    }
  }

  if (state.flight) updateFlight();
}

function updateFlight() {
  const f = state.flight;
  const t = clamp((performance.now() - f.start) / f.duration, 0, 1);
  const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  camera.position.lerpVectors(f.fromPos, f.toPos, k);
  controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
  if (t >= 1) {
    state.flight = null;
    if (f.restoreRotate) setAutoRotate(true);
  }
}

function flyTo(pos, target, duration = 900, restoreRotate = false) {
  state.flight = {
    fromPos: camera.position.clone(),
    toPos: pos.clone(),
    fromTarget: controls.target.clone(),
    toTarget: target.clone(),
    start: performance.now(),
    duration: Math.max(300, duration),
    restoreRotate
  };
  controls.autoRotate = false;
  syncAutoRotateUI();
}

function focusPart(index) {
  const p = parts[index];
  if (!p) return;
  p.group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(p.group);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(0.65, sphere.radius);
  const dist = clamp(radius / Math.tan(camera.fov * DEG * 0.5) * 1.55 + 1.1, 3.4, 16);
  const dir = camera.position.clone().sub(controls.target).normalize();
  const pos = sphere.center.clone().add(dir.multiplyScalar(dist));
  flyTo(pos, sphere.center.clone(), 850);
  hideOnboarding();
}

function resetView() {
  const home = computeHome();
  flyTo(home.pos, home.target, 900);
}

/* ───────────────────────── selection ───────────────────────── */

function selectPart(index, opts = {}) {
  if (!parts[index]) return;
  state.selected = index;
  state.hover = null;
  hideHover();
  clearHoverOutline();

  if (opts.explode !== false) {
    const minimum = window.innerWidth <= 820 ? 58 : 66;
    if (state.target < minimum) setExplode(minimum + 8);
  } else if (state.target < 8) {
    setExplode(26);
  }

  syncSelectionUI();
  showDetail(index);
  hideOnboarding();

  if (window.innerWidth <= 820) {
    closeDrawers();
    els.infoPanel.classList.add('mobile-open');
    els.infoPanel.setAttribute('aria-hidden', 'false');
  }
}

function clearSelection(opts = {}) {
  state.selected = null;
  syncSelectionUI();
  showDefaultInfo();
  if (!opts.silent) {
    state.hover = null;
    hideHover();
  }
}

function syncSelectionUI() {
  const items = els.partList.querySelectorAll('.part-item');
  items.forEach((el, i) => {
    const on = i === state.selected;
    el.classList.toggle('selected', on);
    if (on) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  const active = els.partList.querySelector('.part-item.selected');
  if (active) active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  if (state.selected == null) detachSelectionFrame();
  else attachSelectionFrame(state.selected);
}

/* ───────────────────────── hit testing / hover ───────────────────────── */

function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  for (const hit of hits) {
    const idx = hit.object.userData.partIndex;
    if (idx !== undefined) return idx;
  }
  return null;
}

function setHover(index) {
  if (index === state.hover) return;
  state.hover = index;

  if (index === null || index === state.selected) {
    clearHoverOutline();
    canvas.classList.remove('is-hovering');
    hideHover();
    return;
  }

  canvas.classList.add('is-hovering');
  els.hoverIndex.textContent = `MODULE ${pad2(index + 1)} / ${pad2(parts.length)}`;
  els.hoverName.textContent = parts[index].def.name;
  els.hoverTooltip.classList.add('visible');
  els.hoverTooltip.setAttribute('aria-hidden', 'false');
}

function clearHoverOutline() {
  /* Selection is communicated by the list, detail panel and a static bracket. */
}

function attachSelectionFrame(index) {
  if (!selectionFrame) {
    const pts = [];
    const t = 0.19;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 0.5, y = sy * 0.5, z = sz * 0.5;
      pts.push(x, y, z, x - sx * t, y, z);
      pts.push(x, y, z, x, y - sy * t, z);
      pts.push(x, y, z, x, y, z - sz * t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x58e6ff, transparent: true, opacity: 0.52, depthTest: false
    });
    selectionFrame = new THREE.LineSegments(geo, mat);
    selectionFrame.renderOrder = 6;
    selectionFrame.visible = false;
  }
  const p = parts[index];
  if (!p) {
    detachSelectionFrame();
    return;
  }
  const size = p.box.getSize(new THREE.Vector3());
  const center = p.box.getCenter(new THREE.Vector3());
  selectionFrame.position.copy(center);
  selectionFrame.scale.copy(size).multiplyScalar(1.035);
  if (selectionFrame.parent !== p.group) p.group.add(selectionFrame);
  selectionFrame.visible = true;
}

function detachSelectionFrame() {
  if (!selectionFrame) return;
  selectionFrame.visible = false;
  selectionFrame.parent?.remove(selectionFrame);
}

function hideHover() {
  els.hoverTooltip.classList.remove('visible');
  els.hoverTooltip.setAttribute('aria-hidden', 'true');
  canvas.classList.remove('is-hovering');
}

function positionTooltip(x, y) {
  const pad = 16;
  const w = els.hoverTooltip.offsetWidth || 170;
  const h = els.hoverTooltip.offsetHeight || 64;
  let left = x + pad;
  let top = y - h - 12;
  if (left + w > window.innerWidth - 12) left = x - w - pad;
  if (top < 90) top = y + 18;
  left = clamp(left, 12, window.innerWidth - w - 12);
  top = clamp(top, 90, window.innerHeight - h - 12);
  els.hoverTooltip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
}

/* ───────────────────────── annotation engine ───────────────────────── */

function measureLayout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw <= 820;
  const pl = els.partsPanel.getBoundingClientRect();
  const pr = els.infoPanel.getBoundingClientRect();
  const deck = document.getElementById('controlDeck').getBoundingClientRect();
  const leftEdge = mobile ? 16 : pl.right + 16;
  const rightEdge = mobile ? vw - 16 : pr.left - 16;
  state.layout = {
    vw, vh, leftEdge, rightEdge, mobile,
    minY: mobile ? 86 : 108,
    maxY: mobile ? vh - 96 : Math.max(320, deck.top - 16)
  };
  state.explodeScale = mobile ? 0.78 : 1;
}

function updateAnnotations() {
  if (!annoEls.length) return;
  const { vw, vh, leftEdge, rightEdge, minY, maxY, mobile } = state.layout;
  const showAll = state.labelsOn && state.explode > 22 && !document.body.classList.contains('help-open');

  if (!showAll) {
    if (!state.annoHidden) {
      annoEls.forEach((a) => hideAnno(a));
      state.annoHidden = true;
    }
    return;
  }
  state.annoHidden = false;

  const list = [];

  annoEls.forEach((a, i) => {
    const p = parts[i];
    const selected = i === state.selected;

    if (selected !== a.selected) {
      a.selected = selected;
      a.el.classList.toggle('active', selected);
      // measure only when the card changes height, never per frame
      a.h = a.el.offsetHeight || (selected ? 46 : 30);
      a._placeKey = '';
    }

    const show = !mobile || selected;
    if (!show) { hideAnno(a); return; }

    const world = tmpWorld.copy(p.anchor).applyMatrix4(p.group.matrixWorld).project(camera);
    if (world.z > 1 || world.z < -1) { hideAnno(a); return; }

    const sx = (world.x * 0.5 + 0.5) * vw;
    const sy = (-world.y * 0.5 + 0.5) * vh;
    if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) { hideAnno(a); return; }

    a.visible = true;
    a.sx = sx;
    a.sy = sy;
    list.push(a);
  });

  if (mobile) {
    const a = list.find((x) => x.selected) || list[0];
    if (a) {
      const w = a.w;
      const x = clamp(a.sx + 34, 12, vw - w - 12);
      const y = clamp(a.sy - a.h / 2, minY, vh - 170);
      a.side = x < a.sx ? 'left' : 'right';
      placeLabel(a, x, y);
      drawLeader(a, x, y, 1);
    }
    return;
  }

  const left = [];
  const right = [];
  list.forEach((a) => {
    if (a.sx < vw / 2) left.push(a);
    else right.push(a);
  });

  layoutColumn(left, leftEdge, minY, maxY, 'left');
  layoutColumn(right, rightEdge, minY, maxY, 'right');

  left.forEach((a) => { placeLabel(a, a.lx, a.ly); drawLeader(a, a.lx, a.ly, 1); });
  right.forEach((a) => { placeLabel(a, a.lx, a.ly); drawLeader(a, a.lx, a.ly, 1); });
}

function hideAnno(a) {
  if (a.visible === false) return;
  a.visible = false;
  a._placeKey = '';
  a._shown = false;
  a._lineOpacity = null;
  a.el.style.opacity = '0';
  a.el.style.pointerEvents = 'none';
  a.g.style.opacity = '0';
}

function layoutColumn(items, edgeX, minY, maxY, side) {
  if (!items.length) return;
  items.sort((a, b) => a.sy - b.sy);
  const gap = 5;
  let cursor = minY;
  items.forEach((a) => {
    a.side = side;
    a.ly = Math.max(a.sy - a.h / 2, cursor);
    a.lx = side === 'left' ? edgeX : edgeX - a.w;
    cursor = a.ly + a.h + gap;
  });
  let overflow = cursor - gap - maxY;
  if (overflow > 0) {
    items.forEach((a) => { a.ly -= overflow; });
    let c = minY;
    items.forEach((a) => {
      a.ly = Math.max(a.ly, c);
      c = a.ly + a.h + gap;
    });
  }
}

function placeLabel(a, x, y) {
  a.lx = x;
  a.ly = y;
  const xr = Math.round(x);
  const yr = Math.round(y);
  const key = `${xr},${yr},${a.h}`;
  if (a._placeKey !== key) {
    a.el.style.transform = `translate3d(${xr}px, ${yr}px, 0)`;
    a._placeKey = key;
  }
  if (a._shown !== true) {
    a.el.style.opacity = '1';
    a.el.style.pointerEvents = 'auto';
    a.g.style.opacity = '1';
    a._shown = true;
  }
}

function drawLeader(a, lx, ly, opacity) {
  const midY = ly + a.h / 2;
  const isLeft = a.side ? a.side === 'left' : lx < a.sx;
  const edgeX = isLeft ? lx + a.w : lx;
  const elbowX = edgeX + (isLeft ? 16 : -16);
  const d = `M ${a.sx.toFixed(1)} ${a.sy.toFixed(1)} L ${elbowX.toFixed(1)} ${a.sy.toFixed(1)} L ${elbowX.toFixed(1)} ${midY.toFixed(1)} L ${edgeX.toFixed(1)} ${midY.toFixed(1)}`;
  if (a._d !== d) {
    a.path.setAttribute('d', d);
    const sx = a.sx.toFixed(1);
    const sy = a.sy.toFixed(1);
    a.dot.setAttribute('cx', sx);
    a.dot.setAttribute('cy', sy);
    a.ring.setAttribute('cx', sx);
    a.ring.setAttribute('cy', sy);
    a._d = d;
  }
  if (a._lineOpacity !== opacity) {
    a.path.style.opacity = String(0.9 * opacity);
    a.g.style.opacity = String(opacity);
    a._lineOpacity = opacity;
  }
}

/* ───────────────────────── flight helpers / UI state hooks ───────────────────────── */

function setAutoRotate(on) {
  state.autoRotate = on;
  controls.autoRotate = on;
  syncAutoRotateUI();
}

function setLabels(on) {
  state.labelsOn = on;
  syncLabelsUI();
}

/* While the user is dragging/zooming, skip the expensive glow passes.
   They return ~200ms after the camera settles, so motion stays fluid. */
function beginInteraction() {
  state.interacting = true;
  if (bloomPass) bloomPass.enabled = false;
}

function endInteraction() {
  clearTimeout(interactionTimer);
  interactionTimer = setTimeout(() => {
    state.interacting = false;
    if (bloomPass) bloomPass.enabled = !document.body.classList.contains('fx-muted');
  }, 200);
}

function sampleAutoQuality(now) {
  if (!state.autoQuality || state.autoQualityDone || document.visibilityState !== 'visible') return;
  if (!state.fpsStart) {
    state.fpsStart = now;
    state.fpsFrames = 0;
    return;
  }
  state.fpsFrames += 1;
  const elapsed = now - state.fpsStart;
  if (elapsed > 6000) {
    // tab was hidden or the tab was throttled — restart the sample
    state.fpsStart = now;
    state.fpsFrames = 0;
    return;
  }
  if (elapsed < 3200) return;
  state.autoQualityDone = true;
  const fps = state.fpsFrames / (elapsed / 1000);
  if (fps < 38 && !document.body.classList.contains('fx-muted')) {
    toggleFx();
    showPerfToast();
  }
}

function showPerfToast() {
  const el = document.getElementById('perfToast');
  if (!el) return;
  el.textContent = window.innerWidth <= 460
    ? '已自动降低特效以保持流畅'
    : '已自动降低特效以保持流畅 · 点右上角 ☀ 恢复辉光';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5200);
}

function toggleFx() {
  const muted = document.body.classList.toggle('fx-muted');  els.soundlessBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  els.soundlessBtn.title = muted ? '恢复辉光与完整光效' : '性能模式：关闭辉光';
  if (!composer) return;
  bloomPass.enabled = !muted && !state.interacting;
  const ratio = muted ? 1 : Math.min(window.devicePixelRatio || 1, window.innerWidth <= 820 ? 1.25 : 1.4);
  renderer.setPixelRatio(ratio);
  composer.setPixelRatio(ratio);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(Math.max(1, window.innerWidth * 0.5), Math.max(1, window.innerHeight * 0.5));
}

function hideOnboarding() {
  els.onboarding.classList.add('hide');
}

/* ───────────────────────── resize ───────────────────────── */

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  const home = computeHome();
  camera.fov = home.fov;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.setSize(Math.max(1, w * 0.5), Math.max(1, h * 0.5));
  measureLayout();
  annoEls.forEach((a) => {
    a.w = a.el.offsetWidth || a.w;
    a.h = a.el.offsetHeight || a.h;
    a._placeKey = '';
  });
  if (!state.hasInteracted && !state.flight) {
    const hm = computeHome();
    camera.position.copy(hm.pos);
    controls.target.copy(hm.target);
    controls.update();
  }
}

/* ───────────────────────── main loop ───────────────────────── */

function animate() {
  requestAnimationFrame(animate);
  if (!state.ready) {
    controls.update();
    return;
  }

  const dt = Math.min(clock3d.getDelta(), 0.05);
  const time = clock3d.elapsedTime;

  updateExplosion(dt);
  controls.update();

  if (scene.userData.gridMat) scene.userData.gridMat.uniforms.uTime.value = time;
  if (particles) particles.rotation.y += dt * 0.011;
  if (scene.userData.dust) scene.userData.dust.rotation.y -= dt * 0.006;

  floorRings.forEach((ring, i) => {
    if (i === 0) {
      const s = 1 + Math.sin(time * 0.7) * 0.006;
      ring.scale.set(s, s, 1);
    }
  });

  if (stageGlow) {
    // reserved for stage pulse
  }

  // labels are HUD text; 25 fps is indistinguishable during orbit and far cheaper
  annoAcc += dt;
  if (annoAcc > (state.interacting ? 0.1 : 0.04)) {
    annoAcc = 0;
    updateAnnotations();
  }

  if (state.selected !== null) {
    coordAcc += dt;
    if (coordAcc > 0.14) {
      coordAcc = 0;
      const p = parts[state.selected];
      const wp = p.anchor.clone().applyMatrix4(p.group.matrixWorld);
      els.detailCoord.textContent = `X ${wp.x >= 0 ? '+' : ''}${wp.x.toFixed(1)} / Y ${wp.y >= 0 ? '+' : ''}${wp.y.toFixed(1)} / Z ${wp.z >= 0 ? '+' : ''}${wp.z.toFixed(1)}`;
    }
  }

  if (bloomPass) {
    bloomPass.enabled = !document.body.classList.contains('fx-muted') && !state.interacting && !state.autoRotate;
  }
  composer.render();
  sampleAutoQuality(performance.now());
}

/* ───────────────────────── init ───────────────────────── */

function init() {
  try {
    initRenderer();
    initScene();
    initComposer();

    // swap in the real canvas textures generated by model.js
    const textures = modelTextures;
    if (textures) {
      const shadow = scene.userData.shadowPlane;
      if (shadow) shadow.material.map = textures.shadow;
      const halo = scene.userData.stageHalo;
      if (halo) {
        halo.material.map = textures.glow;
        halo.material.needsUpdate = true;
      }
      if (particles) particles.material.map = textures.glow;
      if (scene.userData.dust) scene.userData.dust.material.map = textures.glow;
    }

    measureLayout();
    initUI();

    clock3d = new THREE.Clock();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

    animate();
    finishBoot();
    state.ready = true;
    window.__DSH_APP_READY = true;
    window.__DSH_DEBUG = { camera, controls, parts, state, modelRoot, scene, renderer };
  } catch (err) {
    fail(err);
  }
}

async function finishBoot() {
  const steps = [
    [18, '解析程序化几何'],
    [38, '绘制屏幕与主板纹理'],
    [61, '装配 11 组模块'],
    [79, '构建光学高亮通道'],
    [94, '校准标注与交互'],
    [100, 'DIGITAL TWIN READY']
  ];
  for (const [pct, label] of steps) {
    setLoader(pct);
    if (els.loaderTitle && pct < 100) els.loaderTitle.textContent = `INITIALIZING DIGITAL TWIN · ${label}`;
    await sleep(pct === 100 ? 200 : 130);
  }
  els.loaderTitle.textContent = 'DIGITAL TWIN READY';
  await sleep(260);
  els.loader.classList.add('done');
  setTimeout(() => {
    els.loader.setAttribute('style', 'display:none');
  }, 1000);
}

/* ═══════════════════════════════════════════════════════════════════
   UI LAYER — part index, detail panel, labels, HUD interaction
   ═══════════════════════════════════════════════════════════════════ */

function initUI() {
  els.partCount.textContent = String(parts.length);
  buildPartList();
  buildAnnotations();
  syncExplodeReadout();
  syncAutoRotateUI();
  syncLabelsUI();
  syncFxUI();
  bindUI();
  tickClock();
  setInterval(tickClock, 1000);
  els.explodeRange.style.setProperty('--range-fill', '0%');

  requestAnimationFrame(() => {
    measureLayout();
    annoEls.forEach((a) => {
      a.w = a.el.offsetWidth || a.w;
      a.h = a.el.offsetHeight || a.h;
    });
    syncSelectionUI();
  });

  setTimeout(() => hideOnboarding(), 11000);

  // deep-link helpers (also used for visual regression captures)
  const params = new URLSearchParams(window.location.search);
  state.autoQuality = params.get('still') !== '1';
  if (params.get('still') === '1') setAutoRotate(false);
  if (params.has('explode')) {
    const v = clamp(Number(params.get('explode')) || 0, 0, 100);
    setTimeout(() => setExplode(v), 900);
  }
  const partParam = Number(params.get('part'));
  if (partParam >= 1 && partParam <= parts.length) {
    setTimeout(() => {
      selectPart(partParam - 1, { explode: true });
      setAutoRotate(false);
    }, 1000);
  }
}

function buildPartList() {
  const frag = document.createDocumentFragment();
  parts.forEach((p, i) => {
    const d = p.def;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'part-item';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `${pad2(i + 1)} ${d.name}，点击拆解并查看解析`);
    btn.innerHTML = `
      <span class="p-num mono">${pad2(i + 1)}</span>
      <span class="p-meta"><span class="p-name">${d.name}</span><span class="p-sub">${d.sub || d.en}</span></span>
      <span class="p-status"></span>`;
    btn.addEventListener('click', () => {
      selectPart(i, { explode: true });
    });
    btn.addEventListener('mouseenter', () => {
      if (!state.ready || state.interacting || window.innerWidth <= 820) return;
      state.hover = i;
    });
    btn.addEventListener('mouseleave', () => {
      if (state.hover === i) {
        state.hover = null;
        clearHoverOutline();
      }
    });
    frag.appendChild(btn);
  });
  els.partList.replaceChildren(frag);
}

function buildAnnotations() {
  const NS = 'http://www.w3.org/2000/svg';
  els.annotationSvg.replaceChildren();
  els.annotationLabels.replaceChildren();
  annoEls = [];

  parts.forEach((p, i) => {
    const d = p.def;
    const el = document.createElement('div');
    el.className = 'anno-label';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${d.name}：${d.specLine}`);
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <span class="a-no mono">${pad2(i + 1)}</span>
      <span class="a-name">${d.name}</span>
      <span class="a-spec">${d.specLine}</span>`;
    const activate = () => selectPart(i, { explode: false });
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    els.annotationLabels.appendChild(el);

    const g = document.createElementNS(NS, 'g');
    g.style.opacity = '0';
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(88, 230, 255, 0.34)');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('r', '6.4');
    ring.setAttribute('class', 'ring');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '2.3');
    g.appendChild(path);
    g.appendChild(ring);
    g.appendChild(dot);
    els.annotationSvg.appendChild(g);

    annoEls.push({
      el, path, dot, ring, g,
      w: 168, h: 30, sx: 0, sy: 0, lx: 0, ly: 0,
      visible: false, selected: false, _shown: false
    });
  });
}

function showDetail(index) {
  const d = PARTS[index];
  const p = parts[index];
  if (!d || !p) return;

  els.infoDefault.hidden = true;
  els.infoDetail.hidden = false;
  els.detailIndex.textContent = pad2(index + 1);
  els.detailEn.textContent = d.en;
  els.detailName.textContent = d.name;
  els.detailDesc.textContent = d.desc;
  els.detailTags.innerHTML = (d.tags || []).map((t) => `<span>${t}</span>`).join('');
  els.detailSpecs.innerHTML = (d.specs || [])
    .map(([k, v]) => `<div class="spec-row"><span>${k}</span><b>${v}</b></div>`)
    .join('');
  els.detailCoord.textContent = formatPartCoord(p);
  els.infoScroll.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDefaultInfo() {
  els.infoDefault.hidden = false;
  els.infoDetail.hidden = true;
  els.detailCoord.textContent = 'X 00.0 / Y 00.0 / Z 00.0';
}

function formatPartCoord(p) {
  const x = p.anchor.x + p.group.position.x;
  const y = p.anchor.y + p.group.position.y;
  const z = p.anchor.z + p.group.position.z;
  const f = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
  return `X ${f(x)} / Y ${f(y)} / Z ${f(z)}`;
}

function syncExplodeReadout() {
  const v = Math.round(state.target);
  els.explodeRange.value = String(v);
  els.explodeRange.style.setProperty('--range-fill', `${v}%`);
  els.explodeRange.setAttribute('aria-valuenow', String(v));
  els.explodeValue.textContent = pad2(v);
  if (els.heroExplodeLabel) els.heroExplodeLabel.textContent = v > 88 ? '重新组装' : '开始拆解';
  if (els.heroExplodeMeta) els.heroExplodeMeta.textContent = v > 88 ? 'ASSEMBLE / RESET' : 'EXPLODE 11 MODULES';
  if (els.mobileCtaLabel) els.mobileCtaLabel.textContent = v > 88 ? '重新组装' : '开始拆解';
}

function syncAutoRotateUI() {
  els.rotateBtn.classList.toggle('active', state.autoRotate);
  els.rotateBtn.setAttribute('aria-pressed', String(state.autoRotate));
}

function syncLabelsUI() {
  els.labelsBtn.classList.toggle('active', state.labelsOn);
  els.labelsBtn.setAttribute('aria-pressed', String(state.labelsOn));
}

function syncFxUI() {
  const on = !document.body.classList.contains('fx-muted');
  els.soundlessBtn.setAttribute('aria-pressed', String(on));
  els.soundlessBtn.classList.toggle('active', on);
}

function tickClock() {
  const now = new Date();
  els.clock.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/* ───────────────────────── drawers / modal ───────────────────────── */

function closeDrawers() {
  if (window.innerWidth > 820) return;
  els.partsPanel.classList.remove('mobile-open');
  els.infoPanel.classList.remove('mobile-open');
  els.partsPanel.setAttribute('aria-hidden', 'true');
  els.infoPanel.setAttribute('aria-hidden', 'true');
}

function openHelp() {
  hideOnboarding();
  els.helpModal.classList.add('open');
  els.helpModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('help-open');
}

function closeHelp() {
  els.helpModal.classList.remove('open');
  els.helpModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('help-open');
}

/* ───────────────────────── event wiring ───────────────────────── */

function bindUI() {
  // teardown slider
  els.explodeRange.addEventListener('pointerdown', () => { state.sliderActive = true; });
  window.addEventListener('pointerup', () => { state.sliderActive = false; });
  els.explodeRange.addEventListener('input', (e) => {
    state.sliderActive = true;
    setExplode(Number(e.target.value));
  });
  els.explodeRange.addEventListener('change', () => { state.sliderActive = false; });

  els.explodeBtn.addEventListener('click', () => {
    setExplode(state.target > 88 ? 0 : 100);
    hideOnboarding();
  });
  els.heroExplode?.addEventListener('click', () => {
    setExplode(state.target > 88 ? 0 : 100);
    hideOnboarding();
  });
  els.mobileCta?.addEventListener('click', () => {
    setExplode(state.target > 88 ? 0 : 100);
    hideOnboarding();
  });
  els.assembleBtn.addEventListener('click', () => setExplode(0));
  els.rotateBtn.addEventListener('click', () => {
    setAutoRotate(!state.autoRotate);
    hideOnboarding();
  });
  els.labelsBtn.addEventListener('click', () => setLabels(!state.labelsOn));
  els.resetBtn.addEventListener('click', () => resetView());

  els.helpBtn.addEventListener('click', openHelp);
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeHelp);
  });
  els.soundlessBtn.addEventListener('click', () => {
    toggleFx();
    syncFxUI();
  });

  els.detailClose.addEventListener('click', () => clearSelection());
  els.closeInfoBtn.addEventListener('click', () => {
    closeDrawers();
    if (window.innerWidth <= 820) clearSelection();
  });
  els.focusPartBtn.addEventListener('click', () => {
    if (state.selected !== null) focusPart(state.selected);
  });
  els.overviewBtn.addEventListener('click', () => resetView());
  els.dismissOnboarding.addEventListener('click', hideOnboarding);

  els.mobilePartsBtn.addEventListener('click', () => {
    const open = els.partsPanel.classList.toggle('mobile-open');
    els.partsPanel.setAttribute('aria-hidden', String(!open));
    if (open) {
      els.infoPanel.classList.remove('mobile-open');
      els.infoPanel.setAttribute('aria-hidden', 'true');
    }
  });
  els.mobileInfoBtn.addEventListener('click', () => {
    const open = els.infoPanel.classList.toggle('mobile-open');
    els.infoPanel.setAttribute('aria-hidden', String(!open));
    if (open) {
      els.partsPanel.classList.remove('mobile-open');
      els.partsPanel.setAttribute('aria-hidden', 'true');
    }
  });

  // canvas interaction
  canvas.addEventListener('pointerdown', (e) => {
    state.pointerDown = { x: e.clientX, y: e.clientY, time: performance.now() };
    state.dragging = false;
    state.flight = null;
    hideOnboarding();
  });

  canvas.addEventListener('pointermove', (e) => {
    state.pointerX = e.clientX;
    state.pointerY = e.clientY;
    if (state.hover !== null) positionTooltip(e.clientX, e.clientY);

    if (state.pointerDown) {
      const dx = e.clientX - state.pointerDown.x;
      const dy = e.clientY - state.pointerDown.y;
      if (dx * dx + dy * dy > 36) {
        state.dragging = true;
        state.hasInteracted = true;
        if (state.autoRotate) setAutoRotate(false);
      }
    }

    if (e.buttons || window.innerWidth <= 820 || !state.ready) {
      if (state.hover !== null) {
        state.hover = null;
        clearHoverOutline();
        hideHover();
      }
      return;
    }

    if (state.hoverQueued) return;
    state.hoverQueued = true;
    requestAnimationFrame(() => {
      state.hoverQueued = false;
      const idx = pickAt(state.pointerX, state.pointerY);
      setHover(idx);
    });
  });

  canvas.addEventListener('pointerup', (e) => {
    const down = state.pointerDown;
    state.pointerDown = null;
    if (!down || !state.ready) return;
    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (state.dragging || dist > 7) return;

    const idx = pickAt(e.clientX, e.clientY);
    if (idx !== null) {
      selectPart(idx, { explode: true });
    } else if (state.selected !== null) {
      clearSelection();
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (state.hover !== null && !state.pointerDown) {
      state.hover = null;
      clearHoverOutline();
      hideHover();
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    const idx = pickAt(e.clientX, e.clientY);
    if (idx !== null) {
      selectPart(idx, { explode: true });
      focusPart(idx);
    }
  });

  canvas.addEventListener('wheel', () => {
    state.hasInteracted = true;
    if (state.autoRotate) setAutoRotate(false);
    hideOnboarding();
  }, { passive: true });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (els.helpModal.classList.contains('open')) {
      if (e.key === 'Escape') closeHelp();
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'e':
        setExplode(100);
        break;
      case 'r':
        setExplode(0);
        break;
      case 'l':
        setLabels(!state.labelsOn);
        break;
      case 'v':
        resetView();
        break;
      case 'h':
        openHelp();
        break;
      case 'escape':
        if (state.selected !== null) clearSelection();
        closeDrawers();
        hideHover();
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', () => {
    measureLayout();
    if (window.innerWidth > 820) {
      els.partsPanel.removeAttribute('aria-hidden');
      els.infoPanel.removeAttribute('aria-hidden');
    }
  }, { passive: true });
}

/* ───────────────────────── start ───────────────────────── */

init();

