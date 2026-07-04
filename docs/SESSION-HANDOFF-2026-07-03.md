# SESSION HANDOFF — OTTI MUSIC SITE — 2026-07-03

_First handoff for this project. No prior handoff to supersede._

---

## 1. 30-second elevator

**OTTI MUSIC SITE** is a single-file 3D web experience titled **"TO BE QUITE HONEST"** — a recreation of Shopify's Black Friday "Watch the World Shop Live" pinball site, reskinned for OTTI (music). It's a three.js + matter.js scene: a **playable neon pinball machine** sitting in a dark retro studio room, with a live-updating **streams/plays/listeners** ticker, a **transaction-arc globe** (real earth geography), moving camera states, and a fully realized desk environment. The **left desk monitor runs OTTI's actual Figma Make "Y2K Desktop OS" app live** — click it and the camera flies in so you can use it.

**State NOW:** Fully working and deployed to GitHub. 3 commits on `main`, all pushed, working tree clean. Everything in this session was verified live before commit. No known broken artifacts.

Everything lives in ONE file: `index.html` (66KB, ~1250 lines) + `assets/`.

---

## 2. State of the codebase at handoff

| Check | State |
|---|---|
| Git HEAD | `1aa4a7b` |
| Remote sync | **SYNCED** (HEAD == origin/main) |
| Working tree | **clean** (0 uncommitted files) |
| Repo | https://github.com/ottiwroteit/otti-music-site (public) |
| `#selftest` | passes (fmt, score, drain, game-over, reset, arc-spawn, tx-updates-counters) |
| Console errors | none (verified this session after every change) |
| Live build (local preview) | `assets/y2k-os/index.html` → 200, `index-*.js` → 200 |
| Preview server | Claude Preview MCP, server name `otti-music-site` → port 4599 (may need restart next session) |
| In-flight agents | none |
| Uncommitted local dirs | `y2k-os-src/` (396MB, **gitignored** — raw Figma export + node_modules) |

---

## 3. What was SHIPPED in this session

