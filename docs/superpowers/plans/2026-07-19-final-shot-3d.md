# FINAL SHOT 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat canvas FINAL SHOT game with a true 3D on-rails shooter using Tripo-generated enemy models, as the reusable template for the other seven arcade games.

**Architecture:** One self-contained HTML file (`assets/arcade/final-shot-3d.html`) holding a three.js scene: the camera rides an authored Catmull-Rom spline through a procedural city then space, Tripo GLB enemies spawn from a clone pool at depth, raycast shooting from screen coordinates, and a 2D canvas overlay draws the HUD. The scene's gundam cabinet is the only thing routed to it; the other seven games keep the existing canvas engine untouched.

**Tech Stack:** three.js 0.166.1 (CDN importmap, matching the main scene), GLTFLoader + MeshoptDecoder, WebAudio synthesized SFX, no build step, no npm dependencies at runtime.

## Global Constraints

- three.js version is exactly `0.166.1` via `https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js` and addons at `https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/` — same as `index.html`
- Canvas render size is exactly 960x540; `renderer.setPixelRatio(1)`
- Total new download budget under 5MB; each enemy GLB under 1.5MB after compression
- Max 12 live enemy instances, drawn from a pre-allocated clone pool; never allocate a GLB clone during play
- No shadow maps (`renderer.shadowMap.enabled` stays false)
- All loaded GLB materials get `emissiveIntensity = 0` (house bloom rule)
- Tripo settings for every generation: Standard mesh (NEVER Ultra), PBR on, v3.0, HD Texture off, Private on
- Compression recipe verbatim: `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`
- Do NOT commit `arcade-src/glb/` (gitignored raw Tripo dumps)
- No devil/demon/occult imagery — enemies are machines. No money, no `$` anywhere
- Test hooks that MUST exist on `window` with the same names and semantics as the canvas engine: `__arcStop`, `__arcGame`, `__arcStep(n, dt)`, `__arcShoot(x, y)`, `__arcState`, `__arcEnts()`
- `__arcShoot(x, y)` takes coordinates in the 960x540 game space, matching the old engine
- ESC calls `parent.__arcExit && parent.__arcExit()` inside a try/catch, matching the old engine
- Work happens on branch `final-shot-3d`; never push to `main`
- Verify on the deployed URL after merge, never claim correctness from a local preview

## File Structure

| File | Responsibility |
|---|---|
| `assets/arcade/final-shot-3d.html` | CREATE. The entire game: scene, rail, stages, enemies, combat, fx, hud, audio, test hooks |
| `assets/props/fs-mech.glb` | CREATE. Tripo enemy mech, compressed |
| `assets/props/fs-pod.glb` | CREATE. Tripo flying pod, compressed |
| `assets/props/fs-missile.glb` | CREATE. Tripo missile, compressed |
| `index.html:375` | MODIFY. Route the gundam cabinet to the new file; all other games unchanged |
| `arcade-src/fs-*.png` | CREATE. Source images for the three Tripo gens (committed; CDN URLs expire) |

The game is one file because that is the established pattern for this project's sub-apps (`assets/arcade/index.html` is 618 lines, `assets/mpc/index.html` similar) and because it must be independently loadable in an iframe with zero build tooling. Internal structure is enforced by clearly separated sections with a single top-level `FS` state object, mirroring the existing engine's `ST` object.

---

### Task 1: Generate and compress the three Tripo enemy models

**Files:**
- Create: `arcade-src/fs-mech.png`, `arcade-src/fs-pod.png`, `arcade-src/fs-missile.png`
- Create: `arcade-src/glb/fs-mech-raw.glb`, `fs-pod-raw.glb`, `fs-missile-raw.glb` (gitignored)
- Create: `assets/props/fs-mech.glb`, `assets/props/fs-pod.glb`, `assets/props/fs-missile.glb`

**Interfaces:**
- Consumes: nothing
- Produces: three compressed GLB files at known paths, each under 1.5MB, each a machine with a clear front-facing orientation

- [ ] **Step 1: Generate the three source images**

Use Constants `create_image` (or Higgsfield if topped up). Three prompts, 3/4 front view, plain background, full body in frame:

1. `fs-mech.png` — "3D render of a hostile military mech head and torso, dark green armor plating, single glowing red cyclops eye sensor, blocky industrial 90s anime style, three-quarter front view, plain light gray background, full subject in frame"
2. `fs-pod.png` — "3D render of a small purple ovoid flying scout drone, glossy shell, single glowing cyan eye lens, two small side thrusters, three-quarter front view, plain light gray background, full subject in frame"
3. `fs-missile.png` — "3D render of a sleek white and red guided missile with four tail fins, military hardware, side-on three-quarter view, plain light gray background, full subject in frame"

Save each to `arcade-src/`. Verify each file exists and is a valid PNG:

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
file arcade-src/fs-mech.png arcade-src/fs-pod.png arcade-src/fs-missile.png
```
Expected: each line reports `PNG image data`.

- [ ] **Step 2: Serve the images with CORS for Tripo**

Tripo runs on https and blocks mixed content from `localhost`; it must be `127.0.0.1`.

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
curl -s -o /dev/null -w "%{http_code}\n" --max-time 2 http://127.0.0.1:8756/arcade-src/fs-mech.png || \
nohup python3 -c "from http.server import HTTPServer,SimpleHTTPRequestHandler as H
class C(H):
 def end_headers(s): s.send_header('Access-Control-Allow-Origin','*'); H.end_headers(s)
HTTPServer(('127.0.0.1',8756),C).serve_forever()" >/tmp/arc_cors.log 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8756/arcade-src/fs-mech.png
```
Expected: `200`.

- [ ] **Step 3: Generate each model in Tripo web**

Drive OTTI's logged-in Chrome via `claude-in-chrome` at https://www.tripo3d.ai/app/home. Per model, strictly serially (each result modal blocks the next injection):

