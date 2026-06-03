import type { ProjectState } from '../types/story'
import { probeSceneImageUrl } from './probeSceneImageUrl'

export type PortraitRecoveryResult = {
  needsRegen: { id: string; name: string; reason: string }[]
  restored: string[]
}

/**
 * Verify portrait URLs; characters without valid portraits need regeneration.
 */
export async function auditCharacterPortraits(
  project: ProjectState | null | undefined
): Promise<PortraitRecoveryResult> {
  const chars = project?.bible?.characters ?? []
  const needsRegen: PortraitRecoveryResult['needsRegen'] = []
  const restored: string[] = []

  for (const ch of chars) {
    const url = String(ch.baseImageUrl || '').trim()
    if (!url) {
      needsRegen.push({ id: ch.id, name: ch.name, reason: 'missing_url' })
      continue
    }
    const probe = await probeSceneImageUrl(url, 12_000)
    if (!probe.ok) {
      needsRegen.push({ id: ch.id, name: ch.name, reason: probe.reason || 'invalid' })
    } else {
      restored.push(ch.name)
    }
  }

  return { needsRegen, restored }
}
