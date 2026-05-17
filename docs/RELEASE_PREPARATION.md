# Release Preparation — v1.0 (May 2026)

Final audit for public production release (web + Tauri desktop).

## Verification (automated)

| Check | Command | Status |
|-------|---------|--------|
| TypeScript | `npm run typecheck` | Pass |
| Lint + i18n | `npm run lint` | Pass |
| Production build | `npm run build` → `web-dist/` | Pass |
| All-in-one | `npm run verify` | Recommended before tag |

## Code health

| Area | Finding |
|------|---------|
| `console.*` in `src/` | 3 sites — i18n guardrails only |
| TODO/FIXME in product code | None |
| Duplicate web shells | Removed in prior audit; canonical entry `web/` |
| Orphan `src/web` shells | Removed; bridge at `src/web/kathaWebBridge.ts` |
| Dependencies | Lean runtime set; `vercel` CLI is dev-only |

## Systems preserved (unchanged)

- Scene orchestration pipeline (`buildSceneOrchestratedPlan`)
- Cinematic director v2–v4, evolution, timeline sync
- Creator studio, live production, social publishing layers
- Provider abstraction (TTS, render, Leonardo slots)
- Five workspace slots + cloud project sync

## Release deliverables

1. **User guide** — expanded Help Center (`userGuideSections.ts`): web/desktop, account/worker, social, creator, live production.
2. **Docs** — `DEPLOYMENT.md`, `TAURI_DESKTOP.md`, `TROUBLESHOOTING.md`, this file.
3. **Desktop** — Tauri id `com.katha.ekadeshko.studio`, v1.0.0, CSP hardened, npm scripts `desktop:dev` / `desktop:build`.
4. **Stability** — `repairProjectOnLoad` on cloud project fetch.
5. **UI stamp** — build badge `3.0`.

## Manual QA checklist

- [ ] Generate story (bible + episode)
- [ ] Scene stills / Leonardo when keyed
- [ ] Narration + subtitles in player
- [ ] Render queue + worker completion
- [ ] Post-export workspace + Creator studio edits
- [ ] Live preview revision after co-pilot
- [ ] Social publish flow (connect + composer)
- [ ] Workspace slot switch + autosave
- [ ] Cloud sign-in + project load
- [ ] `npm run desktop:dev` opens window (optional)
- [ ] Responsive layout at 1280px and 1920px widths

## Known limitations (documented, not blockers)

- Direct social upload uses platform composer + clipboard until OAuth APIs are configured.
- Desktop local SQLite persistence is scaffolded in Rust; browser workspace slots are primary today.
- Burned-in subtitle export depends on worker/FFmpeg path.

## Post-release

- Tag `v1.0.0` after QA sign-off.
- Publish Vercel production + attach desktop installers to GitHub Releases when built.