1. Click `.single-img-button`, then **wait ~1.6s** — Tripo renders the file input asynchronously; querying immediately finds 0 inputs
2. Inject the image bytes into the hidden `<input type=file>` (the native picker is undrivable)
3. Verify by the **thumbnail**, not `input.files` — after React ingests the file, `input.files` reads back empty, which is normal
4. Settings: PBR on, **Standard** mesh, Private on, v3.0, HD Texture off
5. Click Generate **manually** via a real click — JS-triggered clicks are unreliable
6. Confirm it fired by the **credit drop of 25**; if credits did not move it did not fire and cost nothing
7. Close the result modal before the next injection. NEVER bulk-click `[class*=close]` — it clicks the uploaded thumbnail's × and silently wipes the image

- [ ] **Step 4: Download the raws and compress**

Download each GLB from the model page's Download button (free, permanent in My Models). They land in `~/Downloads/tripo_pbr_model_<uuid>.glb`. Copy to gitignored working paths and compress:

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
mkdir -p arcade-src/glb
# copy each downloaded uuid file to arcade-src/glb/<name>-raw.glb first, then:
for n in fs-mech fs-pod fs-missile; do
  npx @gltf-transform/cli optimize arcade-src/glb/${n}-raw.glb assets/props/${n}.glb \
    --compress meshopt --texture-compress webp --texture-size 1024
done
ls -lh assets/props/fs-*.glb
```
Expected: three files, each well under 1.5MB.

- [ ] **Step 5: Verify the GLBs are valid and gitignored raws stay out**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
for n in fs-mech fs-pod fs-missile; do
  echo "== $n"; npx @gltf-transform/cli validate assets/props/${n}.glb 2>&1 | grep -A2 "ERROR" | head -3
done
git check-ignore arcade-src/glb/fs-mech-raw.glb && echo "raws ignored OK"
```
Expected: each model reports `info: No errors found.` under ERROR, and `raws ignored OK`.

- [ ] **Step 6: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add arcade-src/fs-mech.png arcade-src/fs-pod.png arcade-src/fs-missile.png assets/props/fs-mech.glb assets/props/fs-pod.glb assets/props/fs-missile.glb
git commit -m "FINAL SHOT 3D: Tripo enemy models (mech, pod, missile) compressed to web weight"
```

---

### Task 2: Scene shell, rail camera, and the test-hook contract

**Files:**
- Create: `assets/arcade/final-shot-3d.html`

**Interfaces:**
- Consumes: nothing from earlier tasks (GLBs arrive in Task 3)
- Produces:
  - `FS` — the single global state object, with fields `mode` (`'attract'|'play'|'over'`), `t`, `tick`, `stage`, `score`, `hi`, `shield`, `power`, `powerAmmo`, `ents` (array), and methods `start()`, `hurt(n)`, `gameOver()`, `nextStage()`, `shoot(x, y)`, `update(dt)`, `render()`
  - `railPos(u, out)` — writes the spline position at `u` (0..1) into `THREE.Vector3 out`, returns `out`
  - `railLook(u, out)` — writes the look-ahead target at `u` into `out`, returns `out`
  - `window.__arcStep(n, dt)`, `window.__arcShoot(x, y)`, `window.__arcState`, `window.__arcEnts()`, `window.__arcStop`, `window.__arcGame`
  - `SFX` — object with `shot`, `hit`, `big`, `bad`, `power`, `over`, `stage` methods (ported verbatim from the canvas engine's synth section)

- [ ] **Step 1: Write the failing test harness**

Create `assets/arcade/final-shot-3d.html` containing ONLY a selftest that asserts the contract, so it fails first. Put this at the end of the file's module script:

```javascript
if(location.hash==='#selftest'){
  const A=(c,m)=>{if(!c)throw new Error('FAIL: '+m);};
  A(typeof window.__arcStep==='function','__arcStep exists');
  A(typeof window.__arcShoot==='function','__arcShoot exists');
  A(typeof window.__arcEnts==='function','__arcEnts exists');
  A(typeof window.__arcStop==='function','__arcStop exists');
  A(window.__arcGame==='gundam','__arcGame is gundam');
  A(FS.mode==='attract','starts in attract');
  const p=railPos(0,new THREE.Vector3()), p2=railPos(0.5,new THREE.Vector3());
  A(p.distanceTo(p2)>1,'rail actually travels');
  FS.start();
  A(FS.mode==='play'&&FS.shield===6&&FS.score===0,'start resets state');
  window.__arcStep(10,0.016);
  A(FS.t>0.1,'stepping advances time');
  console.log('SELFTEST OK');
}
```

- [ ] **Step 2: Run it to make sure it fails**

Serve and load the page (the CORS server from Task 1 Step 2 serves the repo root):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8756/assets/arcade/final-shot-3d.html
```
Then open `http://127.0.0.1:8756/assets/arcade/final-shot-3d.html#selftest` in the Browser pane and read console.
Expected: a ReferenceError (`FS is not defined`) — NOT `SELFTEST OK`.

- [ ] **Step 3: Implement the shell — page, renderer, rail, state, hooks**

Write the full file. Head and body:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>OTTI ARCADE — FINAL SHOT</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body{width:100%;height:100%;overflow:hidden;background:#050508;font-family:'Courier New',monospace;
    user-select:none;-webkit-user-select:none;cursor:none}
  #wrap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:960px;height:540px}
  #gl,#ui{position:absolute;left:0;top:0;width:960px;height:540px;cursor:none}
  #ui{pointer-events:none}
</style>
</head>
<body>
<div id="wrap"><canvas id="gl" width="960" height="540"></canvas><canvas id="ui" width="960" height="540"></canvas></div>
<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js",
"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/"}}
</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
</script>
</body>
</html>
```

Inside the module script, the shell:

```javascript
const W=960,H=540;
const glc=document.getElementById('gl'), uic=document.getElementById('ui'), ui=uic.getContext('2d');
function fit(){const s=Math.min(innerWidth/W,innerHeight/H);
  document.getElementById('wrap').style.transform=`translate(-50%,-50%) scale(${s})`;}
addEventListener('resize',fit);fit();

