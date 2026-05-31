import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { buildStoryboardTileModels } from '../utils/cinematicStoryboardSceneModel'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { CinematicStoryboardTile } from './CinematicStoryboardTile'
import { NARRATOR_UI_PRESETS } from '../constants/narrators'
import { normalizeNarratorId } from '../constants/narrators'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeTileIndex: number
  onActiveTileIndexChange: (index: number) => void
  busyLabel: string | null
  /** Bordered monitor body — fallback scroll root when scene feed is not scrollable */
  scrollContainerRef?: RefObject<HTMLElement | null>
  onRegenerateScene?: (sceneIndex: number) => void
  onReplaceSceneImage?: (sceneIndex: number) => void
}

function scrollTileIntoView(scrollEl: HTMLElement, tileEl: HTMLElement, smooth: boolean) {
  const pad = 6
  const canScroll = scrollEl.scrollHeight > scrollEl.clientHeight + 1
  if (!canScroll) {
    tileEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'nearest' })
    return
  }
  const cRect = scrollEl.getBoundingClientRect()
  const tRect = tileEl.getBoundingClientRect()
  const relTop = tRect.top - cRect.top + scrollEl.scrollTop
  const tileH = tileEl.offsetHeight
  const viewH = scrollEl.clientHeight
  let top = relTop - pad
  if (tileH < viewH) {
    top = relTop - (viewH - tileH) / 2
  }
  top = Math.max(0, Math.min(top, scrollEl.scrollHeight - viewH))
  scrollEl.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

/** Vertical cinematic scene browser — sole scene list for generated stories. */
export function CinematicStoryboardMonitor({
  project,
  episode,
  activeTileIndex,
  onActiveTileIndexChange,
  busyLabel,
  scrollContainerRef,
  onRegenerateScene,
  onReplaceSceneImage
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
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

  const scrollToTile = useCallback(
    (ix: number) => {
      const flow = scrollRef.current
      const scrollEl = scrollContainerRef?.current ?? flow
      if (!scrollEl || !flow) return
      const tile = flow.querySelector(`[data-tile-index="${ix}"]`) as HTMLElement | null
      if (!tile) return
      const smooth = !reduced
      if (scrollEl.scrollHeight > scrollEl.clientHeight + 1) {
        scrollTileIntoView(scrollEl, tile, smooth)
        return
      }
      tile.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'nearest' })
    },
    [reduced, scrollContainerRef]
  )

  useEffect(() => {
    scrollToTile(activeTileIndex)
    setExpandedIndex(activeTileIndex)
  }, [activeTileIndex, scrollToTile])

  return (
    <section className="cine-sb-monitor cine-sb-monitor--reference" aria-labelledby="cine-sb-monitor-title">
      <div className="cine-sb-monitor__head">
        <h3 id="cine-sb-monitor-title" className="studio-mock-wireframe-monitor-h cine-sb-monitor__title">
          {uiText('storyMonitor')}
        </h3>
      </div>

      <div ref={scrollRef} className="cine-sb-monitor__flow cine-sb-monitor__flow--browser">
        {tiles.map((model) => (
          <div key={model.scene.index} data-tile-index={model.rowIndex} className="cine-sb-monitor__tile-slot">
            <CinematicStoryboardTile
              model={model}
              active={model.rowIndex === activeTileIndex}
              expanded={expandedIndex === model.rowIndex}
              subtitleStudio={vs.subtitleStudio}
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
