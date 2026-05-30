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
  onScaleChange?: (fontSizePct: number) => void
}

export function StoryboardSubtitleLiveOverlay({
  scene,
  studio,
  visible,
  containerRef,
  onPositionChange,
  onScaleChange
}: Props) {
  const line = useMemo(() => cinematicSubtitleLineForScene(scene), [scene])
  const pos = useMemo(
    () => resolveSubtitleFreePosition(studio),
    [studio.positionXPct, studio.positionYPct, studio.positionPreset, studio.advanced.customLinePct]
  )
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragRef = useRef(false)
  const resizeRef = useRef<{ startSize: number; startY: number } | null>(null)

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
      if (!studio.subtitlesOn || e.button !== 0 || resizing) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = true
      setDragging(true)
      onPositionChange(pointerToSubtitlePosition(e.clientX, e.clientY, box))
    },
    [containerRef, onPositionChange, resizing, studio.subtitlesOn]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (resizeRef.current && onScaleChange) {
        const { startSize, startY } = resizeRef.current
        const delta = Math.round((startY - e.clientY) * 0.25)
        onScaleChange(Math.min(160, Math.max(70, startSize + delta)))
        return
      }
      if (!dragRef.current) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      onPositionChange(pointerToSubtitlePosition(e.clientX, e.clientY, box))
    },
    [containerRef, onPositionChange, onScaleChange]
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current) {
      resizeRef.current = null
      setResizing(false)
    }
    if (!dragRef.current) return
    dragRef.current = false
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const onHandleDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!studio.subtitlesOn || !onScaleChange) return
      e.stopPropagation()
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      resizeRef.current = { startSize: studio.advanced.fontSizePct, startY: e.clientY }
      setResizing(true)
    },
    [onScaleChange, studio.advanced.fontSizePct, studio.subtitlesOn]
  )

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
    if (!dragging && !resizing) return
    const stop = () => {
      dragRef.current = false
      resizeRef.current = null
      setDragging(false)
      setResizing(false)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging, resizing])

  if (!visible || !studio.subtitlesOn || !line) return null

  return (
    <div
      className={`storyboard-subtitle-overlay${dragging ? ' storyboard-subtitle-overlay--dragging' : ''}${resizing ? ' storyboard-subtitle-overlay--resizing' : ''} ${animClass}`}
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
        {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const).map((edge) => (
          <span
            key={edge}
            className={`storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--${edge}`}
            onPointerDown={edge === 'se' || edge === 's' || edge === 'e' ? onHandleDown : undefined}
          />
        ))}
      </span>
      <span className="storyboard-subtitle-overlay__text">{line}</span>
    </div>
  )
}