const renderer=new THREE.WebGLRenderer({canvas:glc,antialias:true});
renderer.setPixelRatio(1);                    // hard budget: this runs in an iframe over a 3D site
renderer.setSize(W,H,false);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(62,W/H,0.1,900);
const gltfL=new GLTFLoader();
gltfL.setMeshoptDecoder(MeshoptDecoder);      // meshopt files silently fail to load without this

// ---- rail: authored spline the camera rides; u in 0..1 loops per stage ----
const RAILS=[
  new THREE.CatmullRomCurve3([              // stage 0: city, weaving between towers
    new THREE.Vector3(0,14,0),   new THREE.Vector3(14,16,-60),
    new THREE.Vector3(-10,12,-130), new THREE.Vector3(8,18,-200),
    new THREE.Vector3(0,15,-280),
  ],false,'catmullrom',0.5),
  new THREE.CatmullRomCurve3([              // stage 1: space, wider and calmer
    new THREE.Vector3(0,0,0),    new THREE.Vector3(-18,6,-70),
    new THREE.Vector3(12,-4,-150), new THREE.Vector3(-6,8,-230),
    new THREE.Vector3(0,0,-300),
  ],false,'catmullrom',0.5),
];
function rail(){return RAILS[FS.stage%RAILS.length];}
function railPos(u,out){return rail().getPointAt(Math.min(0.999,Math.max(0,u)),out);}
function railLook(u,out){return rail().getPointAt(Math.min(0.999,Math.max(0,u+0.06)),out);}

