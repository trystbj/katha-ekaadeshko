import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { tEpisodePacing } from '../utils/i18nEpisodePacing'
import type { ProjectState } from '../types/story'
import { STUDIO_BROADCAST_CHANNEL } from '../constants/studioSync'
import { StudioMonitorLabelIcon } from './StudioMonitorLabelIcon'
import { useStudioStore } from '../store/useStudioStore'
import { useSyncUiLanguageToI18n } from '../i18n/useSyncUiLanguageToI18n'
import '../styles/saved-projects-window.css'

type Meta = { id: string; title: string; status: string; updatedAt: string }

export type SavedProjectsWindowProps = {
  /** Full-page (`saved.html`) vs embedded Story monitor column */
  variant?: 'page' | 'monitor'
  onClose?: () => void
  /** Loads project in main studio (monitor variant); page variant uses BroadcastChannel */
  onLoadInStudio?: (id: string) => void
}

export function SavedProjectsWindow({
  variant = 'page',
  onClose,
  onLoadInStudio
}: SavedProjectsWindowProps = {}) {
  const uiText = useUiText()
  const embedded = variant === 'monitor'
  useSyncUiLanguageToI18n(variant === 'page')
  const slots = useStudioStore((s) => s.workspaceSlots)
  const activeIx = useStudioStore((s) => s.activeWorkspaceSlotIndex)
  const runtime = useStudioStore((s) => s.workspaceRuntime)
  const switchWorkspaceSlot = useStudioStore((s) => s.switchWorkspaceSlot)
  const createNewWorkspaceProject = useStudioStore((s) => s.createNewWorkspaceProject)
  const [items, setItems] = useState<Meta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProjectState | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [selectedEp, setSelectedEp] = useState<number | null>(null)

  const workspaceRows = useMemo(() => {
    return slots
      .map((slot, ix) => ({ slot, ix }))
      .filter(({ slot, ix }) => Boolean(slot.project || slot.studio.idea.trim()) || ix === activeIx)
  }, [slots, activeIx])

  const exportWorkspaceJson = useCallback(
    (ix: number) => {
      const snap = slots[ix]
      if (!snap) return
      const body = JSON.stringify(snap, null, 2)
      const blob = new Blob([body], { type: 'application/json;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `katha-project-${ix + 1}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    },
    [slots]
  )

  const refresh = useCallback(async () => {
    const k = window.katha
    if (!k?.storyHistoryList) {
      setItems([])
      return
    }
    try {
      setLoadErr(null)
      const list = await k.storyHistoryList()
      setItems(list)
      setSelectedId((cur) => {
        if (!cur) return null
        return list.some((x) => x.id === cur) ? cur : null
      })
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setSelectedEp(null)
      return
    }
    const k = window.katha
    if (!k?.storyHistoryLoad) return
    let cancelled = false
    void k
      .storyHistoryLoad(selectedId)
      .then((p) => {
        if (!cancelled) {
          setDetail(p)
          setSelectedEp(p.episodes.length ? p.episodes[p.episodes.length - 1].number : null)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDetail(null)
          setLoadErr(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const openInStudio = () => {
    if (!selectedId) return
    if (embedded && onLoadInStudio) {
      onLoadInStudio(selectedId)
      onClose?.()
      return
    }
    try {
      const bc = new BroadcastChannel(STUDIO_BROADCAST_CHANNEL)
      bc.postMessage({ type: 'open-story-history', id: selectedId })
      bc.close()
    } catch {
      /* ignore */
    }
  }

  const totalSlots = detail?.bible?.totalEpisodes
    ? detail.bible.totalEpisodes
    : Math.max(1, detail?.episodes.length ?? 0)

  return (
    <div
      className={
        embedded ? 'saved-projects-window saved-projects-window--monitor' : 'saved-projects-window'
      }
      data-theme="dark"
    >
      <header className="saved-projects-window__head">
        <div>
          <h1 className="saved-projects-window__title">{uiText('savedLibraryTitle')}</h1>
          <p className="saved-projects-window__hint">{uiText('savedLibraryHint')}</p>
        </div>
        <div className="saved-projects-window__actions">
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()}>
            {uiText('savedLibraryRefresh')}
          </button>
          <button type="button" className="btn" disabled={!selectedId} onClick={openInStudio}>
            {uiText('savedLibraryOpenInStudio')}
          </button>
        </div>
      </header>

      {loadErr ? <p className="saved-projects-window__err">{loadErr}</p> : null}

      <div
        className={
          embedded
            ? 'saved-projects-window__grid saved-projects-window__grid--stack'
            : 'saved-projects-window__grid'
        }
      >
        <section className="saved-projects-window__list-panel panel">
          <h2 className="saved-projects-window__h">{uiText('savedLibraryWorkspaceListHeading')}</h2>
          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            {workspaceRows.map(({ slot, ix }) => {
              const rt = runtime[ix]
              const isActive = ix === activeIx
              const hasStory = Boolean(slot.project || slot.studio.idea.trim())
              const statusIcon = rt?.lastError
                ? '🔴'
                : rt?.busy
                  ? rt.busy.includes('episode') || rt.busy.includes('bible') || rt.busy.includes('generating')
                    ? '🔵'
                    : '🟢'
                  : hasStory && !isActive
                    ? '🟡'
                    : '⚪'
              const title =
                slot.meta.displayTitle?.trim() ||
                slot.project?.title?.trim() ||
                uiText('projectFallbackTitle', { n: ix + 1 })
              return (
                <div key={ix} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`btn ${isActive ? '' : 'btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'space-between', display: 'flex', gap: 10 }}
                    onClick={() => {
                      switchWorkspaceSlot(ix)
                      onClose?.()
                    }}
                  >
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <span aria-hidden>{statusIcon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    </span>
                    <span className="badge">
                      {isActive ? uiText('workspaceRuntimeStatusActive') : rt?.busy || uiText('workspaceRuntimeStatusIdle')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => exportWorkspaceJson(ix)}
                    title={uiText('workspaceExportJsonTooltip')}
                  >
                    {Glyphs.download}
                  </button>
                </div>
              )
            })}
            {slots.some((s) => !s.project && !s.studio.idea.trim()) ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const r = createNewWorkspaceProject()
                  if (r.ok) switchWorkspaceSlot(r.index)
                  onClose?.()
                }}
              >
                {Glyphs.asterisk}
                {Glyphs.space}
                {uiText('newProject')}
              </button>
            ) : null}
          </div>

          <h2 className="saved-projects-window__h">{uiText('projects')}</h2>
          {items.length === 0 ? (
            <p className="saved-projects-window__empty">{uiText('savedLibraryEmpty')}</p>
          ) : (
            <ul className="saved-projects-window__list">
              {items.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`saved-projects-window__row ${selectedId === row.id ? 'saved-projects-window__row--on' : ''}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="saved-projects-window__row-title">{row.title}</span>
                    <span className="saved-projects-window__row-meta">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside
          className={
            embedded
              ? 'saved-projects-window__episode-panel'
              : 'saved-projects-window__monitor studio-mock-col studio-mock-col--monitor'
          }
        >
          {embedded ? null : (
            <div className="studio-mock-monitor-title">
              <div className="studio-mock-monitor-title__lead">
                <span className="studio-mock-monitor-title__text">
                  <span className="studio-mock-monitor-title__icon" aria-hidden>
                    <StudioMonitorLabelIcon />
                  </span>
                  <span className="studio-mock-monitor-title__label">{uiText('storyMonitor')}</span>
                </span>
              </div>
            </div>
          )}
          <div className={embedded ? 'saved-projects-window__episode-panel-body' : 'studio-mock-monitor-body'}>
            {!detail ? (
              <p className="studio-mock-monitor-placeholder">{uiText('savedLibraryPickProject')}</p>
            ) : (
              <section className="studio-mock-monitor-section" aria-labelledby="saved-lib-eps">
                <h3 id="saved-lib-eps" className="studio-mock-wireframe-monitor-h">
                  {uiText('episodes')}
                </h3>
                <div className="panel studio-mock-panel studio-mock-episodes-panel">
                  {Array.from({ length: totalSlots }, (_, i) => i + 1).map((n) => {
                    const ep = detail.episodes.find((e) => e.number === n)
                    const done = Boolean(ep)
                    const current = selectedEp === n
                    return (
                      <div
                        key={n}
                        className={`episode-row ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                        onClick={() => setSelectedEp(n)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedEp(n)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span>
                          {uiText('episodeSavedLibraryRowLabel', {
                            n,
                            pacing: ep ? tEpisodePacing(uiText, ep.pacing) : uiText('uiEllipsis')
                          })}
                        </span>
                        <span className="badge">{done ? uiText('episodeBadgeDone') : uiText('episodeBadgeUpcoming')}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
