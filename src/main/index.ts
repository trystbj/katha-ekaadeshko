import { app, BrowserWindow, Menu, clipboard, ipcMain, shell } from 'electron'
import { dirname, join, resolve } from 'path'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile, readdir, unlink } from 'fs/promises'
import Store from 'electron-store'
import { aiComplete } from './ai/router'
import { leonardoGenerateImage } from './ai/leonardo'
import { currentBackendPort, startBackend } from './backend/server'
import { stopBackend } from './backend/server'
import net from 'node:net'

const store = new Store<{ apiKeys: ApiKeysState }>({
  name: 'katha-settings',
  defaults: { apiKeys: {} }
})

let mainWindow: BrowserWindow | null = null
let backendBaseUrl: string | null = null

async function pickFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const s = net.createServer()
    s.on('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      s.close(() => {
        if (typeof addr === 'object' && addr && 'port' in addr) resolve(addr.port)
        else reject(new Error('Could not determine free port'))
      })
    })
  })
}

async function ensureBackendRunning(): Promise<string> {
  // Prefer existing env override (advanced users), else use a managed loopback server.
  if (process.env['KATHA_BACKEND_URL']) {
    backendBaseUrl = process.env['KATHA_BACKEND_URL']
    return backendBaseUrl
  }
  if (backendBaseUrl) return backendBaseUrl
  const port = await pickFreePort()
  backendBaseUrl = `http://127.0.0.1:${port}`
  startBackend(port)
  return backendBaseUrl
}

type ApiKeysState = {
  openai?: string
  gemini?: string
  deepseek?: string
  leonardo?: string
}

function parseEnvLike(content: string): ApiKeysState {
  const out: ApiKeysState = {}
  // Strip UTF-8 BOM if present
  const cleaned = content.replace(/^\uFEFF/, '')
  for (const rawLine of cleaned.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.toLowerCase().startsWith('export ')) line = line.slice(7).trim()
    const idx = line.indexOf('=')
    if (idx < 0) continue
    const k = line.slice(0, idx).trim().toUpperCase()
    const v = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1')
    if (!v) continue
    if (k === 'OPENAI_API_KEY') out.openai = v
    if (k === 'GEMINI_API_KEY') out.gemini = v
    if (k === 'DEEPSEEK_API_KEY') out.deepseek = v
    if (k === 'LEONARDO_API_KEY') out.leonardo = v
  }
  return out
}

function fileKeyCandidates(): string[] {
  // Prefer a file next to where the user launches the app in dev.
  const cwd = process.cwd()
  // npm sets INIT_CWD to the directory where the command was started.
  const initCwd = process.env['INIT_CWD'] || ''
  // app.getAppPath() points to the packaged app resources root; in dev it can vary.
  const appPath = app.getAppPath()
  const exeDir = dirname(process.execPath)
  // __dirname is usually .../out/main (dev+prod). Walk up to project/app root.
  const projectRootGuess = resolve(__dirname, '../../..')
  const userData = app.getPath('userData')
  return [
    join(cwd, 'api-keys.local.env'),
    ...(initCwd ? [join(initCwd, 'api-keys.local.env')] : []),
    join(appPath, 'api-keys.local.env'),
    join(projectRootGuess, 'api-keys.local.env'),
    join(exeDir, 'api-keys.local.env'),
    join(userData, 'api-keys.local.env')
  ]
}

async function loadFileKeys(): Promise<ApiKeysState> {
  for (const p of fileKeyCandidates()) {
    try {
      if (!existsSync(p)) continue
      // Handle UTF-8 / UTF-16LE files safely
      const buf = await readFile(p)
      const isUtf16Le =
        buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || buf.includes(0x00))
      const raw = isUtf16Le ? buf.toString('utf16le') : buf.toString('utf8')
      const parsed = parseEnvLike(raw)
      if (parsed.openai || parsed.gemini || parsed.deepseek || parsed.leonardo) return parsed
    } catch {
      // ignore
    }
  }
  return {}
}

async function resolvedKeys(): Promise<ApiKeysState> {
  const storeKeys = store.get('apiKeys')
  const fileKeys = await loadFileKeys()
  // File keys override store keys (user explicitly wants file-driven secrets).
  return { ...storeKeys, ...fileKeys }
}

