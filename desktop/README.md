# Katha Ekadeshko — Desktop (Tauri 2)

Hybrid desktop build wrapping the **same** web UI from `web-dist/` (produced by root `npm run build`).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) stable
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (Windows / macOS / Linux)

Install Tauri CLI (one-time):

```bash
cargo install tauri-cli --version "^2"
```

## Development

From repository root:

```bash
npm install
npm run desktop:dev
```

This runs `npm run web:dev` (Vite on port 4173) and opens the native window pointed at the dev URL.

## Production desktop build

```bash
npm install
npm run build
npm run desktop:build
```

Installers appear under `desktop/src-tauri/target/release/bundle/`.

## Configuration

- `desktop/src-tauri/tauri.conf.json` — app id `com.katha.ekadeshko.studio`, `frontendDist`: `../../web-dist`
- Rust commands: `desktop_ping` (health check); persistence module reserved for local project files

## Web vs desktop

| Feature | Web (Vercel) | Desktop (Tauri) |
|---------|----------------|-----------------|
| UI | Same React app | Same bundle |
| AI generate | Cloud APIs | Cloud APIs (online) |
| Render worker | Local FFmpeg recommended | Local FFmpeg + filesystem |
| Project save | Cloud + workspace slots | Slots + future local FS adapter |
| Social publish | Composer + clipboard | Same |

See [`docs/TAURI_DESKTOP.md`](../docs/TAURI_DESKTOP.md) for full setup.
