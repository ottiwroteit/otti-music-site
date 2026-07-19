/* engine3d.js - shared 3D rail-shooter engine for the MSL ARCADE cabinets.
 *
 * Extracted verbatim from the shipped FINAL SHOT (assets/arcade/final-shot-3d.html).
 * Every comment below is a hard-won fix from that build; do not "clean up" a line
 * that carries one without reading the comment first.
 *
 * The host HTML owns the markup, the CSS and the importmap. This module is imported
 * with bare specifiers ("three", "three/addons/") and therefore only works from a page
 * that ships the three@0.166.1 importmap.
 *
 * A game supplies a config and gets: renderer boot, the rail, the clone pool, entity
 * lifecycle, particles, synth SFX, input, the rAF loop, screen shake, the six window
 * test hooks and the generic HUD primitives. The game keeps its own rails, stage
 * builders, kinds table, spawn cadences and HUD extras.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

export const rnd=(a,b)=>a+Math.random()*(b-a);

// deterministic pseudo-random so a rebuilt stage is identical (selftest relies on this)
export function srnd(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}

export function disposeGroup(gp){
  gp.traverse(o=>{if(o.isMesh||o.isPoints){o.geometry.dispose();   // Points too: the starfield leaks otherwise
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m&&m.dispose());}});
}

/* ---------- tiny synth SFX (no samples anywhere), ported verbatim from assets/arcade/index.html ---------- */
let AC=null,master=null;
export function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.5;master.connect(AC.destination);}AC.resume();return AC;}
export function audioState(){return AC?AC.state:'none';}
export function blip(f0,f1,dur,type,vol,noise){
  if(!AC)return;const t=AC.currentTime;
  if(noise){const n=AC.createBufferSource(),len=AC.sampleRate*dur,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);n.buffer=b;
    const gn=AC.createGain();gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(.001,t+dur);
    const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(Math.max(f1,40),t+dur);
    n.connect(fl);fl.connect(gn);gn.connect(master);n.start(t);n.stop(t+dur);return;}
  const o=AC.createOscillator(),gn=AC.createGain();o.type=type||'square';
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(f1,30),t+dur);
  gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(gn);gn.connect(master);o.start(t);o.stop(t+dur);
}
export const SFX={
  shot:()=>blip(900,120,.09,'square',.30,true),
  hit:()=>blip(300,900,.08,'square',.22),
  big:()=>blip(140,30,.5,'sawtooth',.4,true),
  bad:()=>blip(200,60,.35,'sawtooth',.35),
  power:()=>{blip(440,880,.12,'square',.25);setTimeout(()=>blip(660,1320,.12,'square',.25),90);},
  over:()=>{blip(400,50,.8,'sawtooth',.35);},
  stage:()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>blip(f,f,.14,'square',.22),i*110));},
};

/* ---------- the engine ----------
 * createEngine(cfg) -> E
 *
 * cfg fields (all optional unless marked):
 *   gameId        REQUIRED string, the value of window.__arcGame and __arcState.game
 *   title         REQUIRED string, drawn in the top bar and on the attract screen
 *   subtitle      string under the attract title
 *   tint          accent colour for title / banner / attract title (default '#ffd23d')
 *   rails         REQUIRED array of THREE.CatmullRomCurve3, one per stage, cycled by index
 *   stages        REQUIRED array of (group, rand, E) => void stage builders, cycled by index
 *   kinds         REQUIRED entity table: {key:{hp,pts,file,r,size,harm?,power?}}
 *   spawnTick     (E, dt) => void, called every play frame; the game's spawn cadences
 *   entityUpdate  (e, dt, E) => void, per-kind motion, called after velocity integration
 *   damage        (hit, E) => number, damage for one shot (default 1)
 *   onKill        (e, E) => truthy if the game handled this kill (power-ups); else engine scores it
 *   onStart       (E) => void, reset game-specific state on a new run
 *   hud           (E) => void, the game's full HUD draw, built from the E.draw* primitives
 *   maxStages     stage index that ends the run (default 2)
 *   shieldStart   starting shield (default 6)
 *   railSpeed     rail laps per second (default 0.035, one lap is one stage)
 *   propPath      GLB folder (default '../props/')
 *   poolPer       clones per file (default 6)
 *   width/height  canvas size (default 960x540)
 */
