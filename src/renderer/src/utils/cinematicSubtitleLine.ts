import type { StoryScene } from '../types/story'

const MAX_SUBTITLE_CHARS = 140

/** Short dialogue/narration line for cinematic overlay — never full screenplay paragraphs. */
export function cinematicSubtitleLineForScene(scene: StoryScene | null | undefined): string {
  if (!scene) return ''

  const dial = scene.dialogueLines?.find((d) => d.line?.trim())
  if (dial?.line) {
    const who = dial.character?.trim()
    const line = dial.line.trim().slice(0, MAX_SUBTITLE_CHARS)
    if (who && who.toLowerCase() !== 'narration') return `${who}: ${line}`
    return line
  }

  const nar = scene.narrationText?.trim()
  if (nar) return nar.slice(0, MAX_SUBTITLE_CHARS)

  const body = scene.text?.trim() || ''
  if (!body) return ''
  if (body.length <= MAX_SUBTITLE_CHARS) return body
  const sentence = body.split(/(?<=[.!?])\s+/)[0] || body
  return sentence.slice(0, MAX_SUBTITLE_CHARS)
}
