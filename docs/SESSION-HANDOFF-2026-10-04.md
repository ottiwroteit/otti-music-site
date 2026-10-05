# SESSION HANDOFF - OTTI MUSIC SITE - 2026-10-04

_Supersedes `docs/SESSION-HANDOFF-2026-07-19.md` (does not delete it). That handoff left ARCADE COP 2 mid-build and blocked on PR #16. This session ran Jul 19 to Oct 4 2026 and covers: verifying #16, the engine's rigged-character surface, ARCADE COP 2 shipped as a real 3D game, a four-round fight with the pinball flippers, and a desk redecoration with a vintage TV that loops OTTI's clip._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** is a single-page 3D web experience, **live at https://otti-music-site.vercel.app** (auto-deploys on merge to `main`). Two connected rooms: the neon pinball studio, and an arcade wing with 9 clickable cabinets.

**What changed this session:** ARCADE COP 2 is now the second true 3D cabinet game, with rigged Tripo characters that crouch, pop up, aim and fall. The shared engine (`engine3d.js`) gained rigged-character support and a custom-camera hook. The pinball flippers no longer move unless a visitor is playing, and are now controlled by mouse hover or arrow keys. The studio desks were redecorated: music gear moved to the left desk, and the right desk's telemetry monitor became a vintage CRT TV on a VHS deck looping OTTI's "for what it's worth" clip.

**State NOW:** `main` is clean and deployed at `4982af1`. **Zero open PRs.** Everything in this handoff was verified on the deployed site on 2026-10-04 (see §2), including ARCADE COP 2, which had not been production-checked until this handoff was written.

---

## 2. State of the codebase at handoff

All rows verified 2026-10-04 ~20:20 CDT unless marked otherwise.

