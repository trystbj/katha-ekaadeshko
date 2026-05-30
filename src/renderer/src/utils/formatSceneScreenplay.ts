import type { StoryScene } from '../types/story'

/** Professional screenplay block for Script tab (English output). */
export function formatSceneScreenplay(scene: StoryScene): string {
  const lines: string[] = []
  const heading = scene.sceneTitle?.trim() || `SCENE ${scene.index}`
  lines.push(heading.toUpperCase())
  lines.push('')

  const env = scene.environment?.trim()
  const cam = scene.cameraDirection?.trim()
  if (env || cam) {
    const loc = env || 'LOCATION'
    const time = cam ? ` — ${cam}` : ''
    lines.push(`${loc.toUpperCase()}${time}`)
    lines.push('')
  }

  const actions = scene.characterActions?.trim()
  if (actions) {
    lines.push(actions)
    lines.push('')
  }

  const staging = scene.visualDescription?.trim()
  if (staging && staging !== actions) {
    lines.push(staging)
    lines.push('')
  }

  const narration = (scene.narrationText ?? scene.text).trim()
  if (narration && scene.character.toLowerCase() === 'narrator') {
    lines.push(`(${narration})`)
    lines.push('')
  } else if (narration && !(scene.dialogueLines?.length)) {
    lines.push(narration)
    lines.push('')
  }

  for (const d of scene.dialogueLines ?? []) {
    lines.push(d.character.toUpperCase())
    lines.push(d.line)
    lines.push('')
  }

  if (scene.emotionalTone?.trim()) {
    lines.push(`[${scene.emotionalTone.trim()}]`)
  }

  return lines.join('\n').trim()
}
