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
  startWidthPct: number
  startHeightPct: number
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

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize'
}

function clampWidthPct(pct: number) {
  return Math.min(92, Math.max(24, Math.round(pct)))
}

function clampHeightPct(pct: number) {
  return Math.min(48, Math.max(8, Math.round(pct)))
}

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
  const [selected, setSelected] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [containerWidth, setContainerWidth] = useState(480)
  const [containerHeight, setContainerHeight] = useState(640)
  const dragRef = useRef(false)
  const resizeRef = useRef<ResizeSession | null>(null)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sync = () => {
      setContainerWidth(Math.max(1, el.clientWidth))
      setContainerHeight(Math.max(1, el.clientHeight))
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    if (!selected) return
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node
      if (rootRef.current?.contains(node)) return
      setSelected(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [selected])

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

  const onMovePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!studio.subtitlesOn || e.button !== 0 || resizing) return
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      e.stopPropagation()
      e.preventDefault()
      setSelected(true)
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

  const onResizePointerDown = useCallback(
    (handle: ResizeHandle) => (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!studio.subtitlesOn || !onBoxChange || e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      setSelected(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      const adv = studio.advanced
      resizeRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidthPct: adv.boxWidthPct ?? adv.boxScaleXPct ?? 72,
        startHeightPct: adv.boxHeightPct ?? 14
      }
      setResizing(true)
    },
    [onBoxChange, studio.advanced, studio.subtitlesOn]
  )

  useEffect(() => {
    if (!dragging && !resizing) return

    const onMove = (e: PointerEvent) => {
      const session = resizeRef.current
      if (session && onBoxChange && containerWidth > 0 && containerHeight > 0) {
        const dx = e.clientX - session.startX
        const dy = e.clientY - session.startY
        const h = session.handle
        let widthPct = session.startWidthPct
        let heightPct = session.startHeightPct

        if (h.includes('e')) widthPct = session.startWidthPct + (dx / containerWidth) * 100
        if (h.includes('w')) widthPct = session.startWidthPct - (dx / containerWidth) * 100
        if (h.includes('s')) heightPct = session.startHeightPct + (dy / containerHeight) * 100
        if (h.includes('n')) heightPct = session.startHeightPct - (dy / containerHeight) * 100

        onBoxChange({
          boxWidthPct: clampWidthPct(widthPct),
          boxHeightPct: clampHeightPct(heightPct)
        })
        return
      }

      if (!dragRef.current) return
      const next = positionFromPointer(e.clientX, e.clientY)
      if (next) onPositionChange(next)
    }

    const end = () => {
      dragRef.current = false
      dragOffsetRef.current = null
      resizeRef.current = null
      setDragging(false)
      setResizing(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [
    containerHeight,
    containerWidth,
    dragging,
    onBoxChange,
    onPositionChange,
    positionFromPointer,
    resizing
  ])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const nudged = nudgeSubtitlePosition(pos, e.key, e.shiftKey)
      if (!nudged) return
      e.preventDefault()
      onPositionChange(nudged)
    },
    [onPositionChange, pos]
  )

  if (!visible || !studio.subtitlesOn || !line) return null

  const bgStyle = storyboardSubtitleBgStyle(studio)
  const showBg = (studio.advanced.bgOpacity ?? 0) > 0.02

  return (
    <div
      ref={rootRef}
      className={`storyboard-subtitle-overlay${dragging ? ' storyboard-subtitle-overlay--dragging' : ''}${resizing ? ' storyboard-subtitle-overlay--resizing' : ''}${selected ? ' storyboard-subtitle-overlay--selected' : ''} ${animClass}`}
      role="group"
      aria-label="Subtitle"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(true)
      }}
      style={storyboardSubtitleOuterStyle(studio)}
    >
      <div
        className="storyboard-subtitle-overlay__box"
        style={storyboardSubtitleBoxStyle(studio, containerWidth, containerHeight)}
      >
        {selected ? (
          <span className="storyboard-subtitle-overlay__frame" aria-hidden>
            {HANDLES.map((edge) => (
              <span
                key={edge}
                className={`storyboard-subtitle-overlay__handle storyboard-subtitle-overlay__handle--${edge}`}
                style={{ cursor: HANDLE_CURSORS[edge] }}
                onPointerDown={onResizePointerDown(edge)}
              />
            ))}
          </span>
        ) : null}
        <div
          className="storyboard-subtitle-overlay__move-surface"
          onPointerDown={onMovePointerDown}
          onClick={() => setSelected(true)}
        >
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
    </div>
  )
}
