import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { StoryScene } from '../types/story'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { cinematicSubtitleLineForScene } from '../utils/cinematicSubtitleLine'
import {
  pointerToSubtitlePosition,
  resolveSubtitleFreePosition,
  nudgeSubtitlePosition,
  storyboardSubtitlePositionStyle,
  type SubtitleFreePosition
} from '../utils/subtitleFreePosition'
import { storyboardSubtitleOverlayStyle } from '../utils/storyboardSubtitleOverlay'

type Props = {
  scene: StoryScene | null | undefined
  studio: SubtitleStudioState
  visible: boolean
  containerRef: RefObject<HTMLElement | null>
  onPositionChange: (pos: SubtitleFreePosition) => void
}

export function StoryboardSubtitleLiveOverlay({
  scene,
  studio,
  visible,
  containerRef,
  onPositionChange
}: Props) {
  const line = useMemo(() => cinematicSubtitleLineForScene(scene), [scene])
  const pos = useMemo(() => resolveSubtitleFreePosition(studio), [studio.positionXPct, studio.positionYPct, studio.positionPreset, studio.advanced.customLinePct])
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(false)

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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!studio.subtitlesOn || e.button !== 0) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = true
      setDragging(true)
      onPositionChange(pointerToSubtitlePosition(e.clientX, e.clientY, box))
    },
    [containerRef, onPositionChange, studio.subtitlesOn]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      onPositionChange(pointerToSubtitlePosition(e.clientX, e.clientY, box))
    },
    [containerRef, onPositionChange]
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = false
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const nudged = nudgeSubtitlePosition(pos, e.key, e.shiftKey)
      if (!nudged) return
      e.preventDefault()
      onPositionChange(nudged)
    },
    [onPositionChange, pos]
  )

  useEffect(() => {
    if (!dragging) return
    const stop = () => {
      dragRef.current = false
      setDragging(false)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging])

  if (!visible || !studio.subtitlesOn || !line) return null

  return (
    <div
      className={`storyboard-subtitle-overlay${dragging ? ' storyboard-subtitle-overlay--dragging' : ''} ${animClass}`}
      role="group"
      aria-label="Subtitle position"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        ...storyboardSubtitleOverlayStyle(studio),
        ...storyboardSubtitlePositionStyle(pos)
      }}
    >
      <span className="storyboard-subtitle-overlay__frame" aria-hidden>
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--nw" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--ne" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--sw" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--se" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--n" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--s" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--e" />
        <span className="storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--w" />
      </span>
      <span className="storyboard-subtitle-overlay__text">{line}</span>
    </div>
  )
}