async function applyKeysToProcessEnv(): Promise<void> {
  const keys = await resolvedKeys()
  if (keys.openai) process.env.OPENAI_API_KEY = keys.openai
  if (keys.gemini) process.env.GEMINI_API_KEY = keys.gemini
  if (keys.deepseek) process.env.DEEPSEEK_API_KEY = keys.deepseek
  if (keys.leonardo) process.env.LEONARDO_API_KEY = keys.leonardo
}

function projectsDir(): string {
  return join(app.getPath('userData'), 'projects')
}

async function ensureProjectsDir(): Promise<void> {
  await mkdir(projectsDir(), { recursive: true })
}

function preloadPath(): string {
  const mjs = join(__dirname, '../preload/index.mjs')
  const js = join(__dirname, '../preload/index.js')
  return existsSync(mjs) ? mjs : js
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'कथा एकादेशको',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await ensureProjectsDir()
  await applyKeysToProcessEnv()
  // Allow copy/paste via keyboard shortcuts everywhere.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      }
    ])
  )
  // Ensure the local backend is running for one-click "Generate".
  // In dev, you can still opt out by setting KATHA_START_BACKEND=0.
  const shouldStartBackend = app.isPackaged ? true : process.env['KATHA_START_BACKEND'] !== '0'
  if (shouldStartBackend) await ensureBackendRunning()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.handle(
  'ui:showContextMenu',
  async (event, payload: { selectionText?: string; isEditable: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const selectionText = (payload.selectionText || '').trim()
    const hasSelection = selectionText.length > 0
    const canPaste = payload.isEditable && clipboard.readText().length > 0
    const template = [
      ...(payload.isEditable
        ? [
            { role: 'cut', enabled: hasSelection },
            { role: 'copy', enabled: hasSelection },
            { role: 'paste', enabled: canPaste }
          ]
        : [{ role: 'copy', enabled: hasSelection }]),
      { type: 'separator' },
      { role: 'selectAll' }
    ] as any
    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  }
)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopBackend()
})

ipcMain.handle('settings:getApiKeys', async () => {
  // Never reveal key masks to the renderer; only connection booleans.
  const k = await resolvedKeys()
  return {
    openai: '',
    gemini: '',
    deepseek: '',
    leonardo: '',
    hasOpenAI: Boolean(k.openai),
    hasGemini: Boolean(k.gemini),
    hasDeepSeek: Boolean(k.deepseek),
    hasLeonardo: Boolean(k.leonardo)
  }
})

ipcMain.handle(
  'settings:setApiKeys',
  (_e, partial: { openai?: string; gemini?: string; deepseek?: string; leonardo?: string }) => {
    const cur = store.get('apiKeys')
    const next = { ...cur }
    if (partial.openai !== undefined) {
      if (partial.openai === '') delete next.openai
      else if (!partial.openai.startsWith('••')) next.openai = partial.openai
    }
    if (partial.gemini !== undefined) {
      if (partial.gemini === '') delete next.gemini
      else if (!partial.gemini.startsWith('••')) next.gemini = partial.gemini
    }
    if (partial.deepseek !== undefined) {
      if (partial.deepseek === '') delete next.deepseek
      else if (!partial.deepseek.startsWith('••')) next.deepseek = partial.deepseek
    }
    if (partial.leonardo !== undefined) {
      if (partial.leonardo === '') delete next.leonardo
      else if (!partial.leonardo.startsWith('••')) next.leonardo = partial.leonardo
    }
    store.set('apiKeys', next)
    return true
  }
)

ipcMain.handle('settings:getApiKeysRaw', () => store.get('apiKeys'))

ipcMain.handle('settings:hasFileKeys', async () => {
  const fk = await loadFileKeys()
  return Boolean(fk.openai || fk.gemini || fk.deepseek || fk.leonardo)
})

ipcMain.handle('settings:debugKeyPaths', async () => {
  const candidates = fileKeyCandidates()
  const results: { path: string; exists: boolean }[] = candidates.map((p) => ({
    path: p,
    exists: existsSync(p)
  }))
  const fk = await loadFileKeys()
  return {
    candidates: results,
    has: {
      openai: Boolean(fk.openai),
      gemini: Boolean(fk.gemini),
      deepseek: Boolean(fk.deepseek),
      leonardo: Boolean(fk.leonardo)
    }
  }
})

