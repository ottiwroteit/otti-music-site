// MSL lounge fireplace: Fire Pro's built-in "Fireplace" preset, seen head-on through the
// firebox opening. The main site (WebGL) overlays this page exactly on the opening.
import * as THREE from 'three/webgpu';
import { ClusteredLighting } from 'three/addons/lighting/ClusteredLighting.js';
import { FireSimulation } from '../dist-lib/threejs-fire-pro.js';
import preset from '../editor/presets/fireplace.json';

// opening in preset units: inner pillar faces at x = +-1.16, hearth top y = 0.22, mantel underside y = 2.32
const OX = 1.16, OY0 = 0.22, OY1 = 2.32, OZ = 0.0, CY = (OY0 + OY1) / 2, D = 4;

if (!navigator.gpu) document.body.dataset.state = 'no-webgpu';
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.lighting = new ClusteredLighting();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.append(renderer.domElement);
document.body.dataset.state='init';
await renderer.init();
document.body.dataset.state='renderer-ok';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070504);
scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x120c08, 0.25));

// firebox interior: soot-dark brick back and cheeks, ash floor
const soot = new THREE.MeshStandardMaterial({ color: 0x241a15, roughness: 0.95 });
const ash = new THREE.MeshStandardMaterial({ color: 0x3a332e, roughness: 1 });
const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
};
add(new THREE.PlaneGeometry(2 * OX + 0.2, OY1 - OY0 + 0.4), soot, 0, CY, -1.1);
add(new THREE.PlaneGeometry(1.4, OY1 - OY0 + 0.4), soot, -OX, CY, -0.4, Math.PI / 2);
add(new THREE.PlaneGeometry(1.4, OY1 - OY0 + 0.4), soot, OX, CY, -0.4, -Math.PI / 2);
const floor = add(new THREE.PlaneGeometry(2 * OX, 1.4), ash, 0, OY0, -0.4); floor.rotation.x = -Math.PI / 2;
const lintel = add(new THREE.PlaneGeometry(2 * OX, 1.4), soot, 0, OY1, -0.4); lintel.rotation.x = Math.PI / 2;

// logs on a grate, same layout as the Fire Pro scene
const bark = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.97 });
const char = new THREE.MeshStandardMaterial({ color: 0x120c09, roughness: 1, emissive: 0xff4a10, emissiveIntensity: 0.25 });
const logGeo = new THREE.CylinderGeometry(0.11, 0.12, 1.25, 14).rotateZ(Math.PI / 2); // lies along x
// two logs across the grate, two crossed on top
[[-0.0, 0.47, -0.05, 0.12, bark], [0.0, 0.47, -0.42, -0.1, char], [-0.25, 0.68, -0.22, 0.55, char], [0.25, 0.68, -0.22, -0.55, bark]]
  .forEach(([x, y, z, ry, m]) => add(logGeo, m as THREE.Material, x as number, y as number, z as number, ry as number));
const iron = new THREE.MeshStandardMaterial({ color: 0x2c2d30, metalness: 0.7, roughness: 0.5 });
for (const x of [-0.8, 0.8]) add(new THREE.BoxGeometry(0.06, 0.28, 1), iron, x, 0.36, -0.2);
for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.04, 0.05, 1), iron, -0.8 + i * 0.2, 0.38, -0.2);

const sim = new FireSimulation(preset.simulation as any);
scene.add(sim);
for (const e of preset.emitters) {
  const em = sim.addEmitter({ ...(e.options as any), shape: { type: 'sphere', radius: e.radius } });
  em.object.position.fromArray(e.position);
}
for (const f of preset.forces) sim.addForce(f.options as any);
document.body.dataset.state='sim-init';
await sim.initialize(renderer);
document.body.dataset.state='sim-ok';

// camera head-on; the frustum is fitted to the opening so the page IS the view through it
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 50);
function fit() {
  if (innerWidth < 8 || innerHeight < 8) return; // a hidden/zero-size frame would allocate zero-size GPU buffers
  renderer.setSize(innerWidth, innerHeight);
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  // pick the vertical fov so the opening fills the view on its limiting axis
  const halfH = Math.max((OY1 - OY0) / 2, OX / aspect);
  camera.fov = (2 * Math.atan(halfH / D) * 180) / Math.PI;
  camera.position.set(0, CY, OZ + D);
  camera.lookAt(0, CY, OZ);
  camera.updateProjectionMatrix();
}
fit(); addEventListener('resize', fit);

const timer = new THREE.Timer();
renderer.setAnimationLoop((t: number) => {
  if (innerWidth < 8 || innerHeight < 8) return;
  timer.update(t);
  const d = timer.getDelta();
  sim.update(Number.isFinite(d) && d > 0 ? Math.min(d, 1 / 30) : 1 / 60); // first frame can report NaN
  renderer.render(scene, camera);
});
document.body.dataset.state = 'running';
(window as any).__fire = { sim, renderer };
