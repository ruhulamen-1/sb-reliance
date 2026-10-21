// The 3D ducting model in the home page hero (three.js): a ceiling-void cut-away like a real Singapore ACMV job —
// galvanised duct with cross-breaks and TDF flanges, a radius elbow, a foil-insulated run, unistrut trapeze hangers
// on threaded rods, flexible ducts with volume dampers down to 4-way diffusers in a ceiling board, copper pipes and an FCU.
// Loaded only on desktop, after the page has loaded. mountDuct() starts it on a canvas and returns a cleanup.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const W = 1.0; // main duct width
const H = 0.5; // and height
const SLAB = 1.25; // underside of the slab the rods hang from
const BOARD = -1.45; // ceiling board level

// ---------- textures drawn on a canvas (no image files to download) ----------
function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// galvanised sheet: zinc spangle crystals and the X cross-break pressed into every panel
function galvanised() {
  const map = canvasTex(512, (g, s) => {
    g.fillStyle = '#b8c1c5';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = rnd(0, s), y = rnd(0, s), r = rnd(6, 22), l = Math.round(rnd(168, 214));
      g.fillStyle = `rgba(${l},${l + 6},${l + 10},${rnd(0.25, 0.6)})`;
      g.beginPath();
      const n = Math.floor(rnd(5, 8));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd(-0.3, 0.3), rr = r * rnd(0.6, 1.1);
        k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
    // cross-break: a light and a dark line along both diagonals
    for (const [dx, col] of [[0, 'rgba(255,255,255,.35)'], [3, 'rgba(60,70,75,.28)']] as [number, string][]) {
      g.strokeStyle = col;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(10 + dx, 10); g.lineTo(s - 10 + dx, s - 10);
      g.moveTo(s - 10 + dx, 10); g.lineTo(10 + dx, s - 10);
      g.stroke();
    }
    // a seam line along each edge
    g.strokeStyle = 'rgba(70,80,85,.35)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, s - 4, s - 4);
  });
  const rough = canvasTex(256, (g, s) => {
    g.fillStyle = '#6a6a6a';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      const l = Math.round(rnd(70, 140));
      g.fillStyle = `rgb(${l},${l},${l})`;
      g.fillRect(rnd(0, s), rnd(0, s), rnd(4, 12), rnd(4, 12));
    }
  }, false);
  return new THREE.MeshStandardMaterial({ map, roughnessMap: rough, metalness: 0.75, roughness: 0.55, envMapIntensity: 1.1 });
}

// aluminium foil insulation: crinkles (bump) and a tape band at each joint
function foil() {
  const bump = canvasTex(512, (g, s) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      const l = Math.round(rnd(40, 220));
      g.strokeStyle = `rgba(${l},${l},${l},.5)`;
      g.lineWidth = rnd(1, 3);
      g.beginPath();
      const x = rnd(0, s), y = rnd(0, s), a = rnd(0, Math.PI);
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * rnd(8, 40), y + Math.sin(a) * rnd(8, 40));
      g.stroke();
    }
  }, false);
  const map = canvasTex(256, (g, s) => {
    g.fillStyle = '#d7dbdc';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,.55)'; // tape
    g.fillRect(0, 0, s, 18);
    g.fillRect(0, s - 18, s, 18);
  });
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, metalness: 0.95, roughness: 0.32, envMapIntensity: 1.25 });
}

