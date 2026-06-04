import type { ProjectState } from '../types/story'
import { buildVisualPipelinePayload } from './buildVisualPipelinePayload'

export type VisualPreflightResult = { ok: boolean; errors: string[] }

export function validateVisualGenerationPreflight(
  project: ProjectState | null | undefined,
  episodeNumber: number
): VisualPreflightResult {
  const errors: string[] = []
  if (!project?.bible) errors.push('story_missing')
  if (!project?.bible?.styleId && !project?.bible?.customVisualPrompt) errors.push('style_missing')
  if (!project?.bible?.characters?.length) errors.push('characters_missing')
  const payload = project ? buildVisualPipelinePayload(project, episodeNumber) : null
  if (!payload?.script?.length) errors.push('script_missing')
  if (payload && !payload.story) errors.push('story_payload_missing')
  const cast = project?.bible?.characters ?? []
  for (const c of cast) {
    if (!String(c.name || '').trim()) errors.push('character_name_missing')
    if (!String(c.visualIdentity || c.appearance || '').trim()) errors.push(`character_visual:${c.name}`)
  }
  for (const row of payload?.script ?? []) {
    const vd = String((row as { visual_description?: string }).visual_description || '').trim()
    const nar = String((row as { narration?: string }).narration || '').trim()
    if (!vd && !nar) errors.push('scene_description_missing')
  }
  return { ok: errors.length === 0, errors }
}

export type VisualHealthCheck = {
  ok: boolean
  network: boolean
  leonardoReady?: boolean
  storyAiReady?: boolean
  storageWritable: boolean
  errors: string[]
}

/** Pre-batch health probe (API keys, provider, network). */
export async function runVisualGenerationHealthCheck(
  healthUrl = '/api/health',
  signal?: AbortSignal
): Promise<VisualHealthCheck> {
  const errors: string[] = []
  let network = true
  let leonardoReady: boolean | undefined
  let storyAiReady: boolean | undefined
  try {
    const res = await fetch(healthUrl, { method: 'GET', signal })
    if (!res.ok) {
      network = false
      errors.push(`health_http_${res.status}`)
    } else {
      const json = (await res.json()) as {
        ready?: boolean
        storyAiReady?: boolean
        leonardoReady?: boolean
        providers?: { leonardo?: boolean }
      }
      storyAiReady = json.storyAiReady ?? json.ready
      leonardoReady = json.leonardoReady
      if (leonardoReady === false) errors.push('leonardo_unavailable')
    }
  } catch {
    network = false
    errors.push('network_unavailable')
  }
  let storageWritable = true
  try {
    if (typeof localStorage !== 'undefined') {
      const k = '__katha_storage_probe__'
      localStorage.setItem(k, '1')
      localStorage.removeItem(k)
    }
  } catch {
    storageWritable = false
    errors.push('storage_not_writable')
  }
  return {
    ok: network && storageWritable && errors.length === 0,
    network,
    leonardoReady,
    storyAiReady,
    storageWritable,
    errors
  }
}
