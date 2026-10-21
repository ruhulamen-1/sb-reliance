// The 3D ducting model in the home page hero (three.js). Loaded only on desktop, after the page has loaded,
// so phones and the first paint never pay for it. mountDuct() starts it on a canvas and returns a cleanup.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const W = 0.9; // rectangular duct width
const H = 0.55; // and height

export function mountDuct(canvas: HTMLCanvasElement, hoverEl: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(7.6, 4.6, 8.8);
  camera.lookAt(0, -0.35, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b27a, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 9, 6);
  scene.add(sun);
  const warm = new THREE.PointLight(0xf2b705, 6, 12);
  warm.position.set(-2.5, 1.5, 2.5);
  scene.add(warm);

  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd8db, metalness: 0.8, roughness: 0.34 });
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xb9c3c6, metalness: 0.9, roughness: 0.25 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xc9874a, metalness: 0.9, roughness: 0.28 });
  const lagging = new THREE.MeshStandardMaterial({ color: 0x1d3a3e, metalness: 0.05, roughness: 0.85 });
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x8c979a, metalness: 0.7, roughness: 0.4 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2f7d74, transparent: true, opacity: 0.55 });

  const root = new THREE.Group();
  scene.add(root);
  const model = new THREE.Group();
  root.add(model);
  const geos: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, edges = false) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    model.add(m);
    if (edges) {
      const e = new THREE.EdgesGeometry(geo, 25);
      geos.push(e);
      const l = new THREE.LineSegments(e, edgeMat);
      l.position.copy(m.position);
      model.add(l);
    }
    return m;
  };

  // main run along x, an elbow, then a run along -z, with a flange every metre
  const runX = { from: -3.2, to: 1.2 };
  const runZ = { to: -3.4 };
  add(new THREE.BoxGeometry(runX.to - runX.from, H, W), steel, (runX.from + runX.to) / 2, 0, 0, true);
  add(new THREE.BoxGeometry(W, H, Math.abs(runZ.to) - W / 2), steel, runX.to + W / 2, 0, (runZ.to - W / 2) / 2, true);
  add(new THREE.BoxGeometry(W, H, W), steel, runX.to + W / 2, 0, 0, true); // elbow block
  for (let x = runX.from + 0.2; x < runX.to; x += 1.1) add(new THREE.BoxGeometry(0.06, H + 0.12, W + 0.12), flangeMat, x, 0, 0);
  for (let z = -0.9; z > runZ.to; z -= 1.1) add(new THREE.BoxGeometry(W + 0.12, H + 0.12, 0.06), flangeMat, runX.to + W / 2, 0, z);
  // end caps
  add(new THREE.BoxGeometry(0.06, H + 0.12, W + 0.12), flangeMat, runX.from, 0, 0);
  add(new THREE.BoxGeometry(W + 0.12, H + 0.12, 0.06), flangeMat, runX.to + W / 2, 0, runZ.to);

  // hanger rods up to the slab
  const rod = (x: number, z: number) => add(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), rodMat, x, H / 2 + 0.75, z);
  for (const x of [-2.6, -0.9, 0.6]) { rod(x, W / 2 + 0.05); rod(x, -W / 2 - 0.05); }
  for (const z of [-1.4, -2.9]) { rod(runX.to + 0.02, z); rod(runX.to + W + 0.08, z); }

  // round drops to square ceiling diffusers
  const diffusers: THREE.Vector3[] = [];
  const drop = (x: number, z: number) => {
    add(new THREE.CylinderGeometry(0.2, 0.2, 1.05, 24), steel, x, -H / 2 - 0.52, z, true);
    const y = -H / 2 - 1.08;
    add(new THREE.BoxGeometry(0.95, 0.07, 0.95), flangeMat, x, y, z, true);
    for (const s of [0.75, 0.55, 0.35]) {
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(s, 0.01, s));
      geos.push(g);
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5f6b6e }));
      l.position.set(x, y - 0.04, z);
      model.add(l);
    }
    diffusers.push(new THREE.Vector3(x, y - 0.05, z));
  };
  drop(-1.9, 0);
  drop(runX.to + W / 2, -2.3);

  // a copper refrigerant pipe and an insulated one running beside the duct
  const pipePath = (dx: number) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, 0.05, W / 2 + 0.3 + dx),
    new THREE.Vector3(0.4, 0.05, W / 2 + 0.3 + dx),
    new THREE.Vector3(runX.to + W + 0.3 + dx, 0.05, W / 2 + 0.25 + dx * 0.6),
    new THREE.Vector3(runX.to + W + 0.3 + dx, 0.05, -0.8),
    new THREE.Vector3(runX.to + W + 0.3 + dx, 0.05, runZ.to),
  ], false, 'catmullrom', 0.2);
  add(new THREE.TubeGeometry(pipePath(0), 160, 0.055, 12), copper, 0, 0, 0);
  add(new THREE.TubeGeometry(pipePath(0.26), 160, 0.1, 14), lagging, 0, 0, 0);

  // centre the model
  const box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.sub(c);
  diffusers.forEach((d) => d.sub(c));

  // cool air falling out of the diffusers
  const PER = 46;
  const count = PER * diffusers.length;
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const seed = (i: number, fresh: boolean) => {
    const d = diffusers[Math.floor(i / PER)];
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.36;
    pos[i * 3] = d.x + Math.cos(a) * r;
    pos[i * 3 + 1] = d.y - (fresh ? Math.random() * 1.4 : 0);
    pos[i * 3 + 2] = d.z + Math.sin(a) * r;
    speed[i] = 0.35 + Math.random() * 0.5;
  };
  for (let i = 0; i < count; i++) seed(i, true);
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geos.push(airGeo);
  const airMat = new THREE.PointsMaterial({ color: 0x3f9fc4, size: 0.08, transparent: true, opacity: 0.75, depthWrite: false });
  root.add(new THREE.Points(airGeo, airMat));

  // size, mouse tilt, pause when hidden
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let tx = 0;
  let ty = 0;
  const onMove = (e: PointerEvent) => {
    const r = hoverEl.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
  };
  hoverEl.addEventListener('pointermove', onMove);

  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
  io.observe(canvas);

  const clock = new THREE.Clock();
  let spin = -0.5;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    spin += dt * 0.12;
    root.rotation.y += (spin + tx - root.rotation.y) * 0.06;
    root.rotation.x += (ty * 0.6 - root.rotation.x) * 0.06;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= speed[i] * dt;
      const d = diffusers[Math.floor(i / PER)];
      if (pos[i * 3 + 1] < d.y - 1.5) seed(i, false);
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
    [steel, flangeMat, copper, lagging, rodMat, edgeMat, airMat].forEach((m) => m.dispose());
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
