# SESSION HANDOFF — OTTI MUSIC SITE — 2026-07-04

_Supersedes `docs/SESSION-HANDOFF-2026-07-03.md` (does not delete it). That handoff covered the pinball scene + Y2K monitor bootstrap; this one covers everything since: favicon, Vercel deploy, floor props, downtown window, and the in-progress **playable MPC** feature._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** ("TO BE QUITE HONEST") is a single-file 3D web experience — a neon pinball machine in a dark retro studio, with a live streams/plays ticker, a real-geography globe, a desk monitor running OTTI's Y2K Desktop OS on click, floor statues (Black Panther, War Machine), tufted anime rugs (swordswoman, Barry Sanders), and a downtown skyline window with a day/night toggle. It is **live at https://otti-music-site.vercel.app** (auto-deploys from GitHub `main` on every merge).

**State NOW:** `main` is clean and deployed through **PR #5** (commit `bd46947`). This session's active work — a **playable AKAI MPC2000XL** on the left desk (click it → camera dives in → play OTTI's stems / Kanye POWER / Kanye RUNAWAY on the pads) — is **built and largely wired but UNCOMMITTED** on branch `playable-mpc`. It is NOT yet verified in-scene end-to-end and NOT shipped. Everything lives in `index.html` (~1330 lines) + `assets/`.

---

## 2. State of the codebase at handoff

