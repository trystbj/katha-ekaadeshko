/**
 * Centralized studio task phases — prevents permanent "busy" lock.
 */

export type StudioTaskPhase =
  | 'idle'
  | 'generating_story'
  | 'generating_images'
  | 'generating_audio'
  | 'rendering_video'
  | 'validating_scenes'
  | 'completed'
  | 'failed'

export type StudioTaskState = {
  phase: StudioTaskPhase
  detail?: string
  startedAt?: string
}

export function idleTaskState(): StudioTaskState {
  return { phase: 'idle' }
}

export function busyLabelForPhase(phase: StudioTaskPhase): string | null {
  switch (phase) {
    case 'generating_story':
      return 'generating'
    case 'generating_images':
      return 'leonardo'
    case 'generating_audio':
      return 'narration'
    case 'rendering_video':
      return 'rendering'
    case 'validating_scenes':
      return 'validating'
    case 'completed':
    case 'failed':
    case 'idle':
    default:
      return null
  }
}

export function phaseFromBusyLabel(busy: string | null | undefined): StudioTaskPhase {
  if (!busy) return 'idle'
  const b = String(busy).toLowerCase()
  if (b === 'rendering') return 'rendering_video'
  if (b === 'leonardo' || b.includes('visual')) return 'generating_images'
  if (b.includes('narrat') || b === 'tts') return 'generating_audio'
  if (b === 'generating' || b.startsWith('episode')) return 'generating_story'
  if (b.includes('validat')) return 'validating_scenes'
  return 'generating_story'
}

export function taskStateFromStage(stage: string | undefined): StudioTaskPhase {
  const s = String(stage || '').toLowerCase()
  if (!s || s === 'idle' || s === 'done') return s === 'done' ? 'completed' : 'idle'
  if (s.includes('master_context') || s === 'story' || s === 'script' || s === 'merge') {
    return 'generating_story'
  }
  if (s.includes('image') || s.includes('visual') || s.includes('scene_generat')) {
    return 'generating_images'
  }
  if (s.includes('audio') || s.includes('narrat') || s.includes('tts')) {
    return 'generating_audio'
  }
  if (s.includes('validat')) return 'validating_scenes'
  if (s.includes('render') || s.includes('ffmpeg')) return 'rendering_video'
  if (s === 'failed' || s === 'error') return 'failed'
  return 'generating_story'
}

export function serializePipelineError(err: unknown, fallback = 'Operation failed'): string {
  if (err instanceof Error && err.message.trim() && err.message !== '[object Object]') {
    return err.message
  }
  if (typeof err === 'string' && err.trim() && err !== '[object Object]') return err
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message
    if (typeof o.error === 'string' && o.error.trim()) return o.error
    try {
      const raw = JSON.stringify(err, null, 2)
      if (raw && raw !== '{}' && raw !== '[object Object]') return raw.slice(0, 1200)
    } catch {
      /* ignore */
    }
  }
  return fallback
}
