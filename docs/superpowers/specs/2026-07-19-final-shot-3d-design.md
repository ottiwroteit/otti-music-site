# FINAL SHOT 3D — Design Spec

Date: 2026-07-19
Project: OTTI MUSIC SITE — arcade wing
Status: approved (OTTI, 2026-07-19)

## 1. Goal

Make the arcade cabinets' on-screen gameplay top tier by rebuilding the games as true 3D
rail shooters with Tripo-generated enemy models, starting with FINAL SHOT (`gundam`) as
the flagship and template for the remaining seven.

Today all 8 games share one 960x540 canvas engine (`assets/arcade/index.html`) with flat
canvas-drawn art. The cabinets around them are now photoreal (PR #13); the screens are the
weakest surface in the wing.

## 2. Scope

**In scope (this spec):** FINAL SHOT only — a new self-contained three.js game at
`assets/arcade/final-shot-3d.html`, three Tripo enemy models, and the cabinet iframe routing
that sends `?g=gundam` to the new file.

**Out of scope (later PRs, same engine):** the other seven games. They keep the current
canvas engine untouched until their own PR. No changes to the scene (`index.html`), the
cabinet GLBs, the pinball, or the MPC apps.

**Explicitly not doing:** rigged/animated Tripo characters (motion is procedural), audio
asset files (SFX stay WebAudio-synthesized), any ROM or third-party game content.

## 3. Gameplay

**Camera: on-rails ride.** The camera glides along an authored Catmull-Rom spline through
the stage, banking into turns. The player never controls movement — only aim and fire.
This is the Star Fox / Time Crisis rail format: the screen is always moving.

**Controls (unchanged from the current engine):** mouse moves the crosshair, click or SPACE
fires, R reloads, ESC exits to the wing. Touch: tap to fire at the tap point.

**Stages:** 2, matching today.
- Stage 1 — burning neon city: the rail flies between buildings at rooftop height.
- Stage 2 — space: the rail leaves the atmosphere, planet and starfield, debris field.
Stage advances on the existing tick cadence (~1500 ticks) or on stage-boss kill.

**Mechanics preserved from the current gundam config:** shield HUD (not lives), infinite
base ammo, score values per enemy kind, bazooka (B) and shield (S) power drops, game-over
at shield zero, high-score display, `INSERT COIN` attract framing.

**Enemy roles (unchanged behavior, new 3D bodies):**

| Kind | HP | Points | Behavior in 3D |
|---|---|---|---|
| zaku (enemy mech) | 2 | 300 | Emerges from cover at mid depth, tracks the camera, fires |
| pod (flying) | 1 | 200 | Crosses the rail laterally at close depth, banking |
| missile | 1 | 100 | Flies at the camera on an intercept course; shoot it or take damage |
| powerB / powerS | 1 | 0 | Drifting pickup; shooting it grants bazooka / shield |

## 4. Assets

**Tripo (3 new generations, ~75 of 260 credits):**
1. Enemy mech — green, one-eyed, hostile silhouette (original design, not a licensed mech)
2. Flying pod — purple ovoid scout with a glowing eye
3. Missile/drone — sleek warhead with fins

Settings per the proven cabinet recipe: **Standard mesh (never Ultra), PBR on, v3.0,
HD Texture off, Private on.** Generated **unrigged** — motion is procedural (hover bob,
lunge toward camera, banking roll), which reads correctly for machines and avoids rigging
cost and the orientation pitfalls of imported rigs.

**Compression (same proven recipe, ~94% reduction):**
```bash
npx @gltf-transform/cli optimize in.glb out.glb \
  --compress meshopt --texture-compress webp --texture-size 1024
```
Target: under 1.5MB per enemy. Committed as `assets/props/fs-mech.glb`, `fs-pod.glb`,
`fs-missile.glb`. Raw Tripo dumps stay in the gitignored `arcade-src/glb/`.

**Procedural (no credits, three.js):** buildings, streets, fire/smoke, starfield, planet,
debris, muzzle flash, tracers, explosions. Tripo credits are spent only on what the player
shoots.

## 5. Technical design

**File:** `assets/arcade/final-shot-3d.html` — self-contained, same shape as the existing
arcade engine (single HTML file, CDN importmap for three@0.166.1, no build step).

**Routing:** `index.html` currently sends every cabinet to
`assets/arcade/index.html?g=<game>#<game>`. The gundam unit instead points at
`assets/arcade/final-shot-3d.html`. The per-game query stays (it is what forces a real
iframe reload — hash-only changes are fragment navigations the engine ignores).

**Modules inside the file:**

| Module | Responsibility |
|---|---|
| `rail` | Spline path, camera position/look/bank per t, stage transitions |
| `stage` | Procedural world build per stage (city, space), fog, lighting |
| `enemies` | GLB load + clone pool, spawn table, per-kind procedural motion, hitboxes |
| `combat` | Raycast shooting, damage, score, power-ups, shield, game over |
| `fx` | Muzzle flash, tracers, hit sparks, explosions, screen shake |
| `hud` | Crosshair, score, shield, stage banner, attract/game-over screens (2D canvas overlay) |
| `audio` | WebAudio synthesized SFX (reuses the current engine's approach) |

**Loader:** GLTFLoader with `MeshoptDecoder` registered (mandatory — meshopt files silently
fail without it). Enemies load once and `clone(true)` per spawn from a pool; materials get
`emissiveIntensity=0` per the house bloom rule.

**Performance budget (hard constraints — this runs in an iframe on top of an already-3D site):**
- 960x540 canvas, `pixelRatio` capped at 1
- Total download under 5MB (3 enemy GLBs ~4.5MB worst case + code)
- Max ~12 live enemy instances; pooled, never allocated per spawn
- Fog + frustum culling; no shadows (baked lighting look instead)
- Target 60fps desktop, degrade to 30fps gracefully on mobile

**Test hooks (contract preserved so the scene selftest and QA still work):**
`__arcStop`, `__arcGame`, `__arcStep`, `__arcShoot`, `__arcState`, `__arcEnts` — same names
and semantics as the canvas engine, so anything driving the old engine drives this one.

## 6. House rules honored

- No devil/demon/occult imagery — enemies are machines
- No money, no `$` anywhere
- Bloom-knee dimming; `emissiveIntensity=0` on all loaded GLB materials
- Locked copy untouched; the scene stays a 3D scene
- Do not commit `arcade-src/glb/` raws
- Feature branch → PR → OTTI merges; verify on the deployed URL, never a local preview
- No UI at left-center or right-center (pinball flipper tap zones) — the game canvas is
  centered and modal, so this constrains only the exit chip, which stays where it is

## 7. Verification

Before requesting review:
- Game loads in the cabinet iframe from a real click on the gundam unit
- All mechanics exercised: shoot each enemy kind, take damage, both power-ups, stage
  transition, game over, restart
- ESC returns to the wing and stops the game (`__arcStop`)
- Scene `#selftest` still passes; 0 console errors
- The other 7 cabinets still load the old engine correctly
- Perf: frame timing sampled on the deployed site, not a local preview
- Portrait/mobile: canvas letterboxes correctly, tap-to-fire works

Post-merge: verify on https://otti-music-site.vercel.app with screenshots before scoring 5/5.

## 8. Rollout

One game per PR. FINAL SHOT ships and gets OTTI's approval on production first; that
locks the engine as the template. Then the remaining seven convert on the same engine
(one to two per PR), each reusing `rail`/`stage`/`enemies`/`combat`/`fx`/`hud` with a
per-game config — the same config-driven shape the current canvas engine uses.

Order after FINAL SHOT (proves two genres early): ARCADE COP 2, then ARCADE COP 3,
THE LOST LAND (x2 cabinets, one game), SKYFIRE GUNNER, HOUSE OF THE UNDEAD,
BIG RACK HUNTER, RED GUN RANGE.
