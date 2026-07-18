# SESSION HANDOFF — OTTI MUSIC SITE — 2026-07-18

_Supersedes `docs/SESSION-HANDOFF-2026-07-04.md` (does not delete it). That handoff covered the playable MPC build; this one covers everything since: the MPC ship, the MSL rebrand, the playable ARCADE WING, the hangar environment pass, the pinball input fix, and the in-progress **Tripo photoreal cabinet pipeline**._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** is a single-file 3D web experience, **live at https://otti-music-site.vercel.app** (auto-deploys on merge to `main`). It is now TWO connected rooms:

- **The studio** — neon pinball machine ("TO BE QUITE HONEST"), live streams ticker, real-geography globe, Y2K Desktop OS monitor, floor statues, anime rugs, downtown day/night window, and **3 playable MPC2000XL machines** on the left desk.
- **The arcade wing** (NEW) — pan counter-clockwise past the MPC desk into a daylit warehouse hangar with **9 clickable light-gun cabinets / 8 playable games**.

The site is branded **MSL (Make Sense Later Records)** across every surface.

**State NOW:** `main` is clean and deployed through **PR #12** (`d4ec5b4`). Everything above is LIVE and verified. The active unfinished work is the **photoreal cabinet upgrade**: all 8 arcade cabinets have been generated as 3D meshes in Tripo, 1 of 8 is fully processed and committed. WIP lives on branch `arcade-glb-pipeline` (`193023b`, pushed, no PR yet by design).

---

## 2. State of the codebase at handoff

