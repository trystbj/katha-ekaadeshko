import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { StoryScene } from '../types/story'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { cinematicSubtitleLineForScene } from '../utils/cinematicSubtitleLine'
import {
  clampSubtitlePosition,
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
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)

  const masterOpacity = Math.min(1, Math.max(0, studio.advanced.bgOpacity))

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

  const positionFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return null
      const off = dragOffsetRef.current
      const x = off
        ? ((clientX - box.left - off.dx) / Math.max(1, box.width)) * 100
        : ((clientX - box.left) / Math.max(1, box.width)) * 100
      const y = off
        ? ((clientY - box.top - off.dy) / Math.max(1, box.height)) * 100
        : ((clientY - box.top) / Math.max(1, box.height)) * 100
      return clampSubtitlePosition(x, y)
    },
    [containerRef]
  )

  const onTextPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!studio.subtitlesOn || e.button !== 0 || resizing) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      e.stopPropagation()
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      const anchorX = (pos.positionXPct / 100) * box.width
      const anchorY = (pos.positionYPct / 100) * box.height
      dragOffsetRef.current = {
        dx: e.clientX - box.left - anchorX,
        dy: e.clientY - box.top - anchorY
      }
      dragRef.current = true
      setDragging(true)
    },
    [containerRef, pos.positionXPct, pos.positionYPct, resizing, studio.subtitlesOn]
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
      const next = positionFromPointer(e.clientX, e.clientY)
      if (next) onPositionChange(next)
    },
    [onPositionChange, onScaleChange, positionFromPointer]
  )

  const endPointer = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) {
      resizeRef.current = null
      setResizing(false)
    }
    if (dragRef.current) {
      dragRef.current = false
      dragOffsetRef.current = null
      setDragging(false)
      try {
        if (e.currentTarget instanceof HTMLElement && 'releasePointerCapture' in e.currentTarget) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      } catch {
        /* already released */
      }
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
      dragOffsetRef.current = null
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

  if (!visible || !studio.subtitlesOn || !line || masterOpacity <= 0) return null

  return (
    <div
      className={`storyboard-subtitle-overlay${dragging ? ' storyboard-subtitle-overlay--dragging' : ''}${resizing ? ' storyboard-subtitle-overlay--resizing' : ''} ${animClass}`}
      role="group"
      aria-label="Subtitle position"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
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
            onPointerDown={
              edge === 'se' || edge === 's' || edge === 'e' ? onHandleDown : undefined
            }
          />
        ))}
      </span>
      <span
        className="storyboard-subtitle-overlay__text"
        onPointerDown={onTextPointerDown}
      >
        {line}
      </span>
    </div>
  )
}