const _rp=new THREE.Vector3(), _rl=new THREE.Vector3();
function driveCamera(){
  const u=(FS.t*0.035)%1;                     // ~28s per stage lap
  camera.position.copy(railPos(u,_rp));
  camera.lookAt(railLook(u,_rl));
  camera.rotation.z=Math.sin(FS.t*0.5)*0.06;  // gentle bank so the ride reads as flight
}
```

The state object, mirroring the canvas engine's `ST` shape so the contract is familiar:

```javascript
const FS={
  mode:'attract', t:0, tick:0, stage:0, score:0, hi:0, shield:6,
  power:null, powerAmmo:0, ents:[], flashMsg:'', flashT:0, shake:0, over:0,
  start(){this.mode='play';this.t=0;this.tick=0;this.stage=0;this.score=0;this.shield=6;
    this.power=null;this.powerAmmo=0;this.ents.length=0;this.flashMsg='STAGE 1';this.flashT=2;SFX.stage();},
  hurt(n){if(this.mode!=='play')return;this.shake=.4;SFX.bad();
    this.shield-=n;if(this.shield<=0)this.gameOver();},
  gameOver(){this.mode='over';this.over=0;this.hi=Math.max(this.hi,this.score);SFX.over();},
  nextStage(){this.stage++;SFX.stage();this.flashMsg='STAGE '+(this.stage+1);this.flashT=2;
    if(this.stage>=2)this.gameOver();},
  shoot(x,y){
    if(this.mode==='attract'){this.start();return;}
    if(this.mode==='over'){if(this.over>1.2)this.mode='attract';return;}
    SFX.shot();
  },
  update(dt){
    this.t+=dt;this.tick++;
    if(this.flashT>0)this.flashT-=dt;
    if(this.shake>0)this.shake=Math.max(0,this.shake-dt*2);
    if(this.mode==='over')this.over+=dt;
    driveCamera();
    if(this.mode==='play'&&this.tick>0&&this.tick%1500===0)this.nextStage();
  },
  render(){renderer.render(scene,camera);drawHUD();},
};
```

Input, matching the old engine's semantics exactly:

```javascript
const aim={x:W/2,y:H/2,down:false};
function toGame(e){const r=glc.getBoundingClientRect();
  return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
glc.addEventListener('pointermove',e=>{const p=toGame(e);aim.x=p.x;aim.y=p.y;});
glc.addEventListener('pointerdown',e=>{e.preventDefault();const p=toGame(e);
  aim.x=p.x;aim.y=p.y;aim.down=true;ac();FS.shoot(p.x,p.y);});
glc.addEventListener('pointerup',()=>aim.down=false);
addEventListener('keydown',e=>{
  if(e.key==='Escape'){try{parent.__arcExit&&parent.__arcExit();}catch(_){}return;}
  if(e.repeat)return;ac();
  if(e.key===' '){FS.shoot(aim.x,aim.y);aim.down=true;}
});
addEventListener('keyup',e=>{if(e.key===' ')aim.down=false;});
```

Port the synth SFX section verbatim from `assets/arcade/index.html` lines 26-55 (`ac()`, `blip()`, `SFX`) — same sounds, no samples. Keep only the keys this game uses: `shot`, `hit`, `big`, `bad`, `power`, `over`, `stage`.

A placeholder HUD so the shell renders (Task 5 replaces it):

```javascript
function drawHUD(){
  ui.clearRect(0,0,W,H);
  ui.font='bold 16px "Courier New",monospace';ui.fillStyle='#ffd23d';ui.textAlign='left';
  ui.fillText('SCORE '+String(FS.score).padStart(7,'0'),14,28);
}
```

Loop and hooks:

```javascript
let last=performance.now();
function loop(){requestAnimationFrame(loop);
  const now=performance.now(), dt=Math.min((now-last)/1000,0.033);last=now;
  FS.update(dt);FS.render();}
loop();

window.__arcGame='gundam';
window.__arcStop=()=>{if(AC&&AC.state==='running')AC.suspend();if(FS.mode==='play')FS.mode='attract';};
window.__arcStep=(n,dt)=>{n=n||1;dt=dt||.016;for(let i=0;i<n;i++)FS.update(dt);FS.render();};
window.__arcShoot=(x,y)=>FS.shoot(x,y);
window.__arcEnts=()=>FS.ents.filter(e=>!e.dead).map(e=>({k:e.kind,x:e.sx,y:e.sy,friendly:false}));
```

Keep `window.__arcState` refreshed inside `FS.update`:

```javascript
    window.__arcState={game:'gundam',mode:this.mode,score:this.score,stage:this.stage,
      ents:this.ents.filter(e=>!e.dead).length,shield:this.shield,audio:AC?AC.state:'none'};
```

- [ ] **Step 4: Run the selftest to verify it passes**

Load `http://127.0.0.1:8756/assets/arcade/final-shot-3d.html#selftest` in the Browser pane, read console messages.
Expected: `SELFTEST OK`, zero errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add assets/arcade/final-shot-3d.html
git commit -m "FINAL SHOT 3D: scene shell, rail camera, state object, test-hook contract"
```

---

### Task 3: Procedural stages — neon city and space

**Files:**
- Modify: `assets/arcade/final-shot-3d.html`

**Interfaces:**
- Consumes: `scene`, `FS.stage`, `THREE` from Task 2
- Produces:
  - `buildStage(n)` — clears the previous stage group and builds stage `n` (0 = city, 1 = space) into `scene`; returns the `THREE.Group`
  - `stageGroup` — module-level reference to the current stage group, disposed on rebuild

- [ ] **Step 1: Write the failing test**

Add to the selftest block, before `console.log('SELFTEST OK')`:

```javascript
  A(stageGroup&&stageGroup.children.length>10,'stage 0 built with content');
  const n0=stageGroup.children.length;
  buildStage(1);
  A(stageGroup.children.length>0,'stage 1 built');
  A(stageGroup!==null,'stage group replaced not leaked');
  buildStage(0);
  A(Math.abs(stageGroup.children.length-n0)<2,'stage 0 rebuilds deterministically');
```

- [ ] **Step 2: Run it to verify it fails**

Load `...final-shot-3d.html#selftest`.
Expected: `ReferenceError: stageGroup is not defined`.

- [ ] **Step 3: Implement the stages**

```javascript
let stageGroup=null;
function disposeGroup(gp){
  gp.traverse(o=>{if(o.isMesh){o.geometry.dispose();
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m&&m.dispose());}});
}
// deterministic pseudo-random so a rebuilt stage is identical (selftest relies on this)
function srnd(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}

function buildStage(n){
  if(stageGroup){scene.remove(stageGroup);disposeGroup(stageGroup);}
  stageGroup=new THREE.Group();scene.add(stageGroup);
  const R=srnd(n===0?1337:7331);
  if(n%2===0)buildCity(stageGroup,R); else buildSpace(stageGroup,R);
  return stageGroup;
}

function buildCity(gp,R){
  scene.background=new THREE.Color(0x2a1408);
  scene.fog=new THREE.Fog(0x2a1408,60,420);
  gp.add(new THREE.AmbientLight(0xffc890,0.5));
  const key=new THREE.DirectionalLight(0xffb060,1.6);key.position.set(-30,60,20);gp.add(key);
  const rim=new THREE.PointLight(0xff6020,140,220);rim.position.set(10,20,-140);gp.add(rim);
  // ground
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,700),
    new THREE.MeshStandardMaterial({color:0x14100c,roughness:.95}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-2,-300);gp.add(ground);
  // towers flanking the rail, lit windows via emissive stripes
  const bodyM=new THREE.MeshStandardMaterial({color:0x0d0a08,roughness:.9});
  const winM=new THREE.MeshBasicMaterial({color:0xffb020,toneMapped:false});
  winM.color.multiplyScalar(0.55);            // bloom-knee dimming (house rule)
  for(let i=0;i<26;i++){
    const side=i%2?1:-1, h=40+R()*90, w=10+R()*10, d=10+R()*10;
    const x=side*(26+R()*40), z=-20-i*22-R()*10;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),bodyM);
    b.position.set(x,h/2-2,z);gp.add(b);
    const wq=new THREE.Mesh(new THREE.PlaneGeometry(w*0.7,h*0.8),winM);
    wq.position.set(x-side*(w/2+0.1),h/2,z);wq.rotation.y=side>0?-Math.PI/2:Math.PI/2;gp.add(wq);
  }
  return gp;
}

function buildSpace(gp,R){
  scene.background=new THREE.Color(0x02030d);
  scene.fog=new THREE.Fog(0x02030d,120,700);
  gp.add(new THREE.AmbientLight(0x88aaff,0.35));
  const sun=new THREE.DirectionalLight(0xffffff,2.0);sun.position.set(40,30,10);gp.add(sun);
  // starfield
  const pos=new Float32Array(1200*3);
  for(let i=0;i<1200;i++){pos[i*3]=(R()-.5)*700;pos[i*3+1]=(R()-.5)*400;pos[i*3+2]=-R()*700;}
  const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',
    new THREE.BufferAttribute(pos,3)),
    new THREE.PointsMaterial({color:0xcfe4ff,size:1.6,sizeAttenuation:false,toneMapped:false}));
  gp.add(stars);
  // planet
  const planet=new THREE.Mesh(new THREE.SphereGeometry(90,32,24),
    new THREE.MeshStandardMaterial({color:0x1d4a80,roughness:.9,emissive:0x0a1c33,emissiveIntensity:1}));
  planet.position.set(-140,40,-420);gp.add(planet);
  // debris the rail threads through
  const dM=new THREE.MeshStandardMaterial({color:0x554b44,roughness:.85});
  for(let i=0;i<40;i++){
    const s=1+R()*4;
    const d=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),dM);
    d.position.set((R()-.5)*180,(R()-.5)*90,-20-R()*300);
    d.rotation.set(R()*6,R()*6,R()*6);gp.add(d);
  }
  return gp;
}
```

Call `buildStage(0)` once at init (after the state object is defined), and rebuild on stage change by adding to `FS.nextStage()`, immediately after `this.stage++`:

```javascript
    buildStage(this.stage);
```

- [ ] **Step 4: Run the selftest to verify it passes**

Load `...final-shot-3d.html#selftest`.
Expected: `SELFTEST OK`, zero errors. Also load without the hash and screenshot — expect a burning-orange city corridor moving past the camera.

- [ ] **Step 5: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add assets/arcade/final-shot-3d.html
git commit -m "FINAL SHOT 3D: procedural neon-city and space stages with deterministic layout"
```

---

### Task 4: Enemy pool, spawning, and combat

**Files:**
- Modify: `assets/arcade/final-shot-3d.html`

**Interfaces:**
- Consumes: `FS`, `scene`, `camera`, `gltfL`, `buildStage` from Tasks 2-3
- Produces:
  - `KINDS` — `{mech:{hp:2,pts:300,file:'fs-mech',r:3.2}, pod:{hp:1,pts:200,file:'fs-pod',r:2.2}, missile:{hp:1,pts:100,file:'fs-missile',r:1.4,harm:true}, powerB:{hp:1,pts:0,file:'fs-pod',r:2,power:'bazooka'}, powerS:{hp:1,pts:0,file:'fs-pod',r:2,power:'shield'}}`
  - `spawn(kindKey, opts)` — takes an entity from the pool, positions it, pushes to `FS.ents`; entity shape is `{kind, k, obj, hp, t, dead, vel:THREE.Vector3, sx, sy}` where `sx/sy` are its projected 960x540 screen coordinates
  - `hitTest(x, y)` — returns the nearest live entity whose projected position is within its screen radius of `(x, y)`, or `null`
  - `killEnt(e)` — marks dead, scores, spawns fx, returns the object to the pool

- [ ] **Step 1: Write the failing test**

Add to the selftest block, before `console.log('SELFTEST OK')`:

```javascript
  FS.start();
  const before=FS.score;
  const e=spawn('mech',{at:new THREE.Vector3(0,12,-40)});
  A(e&&FS.ents.length===1,'spawn adds an entity');
  window.__arcStep(2,0.016);
  A(e.sx>=0&&e.sx<=960,'entity projects into screen space');
  A(hitTest(e.sx,e.sy)===e,'hitTest finds it at its own screen position');
  A(hitTest(5,5)===null,'hitTest misses far away');
  killEnt(e);killEnt(e);              // double-kill must not double-score
  A(FS.score===before+300,'kill scores exactly once');
  A(window.__arcEnts().length===0,'dead entities leave __arcEnts');
  FS.ents.length=0;
```

- [ ] **Step 2: Run it to verify it fails**

Load `...final-shot-3d.html#selftest`.
Expected: `ReferenceError: spawn is not defined`.

- [ ] **Step 3: Implement pool, spawn, motion, and hit detection**

```javascript
const KINDS={
  mech   :{hp:2,pts:300,file:'fs-mech',   r:3.2,size:6.0},
  pod    :{hp:1,pts:200,file:'fs-pod',    r:2.2,size:3.4},
  missile:{hp:1,pts:100,file:'fs-missile',r:1.4,size:2.2,harm:true},
  powerB :{hp:1,pts:0,  file:'fs-pod',    r:2.0,size:3.0,power:'bazooka'},
  powerS :{hp:1,pts:0,  file:'fs-pod',    r:2.0,size:3.0,power:'shield'},
};
const POOL={};                      // file -> array of ready clones
const PROTO={};                     // file -> loaded+normalized source object
const MAX_LIVE=12;                  // hard budget

function normalize(o,size){
  const bb=new THREE.Box3().setFromObject(o), dim=bb.getSize(new THREE.Vector3());
  o.scale.setScalar(size/Math.max(dim.x,dim.y,dim.z));
  o.traverse(c=>{if(c.isMesh&&c.material){
    c.material.emissiveIntensity=0;   // house rule: generated GLBs ship hot emissives
    c.material.envMapIntensity=.6;
  }});
  return o;
}
['fs-mech','fs-pod','fs-missile'].forEach(file=>{
  POOL[file]=[];
  gltfL.load(`../props/${file}.glb`,g=>{
    PROTO[file]=g.scene;
    for(let i=0;i<6;i++){const c=g.scene.clone(true);c.visible=false;scene.add(c);POOL[file].push(c);}
  },undefined,()=>console.warn('enemy GLB failed: '+file));  // silent skip, game still playable
});

function takeFromPool(file,size){
  const p=POOL[file];
  if(!p||!p.length)return null;      // not loaded yet, or pool exhausted -> skip this spawn
  const o=p.pop();normalize(o,size);o.visible=true;return o;
}
function returnToPool(file,o){o.visible=false;POOL[file]&&POOL[file].push(o);}

function spawn(kindKey,opts){
  if(FS.ents.filter(e=>!e.dead).length>=MAX_LIVE)return null;
  const k=KINDS[kindKey];
  const obj=takeFromPool(k.file,k.size);
  if(!obj)return null;
  const at=(opts&&opts.at)||new THREE.Vector3(0,10,-60);
  obj.position.copy(at);
  const e={kind:kindKey,k,obj,hp:k.hp,t:0,dead:0,sx:-1,sy:-1,
    vel:(opts&&opts.vel)||new THREE.Vector3(0,0,0),spin:(opts&&opts.spin)||0};
  FS.ents.push(e);return e;
}

const _pv=new THREE.Vector3();
function projectEnt(e){
  _pv.copy(e.obj.position).project(camera);
  e.sx=(_pv.x+1)/2*W; e.sy=(1-_pv.y)/2*H; e.behind=_pv.z>1;
}
function screenRadius(e){
  // radius in screen px scales with distance; keep clicks fair at depth
  const d=camera.position.distanceTo(e.obj.position);
  return Math.max(18,(e.k.r*520)/Math.max(6,d));
}
function hitTest(x,y){
  let best=null,bd=1e9;
  for(const e of FS.ents){
    if(e.dead||e.behind)continue;
    const dx=e.sx-x, dy=e.sy-y, d=Math.hypot(dx,dy);
    if(d<screenRadius(e)&&d<bd){bd=d;best=e;}
  }
  return best;
}
function killEnt(e){
  if(e.dead)return;                  // double-kill guard: score exactly once
  e.dead=1;
  if(e.k.power){
    if(e.k.power==='shield')FS.shield=Math.min(8,FS.shield+2); else FS.powerAmmo=5,FS.power='bazooka';
    SFX.power();
  } else { FS.score+=e.k.pts; SFX.big(); boom(e.obj.position); }
  returnToPool(e.k.file,e.obj);
}
```

Per-frame entity motion and cleanup — add inside `FS.update(dt)`, after `driveCamera()`:

```javascript
    for(const e of this.ents){
      if(e.dead)continue;
      e.t+=dt;
      e.obj.position.addScaledVector(e.vel,dt);
      if(e.kind==='mech')e.obj.position.y+=Math.sin(e.t*2)*0.02;      // hover bob
      if(e.kind==='pod')e.obj.rotation.z=Math.sin(e.t*3)*0.25;        // banking
      if(e.spin)e.obj.rotation.y+=e.spin*dt;
      e.obj.lookAt(camera.position);
      projectEnt(e);
      // missiles that reach the camera hurt and vanish
      if(e.k.harm&&camera.position.distanceTo(e.obj.position)<6){
        this.hurt(1);e.dead=1;returnToPool(e.k.file,e.obj);
      }
      // anything that passes behind the camera is recycled
      if(e.obj.position.z>camera.position.z+12){e.dead=1;returnToPool(e.k.file,e.obj);}
    }
    if(this.tick%30===0)this.ents=this.ents.filter(e=>!e.dead);
```

The spawn table — add to `FS.update(dt)` inside a `if(this.mode==='play')` block:

```javascript
      const ahead=()=>{const u=(this.t*0.035)%1;
        return railPos(Math.min(0.999,u+0.14),new THREE.Vector3());};
      if(this.tick%Math.max(30,70-this.stage*10)===0){
        const p=ahead(), side=Math.random()<.5?-1:1;
        if(Math.random()<.6)spawn('mech',{at:p.clone().add(new THREE.Vector3(side*rnd(6,18),rnd(-4,6),0))});
        else spawn('pod',{at:p.clone().add(new THREE.Vector3(side*30,rnd(2,14),0)),
          vel:new THREE.Vector3(-side*14,0,6),spin:0.6});
      }
      if(this.tick%150===100){
        const p=ahead();
        const v=camera.position.clone().sub(p).normalize().multiplyScalar(26);
        spawn('missile',{at:p,vel:v});
      }
      if(this.tick%600===400){
        const p=ahead();
        spawn(Math.random()<.5?'powerB':'powerS',{at:p.clone().add(new THREE.Vector3(0,8,0)),
          vel:new THREE.Vector3(0,0,10),spin:1.4});
      }
```

Add the helper near the top: `const rnd=(a,b)=>a+Math.random()*(b-a);`

Wire shooting into `FS.shoot`, replacing the placeholder body after the attract/over guards:

```javascript
    SFX.shot();
    const hit=hitTest(x,y);
    if(!hit)return;
    const dmg=(this.power==='bazooka'&&this.powerAmmo>0)?3:1;
    if(this.power==='bazooka'&&this.powerAmmo>0){this.powerAmmo--;if(this.powerAmmo<=0)this.power=null;}
    hit.hp-=dmg;
    if(hit.hp<=0)killEnt(hit); else {SFX.hit();spark(hit.obj.position);}
```

- [ ] **Step 4: Run the selftest to verify it passes**

Load `...final-shot-3d.html#selftest`.
Expected: `SELFTEST OK`. Note the test spawns before GLBs finish loading may return `null` — the test asserts on a spawn made after `window.__arcStep`, and `spawn` returning `null` when the pool is empty is correct behavior. If the assertion is flaky because of load timing, await the pool in the test:

```javascript
  // in the selftest, before the spawn assertions:
  await new Promise(r=>{const w=()=>POOL['fs-mech'].length?r():setTimeout(w,50);w();});
```
(The selftest block must then be wrapped in an `async` IIFE: `(async()=>{ ... })();`)

- [ ] **Step 5: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add assets/arcade/final-shot-3d.html
git commit -m "FINAL SHOT 3D: pooled Tripo enemies, spawn table, raycast-free screen hit detection, combat"
```

---

### Task 5: Effects and HUD

**Files:**
- Modify: `assets/arcade/final-shot-3d.html`

**Interfaces:**
- Consumes: `FS`, `scene`, `camera`, `ui`, `aim` from Tasks 2-4
- Produces:
  - `boom(pos)` — explosion burst at a world position
  - `spark(pos)` — small hit flash at a world position
  - `drawHUD()` — replaces the Task 2 placeholder; draws crosshair, score, shield pips, stage banner, attract screen, game-over screen

- [ ] **Step 1: Write the failing test**

Add to the selftest block:

```javascript
  const fxBefore=FXP.count;
  boom(new THREE.Vector3(0,10,-30));
  A(FXP.count>fxBefore,'boom emits particles');
  spark(new THREE.Vector3(0,10,-30));
  A(typeof drawHUD==='function','drawHUD defined');
  FS.mode='over';drawHUD();FS.mode='attract';drawHUD();FS.mode='play';drawHUD();
```

- [ ] **Step 2: Run it to verify it fails**

Load `...final-shot-3d.html#selftest`.
Expected: `ReferenceError: FXP is not defined`.

- [ ] **Step 3: Implement fx and HUD**

Particles as one pooled Points cloud — never allocate during play:

```javascript
const FXN=260;
const FXP={count:0,i:0,life:new Float32Array(FXN),vel:new Float32Array(FXN*3)};
const fxPos=new Float32Array(FXN*3);
const fxGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(fxPos,3));
const fxPts=new THREE.Points(fxGeo,new THREE.PointsMaterial({
  color:0xffb020,size:2.6,sizeAttenuation:true,transparent:true,opacity:.95,toneMapped:false}));
scene.add(fxPts);
function emit(pos,n,spread,speed){
  for(let j=0;j<n;j++){
    const i=FXP.i;FXP.i=(FXP.i+1)%FXN;
    fxPos[i*3]=pos.x;fxPos[i*3+1]=pos.y;fxPos[i*3+2]=pos.z;
    FXP.vel[i*3]=(Math.random()-.5)*spread*speed;
    FXP.vel[i*3+1]=(Math.random()-.5)*spread*speed;
    FXP.vel[i*3+2]=(Math.random()-.5)*spread*speed;
    FXP.life[i]=0.8;FXP.count++;
  }
  fxGeo.attributes.position.needsUpdate=true;
}
function boom(pos){emit(pos,40,1,26);FS.shake=Math.max(FS.shake,.35);}
function spark(pos){emit(pos,10,1,12);}
function updateFX(dt){
  let live=0;
  for(let i=0;i<FXN;i++){
    if(FXP.life[i]<=0)continue;
    FXP.life[i]-=dt;live++;
    fxPos[i*3]+=FXP.vel[i*3]*dt;
    fxPos[i*3+1]+=FXP.vel[i*3+1]*dt-9*dt*dt;
    fxPos[i*3+2]+=FXP.vel[i*3+2]*dt;
  }
  if(live)fxGeo.attributes.position.needsUpdate=true;
}
```

Call `updateFX(dt)` from `FS.update(dt)` right after the entity loop.

HUD, replacing the Task 2 placeholder entirely:

```javascript
function txt(s,x,y,size,col,align){
  ui.font='bold '+size+'px "Courier New",monospace';ui.fillStyle=col;
  ui.textAlign=align||'center';ui.fillText(s,x,y);
}
function drawHUD(){
  ui.clearRect(0,0,W,H);
  // top bar
  txt('FINAL SHOT',14,30,17,'#ffd23d','left');
  txt('SCORE '+String(FS.score).padStart(7,'0'),W/2,30,17,'#fff');
  txt('HI '+String(FS.hi).padStart(7,'0'),W-14,30,17,'#9ce0ff','right');
  // shield pips
  for(let i=0;i<8;i++){
    ui.fillStyle=i<FS.shield?'#39c463':'rgba(255,255,255,.12)';
    ui.beginPath();ui.roundRect(W-30-i*16,H-24,12,12,3);ui.fill();
  }
  if(FS.power==='bazooka')txt('BAZOOKA x'+FS.powerAmmo,14,H-16,15,'#ff7a1a','left');
  // stage banner
  if(FS.flashT>0){ui.globalAlpha=Math.min(1,FS.flashT);
    txt(FS.flashMsg,W/2,H/2-60,42,'#ffd23d');ui.globalAlpha=1;}
  // crosshair
  const cx=aim.x,cy=aim.y;
  ui.strokeStyle='#fff';ui.lineWidth=2;
  ui.beginPath();ui.arc(cx,cy,13,0,Math.PI*2);ui.stroke();
  ui.beginPath();ui.moveTo(cx-20,cy);ui.lineTo(cx-6,cy);ui.moveTo(cx+6,cy);ui.lineTo(cx+20,cy);
  ui.moveTo(cx,cy-20);ui.lineTo(cx,cy-6);ui.moveTo(cx,cy+6);ui.lineTo(cx,cy+20);ui.stroke();
  // modal screens
  if(FS.mode==='attract'){
    ui.fillStyle='rgba(4,5,10,.72)';ui.fillRect(0,0,W,H);
    txt('FINAL SHOT',W/2,H/2-70,58,'#ffd23d');
    txt('MOBILE SUIT ARCADE',W/2,H/2-30,20,'#fff');
    txt('CLICK / TAP TO START',W/2,H/2+40,26,'#fff');
    txt('shoot: click or SPACE  ·  exit: ESC',W/2,H/2+80,14,'#9ce0ff');
    txt('an OTTI RECORDS arcade original',W/2,H-30,12,'rgba(255,255,255,.5)');
  }
  if(FS.mode==='over'){
    ui.fillStyle='rgba(4,5,10,.72)';ui.fillRect(0,0,W,H);
    txt('GAME OVER',W/2,H/2-20,54,'#ff5050');
    txt('SCORE '+String(FS.score).padStart(7,'0'),W/2,H/2+30,24,'#fff');
    if(FS.over>1.2)txt('CLICK TO CONTINUE',W/2,H/2+80,18,'#9ce0ff');
  }
}
```

Apply screen shake in `FS.render()` before rendering:

```javascript
  render(){
    if(this.shake>0){
      camera.position.x+=(Math.random()-.5)*this.shake*1.4;
      camera.position.y+=(Math.random()-.5)*this.shake*1.4;
    }
    renderer.render(scene,camera);drawHUD();
  },
```

- [ ] **Step 4: Run the selftest and play-test**

Load `...final-shot-3d.html#selftest` — expect `SELFTEST OK`, zero errors.
Then load without the hash in the Browser pane and drive it:

```javascript
// in the page console via javascript_tool
window.__arcShoot(480,270);          // starts the game from attract
window.__arcStep(120,0.016);         // ~2s of play
JSON.stringify(window.__arcState)
```
Expected: `mode:"play"`, entities present. Screenshot to confirm enemies, HUD, and city are visible.

- [ ] **Step 5: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add assets/arcade/final-shot-3d.html
git commit -m "FINAL SHOT 3D: pooled particle fx, screen shake, full HUD with attract and game-over screens"
```

---

### Task 6: Route the gundam cabinet and verify the whole chain

**Files:**
- Modify: `index.html:375`

**Interfaces:**
- Consumes: `assets/arcade/final-shot-3d.html` from Tasks 2-5
- Produces: the gundam cabinet loading the 3D game; the other seven unchanged

- [ ] **Step 1: Write the failing test**

Add to the scene's existing `#selftest` block in `index.html`, after the current arcade assertions (near line 1539):

```javascript
  A(arcSrcFor('gundam').startsWith('assets/arcade/final-shot-3d.html'),'gundam routes to the 3D game');
  A(arcSrcFor('vcop2').startsWith('assets/arcade/index.html'),'other games keep the canvas engine');
```

- [ ] **Step 2: Run it to verify it fails**

Load `http://127.0.0.1:8756/index.html#selftest` in the Browser pane.
Expected: `ReferenceError: arcSrcFor is not defined`.

- [ ] **Step 3: Implement the route**

In `index.html`, replace the single `want` line inside the `if(s==='arc')` block (currently line 375):

```javascript
      const want=arcSrcFor(curArc.game);
```

And add the helper immediately above the `setCam` function (near line 345, beside `const arcframe=...`):

```javascript
// FINAL SHOT runs the 3D rail-shooter build; the other seven stay on the canvas engine.
// The per-game query is what forces a real iframe reload (hash-only changes are fragment navigations).
function arcSrcFor(game){
  return game==='gundam'
    ? 'assets/arcade/final-shot-3d.html?g=gundam#gundam'
    : 'assets/arcade/index.html?g='+game+'#'+game;
}
```

- [ ] **Step 4: Run the scene selftest and the full click-through**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8756/index.html
```
Load `http://127.0.0.1:8756/index.html#selftest` — expect `SELFTEST OK`, zero console errors.

Then verify the real chain in the Browser pane, without the hash:

```javascript
// enter the wing and dive into the gundam cabinet the way a click does
window._setCam('arcade'); window.__step();
window._camCur.pos.copy(window._ct.pos); window._camCur.look.copy(window._ct.look); window.__step();
window._arcSelect(8);                       // index 8 is the gundam unit
window._camCur.pos.copy(window._ct.pos); window._camCur.look.copy(window._ct.look);
for(let i=0;i<12;i++)window.__step();
const f=document.getElementById('arcframe');
JSON.stringify({src:f.src.split('/').pop(),cls:f.className,game:f.contentWindow.__arcGame})
```
Expected: `src` is `final-shot-3d.html?g=gundam#gundam`, `cls` is `show`, `game` is `gundam`.

Then confirm the other seven are untouched:

```javascript
(()=>{const f=document.getElementById('arcframe'),out=[];
 for(let i=0;i<8;i++){window._arcSelect(i);out.push(window._arcUnits[i].game+'->'+f.src.split('/').pop());}
 return JSON.stringify(out);})()
```
Expected: indices 0-7 all report `index.html?g=<game>#<game>`.

Verify ESC restores the wing:

```javascript
dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
for(let i=0;i<6;i++)window.__step();
JSON.stringify({cls:document.getElementById('arcframe').className||'(none)',state:window._dbg().state})
```
Expected: `cls` is `(none)`, `state` is `arcade`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git add index.html
git commit -m "FINAL SHOT 3D: route the gundam cabinet to the 3D rail shooter, others unchanged"
```

---

### Task 7: Performance pass, portrait check, and PR

**Files:**
- Modify: `assets/arcade/final-shot-3d.html` (only if the perf numbers demand it)

**Interfaces:**
- Consumes: everything from Tasks 1-6
- Produces: a PR against `main` with measured evidence

- [ ] **Step 1: Measure frame timing and draw calls under load**

In the Browser pane with the game running:

```javascript
window.__arcShoot(480,270);
window.__arcStep(300,0.016);
(()=>{const t0=performance.now();for(let i=0;i<60;i++)window.__arcStep(1,0.016);
 const ms=(performance.now()-t0)/60;
 return JSON.stringify({msPerFrame:+ms.toFixed(2),fps:+(1000/ms).toFixed(0),
   ents:window.__arcEnts().length});})()
```
Expected: `msPerFrame` under 16 (60fps). If it exceeds 16, reduce `MAX_LIVE` from 12 to 8 and the city tower count from 26 to 18, then re-measure. Record the final numbers for the PR body.

- [ ] **Step 2: Verify total download weight**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
du -ch assets/props/fs-*.glb assets/arcade/final-shot-3d.html | tail -1
```
Expected: under 5MB total. If over, re-compress the offending GLB with `--texture-size 512`.

- [ ] **Step 3: Portrait and mobile check**

Resize the Browser pane to mobile (375x812), reload the game, screenshot.
Expected: the 960x540 canvas letterboxes centered and legible; tapping fires (verify via `window.__arcState.mode` flipping from `attract` to `play` after a tap).

- [ ] **Step 4: Full regression of the wing**

Load `http://127.0.0.1:8756/index.html#selftest` — expect `SELFTEST OK`, zero console errors.
Click through all 9 cabinets confirming each loads its correct game, and ESC restores the wing each time.

- [ ] **Step 5: Push and open the PR**

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git push -u origin final-shot-3d
gh pr create --base main --head final-shot-3d \
  --title "FINAL SHOT 3D: on-rails Tripo rail shooter replaces the flat canvas game" \
  --body "Implements docs/superpowers/specs/2026-07-19-final-shot-3d-design.md.

The gundam cabinet now loads a true 3D on-rails shooter: the camera rides an authored spline through a burning neon city then space, with Tripo-generated enemy mechs, pods, and missiles spawning at depth. The other seven games are untouched on the canvas engine.

- 3 Tripo enemy GLBs, meshopt+webp compressed
- Pooled clones (max 12 live), no allocation during play, no shadows, pixelRatio 1
- All original mechanics preserved: shield HUD, bazooka/shield drops, per-kind scoring, 2 stages, game over
- Test-hook contract unchanged (__arcStep/__arcShoot/__arcState/__arcEnts/__arcStop/__arcGame)

Measured: <fill in msPerFrame and fps from Step 1>, total new weight <fill in from Step 2>.
Verified: game selftest OK, scene selftest OK, 0 console errors, all 9 cabinets route correctly, ESC restores, portrait letterboxes and taps fire.

Live-URL verification follows the merge, per house rules.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 6: Run the review loop**

Use the `code-review-loop` skill: `/code-review max --comment`, fix verified findings on new commits (never `--amend`), then `/engineering:code-review` as the final gate. Emit the chat status block with SCORE X/5 after every round. Loop until 5/5, then hand to OTTI to merge.