| Check | State |
|---|---|
| Git HEAD (main) | `bd46947` (PR #5 merge) — SYNCED with GitHub origin/main |
| Working branch | **`playable-mpc`** (NOT pushed, no PR yet) |
| Working tree | **DIRTY** — see §5 |
| Live site | https://otti-music-site.vercel.app → 200, renders (verified this session) |
| Deploy | Vercel project `otti-music-site`, team `ottiwroteits-projects`, GitHub-connected → merge to `main` auto-deploys |
| `#selftest` | passes on `main`; **NOT re-run** on the `playable-mpc` branch yet (must run before shipping) |
| Console errors | 0 on `main`; on branch, `window.__loopErr` was null in last check but full end-to-end not screenshot-verified |
| In-flight agents | none (Explore agent for MPC interaction internals completed) |
| Higgsfield 3D jobs | all complete + downloaded (3 MPC GLBs on disk) |
| Preview server | Claude Preview MCP, name `otti-site`, port 4599 (restart next session) |

---

## 3. What was SHIPPED in this session (all merged to `main`, live)

**PRs merged (auto-deployed):**
- `PR #2` (`ad54fe6`) — Vercel deploy config (`.vercelignore`); site went live
- `PR #3` (`5d5fa7a`) — OTTI favicon (neon-green mark on dark tile, `favicon.png/ico`)
- `PR #4` (`3f5b97f`) — Black Panther floor statue + skater rug + wide-camera tilt to show the floor
- `PR #5` (`bd46947`) — War Machine statue (under right desk), Panther moved under left desk, skater rug → anime swordswoman rug (DMC-*style*, NO devil elements per OTTI rule), added Barry Sanders (Lions #20) rug + **downtown skyline window** behind the right monitors with a **day/night ☀/☾ toggle** (same skyline relit sunrise↔sunset — image-to-image relight so buildings are identical)

**Infra:** Vercel live URL, GitHub↔Vercel auto-deploy pipeline confirmed working (asset 200s + live render verified after each merge).

**Verification artifacts (this session):** each PR verified with real deployed pixels on `otti-music-site.vercel.app` before reporting done (per review-loop blocking rules).

---

## 4. Critical open items (ranked)

**P0 (blocks shipping the MPC feature):**
- **Finish wiring + verify the MPC end-to-end, then ship.** The 3-machine lineup is coded but: (a) the three GLBs replaced the old single-`mpc2000xl` code — confirm PROP_LIST names match the on-disk files (`mpc-otti.glb`, `mpc-power.glb`, `mpc-runaway.glb` ✓ all present); (b) load the scene, confirm all 3 machines render on the left desk without overlapping the lava lamp / pedal / mat (those were moved front-left — re-check collisions); (c) click each → camera dives → correct song's app opens (hash `#otti` / `#power` / `#runaway`); (d) audio plays via `mpcframe.contentDocument` drive test; (e) ESC/wheel/backchip back out and pinball input is restored (`window.__inScreen` covers `'mpc'`); (f) `#selftest` passes; (g) 0 console errors; (h) portrait pass. Then branch is already `playable-mpc` → push → PR → review loop → OTTI merges.

**P1 (important, near-term):**
- **The MPC iframe currently presents as a large CENTERED panel** (growthr-style near-fullscreen), NOT perspective-glued to the tiny faceplate — this was a deliberate change (a flat MPC faces up → head-on glue would be top-down/gimbal-prone). Confirm OTTI is happy with "app takes over the screen" vs a tighter glue. Camera dive toward the unit is the transition.
- **Standalone app verified; in-scene fly-in verified for the OLD single-machine build only.** Re-verify the fly-in with the 3-machine `curMpc` selection logic (each unit has its own `face` panel).

**P2 (polish):**
- OTTI song LCD says `UNTITLED / OTTI` — swap to the real title + BPM when OTTI names the track (one-string edit in `assets/mpc/index.html` `SONGS.otti.lcd`). BPM was estimated at ~140 from the drums stem.
- Vocal chops (`chop1-6.m4a`) are auto-cut from silence detection — OTTI should audition and we re-cut any weak ones (trivial ffmpeg re-slice).

**Founder decisions waiting on OTTI:**
1. Happy with the **3-MPC lineup on the left desk** (RUNAWAY cream / POWER red / OTTI black-neon, left→right across the back)? Placement/spacing is a guess pending a screenshot.
2. Happy with the **centered-panel** MPC presentation (vs tighter 3D glue)?
3. **Kanye samples (POWER/RUNAWAY) are re-hosted from growthr** — same copyright gray zone growthr is in, now on OTTI's site. OK to ship, or keep only the OTTI song public and gate the Kanye banks? (Answered earlier "start with my own song to prove concept, then bring in POWER/RUNAWAY that make sense" — he then explicitly asked to add POWER + RUNAWAY, so proceeding, but flag the risk at merge.)
4. Real OTTI track title + BPM for the LCD.

---

## 5. Specific in-flight artifacts (UNCOMMITTED on branch `playable-mpc`)

- `index.html` — MODIFIED: procedural MPC deleted; `PROP_LIST` has 3 `mpc-*` rows; `mpcUnits[]`/`curMpc` + per-unit `face` panels built in the GLTF loader; `'mpc'` camera state; raycast loops over `mpcUnits`; `#mpcframe` iframe + centered-panel glue in the loop; `setCam` sets the iframe hash per song; ESC/wheel/backchip exits; `window.__inScreen` covers `'mpc'`; lava lamp + pedal moved front-left to make room.
- `.gitignore` — MODIFIED: added `STEMS FOR MPC/` (170MB raw WAVs stay local).
- `assets/mpc/index.html` — NEW: self-contained 3-song MPC app (config-driven `SONGS` object, hash-selected `#otti`/`#power`/`#runaway`, per-song CSS theme, WebAudio engine: synced stems for OTTI, independent loops for POWER/RUNAWAY, one-shots, REVERB/ECHO hold buses via Convolver/Delay, Stop, keyboard+pointer, info popup).
- `assets/mpc/samples/` — NEW: OTTI stems `bass/drums/keys/vocals.m4a` + `chop1-6.m4a` (~17MB).
- `assets/mpc/samples-power/` — NEW: 8 POWER files mirrored from growthr (`ah/ey/eyey/eyeyey.mp3`, `clap/drums.wav`, `guitar-hit/schiz.mp3`).
- `assets/mpc/samples-runaway/` — NEW: 13 RUNAWAY files from growthr (`piano1-8.mp3`, `Instrumental-loop.mp3`, `LookAtCha/BeautifulStars/LadiesNGentlemen/Hey.mp3`).
- `assets/props/mpc-otti.glb` (7.6MB), `mpc-power.glb` (4.3MB), `mpc-runaway.glb` (5.5MB) — NEW, textured Higgsfield GLBs, all downloaded and on disk.
- `mpc-ref.png` (repo root) — scratch screenshot of growthr's faceplate; **delete before commit** (not an asset).
- `.playwright-mcp/` — scratch; delete before commit.
- Local only (gitignored): `STEMS FOR MPC/` (5 raw WAVs, 170MB).

---

## 6. New skills + integrations introduced this session

- **`generating-3d-props-with-higgsfield`** skill (created earlier, used heavily): image→`generate_3d`→GLB→`PROP_LIST`. z_image tends to render figurine **pairs** — crop to one before `generate_3d` (done for panther/warmachine; the MPCs came out single). media_upload → PUT presigned → media_confirm → generate_3d → download GLB.
- **`/reverse-engineer-app` + firecrawl/curl** on growthr.com/mpc: decoded their Vite bundle (`/ye/assets/index-B3l3VyEy.js`, 1.1MB) → extracted exact pad configs for POWER + RUNAWAY. `growthr.com/mpc/power/` redirects to `/ye/#power`.
- **ffmpeg audio pipeline**: WAV→m4a AAC 160k transcode; `silencedetect` phrase-cutting for vocal chops; autocorrelation BPM estimate.
- **WebAudio MPC engine**: time-aligned stems on one clock (loop-pad = gain flip, always in sync); generated-impulse Convolver reverb + Delay-feedback echo wet buses.

---

## 7. What the next agent should NOT do

- **Do NOT iframe growthr.com.** Verified: `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN`. The MPC is a self-hosted rebuild — that was the whole point.
- **Do NOT commit `STEMS FOR MPC/`** (170MB, now gitignored) or the raw `.playwright-mcp/` / `mpc-ref.png` scratch.
- **Do NOT push to `main` directly** (classifier blocks it) — feature branch → PR → OTTI merges. Branch `playable-mpc` already exists with the work.
- **Do NOT use devil/demon/occult imagery, EVER** (hard OTTI rule — the DMC-style rug was built deliberately devil-free).
- **Do NOT regenerate the 3 MPC GLBs** — they're on disk (`assets/props/mpc-*.glb`); the Higgsfield CloudFront URLs expire.
- **Do NOT rely on rapid `window.__step()` to fly the camera** — `dt` from `clock3.getDelta()` is ~0 between fast calls so the damped lerp barely moves. Use a real-timed `setInterval(()=>__step(), 16)` (proven this session) or force `camCur` to target.
- **Do NOT trust the standalone-app test as proof of the in-scene experience** — the fly-in + iframe glue must be screenshot-verified in `index.html` at the 3-machine build.
- Standing scene rules from prior handoff still hold: stays a 3D scene; streams not money (no `$`); flippers user-input-only; locked copy ("TO BE QUITE HONEST" / "WATCH THE WORLD WE LIVE IN" / "EARLY ACCESS"); globe/screen dim under the bloom knee; `driveFlipper` per physics substep; flippers collide with ball only.

---

## 8. Recommended next-session plan

**Most leveraged first move: finish + verify the MPC, don't rebuild it.** Order:

1. `preview_start` name `otti-site` → load `index.html` cache-busted → check `window._propsLoaded` includes `mpc-otti:tex`, `mpc-power:tex`, `mpc-runaway:tex`, `window.__loopErr` null, `window._mpcUnits.length===3`. Screenshot wide → confirm 3 machines sit cleanly on the left desk (no overlap with lava/pedal/mat). Adjust `PROP_LIST` positions if crowded.
2. For each song: `window._setCam('mpc')` after setting `curMpc` (or click-raycast), real-timed step to settle, confirm `#mpcframe` `.show` + correct hash + app theme. Screenshot each.
3. Drive audio via `mpcframe.contentDocument` (same-origin): click a loop pad → assert `AudioContext.state==='running'` + `__mpcState` gain/loop flips + Stop kills. (Playwright trusted click unlocks audio.)
4. ESC → back to `wide`; confirm pinball flippers respond again. Run `#selftest` (expect SELFTEST OK, no thrown error). Portrait pass at 375px.
5. Clean scratch (`mpc-ref.png`, `.playwright-mcp/`). Push `playable-mpc` → PR → `/code-review` loop status block → OTTI merges → re-verify on the **live** URL.

If placement/centered-panel needs OTTI's eye, screenshot and ask before shipping (companion rule for visual surfaces).

---

## 9. Critical paths to know

**Project root:** `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE/`

| Path | What |
|---|---|
| `index.html` | THE site (three.js + matter.js + all logic). MPC wiring: search `mpcUnits`, `curMpc`, `MPC_SONG`, `mpcframe`, `camState==='mpc'`. |
| `assets/mpc/index.html` | Playable 3-song MPC app (WebAudio). `SONGS` object = per-song config + theme. |
| `assets/mpc/samples/` `-power/` `-runaway/` | Audio banks (OTTI stems+chops / Kanye POWER / Kanye RUNAWAY). |
| `assets/props/mpc-{otti,power,runaway}.glb` | The 3 MPC 3D units (textured Higgsfield GLBs). |
| `STEMS FOR MPC/` | OTTI's 5 raw stem WAVs (gitignored, local, 170MB). |
| `docs/SESSION-HANDOFF-2026-07-04.md` | THIS FILE. |
| growthr bundle | `/private/tmp/.../scratchpad/ye-bundle.js` (decoded ref; may be cleared — re-fetch `growthr.com/ye/assets/index-B3l3VyEy.js` if needed). |

**URLs:** live https://otti-music-site.vercel.app · repo https://github.com/ottiwroteit/otti-music-site · local preview http://localhost:4599 · growthr ref https://growthr.com/ye/ (real app; `/mpc/power/` redirects there).

**Debug fragments:** `#selftest` (assertions), `#nobloom` (no-post). MPC app hashes: `#otti` `#power` `#runaway`.

---

## 10. Standing OTTI rules (append-only)

- Commit + push regularly; feature branch → PR → OTTI merges in GitHub UI (never direct to `main`; classifier blocks it). Every tweak reaches the live link via merge auto-deploy.
- After every `/code-review` run, emit a chat status block (SCORE X/5, findings) — OTTI doesn't leave Cade to read PR status.
- **No devil/demon/occult references, EVER** (any asset, any project).
- **Variant lighting = relight ONE master image** (day/night, etc.) via image-to-image — never generate independently (they'd look like different places). [saved to memory this session]
- Merch: **no money / no `$` on the site**; the "Internet" app links/embeds OTTI's YouTube; merch returns later via Shopify wired into `Browser.tsx`.
- Verify sub-agent + tool claims before reporting them as wins (curl/stat/eval/screenshot the DEPLOYED artifact, not a local preview).
- No emojis/em-dashes in output; no sycophantic openers/closers; API keys → `.env`, never chat.
- Higgsfield MCP is the chosen path for generated 3D/image assets. z_image → crop pairs before generate_3d. GLBs committed (not gitignored); raw source folders gitignored.
- This project: 3D scene only; streams not money; flippers user-input-only; locked copy; bloom-knee dimming; the reference is the Shopify BFCM pinball site.

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"

git branch --show-current                 # expect: playable-mpc
git status --short                         # expect: M .gitignore, M index.html, ?? assets/mpc/, ?? assets/props/mpc-*.glb, ?? mpc-ref.png, ?? .playwright-mcp/
git log --oneline -1 main                  # expect: bd46947 (PR #5 merge) — main is clean/deployed

# all 3 MPC units + full audio banks present
ls assets/props/mpc-*.glb                  # otti, power, runaway
ls assets/mpc/samples assets/mpc/samples-power assets/mpc/samples-runaway
[ -f assets/mpc/index.html ] && echo "app present"

# live site still healthy
curl -s -o /dev/null -w "%{http_code}\n" https://otti-music-site.vercel.app   # 200
```

Then in Claude Preview MCP: `preview_start` name `otti-site` → load `index.html?v=N` → step frames real-timed → screenshot. Click a machine → fly-in → app. Drive pads via `mpcframe.contentDocument`.

---

## 12. One-sentence summary

This session took OTTI MUSIC SITE from a shipped-and-live pinball scene (favicon, Vercel auto-deploy, floor statues, anime rugs, day/night skyline window — all merged) to a **built-but-unshipped playable MPC lineup**: three self-hosted AKAI MPC2000XL machines (OTTI's own stems, plus Kanye POWER and RUNAWAY reverse-engineered from growthr) that you click into and play — all coded on branch `playable-mpc`, needing only in-scene end-to-end verification before its PR.