**Commits (all pushed to `main`):**
- `c97a4a7` — Bootstrap: the entire 3D pinball site (machine, globe, ticker, room, camera states, attract mode, Higgsfield-generated props, pegboard)
- `c6ca4c1` — Globe flash on a 4s cadence + mirrored speaker on right desk
- `1aa4a7b` — **Y2K Desktop OS runs live on the studio monitor + flipper physics fixes** (this session's headline)

**Live infrastructure:**
- GitHub repo: https://github.com/ottiwroteit/otti-music-site — public, `main` synced
- No Vercel/hosting deploy yet (offered, not done — see §4 P2)

**Verification artifacts (this session):**
- Y2K OS interactivity proven: synthesized a real click on the monitor via the raycast path → camera reached `screen` state → iframe `#screenframe` showed → clicked the app's Start button through `contentDocument` → Start menu opened. All asserted programmatically.
- Flipper fix proven: displaced flipper settles at rest angle 0.286 (target 0.28), 1 crossing (no oscillation), press reaches -0.494, release returns to rest, ball strike velocity -14.9, center drain still open.
- Globe flash proven: fires at 4s boundary, emissive 0.15→0.72→decay, arc spawns, timer resets.

---

## 4. Critical open items (ranked)

**P0 (blocks nothing right now — site is shippable as-is):** none.

**P1 (important, next logical work):**
- **Y2K OS preview vs. real app mismatch.** At wide zoom the monitor shows a *procedural canvas mock* of a Y2K desktop (hand-drawn in `emC`/`em` canvas). The REAL app only appears after you click in. Ideal: replace the procedural preview with an actual screenshot PNG of the running Y2K OS (`assets/y2k-os-preview.png`) so wide-zoom matches what you get on click. Plan already anticipated this (`assets/y2k-os-preview.png`), just not done.
- **Mobile portrait pass on the Y2K screen state.** `screen` camera state has portrait offsets (dist 2.7, fov 62) but was NOT screenshot-verified on mobile this session. Verify the iframe rect glues correctly on a 375px viewport.

**P2 (polish / nice-to-have):**
- **Vercel deploy** for a shareable URL (offered twice, OTTI hasn't said go). One-liner via the deploy-to-vercel skill or `vercel` CLI.
- **Figma re-export workflow.** When OTTI updates the app in Figma Make, the rebuild is manual (export → strip package.json alias keys → `base:'./'` → build → copy dist). Could be scripted as `scripts/rebuild-y2k.sh`.
- **Preview PNG for the pegboard/props** are already real (Higgsfield). No action.

**Founder decisions waiting on OTTI:**
1. Deploy to Vercel now, or keep GitHub-only? (P2)
2. Want the wide-zoom monitor preview replaced with a real screenshot of the Y2K OS? (P1)
3. Any more scene edits, or is the scene "locked"?

---

## 5. Specific in-flight artifacts

- `y2k-os-src/` — the raw Figma Make export (unzipped, `npm install`ed, built). **Gitignored, 396MB.** Kept locally so re-export/rebuild is possible. NOT in the repo. If this machine is wiped, re-export from Figma Make (see §7/§9).
- `~/Downloads/Y2K Desktop OS.zip` — the original export zip (may still be there; `(1)` duplicate was deleted).
- No uncommitted code. No branches other than `main`. No open PRs.

---

## 6. New skills + integrations introduced this session

- **claude-in-chrome** browser takeover — used to drive OTTI's Chrome to Figma Make and click "Download code." Pattern: `<>` code view → Files panel → download ⬇ icon.
- **Higgsfield MCP** (`generate_image` → `generate_3d`) — used in prior turns for the 6 music props + pegboard texture (already committed).
- **Figma Make export → self-host pipeline** — the reusable recipe (see §7 landmines) for getting a functional Make app onto a same-origin iframe.
- Debug hooks added to `index.html` for headless verification: `window.__step()` (manual frame driver), `window._setCam`, `window._dbg`, `window._globeDbg`, `window._camera`, `window._emScreen`, `window.__inScreen`. These are tiny and intentionally shipped (used for MCP-preview verification).

---

## 7. What the next agent should NOT do

- **Do NOT `git rm` or commit `y2k-os-src/`** — it's 396MB and gitignored on purpose. Only `assets/y2k-os/` (the built dist) belongs in git.
- **Do NOT try to iframe the `figma.site` published URL.** Figma sets `frame-ancestors 'self'` / `X-Frame-Options: sameorigin` — cross-origin embedding is BLOCKED. The only path is export → self-host (already done).
- **Do NOT re-add attract-mode flipper AI.** OTTI explicitly rejected auto-moving flippers twice. Flippers move ONLY on user input. Attract mode auto-launches/respawns the ball only.
- **Do NOT run `driveFlipper()` once per frame outside the substep loop.** It MUST run inside the physics substep loop (once per `Engine.update`), or the spring velocity double-applies on slow frames and flippers flap on their own. (Fixed this session — don't regress.)
- **Do NOT let flippers collide with scenery.** They use collision `category:0x0004, mask:0x0002` (ball only). If you touch flipper bodies, preserve this or they rest on the inlane posts and never reach rest angle.
- **Do NOT put a `$` on the ticker.** OTTI was explicit: it tracks streams/plays, not money. No dollar signs anywhere.
- **Do NOT brighten the globe ocean past ~(205,204,198)** — it blows out under bloom. Same for the Y2K monitor screen material (`color.setScalar(0.72)`).
- **Do NOT change the locked copy:** hero = "TO BE QUITE HONEST", tagline = "WATCH THE WORLD WE LIVE IN" (WE, not YOU), CTA = "EARLY ACCESS". Neon sign above the machine is the OTTI logo image, not text.
- **The site must stay a 3D scene**, not a flat scrolling page. OTTI hard-rejected a flat version early.

---

## 8. Recommended next-session plan

**Most leveraged first move:** ask OTTI the 3 founder decisions in §4, then:

1. If OTTI wants wide-zoom fidelity (P1): capture a screenshot of the running Y2K OS (already can be done via the preview or the localhost build), save as `assets/y2k-os-preview.png`, swap the procedural `emTex` canvas for a texture-load of that PNG (dim to ~0.72). One focused edit.
2. If OTTI wants a shareable link (P2): deploy to Vercel via the deploy-to-vercel skill. The site is static (`index.html` + `assets/`), so it's a zero-config static deploy.
3. If OTTI has more scene edits: they go in `index.html`, verify via Claude Preview MCP (`preview_start` name `otti-music-site`), screenshot, then commit + push.

Every scene change follows the same loop: edit `index.html` → `preview_eval` reload with cache-bust → `preview_screenshot` → check console → commit + push.

---

## 9. Critical paths to know

**Project root:** `/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE/`

| Path | What |
|---|---|
| `index.html` | THE whole site (three.js module + matter.js + all logic). 66KB. |
| `assets/y2k-os/` | Built Figma Make app (committed). Iframed by the monitor. |
| `assets/y2k-os/index.html` | Entry the `#screenframe` iframe loads. Relative asset paths (`./assets/...`). |
| `assets/props/*.glb` | 5 Higgsfield music props (cassette, headphones, mic, pedal, speaker). |
| `assets/earth_spec.jpg` | three.js land/ocean mask, recolored in-canvas for the globe. |
| `assets/pegboard.png` | Higgsfield music-studio pegboard texture. |
| `Otti Transparent.png` | OTTI logo, tinted green on canvas for the neon sign. |
| `y2k-os-src/` | Raw Figma export (gitignored, 396MB, local only). |
| `docs/SESSION-HANDOFF-2026-07-03.md` | THIS FILE. |
| `ScreenRecording_06-14-2026 22-00-51_1.mov` | The Shopify reference video (gitignored, 43MB). |

**Memory:** `/Users/otti/.claude/projects/-Users-otti-Documents-otti-coded-team-WEB-DEV-OTTI-MUSIC-SITE/memory/otti-music-site-project.md` — full project context, updated this session.

**URLs:** https://github.com/ottiwroteit/otti-music-site · local preview http://localhost:4599

**Debug URL fragments:** `#selftest` (runs assertions, logs SELFTEST OK), `#nobloom` (no-post baseline).

---

## 10. Standing OTTI rules (append-only)

- Commit + push regularly. Feature branches for PRs normally, but this repo was bootstrapped direct-to-main and OTTI approves direct commits here for now.
- After every code-review run, emit a chat status block (SCORE X/5, findings) — OTTI doesn't want to leave Cade to read PR status.
- No guessing APIs/versions/paths — verify by reading code/docs/running it.
- No emojis or em-dashes in output. No sycophantic openers/closers.
- Verify sub-agent + tool claims before reporting as wins (curl/stat/eval).
- API keys go straight to `.env`, never echoed in chat.
- **This project specifically:** stays a 3D scene; streams not money (no `$`); flippers user-input-only; locked copy (§7); globe/screen brightness under the bloom knee; the reference is the Shopify BFCM pinball site in the .mov.
- Higgsfield MCP is the chosen path for generated 3D/image assets (CLI isn't authed; use the MCP tools).
- Figma Make apps: export the code (don't plugin-convert, don't iframe figma.site).

---

## 11. Quick sanity-check commands

```bash
cd "/Users/otti/Documents/otti-coded-team/WEB DEV/OTTI MUSIC SITE"

# baseline: clean tree, synced with remote
git status --short                      # expect: empty
git log --oneline -3                    # expect top: 1aa4a7b
[ "$(git rev-parse HEAD)" = "$(git ls-remote origin -h refs/heads/main | awk '{print $1}')" ] && echo SYNCED || echo DRIFT

# the built Y2K app is present and self-hosts with relative paths
grep -q './assets' assets/y2k-os/index.html && echo "relative paths OK"
ls assets/y2k-os/assets/               # expect index-*.js, index-*.css, 2 pngs

# raw export still local (gitignored)
ls -d y2k-os-src && git check-ignore y2k-os-src   # expect: y2k-os-src listed as ignored
```

Then in Claude Preview MCP: `preview_start` name `otti-music-site` → reload cache-busted → `preview_screenshot`. Click the earth-horizon (left) monitor → camera flies in → Y2K OS is interactive. Wheel/ESC/Go Back exits.

---

## 12. One-sentence summary

This session moved OTTI MUSIC SITE from a polished-but-static 3D pinball scene to a **live, interactive experience** — the desk monitor now runs OTTI's real Figma Make Y2K Desktop OS on click, the globe flashes on a deliberate 4s cadence, and two flipper physics regressions (self-flapping) are fixed — all committed and pushed to `main`.