| Check | State |
|---|---|
| `main` HEAD | `d4ec5b4` (PR #12 merge) — SYNCED with origin |
| Working branch | `arcade-glb-pipeline` @ `193023b` — pushed, **no PR yet** (waiting for all 8 cabinets) |
| Working tree | **CLEAN** |
| Live site | https://otti-music-site.vercel.app → **200** (verified) |
| Arcade app live | `/assets/arcade/index.html` → **200** (verified) |
| Live brand | pill reads **MSL** (verified in served HTML) |
| `#selftest` | **SELFTEST OK** on main (now asserts 9 arcade units / 8 distinct games / arcade state round-trip) |
| Console errors | **0** |
| Higgsfield credits | **1.73** — EXHAUSTED (checkout never completed) |
| Tripo web credits | **260** (was 460; 200 spent = exactly 8 × 25, zero waste) |
| In-flight agents | none |
| Background process | CORS server on `127.0.0.1:8756` (may be dead after restart — trivial to restart, see §11) |

---

## 3. What was SHIPPED this session (all merged, live)

**PRs merged (each auto-deployed + verified on the live URL):**
- **PR #6** (`055ede5`) — Playable MPC lineup (3 machines, WebAudio app) + MSL chrome backwall sign + MSL favicons + left-desk clear + audio-lifecycle fixes
- **PR #7** (`bcfb402`) — Removed "WATCH THE WORLD WE LIVE IN" from under the MSL sign
- **PR #8** (`dd5d630`) — Tab title → `MAKE SENSE LATER`
- **PR #9** (`69b124f`) — **ARCADE WING**: warehouse hall, 9 cabinets, 8 playable games
- **PR #10** (`eeb3473`) — Hangar environment pass (trusses, sky, corrugated walls, glossy floor, daylight rig)
- **PR #11 + #12** (`89a9cba`, `d4ec5b4`) — Hangar sign → MSL chrome; **ARCADE chip moved out of the flipper tap zone**; live pill → MSL

**Verification artifacts:** every PR was verified on the REAL deployed URL via Playwright (not local preview), including a real-rAF dive into FINAL SHOT on production.

---

## 4. Critical open items (ranked)

### P0 — finish the photoreal cabinet upgrade (the active task)
All 8 cabinets are **already generated in Tripo** and persist permanently in OTTI's My Models (re-download is FREE). Remaining:
1. **Download 7 GLBs** from Tripo My Models (`vcop2, vcop3, lostworld, machinegun, hotd, buckhunter, redgun`). FINAL SHOT is already done.
2. **Compress each** with the proven recipe (§6) — ~29MB → ~1.8MB each.
3. **Scene integration** — the real work: register `MeshoptDecoder` on the GLTFLoader, replace the procedural `buildCab()` boxes with a GLB loader, **preserve every click/dive/game hookup**, re-verify all 8 games still play.
4. **One PR** carrying all 8 (OTTI explicit: all 8 land together).

### P1
- **Pinball feel.** The ARCADE-chip overlap (root cause of "pinball doesn't work at all") is FIXED and live, but OTTI has not confirmed the game now feels right. Ask him to play it.
- **MPC per-machine click mapping** never live-clicked (correct by construction, never eyeballed).

### P2
- OTTI song LCD still placeholder `UNTITLED / BPM 140` — one string in `assets/mpc/index.html` `SONGS.otti.lcd`.
- Vocal chops auto-cut from silence detection; OTTI should audition.
- `Otti Transparent.png` is now unused (dead asset, safe to delete).

### Founder decisions waiting on OTTI
1. **Does the pinball feel right now?** (chip moved; unconfirmed by OTTI)
2. **Cabinet mesh quality** — FINAL SHOT is committed; does the photoreal direction land before we integrate all 8?
3. **Higgsfield top-up** — balance 1.73, checkout never completed. NOT blocking (Tripo has 260 credits and Constants generates images fine), but Higgsfield is dead until topped up.

---

## 5. Specific in-flight artifacts

Branch **`arcade-glb-pipeline`** @ `193023b` (pushed, no PR):
- `arcade-src/*.png` — **all 8 cabinet source images**, committed deliberately (Higgsfield CDN URLs expire; the 3 Constants ones aren't exactly reproducible)
- `assets/props/arc-gundam.glb` — **1.84 MB**, FINAL SHOT cockpit, QA'd + validated
- `.gitignore` — now ignores only `arcade-src/glb/` (raw 29MB Tripo dumps) instead of all of `arcade-src/`

**In Tripo (OTTI's web account, permanent, free to re-download):** all 8 cabinet models. One known model URL: `https://www.tripo3d.ai/app/model/915a3298-d06b-4055-95f3-cf0b1a526937` (FINAL SHOT). The other 7 are in **My Models**, newest first.

**Local only (gitignored):** `arcade-src/glb/gundam-raw.glb` (29MB), the reference video, `Y2K Desktop OS.zip`.

---

## 6. New skills + integrations introduced this session

**The Tripo image→3D pipeline (the big one).** Higgsfield ran out of credits mid-task; Tripo web is a **completely separate wallet** and unblocked everything.

Working recipe (hard-won — several steps are NOT in the `ot7-tripo-web-roster` skill):
1. Serve source images with CORS from **`127.0.0.1`** (NOT `localhost` — mixed-content blocked from the https Tripo page).
2. Drive OTTI's logged-in Chrome via `claude-in-chrome`.
3. Inject bytes into Tripo's hidden `<input type=file>` — the native picker is undrivable.
   - **GOTCHA (new):** Tripo renders that input **asynchronously**. Clicking `.single-img-button` and immediately querying finds **0 inputs**. Wait ~1.6s.
   - **GOTCHA (new):** after React ingests the file, `input.files` reads back **empty**. That looks like failure but is normal — verify via the thumbnail, not the input.
   - **GOTCHA (new):** NEVER bulk-click `[class*=close]` to dismiss modals — it clicks the uploaded thumbnail's × and silently wipes the image.
4. Settings: PBR on, **Standard** mesh (NOT Ultra — Ultra is 60-80MB), Private on, v3.0, HD Texture off (keeps cost at 25).
5. **Click Generate manually** — clicking it via JS is unreliable. Verify it fired by the **credit drop** (25 each); if credits didn't move, it didn't fire and cost nothing.
6. Generations are **strictly serial** — each result modal blocks the next injection. Close modal → inject → generate → wait.

**Compression recipe (proven, 94% reduction):**
```bash
npx @gltf-transform/cli optimize in.glb out.glb \
  --compress meshopt --texture-compress webp --texture-size 1024
# 29.25 MB -> 1.84 MB, valid glTF 2.0
```

**Constants `create_image`** — image generator used when Higgsfield died. Produced arguably BETTER cabinet art than Higgsfield (see `arcade-src/hotd.png`).

**Arcade light-gun engine** — one canvas engine, 8 hash-selected games, all art canvas-drawn, all SFX WebAudio-synthesized, zero external assets, no ROMs.

---

## 7. What the next agent should NOT do

- **Do NOT commit `arcade-src/glb/`** — raw Tripo dumps are 29MB each and free to re-download.
- **Do NOT regenerate the 8 cabinets in Tripo** — they already exist in My Models. Re-download is free; regenerating burns 25 credits each.
- **Do NOT use Ultra mesh resolution** in Tripo for web — 60-80MB per model is unshippable.
- **Do NOT ship a meshopt-compressed GLB without registering `MeshoptDecoder`** on the GLTFLoader — the file silently fails to load.
- **Do NOT bulk-click `[class*=close]`** in Tripo (wipes the uploaded image, see §6).
- **Do NOT trust the Tripo helper's "queued" return** — only the credit drop proves a generation fired.
- **Do NOT push direct to `main`** (classifier blocks it) — feature branch → PR → OTTI merges.
- **Do NOT put UI chips at left-center or right-center** — those are the pinball flipper tap zones. This exact mistake made OTTI report "the pinball machine does not work at all."
- **Do NOT use devil/demon/occult imagery, EVER** (HOUSE OF THE UNDEAD is deliberately goofy cartoon zombies).
- **Do NOT re-raise the Kanye MPC sample copyright** — settled founder decision (2026-07-06), see memory.
- **Do NOT rely on rapid `__step()`** to fly the camera — use real-timed `setInterval(()=>__step(),16)`, or teleport `_camCur.pos.copy(_ct.pos)`. The preview pane also renders ~7fps, so dives look stuck when they aren't.

---

## 8. Recommended next-session plan

**Most leveraged first move: download + compress the 7 remaining GLBs, THEN integrate.** Order:

1. Restart the CORS server (§11) and open Tripo My Models in OTTI's Chrome. Download the 7 cabinet GLBs (free). They land in `~/Downloads/tripo_pbr_model_*.glb` — match them to cabinets by preview thumbnail.
2. Compress each with the §6 recipe into `assets/props/arc-<game>.glb`. Verify each is ~2MB and `gltf-transform inspect` passes.
3. **Scene integration** in `index.html`:
   - `import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'` and `gltfL.setMeshoptDecoder(MeshoptDecoder)`
   - Replace the procedural `buildCab()` body geometry with a GLB load, keeping the SAME `arcUnits.push({game,title,obj,face})` contract so click/dive/game wiring is untouched
   - Auto-scale via `Box3` to a target size; orient FIRST then ground (`y = floorY - bb.min.y`); `emissiveIntensity=0` on all materials (bloom); no-op error callback
4. Re-verify: all 8 cabinets click → dive → correct game → plays → ESC restores; studio↔arcade nav; `#selftest`; 0 console errors; portrait.
5. **One PR** with all 8 → review → OTTI merges → verify on the live URL.

If the cabinet meshes look wrong in-scene, Tripo offers **Free Retry (3/3)** per model at no credit cost.

---

## 9. Critical paths to know

**Project root:** `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE/`

| Path | What |
|---|---|
| `index.html` | THE site. Arcade wing: search `arcUnits`, `curArc`, `buildCab`, `CAMS.arcade`, `#arcframe`. MPC: `mpcUnits`, `curMpc`. Sign: `drawSign`, `nsM`. |
| `assets/arcade/index.html` | The 8-game light-gun engine. `GAMES` object = per-game config. Test hooks: `__arcStep/__arcShoot/__arcState/__arcEnts`. |
| `assets/mpc/index.html` | The 3-song MPC app. `SONGS` object. |
| `arcade-src/*.png` | The 8 cabinet source images (committed). |
| `arcade-src/glb/` | Raw Tripo dumps (gitignored). |
| `assets/props/arc-gundam.glb` | First finished photoreal cabinet (1.84MB). |
| `prds/otti-music-site-arcade-wing.md` | Arcade wing PRD (in workspace `prds/`, not this repo). |
| `docs/SESSION-HANDOFF-2026-07-18.md` | THIS FILE. |

**Scene test hooks:** `window._arcUnits`, `_arcSelect(i)`, `_arcProj(i)`, `_mpcUnits`, `_setCam(state)`, `_dbg()`, `__step()`, `_camCur`, `_ct`.

**URLs:** live https://otti-music-site.vercel.app · repo https://github.com/ottiwroteit/otti-music-site · Tripo https://www.tripo3d.ai/app/home · local preview http://localhost:4599

**Debug fragments:** `#selftest`, `#nobloom`. Arcade hashes: `#gundam #vcop2 #vcop3 #lostworld #machinegun #hotd #buckhunter #redgun`. MPC: `#otti #power #runaway`.

---

## 10. Standing OTTI rules (append-only)

- Feature branch → PR → **OTTI merges in the GitHub UI**. Never push direct to `main`. Merge auto-deploys production.
- After every `/code-review`, emit a chat status block (SCORE X/5 + findings) — OTTI doesn't leave Cade to read PR status.
- **No devil/demon/occult imagery, EVER** (any asset, any project).
- **Variant lighting = relight ONE master image** via image-to-image — never generate independently.
- **No money / no `$`** anywhere on the site; it tracks streams/plays.
- **Verify on the DEPLOYED artifact** (curl/screenshot the real URL), never claim correctness from a local preview.
- No emojis/em-dashes in output; API keys → `.env`, never chat.
- Scene stays a 3D scene; locked copy ("TO BE QUITE HONEST" / "WATCH THE WORLD WE LIVE IN" on the playfield / "EARLY ACCESS"); bloom-knee dimming; flippers user-input-only; `driveFlipper` per physics substep.
- **[NEW]** Never place UI chips/buttons at left-center or right-center — those are pinball flipper tap zones.
- **[NEW]** Never trust an automation's own "success" return — verify with an independent signal (credit drop, file on disk, rendered pixels).
- **[NEW]** Tripo web credits ≠ Tripo API credits ≠ Higgsfield credits. Three separate wallets.
- **[NEW]** OTTI does not care about credit spend — do not stall a build to ask about credits.
- **[NEW]** Kanye MPC samples shipping publicly is a SETTLED decision — never re-raise.

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"

git branch --show-current                  # expect: arcade-glb-pipeline
git status --short                          # expect: clean
git log --oneline -1 main                   # expect: d4ec5b4 (PR #12)
git log --oneline -1                        # expect: 193023b

ls arcade-src/*.png | wc -l                 # expect: 8
ls -lh assets/props/arc-gundam.glb          # expect: ~1.8M

curl -s -o /dev/null -w "%{http_code}\n" https://otti-music-site.vercel.app                     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://otti-music-site.vercel.app/assets/arcade/index.html  # 200
curl -s https://otti-music-site.vercel.app/index.html | grep -o 'class="brand">[A-Z]*'          # MSL

# restart the CORS server for Tripo (127.0.0.1, NOT localhost)
nohup python3 -c "from http.server import HTTPServer,SimpleHTTPRequestHandler as H
class C(H):
 def end_headers(s): s.send_header('Access-Control-Allow-Origin','*'); H.end_headers(s)
HTTPServer(('127.0.0.1',8756),C).serve_forever()" >/tmp/arc_cors.log 2>&1 &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8756/arcade-src/gundam.png            # 200
```

---

## 12. One-sentence summary

This session took OTTI MUSIC SITE from a shipped pinball studio with an unverified MPC to a **fully live two-room experience** — playable MPC lineup, a daylit warehouse **arcade wing with 8 playable light-gun games**, a complete **MSL rebrand**, and a root-caused pinball input fix — then proved and half-executed a **Tripo photoreal cabinet pipeline** (all 8 meshes generated, 1 compressed to 1.84MB and committed) that only needs downloading, compressing, and scene integration to finish.
