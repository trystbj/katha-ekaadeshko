import { createPortal } from 'react-dom'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import '../styles/story-history-popover.css'

export type StoryHistoryItemRow = {
  id: string
  title: string
  status: string
  updatedAt: string
  episodeCount?: number
  totalEpisodes?: number | null
}

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  items: StoryHistoryItemRow[]
  currentProjectId: string | null
  onContinue: (id: string) => void
  onDelete: (id: string) => void
}

function isOngoingStatus(s: string) {
  return s === 'in_progress' || s === 'new'
}

function sortHistoryRows(rows: StoryHistoryItemRow[]): StoryHistoryItemRow[] {
  return [...rows].sort((a, b) => {
    const ao = isOngoingStatus(a.status) ? 1 : 0
    const bo = isOngoingStatus(b.status) ? 1 : 0
    if (bo !== ao) return bo - ao
    const ta = new Date(a.updatedAt || 0).getTime()
    const tb = new Date(b.updatedAt || 0).getTime()
    return tb - ta
  })
}

export function StoryHistoryPopover({
  open,
  anchorRef,
  onClose,
  items,
  currentProjectId,
  onContinue,
  onDelete
}: Props) {
  const uiText = useUiText()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ top: 0, left: 0, width: 320 })

  const sorted = useMemo(() => sortHistoryRows(items), [items])

  const place = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const panelW = Math.min(340, Math.max(260, vw - 16))
    let left = r.right - panelW
    if (left < 8) left = 8
    if (left + panelW > vw - 8) left = vw - 8 - panelW
    const margin = 8
    const estimatedH = Math.min(420, vh - margin * 2)
    let top = r.bottom + margin
    if (top + estimatedH > vh - margin) {
      top = Math.max(margin, r.top - margin - estimatedH)
    }
    setBox({ top, left, width: panelW })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, place, sorted.length])

  useEffect(() => {
    if (!open) return
    const onResize = () => place()
    const onScroll = () => place()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  const epSubtitle = (row: StoryHistoryItemRow) => {
    const written = row.episodeCount ?? 0
    const total = row.totalEpisodes
    if (typeof total === 'number' && total > 0) {
      return uiText('storyHistoryEpProgress', { written, total })
    }
    return uiText('storyHistoryEpCount', { count: written })
  }

  const node = (
    <div
      ref={panelRef}
      className="story-history-popover"
      style={{ top: box.top, left: box.left, width: box.width }}
      role="dialog"
      aria-label={uiText('storyHistoryPopoverTitle')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="story-history-popover__head">
        <h2 className="story-history-popover__title">{uiText('storyHistoryPopoverTitle')}</h2>
        <p className="story-history-popover__hint">{uiText('storyHistoryHint')}</p>
      </div>
      <div className="story-history-popover__list">
        {sorted.length === 0 ? (
          <p className="story-history-popover__empty">{uiText('storyHistoryEmpty')}</p>
        ) : (
          sorted.map((row) => {
            const isCurrent = currentProjectId === row.id
            return (
              <div
                key={row.id}
                className={`story-history-popover__row ${isCurrent ? 'story-history-popover__row--current' : ''}`}
              >
                <button
                  type="button"
                  className="story-history-popover__main"
                  onClick={() => {
                    onContinue(row.id)
                    onClose()
                  }}
                >
                  <span className="story-history-popover__name">{row.title || '—'}</span>
                  <span className="story-history-popover__meta">{epSubtitle(row)}</span>
                  <span className="story-history-popover__status">{row.status}</span>
                </button>
                <button
                  type="button"
                  className="story-history-popover__trash"
                  aria-label={uiText('storyHistoryDelete')}
                  title={uiText('storyHistoryDelete')}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!window.confirm(uiText('storyHistoryConfirmDelete'))) return
                    onDelete(row.id)
                  }}
                >
                  {Glyphs.multiply}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