export function createEngine(cfg){
  const W=cfg.width||960, H=cfg.height||540;
  const TINT=cfg.tint||'#ffd23d';
  const RAIL_SPEED=cfg.railSpeed!==undefined?cfg.railSpeed:0.035;
  const MAX_STAGES=cfg.maxStages!==undefined?cfg.maxStages:2;
  const SHIELD_START=cfg.shieldStart!==undefined?cfg.shieldStart:6;
  const PROP_PATH=cfg.propPath||'../props/';
  const POOL_PER=cfg.poolPer||6;

  const glc=document.getElementById(cfg.glCanvasId||'gl');
  const uic=document.getElementById(cfg.uiCanvasId||'ui');
  const ui=uic.getContext('2d');
  const wrap=document.getElementById(cfg.wrapId||'wrap');
  function fit(){const s=Math.min(innerWidth/W,innerHeight/H);
    wrap.style.transform=`translate(-50%,-50%) scale(${s})`;}
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
  const RAILS=cfg.rails;
  function rail(){return RAILS[FS.stage%RAILS.length];}
  function railPos(u,out){return rail().getPointAt(Math.min(0.999,Math.max(0,u)),out);}
  function railLook(u,out){return rail().getPointAt(Math.min(0.999,Math.max(0,u+0.06)),out);}

  const _rp=new THREE.Vector3(), _rl=new THREE.Vector3();
  function driveCamera(){
    const u=(FS.t*RAIL_SPEED)%1;                // ~28s per stage lap
    camera.position.copy(railPos(u,_rp));
    camera.lookAt(railLook(u,_rl));
    camera.rotation.z=Math.sin(FS.t*0.5)*0.06;  // gentle bank so the ride reads as flight
  }
  function railU(){return (FS.t*RAIL_SPEED)%1;}

  // ---- procedural stage worlds, supplied by the game as cfg.stages ----
  let stageGroup=null;
  function buildStage(n){
    if(stageGroup){scene.remove(stageGroup);disposeGroup(stageGroup);}
    stageGroup=new THREE.Group();scene.add(stageGroup);
    const R=srnd(1337+n*4099);      // seeded per stage index so every rebuild of stage n is identical
    cfg.stages[n%cfg.stages.length](stageGroup,R,E);
    return stageGroup;
  }

  /* ---------- pooled particle fx: one Points cloud, recycled by index, zero allocation in play ---------- */
  const FXN=260;
  const FX_PARK=-99999;               // dead particles are parked off world, never drawn where they died
  const FXP={count:0,i:0,life:new Float32Array(FXN),vel:new Float32Array(FXN*3)};
  const fxPos=new Float32Array(FXN*3);
  for(let i=0;i<FXN;i++)fxPos[i*3+1]=FX_PARK;
  const fxGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(fxPos,3));
  const fxPts=new THREE.Points(fxGeo,new THREE.PointsMaterial({
    // size is in world units with attenuation on: 2.6 read as screen-filling blobs on a kill
    // near the camera, so keep the sprite small and let the burst count carry the punch
    color:0xffb020,size:0.5,sizeAttenuation:true,transparent:true,opacity:.95,toneMapped:false}));
  fxPts.frustumCulled=false;          // positions move every frame; a stale bounding sphere would pop the cloud out
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
      if(FXP.life[i]<=0){fxPos[i*3+1]=FX_PARK;continue;}   // retire off world instead of freezing mid air
      fxPos[i*3]+=FXP.vel[i*3]*dt;
      fxPos[i*3+1]+=FXP.vel[i*3+1]*dt-9*dt*dt;
      fxPos[i*3+2]+=FXP.vel[i*3+2]*dt;
    }
    if(live)fxGeo.attributes.position.needsUpdate=true;
  }

  /* ---------- enemies: pooled Tripo GLB clones, screen-space hit detection ---------- */
  const KINDS=cfg.kinds;
  const POOL={};                      // file -> array of ready clones
  const BASE={};                      // file -> largest dimension at scale 1
  const MAX_LIVE=12;                  // hard budget: never allocate a clone during play

  const FILES=[];
  for(const key in KINDS){const f=KINDS[key].file;if(FILES.indexOf(f)<0)FILES.push(f);}
  FILES.forEach(file=>{
    POOL[file]=[];
    gltfL.load(`${PROP_PATH}${file}.glb`,g=>{
      const src=g.scene;
      src.traverse(c=>{if(c.isMesh&&c.material){
        (Array.isArray(c.material)?c.material:[c.material]).forEach(m=>{
          m.emissiveIntensity=0;      // house rule: generated GLBs ship hot emissives
          m.envMapIntensity=.6;
        });
      }});
      // measure once at scale 1; re-measuring a scaled clone would reset it to scale 1
      const dim=new THREE.Box3().setFromObject(src).getSize(new THREE.Vector3());
      BASE[file]=Math.max(1e-4,dim.x,dim.y,dim.z);
      for(let i=0;i<POOL_PER;i++){const c=src.clone(true);c.visible=false;scene.add(c);POOL[file].push(c);}
    },undefined,()=>console.warn('enemy GLB failed: '+file));  // silent skip, game still playable
  });

  function takeFromPool(file,size){
    const p=POOL[file];
    if(!p||!p.length)return null;      // not loaded yet, or pool exhausted -> skip this spawn
    const o=p.pop();
    o.scale.setScalar(size/BASE[file]);
    o.rotation.set(0,0,0);
    o.visible=true;return o;
  }
  function returnToPool(file,o){o.visible=false;POOL[file]&&POOL[file].push(o);}

  function spawn(kindKey,opts){
    if(FS.ents.filter(e=>!e.dead).length>=MAX_LIVE)return null;
    const k=KINDS[kindKey];
    if(!k)return null;
    const obj=takeFromPool(k.file,k.size);
    if(!obj)return null;
    const at=(opts&&opts.at)||new THREE.Vector3(0,10,-60);
    obj.position.copy(at);
    const e={kind:kindKey,k,obj,hp:k.hp,t:0,dead:0,sx:-1,sy:-1,behind:false,baseY:at.y,
      vel:(opts&&opts.vel)||new THREE.Vector3(0,0,0),spin:(opts&&opts.spin)||0};
    FS.ents.push(e);
    projectEnt(e);   // project immediately: an unprojected sx/sy of -1 is clickable near the top-left corner
    return e;
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
    // the game gets first refusal so power-ups can score themselves instead of banking points
    if(!(cfg.onKill&&cfg.onKill(e,E))){ FS.score+=e.k.pts; SFX.big(); boom(e.obj.position); }
    returnToPool(e.k.file,e.obj);
  }

  const STAGE_SECONDS=1/RAIL_SPEED;   // exactly one lap of the rail (driveCamera uses t*RAIL_SPEED)
  const FS={
    mode:'attract', t:0, tick:0, stage:0, score:0, hi:0, shield:SHIELD_START,
    paused:false,
    ents:[], flashMsg:'', flashT:0, shake:0, over:0,
    start(){FS.mode='play';FS.t=0;FS.tick=0;FS.stage=0;FS.score=0;FS.shield=SHIELD_START;
      if(cfg.onStart)cfg.onStart(E);
      // hand every checked-out clone back before clearing, or a replay starves the pool
      for(const e of FS.ents)if(!e.dead)returnToPool(e.k.file,e.obj);
      FS.ents.length=0;FS.flashMsg='STAGE 1';FS.flashT=2;
      buildStage(0);   // replay must rebuild the world; stage state and visible world would desync otherwise
      SFX.stage();},
    hurt(n){if(FS.mode!=='play')return;FS.shake=.4;SFX.bad();
      FS.shield-=n;if(FS.shield<=0)FS.gameOver();},
    gameOver(){FS.mode='over';FS.over=0;FS.hi=Math.max(FS.hi,FS.score);SFX.over();},
    nextStage(){FS.stage++;
      // recycle the old stage's enemies: the rail changes under them, so they would
      // hang in the new world holding pool slots until the camera happened to pass each one
      for(const e of FS.ents)if(!e.dead)returnToPool(e.k.file,e.obj);
      FS.ents.length=0;
      FS.t=0;   // new stage, new lap: restart the rail at its start
      if(cfg.onNextStage)cfg.onNextStage(E);
      if(FS.stage>=MAX_STAGES){FS.gameOver();return;}        // check before building a world we would discard
      buildStage(FS.stage);
      SFX.stage();FS.flashMsg='STAGE '+(FS.stage+1);FS.flashT=2;},
    shoot(x,y){
      if(FS.mode==='attract'){FS.start();return;}
      if(FS.mode==='over'){if(FS.over>1.2)FS.mode='attract';return;}
      SFX.shot();
      const hit=hitTest(x,y);
      if(!hit)return;
      const dmg=cfg.damage?cfg.damage(hit,E):1;
      hit.hp-=dmg;
      if(hit.hp<=0)killEnt(hit); else {SFX.hit();spark(hit.obj.position);}
    },
    update(dt){
      FS.t+=dt;FS.tick++;
      if(FS.flashT>0)FS.flashT-=dt;
      if(FS.shake>0)FS.shake=Math.max(0,FS.shake-dt*2);
      if(FS.mode==='over')FS.over+=dt;
      driveCamera();
      for(const e of FS.ents){
        if(e.dead)continue;
        e.t+=dt;
        e.obj.position.addScaledVector(e.vel,dt);
        if(cfg.entityUpdate)cfg.entityUpdate(e,dt,E);   // per-kind motion belongs to the game
        projectEnt(e);
        // missiles that reach the camera hurt and vanish
        if(e.k.harm&&camera.position.distanceTo(e.obj.position)<6){
          FS.hurt(1);e.dead=1;returnToPool(e.k.file,e.obj);continue;
        }
        // anything that passes behind the camera is recycled
        if(e.obj.position.z>camera.position.z+12){e.dead=1;returnToPool(e.k.file,e.obj);}
      }
      updateFX(dt);
      if(FS.tick%30===0)FS.ents=FS.ents.filter(e=>!e.dead);
      if(FS.mode==='play'){
        if(cfg.spawnTick)cfg.spawnTick(E,dt);
        // one stage is one full lap of its rail, so the stage never outlives the spline
        // and the camera never cuts back to the start mid-stage
        if(FS.t>=STAGE_SECONDS)FS.nextStage();
      }
      window.__arcState={game:cfg.gameId,mode:FS.mode,score:FS.score,stage:FS.stage,
        ents:FS.ents.filter(e=>!e.dead).length,shield:FS.shield,audio:audioState()};
    },
    render(){
      if(FS.shake>0){
        camera.position.x+=(Math.random()-.5)*FS.shake*1.4;
        camera.position.y+=(Math.random()-.5)*FS.shake*1.4;
      }
      renderer.render(scene,camera);drawHUD();
    },
  };

  const aim={x:W/2,y:H/2,down:false};
  let last=performance.now();   // declared here so the resume handlers below cannot hit a TDZ
  // the parent focuses this iframe when the player dives back in, and any input means
  // they are here; either resumes the loop that __arcStop paused on exit
  function resume(){if(FS.paused){FS.paused=false;last=performance.now();}}
  addEventListener('focus',resume);
  addEventListener('pointerdown',resume,true);
  addEventListener('keydown',resume,true);
  addEventListener('visibilitychange',()=>{if(!document.hidden)last=performance.now();});
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

  /* ---------- generic HUD primitives; the game composes them in cfg.hud ---------- */
  function txt(s,x,y,size,col,align){
    ui.font='bold '+size+'px "Courier New",monospace';ui.fillStyle=col;
    ui.textAlign=align||'center';ui.fillText(s,x,y);
  }
  function clearHUD(){ui.clearRect(0,0,W,H);}
  function drawTopBar(){
    txt(cfg.title,14,30,17,TINT,'left');
    txt('SCORE '+String(FS.score).padStart(7,'0'),W/2,30,17,'#fff');
    txt('HI '+String(FS.hi).padStart(7,'0'),W-14,30,17,'#9ce0ff','right');
  }
  function drawBanner(){
    if(FS.flashT>0){ui.globalAlpha=Math.min(1,FS.flashT);
      txt(FS.flashMsg,W/2,H/2-60,42,TINT);ui.globalAlpha=1;}
  }
  function drawCrosshair(){
    const cx=aim.x,cy=aim.y;
    ui.strokeStyle='#fff';ui.lineWidth=2;
    ui.beginPath();ui.arc(cx,cy,13,0,Math.PI*2);ui.stroke();
    ui.beginPath();ui.moveTo(cx-20,cy);ui.lineTo(cx-6,cy);ui.moveTo(cx+6,cy);ui.lineTo(cx+20,cy);
    ui.moveTo(cx,cy-20);ui.lineTo(cx,cy-6);ui.moveTo(cx,cy+6);ui.lineTo(cx,cy+20);ui.stroke();
  }
  function drawAttract(){
    if(FS.mode!=='attract')return;
    ui.fillStyle='rgba(4,5,10,.72)';ui.fillRect(0,0,W,H);
    txt(cfg.title,W/2,H/2-70,58,TINT);
    txt(cfg.subtitle||'',W/2,H/2-30,20,'#fff');
    txt('CLICK / TAP TO START',W/2,H/2+40,26,'#fff');
    txt('shoot: click or SPACE  ·  exit: ESC',W/2,H/2+80,14,'#9ce0ff');
    txt('an MSL ARCADE original',W/2,H-30,12,'rgba(255,255,255,.5)');
  }
  function drawGameOver(){
    if(FS.mode!=='over')return;
    ui.fillStyle='rgba(4,5,10,.72)';ui.fillRect(0,0,W,H);
    txt('GAME OVER',W/2,H/2-20,54,'#ff5050');
    txt('SCORE '+String(FS.score).padStart(7,'0'),W/2,H/2+30,24,'#fff');
    if(FS.over>1.2)txt('CLICK TO CONTINUE',W/2,H/2+80,18,'#9ce0ff');
  }
  function drawHUD(){cfg.hud(E);}

  function loop(){requestAnimationFrame(loop);
    const now=performance.now(), dt=Math.min((now-last)/1000,0.033);last=now;
    // The parent hides this iframe with opacity, not display, so rAF keeps firing after
    // the player leaves the cabinet. Without this gate a second WebGL context renders a
    // full scene for the rest of the session on top of the site's own 3D scene.
    if(FS.paused)return;   // browsers already stop rAF for hidden tabs, so paused is the only gate needed
    FS.update(dt);FS.render();}

  function installTestHooks(){
    window.__arcGame=cfg.gameId;
    window.__arcStop=()=>{if(AC&&AC.state==='running')AC.suspend();
      if(FS.mode==='play')FS.mode='attract';
      FS.paused=true;};
    window.__arcStep=(n,dt)=>{n=n||1;dt=dt||.016;for(let i=0;i<n;i++)FS.update(dt);FS.render();};
    window.__arcShoot=(x,y)=>FS.shoot(x,y);
    window.__arcEnts=()=>FS.ents.filter(e=>!e.dead).map(e=>({k:e.kind,x:e.sx,y:e.sy,friendly:!!e.k.friendly}));
  }

  function start(){buildStage(0);installTestHooks();loop();}

  const E={
    // three.js handles
    W,H,renderer,scene,camera,ui,uiCanvas:uic,glCanvas:glc,gltfL,
    // state: the same object FINAL SHOT called FS, data plus the mode methods
    state:FS, aim,
    // rail
    rail,railPos,railLook,driveCamera,railU,STAGE_SECONDS,RAIL_SPEED,
    // stages
    buildStage,getStageGroup:()=>stageGroup,
    // entities
    KINDS,MAX_LIVE,pool:POOL,base:BASE,spawn,projectEnt,screenRadius,hitTest,killEnt,
    takeFromPool,returnToPool,
    // fx
    emit,boom,spark,updateFX,fxCount:()=>FXP.count,
    // audio
    ac,blip,SFX,audioState,
    // hud
    txt,clearHUD,drawTopBar,drawBanner,drawCrosshair,drawAttract,drawGameOver,drawHUD,
    // boot: builds stage 0, installs the six window.__arc* hooks, starts the rAF loop
    start,fit,loop,installTestHooks,
  };
  return E;
}
