/// <reference types="vite/client" />

import type { ProjectState } from './types/story'

export type ApiKeyMask = {
  openai: string
  gemini: string
  deepseek: string
  leonardo: string
  hasOpenAI: boolean
  hasGemini: boolean
  hasDeepSeek: boolean
  hasLeonardo: boolean
}

export type KathaAPI = {
  authGetSession: () => Promise<{ user: { id: string; email?: string } | null }>
  authSignInMagicLink: (payload: { email: string; redirectTo?: string }) => Promise<boolean>
  authSignOut: () => Promise<boolean>
  settingsGetApiKeys: () => Promise<ApiKeyMask>
  settingsSetApiKeys: (p: {
    openai?: string
    gemini?: string
    deepseek?: string
    leonardo?: string
  }) => Promise<boolean>
  settingsGetApiKeysRaw: () => Promise<{
    openai?: string
    gemini?: string
    deepseek?: string
    leonardo?: string
  }>
  settingsHasFileKeys: () => Promise<boolean>
  settingsDebugKeyPaths: () => Promise<{
    candidates: { path: string; exists: boolean }[]
    has: { openai: boolean; gemini: boolean; deepseek: boolean; leonardo: boolean }
  }>
  projectsList: () => Promise<{ id: string; title: string; status: string; updatedAt: string }[]>
  projectsLoad: (id: string) => Promise<ProjectState>
  projectsSave: (project: ProjectState) => Promise<boolean>
  projectsDelete: (id: string) => Promise<boolean>
  /** Local device story history (browser localStorage on web). */
  storyHistoryList?: () => Promise<{ id: string; title: string; status: string; updatedAt: string }[]>
  storyHistorySave?: (project: ProjectState) => Promise<boolean>
  storyHistoryLoad?: (id: string) => Promise<ProjectState>
  storyHistoryDelete?: (id: string) => Promise<boolean>
  aiComplete: (payload: {
    system: string
    user: string
    preferProvider?: 'openai' | 'gemini' | 'deepseek'
    maxTokens?: number
  }) => Promise<{ text: string; provider: string; model: string }>
  leonardoGenerate: (payload: {
    prompt: string
    modelId?: string
    width?: number
    height?: number
    seed?: number
  }) => Promise<{ imageUrl: string; seed?: number; generationId?: string }>
  backendGenerateKatha: (payload: {
    theme: string
    country: string
    genre: string
    length: string
    baseUrl?: string
  }) => Promise<{
    story: { title: string; setting: string; characters: { name: string; role: string; traits: string }[]; story: string }
    script: { scene: number; visual_description: string; narration: string; dialogue: { character: string; line: string }[] }[]
    images: { scene: number; image_url: string; prompt: string }[]
    audio: { scene: number; audio_url: string }[]
    metadata: { country: string; region: string; genre: string; theme: string; length: string }
  }>
  uiShowContextMenu: (payload: { selectionText?: string; isEditable: boolean }) => Promise<void>
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    katha?: KathaAPI
  }
}