// ceiling boards: white tiles with a light grid
function ceiling() {
  const map = canvasTex(512, (g, s) => {
    g.fillStyle = '#f4f2ec';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(0,0,0,${rnd(0.01, 0.04)})`;
      g.fillRect(rnd(0, s), rnd(0, s), 2, 2);
    }
    g.strokeStyle = '#d9d6cd';
    g.lineWidth = 4;
    for (let k = 0; k <= 4; k++) {
      g.beginPath(); g.moveTo((k * s) / 4, 0); g.lineTo((k * s) / 4, s); g.stroke();
      g.beginPath(); g.moveTo(0, (k * s) / 4); g.lineTo(s, (k * s) / 4); g.stroke();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
}

// a quarter-circle arc in the x-z plane, for the radius elbow
class Arc extends THREE.Curve<THREE.Vector3> {
  constructor(private c: THREE.Vector3, private r: number, private a0: number, private a1: number) { super(); }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return out.set(this.c.x + Math.cos(a) * this.r, this.c.y, this.c.z + Math.sin(a) * this.r);
  }
}

export function mountDuct(canvas: HTMLCanvasElement, hoverEl: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(8.7, 6.2, 10.2);
  camera.lookAt(0, -0.35, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfb8, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(3.5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4;
  scene.add(sun);
  const warm = new THREE.PointLight(0xf2b705, 5, 10);
  warm.position.set(-3, 0.8, 2.5);
  scene.add(warm);

  const mats: THREE.Material[] = [];
  const M = <T extends THREE.Material>(m: T) => (mats.push(m), m);
  const galv = M(galvanised());
  const galvFlange = M(new THREE.MeshStandardMaterial({ color: 0xaab4b8, metalness: 0.85, roughness: 0.38 }));
  const foilMat = M(foil());
  const tape = M(new THREE.MeshStandardMaterial({ color: 0xeef1f2, metalness: 0.9, roughness: 0.25 }));
  const strut = M(new THREE.MeshStandardMaterial({ color: 0x9ea8ab, metalness: 0.8, roughness: 0.45 }));
  const rodMat = M(new THREE.MeshStandardMaterial({ color: 0x7d878a, metalness: 0.85, roughness: 0.35 }));
  const copper = M(new THREE.MeshStandardMaterial({ color: 0xc27c43, metalness: 0.95, roughness: 0.25 }));
  const armaflex = M(new THREE.MeshStandardMaterial({ color: 0x1b1d1e, metalness: 0, roughness: 0.9 }));
  const flexMat = M(new THREE.MeshStandardMaterial({ color: 0xc9cfd1, metalness: 0.9, roughness: 0.35, envMapIntensity: 1.2 }));
  const diffMat = M(new THREE.MeshStandardMaterial({ color: 0xf7f7f4, metalness: 0.1, roughness: 0.5 }));
  const darkSlot = M(new THREE.MeshStandardMaterial({ color: 0x2c3436, roughness: 0.8 }));
  const fcuMat = M(new THREE.MeshStandardMaterial({ color: 0xc8cdcf, metalness: 0.55, roughness: 0.45 }));
  const lever = M(new THREE.MeshStandardMaterial({ color: 0xd8a21b, metalness: 0.4, roughness: 0.5 }));
  const boardMat = M(ceiling());
  const slabMat = M(new THREE.MeshStandardMaterial({ color: 0xbfc4c2, roughness: 0.95, transparent: true, opacity: 0.18, depthWrite: false }));

  const root = new THREE.Group();
  scene.add(root);
  const model = new THREE.Group();
  root.add(model);
  const geos: THREE.BufferGeometry[] = [];
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    model.add(m);
    return m;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

  // TDF flange frame around a duct section (four bars and corner cleats), axis 'x' or 'z'
  const flange = (axis: 'x' | 'z', x: number, z: number, w = W, h = H) => {
    const t = 0.035, lip = 0.05;
    if (axis === 'x') {
      box(t, lip, w + lip * 2, galvFlange, x, h / 2 + lip / 2, z);
      box(t, lip, w + lip * 2, galvFlange, x, -h / 2 - lip / 2, z);
      box(t, h, lip, galvFlange, x, 0, z + w / 2 + lip / 2);
      box(t, h, lip, galvFlange, x, 0, z - w / 2 - lip / 2);
    } else {
      box(w + lip * 2, lip, t, galvFlange, x, h / 2 + lip / 2, z);
      box(w + lip * 2, lip, t, galvFlange, x, -h / 2 - lip / 2, z);
      box(lip, h, t, galvFlange, x + w / 2 + lip / 2, 0, z);
      box(lip, h, t, galvFlange, x - w / 2 - lip / 2, 0, z);
    }
  };

  // 1) galvanised run along x, sections of 1.2 m with a flange at each joint
  const X0 = -3.6, X1 = 0.6, SEC = 1.2;
  for (let x = X0; x < X1 - 0.01; x += SEC) {
    const len = Math.min(SEC, X1 - x);
    box(len, H, W, galv, x + len / 2, 0, 0);
    flange('x', x, 0);
  }
  flange('x', X1, 0);

  // 2) radius elbow turning from +x to -z (rectangle swept along a quarter arc)
  const R = 0.9; // centre-line radius
  const ctr = new THREE.Vector3(X1, 0, -R);
  const shape = new THREE.Shape();
  // the arc's frames put the shape's x upright and its y across, so the section is drawn H by W
  shape.moveTo(-H / 2, -W / 2); shape.lineTo(H / 2, -W / 2); shape.lineTo(H / 2, W / 2); shape.lineTo(-H / 2, W / 2); shape.closePath();
  const elbow = mesh(new THREE.ExtrudeGeometry(shape, { steps: 28, bevelEnabled: false, extrudePath: new Arc(ctr, R, Math.PI / 2, 0) }), galv);
  const ZE = -R; // the elbow ends at x = X1 + R, z = -R
  const XZ = X1 + R;
  flange('z', XZ, ZE);

  // 3) foil-insulated run along -z (insulation makes it a little bigger), with tape bands
  const Z1 = -3.9, IW = W + 0.08, IH = H + 0.08;
  for (let z = ZE; z > Z1 + 0.01; z -= SEC) {
    const len = Math.min(SEC, z - Z1);
    box(IW, IH, len, foilMat, XZ, 0, z - len / 2);
    box(IW + 0.012, IH + 0.012, 0.08, tape, XZ, 0, z - 0.04);
  }

  // 4) fan coil unit at the end of the insulated run
  box(1.5, 0.55, 1.0, fcuMat, XZ, 0, Z1 - 0.5);
  box(1.3, 0.02, 0.6, darkSlot, XZ, -0.28, Z1 - 0.5); // return grille underside
  box(0.32, 0.18, 0.02, lever, XZ - 0.45, 0.05, Z1 - 0.005); // rating plate

  // 5) unistrut trapeze hangers on threaded rods with nuts
  const hanger = (axis: 'x' | 'z', x: number, z: number, span: number, bottom: number) => {
    const L = span + 0.36;
    // C-channel: a base and two lips
    if (axis === 'x') {
      box(0.042, 0.012, L, strut, x, bottom - 0.035, z);
      box(0.012, 0.042, L, strut, x - 0.02, bottom - 0.02, z);
      box(0.012, 0.042, L, strut, x + 0.02, bottom - 0.02, z);
    } else {
      box(L, 0.012, 0.042, strut, x, bottom - 0.035, z);
      box(L, 0.042, 0.012, strut, x, bottom - 0.02, z - 0.02);
      box(L, 0.042, 0.012, strut, x, bottom - 0.02, z + 0.02);
    }
    for (const s of [-1, 1]) {
      const rx = axis === 'x' ? x : x + s * (span / 2 + 0.1);
      const rz = axis === 'x' ? z + s * (span / 2 + 0.1) : z;
      const top = SLAB, bot = bottom - 0.08;
      mesh(new THREE.CylinderGeometry(0.012, 0.012, top - bot, 8), rodMat, rx, (top + bot) / 2, rz);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6), rodMat, rx, bottom - 0.065, rz);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6), rodMat, rx, bottom + 0.005, rz);
    }
  };
  for (const x of [-3.0, -1.8, -0.6]) hanger('x', x, 0, W, -H / 2 - 0.03);
  for (const z of [-1.6, -2.8]) hanger('z', XZ, z, IW, -IH / 2 - 0.03);

  // 6) branch: spigot with a volume damper, flexible duct, 4-way diffuser in the ceiling board
  const diffusers: THREE.Vector3[] = [];
  const branch = (sx: number, sz: number, dx: number, dz: number, startY: number) => {
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 24), galvFlange, sx, startY - 0.08, sz);
    const handle = box(0.2, 0.02, 0.035, lever, sx + 0.13, startY - 0.1, sz);
    handle.rotation.y = 0.5;
    // flex duct: a tube whose radius ripples along its length
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, startY - 0.16, sz),
      new THREE.Vector3(sx, startY - 0.45, sz),
      new THREE.Vector3((sx + dx) / 2 + 0.15, (startY + BOARD) / 2 - 0.05, (sz + dz) / 2),
      new THREE.Vector3(dx, BOARD + 0.42, dz),
      new THREE.Vector3(dx, BOARD + 0.12, dz),
    ]);
    const seg = 140, rad = 14;
    const tube = new THREE.TubeGeometry(curve, seg, 0.15, rad, false);
    const p = tube.attributes.position as THREE.BufferAttribute;
    const n = tube.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i <= seg; i++) {
      const bump = 0.012 * Math.sin(i * 1.6);
      for (let j = 0; j <= rad; j++) {
        const k = i * (rad + 1) + j;
        p.setXYZ(k, p.getX(k) + n.getX(k) * bump, p.getY(k) + n.getY(k) * bump, p.getZ(k) + n.getZ(k) * bump);
      }
    }
    tube.computeVertexNormals();
    mesh(tube, flexMat);
    // plenum box and the diffuser face: nested square rings
    box(0.5, 0.12, 0.5, galvFlange, dx, BOARD + 0.07, dz);
    const yF = BOARD - 0.03;
    box(0.62, 0.025, 0.62, diffMat, dx, yF, dz);
    for (const [s, m] of [[0.5, darkSlot], [0.44, diffMat], [0.36, darkSlot], [0.3, diffMat], [0.22, darkSlot], [0.16, diffMat]] as [number, THREE.Material][]) {
      box(s, 0.03, s, m, dx, yF - 0.004, dz);
    }
    diffusers.push(new THREE.Vector3(dx, yF - 0.03, dz));
  };
  branch(-2.4, 0, -2.6, 1.5, -H / 2);
  branch(XZ, -2.2, XZ - 1.4, -2.3, -IH / 2);

  // 7) copper pair: bare copper and a black Armaflex-lagged pipe, on the slab side of the duct
  const pipe = (off: number) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.8, 0.55, -0.15 + off),
    new THREE.Vector3(X1 - 0.2, 0.55, -0.15 + off),
    new THREE.Vector3(XZ - 0.35 + off, 0.55, -0.55),
    new THREE.Vector3(XZ - 0.3 + off, 0.55, -1.4),
    new THREE.Vector3(XZ - 0.3 + off, 0.55, Z1 - 0.1),
  ], false, 'catmullrom', 0.15);
  mesh(new THREE.TubeGeometry(pipe(0), 180, 0.035, 10), copper);
  mesh(new THREE.TubeGeometry(pipe(0.2), 180, 0.075, 14), armaflex);

  // 8) ceiling board (receives the shadows) and a faint slab above
  // ceiling: a see-through plane that only shows the shadows, a few boards and the white T-bar grid
  const shadowGeo = new THREE.PlaneGeometry(9, 8);
  const shadowMat = M(new THREE.ShadowMaterial({ opacity: 0.16 }));
  const catcher = mesh(shadowGeo, shadowMat, -0.6, BOARD, -1.4, false);
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  const tbar = M(new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.6 }));
  for (let gx = -4.2; gx <= 3.0; gx += 1.2) box(0.03, 0.025, 7.2, tbar, gx, BOARD, -1.4);
  for (let gz = 1.8; gz >= -4.8; gz -= 1.2) box(7.2, 0.025, 0.03, tbar, -0.6, BOARD, gz);
  for (const [bx, bz] of [[-3.6, 1.2], [-1.2, -3.6], [1.2, 1.2], [-3.6, -2.4]]) {
    const b = box(1.17, 0.012, 1.17, boardMat, bx, BOARD - 0.006, bz);
    b.receiveShadow = true;
  }
  mesh(new THREE.BoxGeometry(8.2, 0.02, 7.2), slabMat, -0.6, SLAB + 0.01, -1.4, false);

  // centre everything
  const bb = new THREE.Box3().setFromObject(model);
  const c = bb.getCenter(new THREE.Vector3());
  model.position.sub(c);
  diffusers.forEach((d) => d.sub(c));

  // cool air leaving the diffusers sideways and down (a 4-way throw)
  const PER = 70;
  const count = PER * diffusers.length;
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const age = new Float32Array(count);
  const seed = (i: number, fresh: boolean) => {
    const d = diffusers[Math.floor(i / PER)];
    const side = Math.floor(Math.random() * 4);
    const ax = [1, -1, 0, 0][side], az = [0, 0, 1, -1][side];
    const along = rnd(-0.22, 0.22);
    pos[i * 3] = d.x + ax * 0.28 + (az ? along : 0);
    pos[i * 3 + 1] = d.y;
    pos[i * 3 + 2] = d.z + az * 0.28 + (ax ? along : 0);
    const sp = rnd(0.35, 0.7);
    vel[i * 3] = ax * sp;
    vel[i * 3 + 1] = -rnd(0.05, 0.2);
    vel[i * 3 + 2] = az * sp;
    age[i] = fresh ? rnd(0, 2.2) : 0;
  };
  for (let i = 0; i < count; i++) seed(i, true);
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geos.push(airGeo);
  const airMat = M(new THREE.PointsMaterial({ color: 0x2f8fbf, size: 0.085, transparent: true, opacity: 0.85, depthWrite: false }));
  root.add(new THREE.Points(airGeo, airMat));

  // size, mouse tilt, pause when not visible
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let tx = 0, ty = 0;
  const onMove = (e: PointerEvent) => {
    const r = hoverEl.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 0.2;
  };
  hoverEl.addEventListener('pointermove', onMove);
  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
  io.observe(canvas);

  const clock = new THREE.Clock();
  let t = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    t += dt;
    // a slow swing (not a full turn), so the model is always seen from a good angle
    const swing = Math.sin(t * 0.18) * 0.55;
    root.rotation.y += (swing + tx - root.rotation.y) * 0.05;
    root.rotation.x += (ty - root.rotation.x) * 0.05;
    for (let i = 0; i < count; i++) {
      age[i] += dt;
      vel[i * 3] *= 0.992; vel[i * 3 + 2] *= 0.992; vel[i * 3 + 1] -= dt * 0.12;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (age[i] > 2.4) seed(i, false);
    }
    airGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    ro.disconnect();
    io.disconnect();
    hoverEl.removeEventListener('pointermove', onMove);
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      const s = m as THREE.MeshStandardMaterial;
      [s.map, s.bumpMap, s.roughnessMap].forEach((tx2) => tx2?.dispose());
      m.dispose();
    });
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
