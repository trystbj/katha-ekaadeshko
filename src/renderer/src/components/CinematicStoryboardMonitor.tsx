import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { buildStoryboardTileModels } from '../utils/cinematicStoryboardSceneModel'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { CinematicStoryboardTile } from './CinematicStoryboardTile'
import type { SmartRegenAction } from './SmartSceneRegenMenu'
import { NARRATOR_UI_PRESETS } from '../constants/narrators'
import { normalizeNarratorId } from '../constants/narrators'

export type StoryboardViewMode = 'compact' | 'cinematic'

const MONITOR_PAGE_SIZE = 5

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeTileIndex: number
  onActiveTileIndexChange: (index: number) => void
  busyLabel: string | null
  onRegenerateScene?: (sceneIndex: number) => void
  onReplaceSceneImage?: (sceneIndex: number) => void
  onSmartRegen?: (sceneIndex: number, action: SmartRegenAction) => void
}

export function CinematicStoryboardMonitor({
  project,
  episode,
  activeTileIndex,
  onActiveTileIndexChange,
  busyLabel,
  onRegenerateScene,
  onReplaceSceneImage,
  onSmartRegen
}: Props) {
  const uiText = useUiText()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<StoryboardViewMode>('compact')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [page, setPage] = useState(0)

  const narratorId = normalizeNarratorId(project.bible?.narratorId ?? '')
  const narratorPreset = NARRATOR_UI_PRESETS.find((n) => n.id === narratorId)
  const narratorLabel = narratorPreset ? uiText(narratorPreset.labelKey) : uiText('cineNarratorAi')

  const cinematicPlan = episode.cinematicDirectorPlan ?? null
  const vs = ensureVideoStudio(project)

  const tiles = useMemo(
    () =>
      buildStoryboardTileModels({
        project,
        episode,
        cinematicPlan,
        busyLabel,
        narratorLabel
      }),
    [project, episode, cinematicPlan, busyLabel, narratorLabel]
  )

  const pageCount = Math.max(1, Math.ceil(tiles.length / MONITOR_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * MONITOR_PAGE_SIZE
  const visibleTiles = tiles.slice(pageStart, pageStart + MONITOR_PAGE_SIZE)

  useEffect(() => {
    const needPage = Math.floor(activeTileIndex / MONITOR_PAGE_SIZE)
    if (needPage !== page) setPage(needPage)
  }, [activeTileIndex, page])

  const scrollToTile = useCallback((ix: number) => {
    const root = scrollRef.current
    if (!root) return
    const el = root.querySelector(`[data-tile-index="${ix}"]`)
    if (el && 'scrollIntoView' in el) {
      ;(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  useEffect(() => {
    scrollToTile(activeTileIndex)
  }, [activeTileIndex, scrollToTile])

  useEffect(() => {
    console.info('[katha:storyboard]', 'monitor_tiles', {
      count: tiles.length,
      withImages: tiles.filter((t) => t.imageUrl).length
    })
  }, [tiles])

  return (
    <section className="cine-sb-monitor" aria-labelledby="cine-sb-monitor-title">
      <div className="cine-sb-monitor__head">
        <h3 id="cine-sb-monitor-title" className="studio-mock-wireframe-monitor-h cine-sb-monitor__title">
          {uiText('cineStoryboardTitle')}
        </h3>
        <div className="cine-sb-monitor__modes" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'compact'}
            className={`btn btn-ghost btn-small${viewMode === 'compact' ? ' cine-sb-monitor__mode--on' : ''}`}
            onClick={() => setViewMode('compact')}
          >
            {uiText('cineViewCompact')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'cinematic'}
            className={`btn btn-ghost btn-small${viewMode === 'cinematic' ? ' cine-sb-monitor__mode--on' : ''}`}
            onClick={() => setViewMode('cinematic')}
          >
            {uiText('cineViewCinematic')}
          </button>
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="cine-sb-monitor__pager">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ◀
          </button>
          <span className="cine-sb-monitor__pager-label">
            {uiText('cineMonitorPage', {
              page: String(safePage + 1),
              total: String(pageCount)
            })}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            ▶
          </button>
        </div>
      ) : null}

      <div ref={scrollRef} className="cine-sb-monitor__flow panel studio-mock-panel">
        {visibleTiles.map((model) => (
          <div
            key={model.scene.index}
            data-tile-index={model.rowIndex}
            className="cine-sb-monitor__tile-slot"
          >
            <CinematicStoryboardTile
              model={model}
              active={model.rowIndex === activeTileIndex}
              expanded={expandedIndex === model.rowIndex}
              viewMode={viewMode}
              subtitleStudio={vs.subtitleStudio}
              narratorLabel={narratorLabel}
              onSelect={() => {
                onActiveTileIndexChange(model.rowIndex)
                console.info('[katha:preview]', 'monitor_tile_select', {
                  sceneIndex: model.scene.index,
                  row: model.rowIndex
                })
              }}
              onToggleExpand={() =>
                setExpandedIndex((cur) => (cur === model.rowIndex ? null : model.rowIndex))
              }
              busy={Boolean(busyLabel)}
              onRegenerateScene={
                onRegenerateScene ? () => onRegenerateScene(model.scene.index) : undefined
              }
              onReplaceImage={
                onReplaceSceneImage ? () => onReplaceSceneImage(model.scene.index) : undefined
              }
              onSmartRegen={
                onSmartRegen
                  ? (action) => onSmartRegen(model.scene.index, action)
                  : undefined
              }
            />
          </div>
        ))}
        {!tiles.length ? (
          <p className="cine-sb-monitor__empty">{uiText('cineStoryboardEmpty')}</p>
        ) : null}
      </div>
    </section>
  )
}
