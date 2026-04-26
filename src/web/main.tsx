import React from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import '../renderer/src/i18n/config'
import App from '../renderer/src/App'
import '../renderer/src/styles/App.css'
import './web.css'
import type { ProjectState } from '../renderer/src/types/story'

type StoredProject = ProjectState

function lsGet<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function lsSet(k: string, v: unknown) {
  localStorage.setItem(k, JSON.stringify(v))
}

const SETTINGS_KEY = 'katha:web:settings'
const STORY_HISTORY_KEY = 'katha:web:story-history'
const STORY_HISTORY_MAX = 80

function nowIso() {
  return new Date().toISOString()
}

function storyHistoryRead(): StoredProject[] {
  const raw = lsGet<{ items?: StoredProject[] } | StoredProject[]>(STORY_HISTORY_KEY, { items: [] })
  if (Array.isArray(raw)) return raw.slice(0, STORY_HISTORY_MAX)
  return (raw.items || []).slice(0, STORY_HISTORY_MAX)
}

function storyHistoryWrite(items: StoredProject[]) {
  lsSet(STORY_HISTORY_KEY, { items: items.slice(0, STORY_HISTORY_MAX) })
}

function ensureBridge() {
  if (window.katha) return
  // In Vercel, we use same-origin serverless functions at /api/*
  // In local dev, you can override with VITE_BACKEND_URL (e.g. http://127.0.0.1:5000)
  const baseUrl = import.meta.env.VITE_BACKEND_URL || ''
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        })
      : null

  async function authHeader(): Promise<Record<string, string>> {
    if (!supabase) return {}
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function fetchHealth() {
    const base = baseUrl.replace(/\/+$/, '')
    const url = base ? `${base}/api/health` : '/api/health'
    const r = await fetch(url, { method: 'GET' })
    if (!r.ok) throw new Error(`Health ${r.status}`)
    return (await r.json()) as {
      ok: boolean
      providers?: { openai?: boolean; gemini?: boolean; deepseek?: boolean; leonardo?: boolean }
    }
  }

  window.katha = {
    authGetSession: async () => {
      if (!supabase) return { user: null }
      const { data } = await supabase.auth.getSession()
      const u = data?.session?.user
      return { user: u ? { id: u.id, email: u.email || undefined } : null }
    },
    authSignInMagicLink: async (payload: any) => {
      if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      const email = String(payload?.email || '').trim()
      if (!email.includes('@')) throw new Error('Enter a valid email.')
      const redirectTo = String(payload?.redirectTo || window.location.origin).trim()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      })
      if (error) throw error
      return true
    },
    authSignOut: async () => {
      if (!supabase) return true
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return true
    },

    // Settings are stored locally in web mode (no secrets are auto-read from disk).
    settingsGetApiKeys: async () => {
      try {
        const h = await fetchHealth()
        const p = h.providers || {}
        return {
          openai: '',
          gemini: '',
          deepseek: '',
          leonardo: '',
          hasOpenAI: Boolean(p.openai),
          hasGemini: Boolean(p.gemini),
          hasDeepSeek: Boolean(p.deepseek),
          hasLeonardo: Boolean(p.leonardo)
        }
      } catch {
        return {
          openai: '',
          gemini: '',
          deepseek: '',
          leonardo: '',
          hasOpenAI: false,
          hasGemini: false,
          hasDeepSeek: false,
          hasLeonardo: false
        }
      }
    },
    settingsSetApiKeys: async () => true,
    settingsGetApiKeysRaw: async () => ({}),
    settingsHasFileKeys: async () => {
      try {
        const h = await fetchHealth()
        const p = h.providers || {}
        return Boolean(p.openai || p.gemini || p.deepseek || p.leonardo)
      } catch {
        return false
      }
    },
    settingsDebugKeyPaths: async () => {
      try {
        const h = await fetchHealth()
        const p = h.providers || {}
        return {
          candidates: [{ path: 'Vercel Environment Variables', exists: true }],
          has: {
            openai: Boolean(p.openai),
            gemini: Boolean(p.gemini),
            deepseek: Boolean(p.deepseek),
            leonardo: Boolean(p.leonardo)
          }
        }
      } catch {
        return {
          candidates: [{ path: 'Vercel Environment Variables', exists: false }],
          has: { openai: false, gemini: false, deepseek: false, leonardo: false }
        }
      }
    },

    projectsList: async () => {
      const base = baseUrl.replace(/\/+$/, '')
      const url = base ? `${base}/api/projects-list` : '/api/projects-list'
      const res = await fetch(url, { method: 'GET', headers: await authHeader() })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      return JSON.parse(text)
    },
    projectsLoad: async (id: string) => {
      const base = baseUrl.replace(/\/+$/, '')
      const url = base ? `${base}/api/projects-get?id=${encodeURIComponent(id)}` : `/api/projects-get?id=${encodeURIComponent(id)}`
      const res = await fetch(url, { method: 'GET', headers: await authHeader() })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      return JSON.parse(text)
    },
    projectsSave: async (project: any) => {
      const base = baseUrl.replace(/\/+$/, '')
      const url = base ? `${base}/api/projects-save` : '/api/projects-save'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ project: { ...project, updatedAt: nowIso() } })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      return true
    },
    projectsDelete: async (id: string) => {
      const base = baseUrl.replace(/\/+$/, '')
      const url = base ? `${base}/api/projects-delete` : '/api/projects-delete'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ id })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      return true
    },

    storyHistoryList: async () => {
      return storyHistoryRead().map((p) => ({
        id: String(p.id),
        title: String(p.title || 'Untitled'),
        status: String(p.status || 'new'),
        updatedAt: String(p.updatedAt || p.createdAt || '')
      }))
    },
    storyHistorySave: async (project: StoredProject) => {
      if (!project?.id) throw new Error('Project id missing')
      const list = storyHistoryRead()
      const next = { ...project, updatedAt: project.updatedAt || nowIso() }
      const rest = list.filter((p) => p.id !== project.id)
      storyHistoryWrite([next, ...rest])
      return true
    },
    storyHistoryLoad: async (id: string) => {
      const p = storyHistoryRead().find((x) => x.id === id)
      if (!p) throw new Error('Story not found in history')
      return p
    },
    storyHistoryDelete: async (id: string) => {
      storyHistoryWrite(storyHistoryRead().filter((p) => p.id !== id))
      return true
    },

    aiComplete: async () => {
      throw new Error('AI complete is not available in web mode yet.')
    },
    leonardoGenerate: async (payload: any) => {
      const base = (payload?.baseUrl || baseUrl).replace(/\/+$/, '')
      const url = base ? `${base}/api/leonardo-generate` : '/api/leonardo-generate'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: payload.prompt,
          width: payload.width,
          height: payload.height,
          seed: payload.seed
        })
      })
      const text = await res.text()
      if (!res.ok) {
        try {
          const j = JSON.parse(text)
          throw new Error(j.error || j.message || text)
        } catch {
          throw new Error(text)
        }
      }
      return JSON.parse(text)
    },

    uiShowContextMenu: async () => {
      // Browser already provides native context menu.
    },
    openExternal: async (url: string) => {
      window.open(url, '_blank', 'noreferrer')
    }
  }

  // Basic web settings persistence (theme etc.) can be added later.
  const s = lsGet<unknown>(SETTINGS_KEY, null)
  if (!s) lsSet(SETTINGS_KEY, {})
}

ensureBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

