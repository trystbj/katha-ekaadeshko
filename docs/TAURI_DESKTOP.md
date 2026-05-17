# Tauri Desktop Setup

Katha Ekadeshko ships as a **hybrid**: one React codebase, two shells (browser + Tauri).

## Architecture

```
npm run build  →  web-dist/
                      ↑
desktop/src-tauri  →  WebView loads web-dist (prod) or localhost:4173 (dev)
```

Core cinematic, AI, and renderer code is **unchanged** between targets. Desktop adds:

- Native window and filesystem APIs (Rust side, extensible)
- Local render worker proximity (lower latency exports)
- Offline-friendly workspace slots (browser localStorage today; SQLite path reserved in `persistence.rs`)

## Commands (from repo root)

| Command | Purpose |
|---------|---------|
| `npm run desktop:dev` | Dev window + Vite |
| `npm run desktop:build` | Release bundles (MSI/DMG/AppImage per OS) |
| `npm run verify` | Pre-release web checks |

## Platform targets

Tauri `bundle.targets: all` produces:

- **Windows** — `.msi` / `.exe`
- **macOS** — `.dmg` / `.app`
- **Linux** — `.deb` / `.AppImage`

Code signing and notarization are project-specific — configure in Apple/Microsoft tooling outside this repo.

## Security

Production `tauri.conf.json` sets a restrictive CSP for the WebView. API calls still require network access to your Vercel backend when using cloud generation.

## Updating the desktop app

1. Bump `version` in `desktop/src-tauri/tauri.conf.json` and `Cargo.toml`.
2. Run `npm run build` then `npm run desktop:build`.
3. Distribute new installers; project data in workspace slots remains compatible.

## Future hooks

- `desktop/src-tauri/src/persistence.rs` — local project directory
- `commands.rs` — extend beyond `desktop_ping` for file pickers, render queue IPC
- Shared `core/render` adapter for native FFmpeg queue

Do not fork the React app for desktop — extend Rust commands and bridge via `window.katha` when needed.
