# SESSION HANDOFF - OTTI MUSIC SITE - 2026-07-19

_Supersedes `docs/SESSION-HANDOFF-2026-07-18.md` (does not delete it). That handoff covered the arcade wing and the half-finished Tripo cabinet pipeline. This one covers everything since: the photoreal cabinets shipping, FINAL SHOT rebuilt as a true 3D game, the shared engine extraction, a reusable conversion skill, and ARCADE COP 2 in progress._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** is a single-page 3D web experience, **live at https://otti-music-site.vercel.app** (auto-deploys on merge to `main`). Two connected rooms: the neon pinball studio, and an arcade wing with 9 clickable cabinets.

**What changed this session:** the cabinets became photoreal Tripo meshes, and the flagship game behind one of them became a real 3D game instead of a flat canvas drawing. FINAL SHOT is now an on-rails three.js shooter with pooled Tripo enemies, running on a shared engine module that the remaining six games will be built on.

**State NOW:** `main` is clean and deployed at `d5e61cf`. FINAL SHOT 3D is LIVE and verified on production. **Two PRs are open and unmerged: #16 (a recovery, read §4 P0) and nothing else.** ARCADE COP 2 is mid-build: characters generated and rigged, game not yet written.

---

## 2. State of the codebase at handoff

| Check | State |
|---|---|
| `main` HEAD | `d5e61cf` (PR #15 merge), synced with origin |
| Working tree | 3 untracked PNGs (`arcade-src/vc-*.png`), intentional, belong to the unbuilt ARCADE COP PR |
| Open PRs | **#16** (engine3d API recovery, needs merge) |
| Live site | https://otti-music-site.vercel.app -> **200** (verified) |
| FINAL SHOT 3D live | `/assets/arcade/final-shot-3d.html` -> **200** (verified) |
| `engine3d.js` live | `/assets/arcade/engine3d.js` -> **200** (verified) |
| Game selftest | **SELFTEST OK**, 0 console errors (verified on production) |
| Scene `#selftest` | **SELFTEST OK** (verified) |
| Frame time | **0.5 to 1.0 ms** against a 16ms budget, 6 live enemies |
| New asset weight | **4.7MB** of GLB against a 5MB budget |
| Tripo credits | **70** (started 260) |
| Higgsfield credits | 1.73, still exhausted, still not blocking |
| In-flight agents | none |
| Background process | CORS server on `127.0.0.1:8756` (restart per §11) |

---

## 3. What was SHIPPED this session (merged and live)

**PR #13** (`9ba85ec` lineage) - **all 8 photoreal cabinets**. The 7 outstanding Tripo GLBs downloaded, compressed with meshopt+webp (28MB -> 1.2-1.8MB each), and integrated. `buildCab()` now loads GLBs while preserving the `arcUnits {game,title,obj,face}` contract so click/dive/game wiring was untouched. A uniform `rotation.y = -1.0` correction was needed because Tripo aligns each mesh to its 3/4 source photo; verified dead-on for all 9 units before baking in.

**PR #14** (`9ba85ec`) - **FINAL SHOT 3D**. The gundam cabinet now loads a true on-rails shooter: camera rides an authored spline through a neon city then space, with three Tripo enemies (mech 2.3MB, pod 1.9MB, missile 443KB) spawning at depth. All original mechanics preserved: shield HUD, bazooka and shield drops, per-kind scoring (mech 300 / pod 200 / missile 100), 2 stages, attract and game-over screens. Test-hook contract unchanged.

**PR #15** (`d5e61cf`) - **engine3d extraction**. FINAL SHOT's 530 lines split into `assets/arcade/engine3d.js` (427 lines, game-agnostic) plus 249 lines of purely FINAL SHOT content. Proven behavior-identical: same probe before and after, stage 1 arriving at 28.583s at dt=1/60 and 28.600s at dt=1/30 in both.

**Also merged:** MSL ARCADE branding fix (`50a1cec`) - the attract footer said "an OTTI RECORDS arcade original" across all 8 games plus three page titles; now "an MSL ARCADE original".

**Verification artifacts:** every PR was verified on the REAL deployed URL after merge (curl for status and content, plus scripted gameplay probes and screenshots), never a local preview.

---

## 4. Critical open items (ranked)

### P0 - merge PR #16, the recovery

**https://github.com/ottiwroteit/otti-music-site/pull/16**

PR #15 merged with only its first commit. The second commit `d500c33` (the additive config surface) was pushed to the branch but never became an ancestor of `main`, and the branch was then deleted on both sides. The only surviving copy was in the local reflog on this machine. It has been recovered, rebased onto merged main as `25e1f39`, verified working, and pushed as PR #16.

Verified missing before recovery:
- `git merge-base --is-ancestor d500c33 main` -> NO
- `curl .../engine3d.js | grep -c onShoot` -> 0

**This blocks ARCADE COP 2 entirely.** Without it the engine has no hook before the hit test, so a 6-round magazine with reload cannot be built without monkey-patching the engine or racing its own listeners. Five of the seven remaining games need a magazine.

**If PR #16 is somehow lost too, the commit is gone** - it exists only in this machine's reflog and on the `engine3d-api` remote branch.

### P1 - finish ARCADE COP 2

Locked decisions (OTTI, this session): **stop-and-go cover camera** (camera walks between cover points and holds while enemies pop out), **ship at the 2D game's balance** and tune after playing, **characters RIGGED**, **animations authored in Blender** rather than Mixamo.

Remaining work:
1. Download the 3 rigged GLBs from Tripo, compress
2. Author 4 animation clips on the rigs in Blender: pop-up-from-cover, aim-and-fire, hit-react, fall-down. Blender 5.1.1 is live and scriptable via `mcp__blender__blender_execute`, `bpy` available, glTF and FBX import both present
3. Export one GLB per character carrying several named actions
4. **New engine surface: `AnimationMixer` support.** The module has none; FINAL SHOT's enemies were machines with procedural motion
5. New game mechanics the engine lacks: lives (not shield), 6-round magazine with reload, friendly-fire penalty
6. Build `assets/arcade/arcade-cop-2-3d.html`, route it, update the scene selftest, one PR

### P2
- Pinball "arms have a mind of their own" - **UNRESOLVED, see §7**
- OTTI song LCD still placeholder `UNTITLED / BPM 140` in `assets/mpc/index.html` `SONGS.otti.lcd`
- `Otti Transparent.png` unused, safe to delete
- Tripo Lite is **discontinued July 31**. Assets must be migrated to Tripo Studio via the "Migrate Assets" button before then or all 20+ models become unreachable

### Founder decisions waiting on OTTI

1. **Merge PR #16** (P0 above). Nothing else can proceed.
2. **Civilian bind pose.** The ARCADE COP civilian was generated hands-up-surrendering, so that is his bind pose. He reads as unmistakably harmless from any angle, which is good for a do-not-shoot target, but walk cycles on that bind pose will look wrong. Keep, or regenerate neutral and raise hands only on spawn?
3. **Pinball.** OTTI reported the flippers move on their own. A flight recorder was armed on the live site but OTTI never ran the capture, so this is still undiagnosed.
4. **FINAL SHOT difficulty.** OTTI chose "let me tune it after I play". Shield drains fast when missiles are not shot down (roughly 15 seconds full to empty if ignored).

---

## 5. Specific in-flight artifacts

**Open PR:** #16 `engine3d-api` branch, commit `25e1f39`. Recovery, see §4 P0.

**Untracked in the working tree** (deliberate, belong to the unbuilt ARCADE COP PR):
- `arcade-src/vc-thug.png`, `vc-boss.png`, `vc-civ.png` - the three IP-checked source images

**In Tripo (OTTI's account, permanent, free to re-download):**
- 3 ARCADE COP characters, **all rigged**: thug `2635e707-dab9-413d-8974-2a1081d24165`, boss `171ad46d-23b9-45cf-8474-c8fa8e0fd5c8`, civ `15c5ab35-3b59-4e43-bf7b-426b173a0240`
- Rigged GLBs partially downloaded to `~/Downloads/tripo_pbr_model_<uuid>.glb`. **These are the pre-rig downloads for some IDs - re-download after rigging to get the skinned versions.**

**New skill created:** `~/.claude/skills/arcade-3d-conversion/SKILL.md` (~1460 words). TDD-verified: a baseline agent planning the vcop2 conversion without it cited the broken Tripo upload method, missed the franchise-IP check, and bundled the engine extraction into the same PR as the new game. With the skill, all three correct. Updated later in the session with the rigging and Blender pipeline.

---

## 6. New skills and integrations introduced

**`arcade-3d-conversion` skill** - the reusable workflow for converting the remaining 6 games. Contains the per-game config table (HUD, gun, stages, enemy kinds, new engine work per game), the corrected Tripo upload method, the IP-check rule, the rigging and Blender pipeline, and the standing non-negotiables.

**Tripo upload method changed.** The previously documented approach (set `input.files`, dispatch `change`) now produces **no thumbnail**. Tripo's uploader listens for drop events. Working method:

```javascript
document.querySelector('.single-img-button').click();
await new Promise(r=>setTimeout(r,2000));          // input renders asynchronously
const inp=document.querySelector('input[type=file]');
const blob=await (await fetch('http://127.0.0.1:8756/arcade-src/NAME.png')).blob();
const file=new File([blob],'NAME.png',{type:'image/png'});
const dt=new DataTransfer(); dt.items.add(file);
inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true}));
const drop=inp.closest('.single-img');             // THIS element, not the button
['dragenter','dragover','drop'].forEach(t=>
  drop.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,dataTransfer:dt})));
```

**Tripo rigging** - 20 credits per character, same balance as generation. **A-pose rigs fine**; a strict T-pose is not required. Proven by rigging one character before committing credits for the cast. Rigged models expose Stand, Walk, Run, Idle, Climb, Somersault plus a Skeleton toggle.

**Blender MCP** - `mcp__blender__blender_execute`, Blender 5.1.1 live, `bpy` available, glTF and FBX import present. This is the assembly step for animation clips.

**Compression recipe (unchanged, still correct):**
```bash
npx @gltf-transform/cli optimize in.glb out.glb \
  --compress meshopt --texture-compress webp --texture-size 1024
```

---

## 7. What the next agent should NOT do

- **Do NOT assume PR #15 delivered the full engine API.** It did not. Check `grep -c onShoot assets/arcade/engine3d.js` before building anything on the module.
- **Do NOT delete a branch until its PR is confirmed merged WITH all its commits.** `gh pr view N --json commits` lists what actually landed. This session lost a commit exactly this way and only recovered it from the local reflog.
- **Do NOT trust Tripo's Generate button.** It silently fails to fire more often than not. **The credit drop is the only proof.** If the thumbnail clears without a credit drop, re-inject and retry.
- **Do NOT use the old Tripo upload method** (`input.files` + `change` alone). It produces no thumbnail. See §6.
- **Do NOT skip the IP check on generated source images.** The first FINAL SHOT mech came back with "E.F.F." and a Gundam Earth Federation insignia baked into the armor texture. These games are all homages, so image models reproduce real franchise marks readily. Regenerating an image is free; regenerating a Tripo model is 25 credits.
- **Do NOT ship enemies with only Tripo's built-in animations.** Stand/Walk/Run/Idle/Climb/Somersault contains nothing a cover shooter needs. Blender is a required step, not optional.
- **Do NOT use `obj.lookAt(camera.position)` on humans or animals.** It pitches them off their feet when the camera rides above or below. Yaw-only, plus a measured per-file yaw offset.
- **Do NOT commit `arcade-src/glb/`** - raw Tripo dumps, 16-29MB each, gitignored, free to re-download.
- **Do NOT use Ultra mesh in Tripo** - 60-80MB, unshippable.
- **Do NOT ship a meshopt GLB without registering `MeshoptDecoder`** - it silently fails to load.
- **Do NOT push direct to `main`.** Feature branch -> PR -> OTTI merges.
- **Do NOT put UI chips at left-center or right-center** - pinball flipper tap zones.
- **Do NOT use devil/demon/occult imagery, EVER.**
- **Do NOT re-raise the Kanye MPC sample copyright** - settled 2026-07-06.
- **Do NOT rely on rapid `__step()`** to fly the camera. Teleport `_camCur.pos.copy(_ct.pos)` instead; the preview pane throttles rAF.

---

## 8. Recommended next-session plan

**Most leveraged first move: merge PR #16.** Everything downstream is blocked on it.

1. **OTTI merges PR #16.** Verify on production: `curl .../engine3d.js | grep -c onShoot` should return non-zero.
2. **Re-download the 3 rigged GLBs from Tripo** (thug, boss, civ - IDs in §5). The copies in `~/Downloads` predate rigging for some models, so confirm each has a skeleton before compressing.
3. **Author the 4 animation clips in Blender** via the MCP: pop-up-from-cover, aim-and-fire, hit-react, fall-down. Export one GLB per character with several named actions. Verify each clip plays and the mesh deforms cleanly before wiring anything.
4. **Add `AnimationMixer` support to `engine3d.js`** - new surface, its own commit, ideally its own PR so it can be reviewed independently of the game.
5. **Build ARCADE COP 2** on the module: stop-and-go cover camera, 3 lives, 6-round magazine with reload, civilian penalty, 3 stages, at the balance in `GAMES.vcop2` in `assets/arcade/index.html`.
6. **Route it**, update the scene `#selftest` (it currently asserts vcop2 routes to the canvas engine and will go red), one PR, review loop, OTTI merges, verify on the live URL.

Games after this, per the skill: ARCADE COP 3, THE LOST LAND, SKYFIRE GUNNER, HOUSE OF THE UNDEAD, BIG RACK HUNTER, RED GUN RANGE.

**Before July 31: migrate Tripo assets to Studio** or lose all 20+ models.

---

## 9. Critical paths to know

**Project root:** `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE/`

| Path | What |
|---|---|
| `index.html` | THE site. Arcade wing: `arcUnits`, `curArc`, `buildCab`, `arcSrcFor`, `#arcframe`. MPC: `mpcUnits`. |
| `assets/arcade/engine3d.js` | Shared 3D engine. `createEngine(cfg)` plus `rnd`, `srnd`, `disposeGroup`, `ac`, `audioState`, `blip`, `SFX`. |
| `assets/arcade/final-shot-3d.html` | FINAL SHOT, first consumer of the engine. The template for every future game. |
| `assets/arcade/index.html` | The 7 remaining games on the old canvas engine. `GAMES` object holds the authoritative balance. |
| `assets/props/fs-*.glb` | FINAL SHOT enemies (mech, pod, missile). |
| `assets/props/arc-*.glb` | The 8 photoreal cabinets. |
| `arcade-src/*.png` | Source images, committed (CDN URLs expire). |
| `arcade-src/glb/` | Raw Tripo dumps, gitignored. |
| `docs/superpowers/specs/2026-07-19-final-shot-3d-design.md` | Approved spec for the 3D conversion. |
| `docs/superpowers/plans/2026-07-19-final-shot-3d.md` | The 7-task implementation plan, with the full Tripo procedure. |
| `~/.claude/skills/arcade-3d-conversion/SKILL.md` | The reusable conversion workflow. **Read this first for any game conversion.** |

**Scene test hooks:** `window._arcUnits`, `_arcSelect(i)`, `_arcProj(i)`, `_mpcUnits`, `_setCam(state)`, `_dbg()`, `__step()`, `_camCur`, `_ct`.

**Game test hooks (both engines, identical semantics):** `__arcStop`, `__arcGame`, `__arcStep(n,dt)`, `__arcShoot(x,y)`, `__arcState`, `__arcEnts()`.

**URLs:** live https://otti-music-site.vercel.app - repo https://github.com/ottiwroteit/otti-music-site - Tripo Studio https://studio.tripo3d.ai - Tripo Lite (dying July 31) https://www.tripo3d.ai/app/my

**Debug fragments:** `#selftest`, `#nobloom`. Arcade hashes: `#gundam #vcop2 #vcop3 #lostworld #machinegun #hotd #buckhunter #redgun`. MPC: `#otti #power #runaway`.

---

## 10. Standing OTTI rules (append-only)

- Feature branch -> PR -> **OTTI merges in the GitHub UI**. Never push direct to `main`.
- After every `/code-review`, emit a chat status block (SCORE X/5 + findings).
- **No devil/demon/occult imagery, EVER.**
- **No money, no `$`** anywhere on the site.
- **Verify on the DEPLOYED artifact**, never a local preview.
- No emojis or em-dashes in output; API keys to `.env`, never chat.
- Scene stays a 3D scene; locked copy; bloom-knee dimming; flippers user-input-only.
- Never place UI chips at left-center or right-center (flipper tap zones).
- Never trust an automation's own success return; verify with an independent signal.
- Tripo web credits, Tripo API credits, and Higgsfield credits are three separate wallets.
- OTTI does not care about credit spend; do not stall a build to ask.
- Kanye MPC samples shipping publicly is SETTLED.
- **[NEW]** OTTI sees the asset before any "not a good fit" reject or retry decision.
- **[NEW]** **Characters get RIGGED**, and Blender is a required pipeline step, not optional.
- **[NEW]** **Confirm a PR merged with ALL its commits before deleting the branch.** `gh pr view N --json commits`.
- **[NEW]** Buy certainty cheaply. Rigging one character for 20 credits to test the approach beat gambling 60 on the whole cast.

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"

git branch --show-current                   # expect: main
git log --oneline -1                        # expect: d5e61cf (PR #15 merge)
git status --short                          # expect: 3 untracked arcade-src/vc-*.png

# THE P0 CHECK - has PR #16 been merged?
grep -c onShoot assets/arcade/engine3d.js   # 0 = NOT merged, blocks ARCADE COP 2
gh pr view 16 --json state --jq .state      # expect OPEN until OTTI merges

curl -s -o /dev/null -w "%{http_code}\n" https://otti-music-site.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" https://otti-music-site.vercel.app/assets/arcade/final-shot-3d.html
curl -s https://otti-music-site.vercel.app/assets/arcade/engine3d.js | grep -c onShoot  # 0 until #16 merges

ls assets/props/fs-*.glb assets/props/arc-*.glb | wc -l   # expect: 11
du -ch assets/props/fs-*.glb | tail -1                     # expect: ~4.7M

# restart the CORS server (127.0.0.1, NOT localhost - Tripo blocks mixed content)
nohup python3 -c "from http.server import HTTPServer,SimpleHTTPRequestHandler as H
class C(H):
 def end_headers(s): s.send_header('Access-Control-Allow-Origin','*'); H.end_headers(s)
HTTPServer(('127.0.0.1',8756),C).serve_forever()" >/tmp/arc_cors.log 2>&1 &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8756/index.html
```

---

## 12. One-sentence summary

This session took the arcade wing from procedural boxes with flat canvas games to **8 photoreal cabinets and a genuinely 3D flagship game running on a reusable engine**, produced a **TDD-verified skill** so the remaining six conversions do not repeat this session's mistakes, and left ARCADE COP 2 mid-build with its characters generated and rigged, blocked only on merging the engine API commit that PR #15 silently dropped.