| Check | State |
|---|---|
| `main` HEAD | `4982af1` (PR #23 merge), synced with origin |
| Working tree | 2 untracked PNGs, **not from this session** (`pizza_throwable.png`, `snowmobile.png`, 2048x2048, dated Sep 2). Unknown origin, see §4 |
| Open PRs | **none** |
| Live site | `/` -> **200** |
| ARCADE COP 2 live | `/assets/arcade/arcade-cop-2-3d.html` -> 200, **`#selftest` = OK on production** |
| FINAL SHOT live | `/assets/arcade/final-shot-3d.html` -> 200, **`#selftest` = OK on production** |
| Scene `#selftest` on production | **Passes.** Console capture is unreliable in the test browser, so proven by side effect: the selftest's final line ran (hover flag cleared) and the flipper swing it asserts measured 44 degrees |
| `engine3d.js` live | 200, byte-identical to `main`. Has `onShoot`, `playClip`, `cfg.camera`, `aimY` |
| Live `index.html` | byte-identical to `main` (sha1 `5d1cd9777281`) |
| Rigged cast | `assets/props/vc-{thug,boss,civ}.glb`, **3.8MB** total, all 200 on prod |
| FINAL SHOT enemies | `assets/props/fs-*.glb`, 4.7MB |
| TV clip | `assets/vhs-loop.mp4`, 1,112,344 bytes, 79.7s, 512x384, muted. Live copy is hash-identical. Plays and loops on prod after first gesture (verified) |
| Total GLBs in `assets/props` | 24 |
| Tripo credits | **50** (last observed 2026-07-20 after rigging the boss). **Not re-checked since.** |
| CORS server | `127.0.0.1:8756` running (pid 79484), serves the repo root |
| In-flight agents | none |

---

## 3. What was SHIPPED this session (merged and live)

| PR | Merge | What |
|---|---|---|
| #16 | (pre-session, verified) | engine3d additive config surface recovered from PR #15. Verified merged with both commits and live (`onShoot` present on prod). |
| #17 | `fd92d94` | **engine3d AnimationMixer support.** SkeletonUtils cloning, one mixer per clone, `playClip` / `clipName` / `faceCameraYaw`, `kind.clip` / `dieHold` / `dieClip`, idempotent `recycle()` (closed a real double-return-to-pool bug). 21-assertion harness. |
| #18 | `1d3064e` (`1bbf284` + review fix `679306c`) | **ARCADE COP 2 3D.** Stop-and-go cover camera, rigged thug / boss / civilian, 3 lives, 6-round mag with 0.8s reload, civilian = -500 and a life, 3 stages, canvas balance preserved. Added engine `cfg.camera` (camera must be set BEFORE projection) and `kind.aimY` (hit circle on the chest, not the feet). Routing became a table (`ARC3D` in `index.html`). `scripts/glb-merge-anims.py` added. Scripted 3-stage run: 11,200 pts, 0.09ms/frame, pools 8/8/8 before and after. |
| #19 | `87cab97` | Flipper fix round 1: pinned flippers with `setAngle` per substep. **This was wrong** (see #20). Kept for history. |
| #20 | `e1a0d15` | Flipper fix round 2: idle flippers become **static bodies**. #19's per-substep `setAngle` fought the pivot constraint and buzzed the arms ~5-9 degrees per frame. |
| #21 | `29dcb54` | Flipper fix round 3 + new controls: **render-level pin** (when not playing, the flipper MESH is drawn at rest regardless of physics), and the control model OTTI asked for: flippers move only while playing, via **mouse hover over a flipper**, arrow / A-D keys, or a touch on either side. Clicking only launches the ball. |
| #22 | CLOSED | Music-gear move. Folded into #23 so the right desk was never crowded. |
| #23 | `4982af1` | **Desk redecoration.** Telemetry monitor removed; `vintageTV()` (CRT on a VHS/DVD deck, MakeSenseLater.com cassette label) plays `assets/vhs-loop.mp4` as a looping VideoTexture. Speakers, mic and headphones moved to the left desk with the MPCs. |

**How verification was done:** every merged PR was checked on the deployed URL with curl (status and byte-identity against `main`) plus scripted probes. Physics claims after #20 were verified with a fixed 1/60 timestep, never by watching the automation browser (see §7).

---

## 4. Critical open items (ranked)

### P0 - OTTI must confirm the flippers by eye

The flipper bug was reported four times. Three of the "fixes" were verified by the agent and still looked broken to OTTI. Root causes found: the demo ball knocking the flippers, then a constraint fight from #19, and through all of it the agent verifying inside a browser tab whose animation loop is throttled (frozen sim, so every check passed). #21 pins the drawn arm at rest whenever nobody is playing, which no physics behaviour can defeat. **The agent cannot watch true 60fps, so OTTI's eyes are the final test.** Hard-refresh first (Cmd+Shift+R): a tab left open from before a deploy keeps running old inline script.

### P0 - Tripo Lite was discontinued July 31; migration was never done

The previous handoff flagged "migrate to Tripo Studio before July 31 or all 20+ models become unreachable." It is now Oct 4 and **this session did not migrate.** Not verified whether the models are still reachable. What is safe regardless: every SHIPPED GLB is in the repo under `assets/props/`, and the raw ARCADE COP clip downloads are on this machine only (`arcade-src/glb/vcop2/`, gitignored, ~600MB). Every future cabinet needs Tripo for new enemies, so check the account state before starting game three.

### P1

1. **Update `~/.claude/skills/arcade-3d-conversion/SKILL.md`** before game three. It was last edited Jul 19 and contains none of this session's lessons: Tripo's hidden preset clips, `glb-merge-anims.py`, `cfg.camera`, `aimY`, `dieHold` pool sizing, the yaw offset, the throttled-tab trap. (grep for any of them returns 0.)
2. **ARCADE COP 3** is the natural next game: same three characters, adds only a slow-motion meter (`hasSlow`). Characters still need a `heavy` instead of `boss` per the `GAMES.vcop3` table.
3. **Tune ARCADE COP 2 after OTTI plays it.** Shipped at the canvas balance, which is hard (enemies fire every 2.6s; a scripted no-shoot run lost 2 lives in ~8s).

### P2

- OTTI song LCD still placeholder `UNTITLED / BPM 140` (`assets/mpc/index.html` `SONGS.otti.lcd`)
- `Otti Transparent.png` unused, safe to delete
- FINAL SHOT difficulty tuning (OTTI chose "after I play")
- Stale branches (see §5). All are fully in `main` except `move-music-props-left`, whose content IS in main via cherry-pick (`ac34fbb`) but whose original commit is not an ancestor
- `arcade-src/glb/vcop2/*-merged.glb` and `*-opt.glb` are superseded first-pass intermediates (~270MB); the real sources are `*-shoot/hurt/fall.glb` and `*-clips.glb`
- The `watch` skill's frame extraction is broken on this ffmpeg (`-vsync` no longer exists, needs `-fps_mode`). Workaround in §7.

### Founder decisions waiting on OTTI

1. **Are the flippers still now, and does hover control feel right?** Hover radius is 150px around each flipper (`FLIP_HOVER_R` in `index.html`). Say if it should be bigger, or switch to "left half / right half of the screen."
2. **Tripo account:** migrate to Studio / check what survived.
3. **ARCADE COP 2 balance** after you play it.
4. **OK to delete the stale branches** listed in §5?
5. **What are `pizza_throwable.png` and `snowmobile.png`?** They sit untracked in this repo's root, created Sep 2, not by this session. Probably another project's output; move or delete?

Resolved this session: the civilian's hands-up bind pose is kept. He only crouches in cover and never walks, so the pose reads as harmless with no downside.

---

## 5. Specific in-flight artifacts

**Uncommitted:** only the two mystery PNGs (§4).

**Gitignored, this machine only:**
- `arcade-src/glb/vcop2/` - raw Tripo per-clip downloads (`{thug,boss,civ}-{shoot,hurt,fall}.glb`), merged sources (`*-clips.glb`), and two reusable harness pages:
  - `anim-check.html` - loads the three cast GLBs in three.js, lists clips, samples bone motion
  - `rig-check.html` - drives `createEngine` with a rigged kind and runs 21 pool / skeleton / death-hold assertions. **Reuse for game three.**
- Source clip: `~/Downloads/copy_2EC752FE-5391-4FE3-8839-AA424682A8E2_VSCO.MOV` (720x720, 55MB). The site uses a cropped copy.

**Tripo (OTTI's account, state unknown after July 31):** thug `2635e707-dab9-413d-8974-2a1081d24165`, boss `171ad46d-23b9-45cf-8474-c8fa8e0fd5c8`, civ `15c5ab35-3b59-4e43-bf7b-426b173a0240`. All three rigged.

**Stale branches (local and remote):** `engine3d-anim`, `engine3d-api`, `fix-attract-flippers`, `fix-flipper-buzz`, `flipper-hover-control`, `vcop2-3d`, `vintage-tv-vhs`, `arcade-msl-sign-pinball`, `arcade-quality`, `arcade-wing` (all verified ancestors of `origin/main`), plus `move-music-props-left` (content in main via cherry-pick).

---

## 6. New skills and integrations introduced

**Engine surface (`assets/arcade/engine3d.js`), all documented in its header block:**
- `E.playClip(ent, name, {fade, once, speed})`, `E.clipName(ent)`, `E.faceCameraYaw(ent, yawOffset)`, `E.recycle(ent)`
- `kind.clip`, `kind.dieClip`, `kind.dieHold`, `kind.aimY`
- `cfg.camera(E, dt)` replaces the rail ride and runs before entities project
- `window.__arcEnts()` now reports `.clip`

**`scripts/glb-merge-anims.py`** - merges Tripo's one-clip-per-file downloads into one GLB with named clips, trims each clip by seconds, and pins root translation to the rest pose. `--demo` self-check. Usage: `glb-merge-anims.py out.glb base.glb:cover:0:1.0 extra.glb:aim:1.875:4.875 ...`

**Tripo has more animations than documented.** The Rigging & Animation panel scrolls. Below Stand / Walk / Run / Somersault / Idle / Climb are **Jump, Slash, Shoot, Hurt, Fall, Turn**. Select one, wait for the checkmark (15-60s), then Download gives a skinned `tripo_retarget_<uuid>.glb` with that one clip. Free (no credit drop observed). What they actually are, from Blender renders: Shoot = run-in then a static **kneeling** aim hold; Hurt = a **crouch**; Fall = a real staggering death. Every preset starts with a run-in from ~3 units away, so trim it.

**`vintageTV()` + VideoTexture pattern** (`index.html`) - a hidden-in-DOM `<video>` feeding `THREE.VideoTexture`, with `kickCRT` starting playback on first pointer / key / touch.

**Pinball control:** `setFlipperLive(live)`, `updatePressed(f)` (ORs `keyHeld || hover || tap`), `flipperHovered()` projects each flipper mesh to screen.

**ARCADE COP 2 debug hook:** `window.__arcDbg()` returns camera, leg, magazine, pool counts and per-entity world + screen data.

**Memory:** `otti-music-site-project.md` updated with the flipper saga, the throttled-tab lesson, the TV build, and the custom-camera screenshot recipe.

---

## 7. What the next agent should NOT do

- **Do NOT verify motion in the claude-in-chrome or built-in browser by watching it.** Those tabs throttle `requestAnimationFrame`; the sim is often frozen, so every check passes. This shipped #19 broken. Drive physics at a fixed 1/60 timestep (replicate `loopBody`'s substep loop or use `#selftest`), or make the guarantee at the render level and assert the mesh rotation.
- **Do NOT pin a constraint-held Matter body with `setAngle` each substep.** It fights the constraint and buzzes. Use `Body.setStatic(true)`.
- **Do NOT move a game's camera in `cfg.tick`.** It runs after projection, so every hit test trails the view. Use `cfg.camera`.
- **Do NOT `Object.assign(mesh, {position: ...})`.** Three.js `position` is read-only; it throws and kills module init (blank scene, no error in `__loopErr`).
- **Do NOT trust Tripo preset names.** Render the clips before mapping them to game states.
- **Do NOT ship raw Tripo clips.** The run-in teleports enemies. Trim with `glb-merge-anims.py`.
- **Do NOT detach or `display:none` a `<video>` used as a texture.** Some browsers won't decode it and the TV freezes on frame one.
- **Do NOT use the `watch` skill's frame extraction on this machine.** It passes `-vsync`, which this ffmpeg rejects. Use `ffmpeg -i <file> -vf "fps=1/6,scale=640:-1" out_%02d.jpg`.
- **Do NOT rely on the browser console capture for `#selftest`.** It missed `SELFTEST OK` repeatedly. Prove completion from side effects or window flags.
- **Do NOT use `_setCam('mpc')` to look at the left desk.** It dives into the MPC player overlay. See the screenshot recipe in memory.
- **Do NOT delete `move-music-props-left` based on `is-ancestor` alone without knowing why** it fails: its content landed via cherry-pick.
- Carried forward from earlier handoffs: never push to `main`; confirm a PR merged with ALL its commits before deleting a branch; never `obj.lookAt` a standing figure; never commit `arcade-src/glb/`; never use Tripo Ultra mesh; always register `MeshoptDecoder`; no devil / demon / occult imagery; no money or `$`; no UI chips at left-center or right-center; don't re-raise the Kanye MPC samples.

---

## 8. Recommended next-session plan

**Most leveraged first move: get OTTI's eyes on the flippers** (one hard refresh, one sentence of feedback). It closes a bug reported four times.

1. OTTI hard-refreshes and confirms the flippers are still when idle and that hover feels right. Adjust `FLIP_HOVER_R` or switch to screen halves if asked.
2. Check the Tripo account (Lite discontinued July 31). Migrate to Studio if anything survived; note what is gone.
3. Update the `arcade-3d-conversion` skill with this session's lessons (§6, §7) before writing game three.
4. Build **ARCADE COP 3** on the engine: reuse the cast (generate a `heavy`), add the slow-motion meter, follow the skill. One PR, review loop, OTTI merges, verify on the deployed URL with `#selftest`.
5. Housekeeping on OTTI's OK: delete stale branches, delete the superseded `arcade-src/glb/vcop2/*-merged.glb` / `*-opt.glb`, resolve the two mystery PNGs.

Games after this: THE LOST LAND, SKYFIRE GUNNER, HOUSE OF THE UNDEAD, BIG RACK HUNTER, RED GUN RANGE.

---

## 9. Critical paths to know

**Project root:** `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE/`

| Path | What |
|---|---|
| `index.html` | THE site. Pinball physics (`makeFlipper`, `driveFlipper`, `setFlipperLive`, `updatePressed`), scene, desks (`desk()`, `deskLG` left / `deskRG` right, `PROP_LIST`), `vintageTV()`, `ARC3D` routing, `#selftest` |
| `assets/arcade/engine3d.js` | Shared 3D engine. Full config surface documented in its header |
| `assets/arcade/final-shot-3d.html` | FINAL SHOT (rail shooter) |
| `assets/arcade/arcade-cop-2-3d.html` | ARCADE COP 2 (cover shooter, rigged cast, `cfg.camera`). **Template for the remaining human-enemy games** |
| `assets/arcade/index.html` | The 6 remaining canvas games. `GAMES` object holds the authoritative balance |
| `assets/props/vc-*.glb` | ARCADE COP rigged cast, clips `cover` / `aim` / `die` |
| `assets/vhs-loop.mp4` | The TV clip |
| `scripts/glb-merge-anims.py` | Clip merge / trim / root-lock tool |
| `arcade-src/vc-*.png` | Cast source images (committed) |
| `arcade-src/glb/` | Raw Tripo downloads + harness pages, gitignored |
| `~/.claude/skills/arcade-3d-conversion/SKILL.md` | Conversion workflow (needs this session's lessons) |
| memory `otti-music-site-project.md` | Long-lived project memory, incl. the screenshot recipe |

**Scene hooks:** `window._arcUnits`, `_arcSelect(i)`, `_mpcUnits`, `_setCam(state)`, `_dbg()`, `__step()`, `_camCur`, `_ct`, `_camera`, `_propsLoaded`. Pinball globals (classic script, reachable by bare name, not `window.`): `game`, `leftFlip`, `rightFlip`, `ball2d`, `engine`, `Matter`, `flipLive`.

**Game hooks:** `__arcStop`, `__arcGame`, `__arcStep(n,dt)`, `__arcShoot(x,y)`, `__arcState`, `__arcEnts()`; ARCADE COP 2 adds `__arcDbg()`.

**URLs:** live https://otti-music-site.vercel.app - repo https://github.com/ottiwroteit/otti-music-site - Tripo Studio https://studio.tripo3d.ai

**Fragments:** `#selftest`, `#nobloom`. Arcade: `#gundam #vcop2 #vcop3 #lostworld #machinegun #hotd #buckhunter #redgun`. MPC: `#otti #power #runaway`.

---

## 10. Standing OTTI rules (append-only)

- Feature branch -> PR -> **OTTI merges in the GitHub UI**. Never push direct to `main`.
- After every `/code-review` or `/engineering:code-review`, emit a chat status block (SCORE X/5 + findings).
- **No devil/demon/occult imagery, EVER.** No money, no `$`.
- **Verify on the DEPLOYED artifact**, never a local preview.
- No emojis or em-dashes in output; API keys to `.env`, never chat.
- Scene stays a 3D scene; locked copy; bloom-knee dimming.
- Never place UI chips at left-center or right-center.
- Never trust an automation's own success return; verify independently.
- Tripo web credits, Tripo API credits and Higgsfield credits are separate wallets. Don't stall to ask about spend.
- Kanye MPC samples shipping publicly is SETTLED.
- OTTI sees the asset before any "not a good fit" call.
- Characters get RIGGED; Blender is part of the pipeline (this session it verified and trimmed, no hand-authoring needed).
- Confirm a PR merged with ALL its commits before deleting a branch.
- Buy certainty cheaply.
- **[NEW]** **Flippers move ONLY while a visitor is playing**, via hover, arrow keys, or touch. Never on their own, never in attract mode.
- **[NEW]** **Never claim a visual or motion fix is done on the strength of a throttled automation tab.** If you cannot observe true 60fps, guarantee it at the render level and say plainly that OTTI's eyes are the final check.
- **[NEW]** When OTTI points at a reference video, the real footage is the asset. Recreate only if he asks; otherwise crop and loop the clip itself.
- **[NEW]** Two edits that touch the same surface ship in one PR, so `main` is never in a half-redecorated state.
- **[NEW]** Tell OTTI to hard-refresh (Cmd+Shift+R) after a deploy: an open tab keeps the old inline script.

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"

git branch --show-current                   # expect: main
git log --oneline -1                        # expect: 4982af1 (PR #23 merge) or newer
git status --short                          # expect: only pizza_throwable.png, snowmobile.png untracked
gh pr list --state open                     # expect: empty

B=https://otti-music-site.vercel.app
for p in "" assets/arcade/arcade-cop-2-3d.html assets/arcade/final-shot-3d.html assets/vhs-loop.mp4 assets/props/vc-thug.glb; do
  printf "%-38s %s\n" "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "$B/$p")"; done      # expect: all 200

# live == main
[ "$(shasum -a1 index.html|cut -c1-12)" = "$(curl -s "$B/index.html?nc=$(date +%s)"|shasum -a1|cut -c1-12)" ] && echo "index live==main" || echo "DRIFT"

# engine surface present
curl -s "$B/assets/arcade/engine3d.js" | grep -c "function playClip\|cfg.camera(E,dt)\|e.k.aimY"   # expect: 3

# flipper guarantees present
grep -c "function setFlipperLive\|function updatePressed\|leftFlipM.rotation.y=-leftFlip.rest" index.html   # expect: 3

# restart the CORS server if needed (127.0.0.1, NOT localhost)
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://127.0.0.1:8756/index.html || \
nohup python3 -c "from http.server import HTTPServer,SimpleHTTPRequestHandler as H
class C(H):
 def end_headers(s): s.send_header('Access-Control-Allow-Origin','*'); H.end_headers(s)
HTTPServer(('127.0.0.1',8756),C).serve_forever()" >/tmp/arc_cors.log 2>&1 &
```

**Production selftests** (load in a fresh tab, wait ~9s, read `window.__selftest`): `$B/assets/arcade/arcade-cop-2-3d.html?x=1#selftest` and `$B/assets/arcade/final-shot-3d.html?x=1#selftest`. Always add a `?query` so the load is real, not a fragment navigation.

---

## 12. One-sentence summary

This session took the site from **one 3D cabinet blocked on a lost engine commit** to **two shipped 3D games on an engine that now drives rigged characters, flippers that only move when a visitor plays (pending OTTI's eye test), and a redecorated studio whose vintage TV loops OTTI's clip**, while leaving two things undone that the next session must face first: OTTI's confirmation of the flippers, and the Tripo account after its July 31 shutdown.
