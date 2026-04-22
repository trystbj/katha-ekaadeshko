import React from 'react'
import ReactDOM from 'react-dom/client'
import '../renderer/src/i18n/config'
import App from '../renderer/src/App'
import '../renderer/src/styles/App.css'
import './web.css'

type StoredProject = any

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

const PROJECTS_KEY = 'katha:web:projects'
const SETTINGS_KEY = 'katha:web:settings'

function nowIso() {
  return new Date().toISOString()
}

function ensureBridge() {
  if ((window as any).katha) return
  // In Vercel, we use same-origin serverless functions at /api/*
  // In local dev, you can override with VITE_BACKEND_URL (e.g. http://127.0.0.1:5000)
  const baseUrl = import.meta.env.VITE_BACKEND_URL || ''

  ;(window as any).katha = {
    // Settings are stored locally in web mode (no secrets are auto-read from disk).
    settingsGetApiKeys: async () => ({
      openai: '',
      gemini: '',
      deepseek: '',
      leonardo: '',
      hasOpenAI: false,
      hasGemini: false,
      hasDeepSeek: false,
      hasLeonardo: false
    }),
    settingsSetApiKeys: async () => true,
    settingsGetApiKeysRaw: async () => ({}),
    settingsHasFileKeys: async () => false,
    settingsDebugKeyPaths: async () => ({ candidates: [], has: { openai: false, gemini: false, deepseek: false, leonardo: false } }),

    projectsList: async () => {
      const m = lsGet<Record<string, StoredProject>>(PROJECTS_KEY, {})
      return Object.keys(m)
        .map((id) => {
          const p = m[id] || {}
          return { id, title: p.title || 'Untitled', status: p.status || 'new', updatedAt: p.updatedAt || '' }
        })
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    },
    projectsLoad: async (id: string) => {
      const m = lsGet<Record<string, StoredProject>>(PROJECTS_KEY, {})
      return m[id]
    },
    projectsSave: async (project: any) => {
      const m = lsGet<Record<string, StoredProject>>(PROJECTS_KEY, {})
      const id = project?.id || `p_${Math.random().toString(16).slice(2)}`
      m[id] = { ...project, id, updatedAt: nowIso() }
      lsSet(PROJECTS_KEY, m)
      return true
    },
    projectsDelete: async (id: string) => {
      const m = lsGet<Record<string, StoredProject>>(PROJECTS_KEY, {})
      delete m[id]
      lsSet(PROJECTS_KEY, m)
      return true
    },

    aiComplete: async () => {
      throw new Error('AI complete is not available in web mode yet.')
    },
    leonardoGenerate: async () => {
      throw new Error('Leonardo image generation is not available in web mode yet.')
    },

    backendGenerateKatha: async (payload: any) => {
      const base = (payload?.baseUrl || baseUrl).replace(/\/+$/, '')
      const url = base ? `${base}/api/generate-katha` : '/api/generate-katha'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: payload.theme,
          country: payload.country,
          genre: payload.genre,
          length: payload.length
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
  const s = lsGet<any>(SETTINGS_KEY, null)
  if (!s) lsSet(SETTINGS_KEY, {})
}

ensureBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

