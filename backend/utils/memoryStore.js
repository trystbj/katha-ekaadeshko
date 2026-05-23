import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname } from 'path'

let memoryCache = null

const EMPTY_MEMORY = () => ({
  fingerprints: [],
  signatures: [],
  recent: []
})

function pathFromEnv() {
  return process.env.MEMORY_PATH || './data/memory.json'
}

function isServerless() {
  // Vercel (and most serverless) has ephemeral FS; keep memory in-process.
  return process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1'
}

export async function ensureMemoryStore() {
  if (isServerless()) {
    if (!memoryCache) memoryCache = EMPTY_MEMORY()
    return
  }
  const path = pathFromEnv()
  try {
    await mkdir(dirname(path), { recursive: true })
  } catch {
    /* ignore */
  }
  try {
    await readFile(path, 'utf8')
  } catch {
    try {
      await writeFile(path, JSON.stringify(EMPTY_MEMORY(), null, 2), 'utf8')
    } catch {
      memoryCache = EMPTY_MEMORY()
    }
  }
}

export async function getMemoryStore() {
  if (memoryCache) return memoryCache
  if (isServerless()) {
    memoryCache = EMPTY_MEMORY()
    return memoryCache
  }
  await ensureMemoryStore()
  const path = pathFromEnv()
  try {
    const raw = await readFile(path, 'utf8')
    memoryCache = JSON.parse(raw)
    if (!memoryCache || typeof memoryCache !== 'object') memoryCache = EMPTY_MEMORY()
    return memoryCache
  } catch (e) {
    console.warn('[katha:memory]', 'memory_store_fallback', {
      message: e instanceof Error ? e.message : String(e)
    })
    memoryCache = EMPTY_MEMORY()
    return memoryCache
  }
}

export function summarizeMemory(memory) {
  const recent = Array.isArray(memory?.recent) ? memory.recent.slice(-12) : []
  if (recent.length === 0) return '(empty)'
  return recent
    .map((r) => `- ${r.country} | ${r.theme} | ${r.genre} | fp=${String(r.fp).slice(0, 10)}`)
    .join('\n')
}

export async function recordFingerprint(fp, meta) {
  const mem = await getMemoryStore()
  const item = {
    fp,
    ...meta,
    at: new Date().toISOString()
  }
  mem.fingerprints = Array.isArray(mem.fingerprints) ? mem.fingerprints : []
  mem.signatures = Array.isArray(mem.signatures) ? mem.signatures : []
  mem.recent = Array.isArray(mem.recent) ? mem.recent : []
  mem.fingerprints.push(fp)
  mem.recent.push(item)
  mem.fingerprints = mem.fingerprints.slice(-250)
  mem.signatures = mem.signatures.slice(-120)
  mem.recent = mem.recent.slice(-250)
  if (!isServerless()) {
    try {
      const path = pathFromEnv()
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify(mem, null, 2), 'utf8')
    } catch (e) {
      console.warn('[katha:memory]', 'record_fingerprint_disk_skip', {
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }
  memoryCache = mem
}

export async function shouldRejectAsRepetitive(fp) {
  const mem = await getMemoryStore()
  const prev = Array.isArray(mem?.fingerprints) ? mem.fingerprints.slice(-80) : []
  // Simple guard: exact fingerprint seen recently.
  return prev.includes(fp)
}

export async function recordSignature(sig, meta) {
  const mem = await getMemoryStore()
  mem.signatures = Array.isArray(mem.signatures) ? mem.signatures : []
  mem.signatures.push({
    sig,
    ...meta,
    at: new Date().toISOString()
  })
  mem.signatures = mem.signatures.slice(-120)
  if (!isServerless()) {
    try {
      const path = pathFromEnv()
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify(mem, null, 2), 'utf8')
    } catch (e) {
      console.warn('[katha:memory]', 'record_signature_disk_skip', {
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }
  memoryCache = mem
}

export async function recentSignatures() {
  const mem = await getMemoryStore()
  return Array.isArray(mem?.signatures) ? mem.signatures.slice(-60) : []
}