ipcMain.handle('projects:list', async () => {
  await ensureProjectsDir()
  const names = await readdir(projectsDir())
  const jsonFiles = names.filter((n) => n.endsWith('.json'))
  const meta: { id: string; title: string; status: string; updatedAt: string }[] = []
  for (const f of jsonFiles) {
    try {
      const raw = await readFile(join(projectsDir(), f), 'utf-8')
      const p = JSON.parse(raw) as { id: string; title: string; status: string; updatedAt: string }
      meta.push({
        id: p.id || f.replace('.json', ''),
        title: p.title || 'Untitled',
        status: p.status || 'new',
        updatedAt: p.updatedAt || ''
      })
    } catch {
      /* skip */
    }
  }
  meta.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return meta
})

ipcMain.handle('projects:load', async (_e, id: string) => {
  const path = join(projectsDir(), `${id}.json`)
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw)
})

ipcMain.handle('projects:save', async (_e, project: unknown) => {
  await ensureProjectsDir()
  const p = project as { id: string }
  const path = join(projectsDir(), `${p.id}.json`)
  await writeFile(path, JSON.stringify(project, null, 2), 'utf-8')
  return true
})

ipcMain.handle('projects:delete', async (_e, id: string) => {
  await unlink(join(projectsDir(), `${id}.json`))
  return true
})

ipcMain.handle(
  'ai:complete',
  async (
    _e,
    payload: {
      system: string
      user: string
      preferProvider?: 'openai' | 'gemini' | 'deepseek'
      maxTokens?: number
    }
  ) => {
    const keys = await resolvedKeys()
    const hasAny = Boolean(keys.openai || keys.gemini || keys.deepseek)
    if (!hasAny) {
      // Build a safe diagnostic message (no secret values)
      const candidates = fileKeyCandidates()
      const exists = candidates.map((p) => `${existsSync(p) ? '✓' : '✗'} ${p}`).join('\n')
      throw new Error(
        `No AI provider available.\n` +
          `Expected at least one of OPENAI_API_KEY / GEMINI_API_KEY / DEEPSEEK_API_KEY.\n` +
          `Checked for api-keys.local.env at:\n${exists}\n` +
          `Tip: ensure the file is UTF-8 (not UTF-16) and uses KEY=value.`
      )
    }
    return aiComplete(keys, payload)
  }
)

ipcMain.handle(
  'leonardo:generate',
  async (
    _e,
    payload: {
      prompt: string
      modelId?: string
      width?: number
      height?: number
      seed?: number
    }
  ) => {
    const key = (await resolvedKeys()).leonardo
    if (!key) throw new Error('Leonardo API key not set')
    return leonardoGenerateImage(key, payload)
  }
)

ipcMain.handle('shell:openExternal', async (_e, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle(
  'backend:generateKatha',
  async (
    _e,
    payload: { theme: string; country: string; genre: string; length: string; baseUrl?: string }
  ) => {
    await applyKeysToProcessEnv()
    const baseUrl = payload.baseUrl || (await ensureBackendRunning())
    const base = baseUrl.replace(/\/+$/, '')

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const tryHealth = async () => {
      try {
        const r = await fetch(`${base}/health`, { method: 'GET' })
        return r.ok
      } catch {
        return false
      }
    }

    // If the backend isn't ready yet, start it and retry briefly.
    if (!(await tryHealth())) {
      // Backend may have crashed or port was in use; pick a fresh port and restart.
      backendBaseUrl = null
      const fresh = payload.baseUrl || (await ensureBackendRunning())
      const freshBase = fresh.replace(/\/+$/, '')
      // allow cold start time (especially after install)
      for (const ms of [250, 500, 1000, 1500, 2500]) {
        await wait(ms)
        try {
          const r = await fetch(`${freshBase}/health`, { method: 'GET' })
          if (r.ok) break
        } catch {
          // keep trying
        }
      }
    }

    let res: Response
    try {
      res = await fetch(`${base}/api/generate-katha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: payload.theme,
          country: payload.country,
          genre: payload.genre,
          length: payload.length
        })
      })
    } catch (e) {
      const port = currentBackendPort()
      const hint =
        `Backend not reachable (${base}).\n` +
        `- If another app uses the port, this build will auto-pick a new one.\n` +
        `- Check backend log: ${join(app.getPath('userData'), 'backend.log')}\n` +
        (port ? `- Current backend port: ${port}\n` : '')
      throw new Error(`${e instanceof Error ? e.message : String(e)}\n\n${hint}`)
    }
    const text = await res.text()
    if (!res.ok) {
      try {
        const j = JSON.parse(text) as { error?: string; message?: string }
        throw new Error(j.error || j.message || text)
      } catch {
        throw new Error(text)
      }
    }
    return JSON.parse(text)
  }
)
