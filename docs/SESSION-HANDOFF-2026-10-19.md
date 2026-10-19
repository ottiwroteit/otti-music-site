# SESSION HANDOFF - OTTI MUSIC SITE - 2026-10-19

_Supersedes `docs/SESSION-HANDOFF-2026-10-04.md` (does not delete it). This session ran 2026-10-18 to 2026-10-19 and covers five merged PRs: #25 (remove EARLY ACCESS), #26 (16-game decomp arcade), #27 (arcade back row spread), #28 (lounge: Fire Pro fireplace + TV guide), #29 (props shrunk 51 MB to 7.1 MB)._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** is a single-page 3D web experience, **live at https://otti-music-site.vercel.app** (auto-deploys on merge to `main`). Three connected spaces now: the neon pinball studio, the arcade wing (16 real browser games in Tripo cabinets), and the new **lounge** (90 degrees right of the TV desk): a brick fireplace with a live Fire Pro fire and a wall TV running a Prevue-style "MSL NETWORK" guide channel.

**State NOW:** `main` is clean and deployed at `853f546` (PR #29 merge). **Zero open PRs.** Live `index.html` byte-matches `main`; production `#selftest` = OK (verified 2026-10-19 ~04:34 UTC).

---

## 2. State of the codebase at handoff

| Check | State |
|---|---|
| `main` HEAD | `853f546` (PR #29 merge), synced with origin |
| Working tree | Only `pizza_throwable.png`, `snowmobile.png` untracked (pre-existing, not from this session, origin unknown) |
| Open PRs | none |
| Live `index.html` | byte-identical to `main` (verified) |
| Production scene `#selftest` | **OK** after PR #28 and again after PR #29 |
| Props on prod | 8 props = 7,098,764 bytes, each byte-identical to `main` (curl content-length checked) |
| Lounge live fire on prod | Verified showing (screenshot `.playwright-mcp/lounge-live-pr28.png`). Cold browser: ~30 s from click to live fire; recorded loop covers the gap |
| First-visit download | Was 58.6 MB measured on prod before #29; props alone now 6.8 MB transferred (measured locally, cache cleared). Full post-#29 total not re-measured |
| Merged local branches still present | `arcade-spread-backrow`, `decomp-arcade`, `lounge-fireplace-tv`, `perf-shrink-props`, `remove-early-access`, plus older ones. Not deleted (needs OTTI OK) |
| In-flight agents | none |

---

## 3. What was SHIPPED this session (merged and live)

| PR | What | Key commits |
|---|---|---|
| #25 | EARLY ACCESS button removed | merged |
| #26 | Arcade rebuilt: 16 real browser games from SubmitGame/awesome-decomp-games, each in its own Tripo image-to-3D cabinet, old homage games deleted | `2155fd3`, `c6d1cb9` |
| #27 | Arcade back row spread to the pillar; portrait camera recentred | `0a87dee`, `6e66b89` |
| #28 | Lounge: brick fireplace, Fire Pro live fire (WebGPU iframe overlay), recorded fallback loop, wall TV with data-driven guide (`GUIDE` table in `makeGuide()`), LOUNGE chip | `fa84f35`, `5d576bb`, `609c2ca` |
| #29 | 8 studio props re-packed (meshopt + WebP, full 2048 res, every triangle kept): 51.3 MB to 7.1 MB. Fire loop video now `preload:'none'` | `8ccfbfb` |

Review loop results: #28 round 1 = 6 findings, 5 fixed, 1 skipped (light toggle caused a 343 ms shader-recompile freeze, reverted); final gate found an 859 ms fly-in stall from the fire page, fixed by loading it after the camera lands (worst frame now 108 ms). Score 4/5. #29 scored 4/5 (one review round only; OTTI asked for speed).

Verification artifacts (local, gitignored): `.playwright-mcp/decomp/arcade-game-test-results.md` (all 63 decomp links tested), `.playwright-mcp/props-compare-full.png`, `props-compare-zoom3x.png`, `props-compare-zoom3x-fullsharp.png`, `lounge-live-pr28.png`.

---

## 4. Critical open items (ranked)

### Founder decisions waiting on OTTI
- **Flipper eye test** (carried from 10-04): confirm flippers only move while playing. Still unanswered.
- **MSL network content**: real channel names, show names and PIP videos for the TV guide. All current entries are placeholders in `GUIDE` (`index.html`, `makeGuide()`).
- **Delete merged branches** (#25 to #29 and older): needs OTTI's OK.
- **Two untracked PNGs** (`pizza_throwable.png`, `snowmobile.png`): keep, commit or delete?

### P1
- **Graphics memory**: props still use 2048x2048 textures (~360 MB VRAM). Halving to 1024 cuts to ~90 MB (iPhone tab-reload risk) but softens fine grain at 3x zoom. OTTI chose "looks the same", so not done. Revisit if phones crash.
- **Arcade cabinets (~9 MB) download 7 s after load** even if the visitor never visits the arcade. Option: load on arcade chip click (cost: cabinets pop in a second late first time).
- **Live fire warm-up ~30 s on a cold browser.** Option: warm the fire page earlier (it runs on the main page's thread; must not stall the fly-in).

### P2
- impeccable `dark-glow` hook finding on `#loungechip` box-shadow (copies `#arcchip`'s glow). Left standing, not ignored.
- In-scene screenshot of the shrunk props was never captured (Playwright kept crashing); evidence is the isolated side-by-side + pixel diff (<1/255 avg) + prod selftest.

---

## 5. Specific in-flight artifacts

- **Fire Pro build source is NOT fully in the repo.** `assets/fire/fireplace.src.ts` is committed, but the bundle `assets/fire/fire.js` was built in a scratchpad clone of dgreenheck/threejs-fire-pro (`npm run build:lib`, then `npx esbuild msl/fireplace.ts --bundle --format=esm --minify --target=es2022 --outfile=msl/fire.js`, importing `../dist-lib/threejs-fire-pro.js` and `../editor/presets/fireplace.json`). That scratchpad is session-temporary. To rebuild: re-clone the repo, place the .ts in `msl/`, run the two commands.
- Shrunk prop variants (half-res 1024 set and full-res set) lived in the session scratchpad only. Originals are in git history before `8ccfbfb`.
- PRDs: `prds/otti-music-site-decomp-arcade.md`, `prds/otti-music-site-lounge-fireplace-tv.md`, `prds/otti-music-site-shrink-props.md` (workspace root).

---

## 6. New skills and integrations introduced

- **Fire Pro** (MIT, three 0.185 WebGPU) bundled as a standalone page `assets/fire/index.html`, overlaid on the projected firebox rect. Licenses: `assets/fire/LICENSE-*.txt`.
- **16 third-party game sites** embedded via `#arcframe` (URLs in `CAB_DEFS`). Leaving a cabinet sets `about:blank`.
- **Prop pipeline**: `npx -y @gltf-transform/cli@4 optimize in.glb out.glb --compress meshopt --texture-compress webp --simplify false` (scene loader has `setMeshoptDecoder`). Add `resize --width 1024 --height 1024` first only if OTTI accepts softer close-ups.
- Lounge on-screen gating: frustum test against `lounge.sphere` gates guide redraw and fire-loop play/pause.

---

## 7. What the next agent should NOT do

- Do NOT toggle `fireL`/`tvGlow` visibility to save GPU: it recompiles every lit shader (measured 343 ms freeze).
- Do NOT load the fire iframe on lounge click: its setup runs on the main thread and stutters the fly-in. It loads on landing (`landed` in the loop).
- Do NOT use `gltf-transform optimize` defaults for props: default simplify drops up to 9% of triangles. Pass `--simplify false`.
- Do NOT trust Playwright's cached loads after replacing assets: `python -m http.server` sends no Cache-Control, so the browser serves old files. Clear cache via CDP `Network.clearBrowserCache` first.
- Do NOT kill other sessions' servers (port 8756 belonged to another session; use 4599 per `.claude/launch.json`).
- Do NOT run long verification loops when OTTI is waiting: send the PR link / score first, verify after.

---

## 8. Recommended next-session plan

1. Run §11 sanity checks; ask OTTI the founder decisions in §4 (one at a time).
2. If OTTI delivers MSL network content: swap it into `GUIDE` and the PIP video source (one PR).
3. Otherwise offer the P1 perf items (arcade load-on-demand, fire warm-up), with measured numbers.

---

## 9. Critical paths to know

- Repo: `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE` (GitHub `ottiwroteit/otti-music-site`)
- Live: https://otti-music-site.vercel.app (selftest: `/?x=1#selftest`, read `window.__selftest`)
- Scene: `index.html` (lounge block after the arcade wing; `makeGuide()`; loop lounge block before the arcade-cabinet overlay)
- Fire page: `assets/fire/` ; props: `assets/props/` ; cabinets: `assets/props/cab-*.glb`
- Local dev server: `.claude/launch.json` -> `python3 -m http.server 4599`
- Prior handoffs: `docs/SESSION-HANDOFF-*.md`

---

## 10. Standing OTTI rules (append-only)

- Feature branch -> PR -> **OTTI merges in the GitHub UI**. Never push direct to `main`.
- After every `/code-review` or `/engineering:code-review`, emit a chat status block (SCORE X/5 + findings).
- **No devil/demon/occult imagery, EVER** in our art (scoped exception: the embedded DOOM/Quake/QuakeWorld/Wolfenstein games themselves). No money, no `$`.
- **Verify on the DEPLOYED artifact**, never a local preview.
- No emojis or em-dashes in output; API keys to `.env`, never chat.
- Scene stays a 3D scene; locked copy; bloom-knee dimming.
- Never place UI chips at left-center or right-center.
- Never trust an automation's own success return; verify independently.
- Tripo web, Tripo API and Higgsfield credits are separate wallets. Don't stall to ask about spend.
- Kanye MPC samples shipping publicly is SETTLED.
- OTTI sees the asset before any "not a good fit" call.
- Characters get RIGGED; Blender is part of the pipeline.
- Confirm a PR merged with ALL its commits before deleting a branch.
- Buy certainty cheaply.
- Flippers move ONLY while a visitor is playing.
- Never claim a visual or motion fix is done on the strength of a throttled automation tab.
- When OTTI points at a reference video, the real footage is the asset.
- Two edits that touch the same surface ship in one PR.
- Tell OTTI to hard-refresh (Cmd+Shift+R) after a deploy.
- Do NOT commit `arcade-src/` or raw GLBs.
- **[NEW]** Arcade games: plays in browser inside the site, 1 to 3 clicks to gameplay, no installs, no logins or personal info. Test ALL candidates, not a sample.
- **[NEW]** Asset compression must "look the same": prove it with a side-by-side render including a close-up, before shipping.
- **[NEW]** Speed matters: when OTTI asks for a link, score or deploy check, give it first and keep extra verification short. Long silent verification loops have angered him.
- **[NEW]** Measure before claiming a perf win (frame-time probe, resource sizes); a "fix" can add a worse regression.

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"
git branch --show-current          # expect: main
git log --oneline -1               # expect: 853f546 or newer
git status --short                 # expect: only pizza_throwable.png, snowmobile.png
gh pr list --state open            # expect: empty
B=https://otti-music-site.vercel.app
[ "$(git show HEAD:index.html|shasum|cut -c1-12)" = "$(curl -s "$B/?nc=$(date +%s)"|shasum|cut -c1-12)" ] && echo "index live==main" || echo DRIFT
for f in speaker mpc-otti mpc-runaway mpc-power headphones mic panther warmachine; do curl -sI "$B/assets/props/$f.glb" | awk -v f=$f -F': ' 'tolower($1)=="content-length"{print f, $2}'; done   # expect: all under 1.4 MB
for p in assets/fire/index.html assets/fire/fire.js assets/fire/fire-loop.mp4 assets/props/cab-doom.glb; do printf "%-28s %s\n" $p "$(curl -s -o /dev/null -w '%{http_code}' $B/$p)"; done   # expect: 200
```

Production selftest: open `$B/?x=1#selftest`, wait ~10 s, read `window.__selftest` (expect `OK`).

---

## 12. One-sentence summary

This session took the site from **a studio plus a weak 9-cabinet homage arcade** to **a 16-real-game arcade, a new lounge with a live WebGPU fireplace and an always-on MSL guide channel, and a first visit 44 MB lighter**, with OTTI's flipper eye test, network content, and branch cleanup still waiting on him.
