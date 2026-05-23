import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { buildStoryboardTileModels } from '../utils/cinematicStoryboardSceneModel'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { CinematicStoryboardTile } from './CinematicStoryboardTile'
import { NARRATOR_UI_PRESETS } from '../constants/narrators'
import { normalizeNarratorId } from '../constants/narrators'

export type StoryboardViewMode = 'compact' | 'cinematic'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeTileIndex: number
  onActiveTileIndexChange: (index: number) => void
  busyLabel: string | null
}

export function CinematicStoryboardMonitor({
  project,
  episode,
  activeTileIndex,
  onActiveTileIndexChange,
  busyLabel
}: Props) {
  const uiText = useUiText()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<StoryboardViewMode>('cinematic')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

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

      <div ref={scrollRef} className="cine-sb-monitor__flow panel studio-mock-panel">
        {tiles.map((model) => (
          <div key={model.scene.index} data-tile-index={model.rowIndex}>
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
