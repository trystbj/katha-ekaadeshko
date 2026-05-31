import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { StoryScene } from '../types/story'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { cinematicSubtitleLineForScene } from '../utils/cinematicSubtitleLine'
import {
  clampSubtitlePosition,
  resolveSubtitleFreePosition,
  nudgeSubtitlePosition,
  type SubtitleFreePosition
} from '../utils/subtitleFreePosition'
import {
  storyboardSubtitleBgStyle,
  storyboardSubtitleBoxStyle,
  storyboardSubtitleOuterStyle,
  storyboardSubtitleTextStyle
} from '../utils/storyboardSubtitleOverlay'

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

type ResizeSession = {
  handle: ResizeHandle
  startX: number
  startY: number
  startScaleX: number
  startScaleY: number
}

type Props = {
  scene: StoryScene | null | undefined
  studio: SubtitleStudioState
  visible: boolean
  containerRef: RefObject<HTMLElement | null>
  onPositionChange: (pos: SubtitleFreePosition) => void
  onBoxChange?: (patch: Partial<SubtitleStudioState['advanced']>) => void
}

const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function StoryboardSubtitleLiveOverlay({
  scene,
  studio,
  visible,
  containerRef,
  onPositionChange,
  onBoxChange
}: Props) {
  const line = useMemo(() => cinematicSubtitleLineForScene(scene), [scene])
  const pos = useMemo(
    () => resolveSubtitleFreePosition(studio),
    [studio.positionXPct, studio.positionYPct, studio.positionPreset, studio.advanced.customLinePct]
  )
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragRef = useRef(false)
  const resizeRef = useRef<ResizeSession | null>(null)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)

  const showChrome = dragging || resizing

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

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!studio.subtitlesOn || e.button !== 0 || resizing) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      e.stopPropagation()
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
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
      const session = resizeRef.current
      if (session && onBoxChange) {
        const dx = e.clientX - session.startX
        const dy = e.clientY - session.startY
        const h = session.handle
        let scaleX = session.startScaleX
        let scaleY = session.startScaleY

        if (h.includes('e')) scaleX = session.startScaleX + dx * 0.1
        if (h.includes('w')) scaleX = session.startScaleX - dx * 0.1
        if (h.includes('s')) scaleY = session.startScaleY + dy * 0.1
        if (h.includes('n')) scaleY = session.startScaleY - dy * 0.1

        onBoxChange({
          boxScaleXPct: Math.min(200, Math.max(50, Math.round(scaleX))),
          boxScaleYPct: Math.min(200, Math.max(50, Math.round(scaleY)))
        })
        return
      }
      if (!dragRef.current) return
      const next = positionFromPointer(e.clientX, e.clientY)
      if (next) onPositionChange(next)
    },
    [onBoxChange, onPositionChange, positionFromPointer]
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
    }
    try {
      if (e.currentTarget instanceof HTMLElement && 'releasePointerCapture' in e.currentTarget) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* released */
    }
  }, [])

  const onHandleDown = useCallback(
    (handle: ResizeHandle) => (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!studio.subtitlesOn || !onBoxChange) return
      e.stopPropagation()
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      const adv = studio.advanced
      resizeRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startScaleX: adv.boxScaleXPct ?? 100,
        startScaleY: adv.boxScaleYPct ?? 100
      }
      setResizing(true)
    },
    [onBoxChange, studio.advanced, studio.subtitlesOn]
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

  if (!visible || !studio.subtitlesOn || !line) return null

  const bgStyle = storyboardSubtitleBgStyle(studio)
  const showBg = (studio.advanced.bgOpacity ?? 0) > 0.02

  return (
    <div
      className={`storyboard-subtitle-overlay${dragging ? ' storyboard-subtitle-overlay--dragging' : ''}${resizing ? ' storyboard-subtitle-overlay--resizing' : ''}${showChrome ? ' storyboard-subtitle-overlay--edit' : ''} ${animClass}`}
      role="group"
      aria-label="Subtitle"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      style={storyboardSubtitleOuterStyle(studio)}
    >
      <div
        className="storyboard-subtitle-overlay__box"
        style={storyboardSubtitleBoxStyle(studio)}
        onPointerDown={onDragPointerDown}
      >
        {showChrome ? (
          <span className="storyboard-subtitle-overlay__frame" aria-hidden>
            {HANDLES.map((edge) => (
              <span
                key={edge}
                className={`storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--${edge}`}
                onPointerDown={onHandleDown(edge)}
              />
            ))}
          </span>
        ) : null}
        <span className="storyboard-subtitle-overlay__inner">
          {showBg ? (
            <span className="storyboard-subtitle-overlay__bg" style={bgStyle} aria-hidden />
          ) : null}
          <span className="storyboard-subtitle-overlay__line" style={storyboardSubtitleTextStyle(studio)}>
            {line}
          </span>
        </span>
      </div>
    </div>
  )
}
