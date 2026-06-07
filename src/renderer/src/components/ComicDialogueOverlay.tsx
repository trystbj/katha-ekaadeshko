import { useMemo } from 'react'
import type { StoryScene } from '../types/story'

type Props = {
  scene: StoryScene | null | undefined
  visible: boolean
}

type Bubble = {
  speaker: string
  text: string
  topPct: number
  leftPct: number
  align: 'left' | 'right'
}

function layoutComicBubbles(scene: StoryScene): Bubble[] {
  const lines = (scene.dialogueLines ?? []).filter((d) => d.line?.trim())
  if (lines.length) {
    return lines.slice(0, 4).map((d, i) => ({
      speaker: d.character?.trim() || 'Character',
      text: d.line.trim(),
      topPct: 12 + i * 22,
      leftPct: i % 2 === 0 ? 8 : 52,
      align: i % 2 === 0 ? 'left' : 'right'
    }))
  }
  const nar = scene.narrationText?.trim() || scene.text?.trim()
  if (!nar) return []
  return [
    {
      speaker: 'Narration',
      text: nar.slice(0, 180),
      topPct: 78,
      leftPct: 10,
      align: 'left'
    }
  ]
}

/** App-rendered comic dialogue — never baked into Leonardo images. */
export function ComicDialogueOverlay({ scene, visible }: Props) {
  const bubbles = useMemo(() => (scene ? layoutComicBubbles(scene) : []), [scene])
  if (!visible || !bubbles.length) return null

  return (
    <div className="comic-dialogue-overlay" aria-hidden={!visible}>
      {bubbles.map((b, i) => (
        <div
          key={`${scene?.index}-${i}`}
          className={`comic-dialogue-overlay__bubble comic-dialogue-overlay__bubble--${b.align}`}
          style={{ top: `${b.topPct}%`, left: `${b.leftPct}%` }}
        >
          {b.speaker && b.speaker.toLowerCase() !== 'narration' ? (
            <span className="comic-dialogue-overlay__speaker">{b.speaker}</span>
          ) : null}
          <p className="comic-dialogue-overlay__text">{b.text}</p>
        </div>
      ))}
    </div>
  )
}
