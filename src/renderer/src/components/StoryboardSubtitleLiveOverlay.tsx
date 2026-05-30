import { useMemo } from 'react'
import type { StoryScene } from '../types/story'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { cinematicSubtitleLineForScene } from '../utils/cinematicSubtitleLine'
import {
  storyboardSubtitleOverlayStyle,
  storyboardSubtitlePositionClass
} from '../utils/storyboardSubtitleOverlay'

type Props = {
  scene: StoryScene | null | undefined
  studio: SubtitleStudioState
  visible: boolean
}

export function StoryboardSubtitleLiveOverlay({ scene, studio, visible }: Props) {
  const line = useMemo(() => cinematicSubtitleLineForScene(scene), [scene])

  if (!visible || !studio.subtitlesOn || !line) return null

  const posClass = storyboardSubtitlePositionClass(studio.positionPreset)
  const animClass =
    studio.advanced.animation === 'fade_in'
      ? 'storyboard-subtitle-overlay--anim-fade'
      : studio.advanced.animation === 'slide'
        ? 'storyboard-subtitle-overlay--anim-slide'
        : studio.advanced.animation === 'typewriter'
          ? 'storyboard-subtitle-overlay--anim-type'
          : studio.advanced.animation === 'bounce'
            ? 'storyboard-subtitle-overlay--anim-pop'
            : ''

  return (
    <div
      className={`storyboard-subtitle-overlay ${posClass} ${animClass}`}
      aria-live="polite"
      style={storyboardSubtitleOverlayStyle(studio)}
    >
      {line}
    </div>
  )
}
