import { spawn } from 'child_process'
import { app } from 'electron'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { appendFileSync } from 'fs'

let backendProc: ReturnType<typeof spawn> | null = null
let backendPort: number | null = null

function backendDir(): string {
  // In production, backend is shipped as an extraResource at resources/backend
  if (app.isPackaged) {
    return join(process.resourcesPath, 'backend')
  }
  // In dev, app.getAppPath() may be `out/main` — try a few safe candidates.
  const candidates = [
    join(process.cwd(), 'backend'),
    join(app.getAppPath(), 'backend'),
    join(resolve(__dirname, '../../..'), 'backend')
  ]
  for (const p of candidates) {
    if (existsSync(join(p, 'server.js'))) return p
  }
  // Fallback to CWD; error will surface when spawn fails.
  return candidates[0]
}

export function startBackend(port: number): void {
  if (backendProc) return
  const dir = backendDir()
  // In packaged apps we don't ship a separate Node binary.
  // Use Electron as Node to run the backend without relaunching the UI.
  const nodeLike = process.execPath
  const logPath = join(app.getPath('userData'), 'backend.log')
  backendPort = port
  backendProc = spawn(nodeLike, ['server.js'], {
    cwd: dir,
    env: {
      ...process.env,
      PORT: String(port),
      ELECTRON_RUN_AS_NODE: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })
  backendProc.stdout?.on('data', (b) => appendFileSync(logPath, b))
  backendProc.stderr?.on('data', (b) => appendFileSync(logPath, b))
  backendProc.on('error', (e) => {
    appendFileSync(logPath, `[katha-backend] spawn error: ${String(e)}\n`)
  })
  backendProc.on('exit', (code, signal) => {
    appendFileSync(logPath, `[katha-backend] exit code=${code ?? 'null'} signal=${signal ?? 'null'}\n`)
    backendProc = null
    backendPort = null
  })
}

export function stopBackend(): void {
  if (!backendProc) return
  backendProc.kill()
  backendProc = null
  backendPort = null
}

export function currentBackendPort(): number | null {
  return backendPort
}

