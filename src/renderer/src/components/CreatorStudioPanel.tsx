import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import type { RegenerationTarget } from '../types/creatorStudio'
import { buildPlaybackTimeline } from '../engines/timelineSync'
import {
  pushCreatorSnapshot,
  creatorUndo,
  creatorRedo,
  canCreatorUndo,
  canCreatorRedo
} from '../creator/creatorHistory'
import { fetchCopilotPatches, fetchQualityReport, fetchRegenerationPlan } from '../creator/creatorApi'
import { applyLiveDirectorToEpisode } from '../realtime/liveDirector'
import { bumpLivePreview } from '../realtime/livePreviewBus'
import { analyzeLiveCinematicFeedback } from '../../../../core/realtime/liveFeedbackAnalyzer'
import { LiveEmotionVisualizer } from './LiveEmotionVisualizer'
import { LiveFeedbackStrip } from './LiveFeedbackStrip'
import { useProductionPipelineStore } from '../store/useProductionPipelineStore'
import '../styles/creator-studio.css'

type Tab = 'storyboard' | 'scene' | 'timeline' | 'live' | 'copilot' | 'quality' | 'export'

type Props = {
  project: ProjectState
  episode: StoryEpisode | null
  episodeNumber: number
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  thumbnailUrl?: string | null
}

const REGEN_TARGETS: RegenerationTarget[] = [
  'visuals',
  'narration',
  'subtitles',
  'soundtrack',
  'camera',
  'pacing'
]

function regenLabelKey(target: RegenerationTarget) {
  const map: Partial<
    Record<
      RegenerationTarget,
      | 'creatorRegenVisuals'
      | 'creatorRegenNarration'
      | 'creatorRegenSubtitles'
      | 'creatorRegenSoundtrack'
      | 'creatorRegenCamera'
      | 'creatorRegenPacing'
    >
  > = {
    visuals: 'creatorRegenVisuals',
    narration: 'creatorRegenNarration',
    subtitles: 'creatorRegenSubtitles',
    soundtrack: 'creatorRegenSoundtrack',
    camera: 'creatorRegenCamera',
    pacing: 'creatorRegenPacing'
  }
  return map[target] ?? 'creatorRegenerate'
}

export function CreatorStudioPanel({ project, episode, episodeNumber, patchProject, thumbnailUrl }: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<Tab>('storyboard')
  const [sceneIx, setSceneIx] = useState(1)
  const [copilotCmd, setCopilotCmd] = useState('')
  const [busy, setBusy] = useState(false)
  const [quality, setQuality] = useState<{
    score: number
    suggestions: Array<{ id: string; message: string; severity: string }>
  } | null>(null)
  const [regenStatus, setRegenStatus] = useState('')

  const scenes = episode?.scenes ?? []
  const plan = episode?.cinematicDirectorPlan
  const orch = plan?.orchestration as
    | { sceneUnits?: Array<Record<string, unknown>>; transitions?: Array<Record<string, unknown>> }
    | undefined
  const liveRevision = useProductionPipelineStore((s) => s.liveRevision)
  const setLiveFeedback = useProductionPipelineStore((s) => s.setLiveFeedback)
  const liveFeedback = useProductionPipelineStore((s) => s.liveFeedback)

  const timeline = useMemo(() => {
    void liveRevision
    return buildPlaybackTimeline(plan, scenes.length)
  }, [plan, scenes.length, liveRevision])

  const patchEpisode = useCallback(
    (fn: (ep: StoryEpisode) => StoryEpisode, label: string, sceneIndex?: number) => {
      patchProject((p) => {
        const next = pushCreatorSnapshot(p, label, episodeNumber)
        return {
          ...next,
          episodes: next.episodes.map((e) => (e.number === episodeNumber ? fn(e) : e))
        }
      })
      bumpLivePreview(sceneIndex, label)
    },
    [patchProject, episodeNumber]
  )

  const onCopilot = useCallback(async () => {
    if (!episode || !copilotCmd.trim()) return
    setBusy(true)
    try {
      const planScenes = (plan as { scenes?: unknown[] } | undefined)?.scenes
      const scenePlan = (planScenes?.[sceneIx - 1] as Record<string, unknown>) ?? null
      const { patches } = await fetchCopilotPatches(copilotCmd, sceneIx, scenePlan)
      patchEpisode((ep) => applyLiveDirectorToEpisode(ep, patches), 'Co-pilot edit', sceneIx)
      setCopilotCmd('')
    } catch (e) {
      setRegenStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [episode, copilotCmd, sceneIx, plan, patchEpisode])

  const onRegen = useCallback(
    async (target: RegenerationTarget) => {
      if (!episode) return
      setBusy(true)
      setRegenStatus('')
      try {
        const { regenerationPlan } = await fetchRegenerationPlan(target, sceneIx, episode)
        const jobs = (regenerationPlan as { jobs?: unknown[] }).jobs
        setRegenStatus(`${target}: ${jobs?.length ?? 0} jobs planned (provider slots ready)`)
      } catch (e) {
        setRegenStatus(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [episode, sceneIx]
  )

  const onQuality = useCallback(async () => {
    if (!episode) return
    setBusy(true)
    try {
      const { report } = await fetchQualityReport(episode)
      setQuality({
        score: report.score,
        suggestions: report.suggestions.map((s, i) => ({
          id: String(s.id ?? i),
          message: String(s.message ?? ''),
          severity: String(s.severity ?? 'info')
        }))
      })
    } finally {
      setBusy(false)
    }
  }, [episode])

  const refreshLiveFeedback = useCallback(() => {
    if (!plan) return
    const report = analyzeLiveCinematicFeedback(plan as Record<string, unknown>, scenes.length)
    setLiveFeedback(report)
  }, [plan, scenes.length, setLiveFeedback])

  useEffect(() => {
    refreshLiveFeedback()
  }, [refreshLiveFeedback, liveRevision])

  if (!episode?.scenes?.length) {
    return <p className="creator-studio__empty">{uiText('creatorNoEpisode')}</p>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'storyboard', label: uiText('creatorTabStoryboard') },
    { id: 'scene', label: uiText('creatorTabScene') },
    { id: 'timeline', label: uiText('creatorTabTimeline') },
    { id: 'copilot', label: uiText('creatorTabCopilot') },
    { id: 'quality', label: uiText('creatorTabQuality') },
    { id: 'export', label: uiText('creatorTabExport') }
  ]

  return (
    <section className="creator-studio" aria-label={uiText('creatorStudioTitle')}>
      <header className="creator-studio__head">
        <h3 className="studio-mock-wireframe-monitor-h">{uiText('creatorStudioTitle')}</h3>
        <p className="creator-studio__blurb">{uiText('creatorStudioBlurb')}</p>
        <div className="creator-studio__history">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!canCreatorUndo(project)}
            onClick={() => patchProject((p) => creatorUndo(p))}
          >
            {uiText('creatorUndo')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!canCreatorRedo(project)}
            onClick={() => patchProject((p) => creatorRedo(p))}
          >
            {uiText('creatorRedo')}
          </button>
        </div>
      </header>

      <div className="creator-studio__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`creator-studio__tab${tab === t.id ? ' creator-studio__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'storyboard' && (
        <div className="creator-studio__storyboard">
          {scenes.map((s, i) => {
            const unit = orch?.sceneUnits?.[i]
            const b = timeline.boundaries[i]
            return (
              <button
                key={s.index}
                type="button"
                className={`creator-studio__card${sceneIx === s.index ? ' creator-studio__card--active' : ''}`}
                onClick={() => setSceneIx(s.index)}
              >
                {thumbnailUrl && i === 0 ? (
                  <span className="creator-studio__thumb" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
                ) : (
                  <span className="creator-studio__thumb creator-studio__thumb--placeholder" />
                )}
                <span className="creator-studio__card-title">{uiText('creatorSceneLabel', { n: s.index })}</span>
                <span className="creator-studio__card-meta">
                  {[
                    String(unit?.beatType ?? uiText('uiEllipsis')),
                    b
                      ? uiText('creatorSecondsUnit', { n: Math.round((b.endMs - b.startMs) / 1000) })
                      : uiText('uiEllipsis')
                  ].join(uiText('creatorMetaJoin'))}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'scene' && (
        <div className="creator-studio__scene">
          <label className="creator-studio__label">
            {uiText('creatorSceneLabel', { n: sceneIx })}
            <select className="select" value={sceneIx} onChange={(e) => setSceneIx(Number(e.target.value))}>
              {scenes.map((s) => (
                <option key={s.index} value={s.index}>
                  {s.index}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="select creator-studio__textarea"
            rows={3}
            value={scenes[sceneIx - 1]?.text ?? ''}
            onChange={(e) =>
              patchEpisode(
                (ep) => ({
                  ...ep,
                  scenes: ep.scenes.map((s) => (s.index === sceneIx ? { ...s, text: e.target.value } : s))
                }),
                'Edit scene text',
                sceneIx
              )
            }
          />
          <div className="creator-studio__regen-row">
            {REGEN_TARGETS.map((t) => (
              <button key={t} type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void onRegen(t)}>
                {uiText(regenLabelKey(t))}
              </button>
            ))}
          </div>
          {regenStatus ? <p className="creator-studio__status">{regenStatus}</p> : null}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="creator-studio__timeline">
          {timeline.boundaries.map((b) => (
            <div key={b.sceneIndex} className="creator-studio__tl-row">
              <span className="creator-studio__tl-label">{uiText('creatorSceneLabel', { n: b.sceneIndex })}</span>
              <div className="creator-studio__tl-track">
                <span className="creator-studio__tl-bar creator-studio__tl-bar--narr" title={uiText('creatorLayerNarration')} />
                <span className="creator-studio__tl-bar creator-studio__tl-bar--sub" title={uiText('creatorLayerSubtitles')} />
                <span className="creator-studio__tl-bar creator-studio__tl-bar--music" title={uiText('creatorLayerMusic')} />
              </div>
              <span className="creator-studio__tl-dur">
                {uiText('creatorSecondsUnit', { n: Math.round((b.endMs - b.startMs) / 1000) })}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'live' && (
        <div className="creator-studio__live">
          <LiveEmotionVisualizer
            plan={plan as Record<string, unknown> | undefined}
            sceneCount={scenes.length}
            activeSceneIndex={sceneIx}
          />
          <LiveFeedbackStrip report={liveFeedback} onRefresh={refreshLiveFeedback} busy={busy} />
        </div>
      )}

      {tab === 'copilot' && (
        <div className="creator-studio__copilot">
          <select className="select" value={sceneIx} onChange={(e) => setSceneIx(Number(e.target.value))}>
            {scenes.map((s) => (
              <option key={s.index} value={s.index}>
                {uiText('creatorSceneLabel', { n: s.index })}
              </option>
            ))}
          </select>
          <textarea
            className="select creator-studio__textarea"
            rows={2}
            placeholder={uiText('creatorCopilotPlaceholder')}
            value={copilotCmd}
            onChange={(e) => setCopilotCmd(e.target.value)}
          />
          <button type="button" className="btn" disabled={busy || !copilotCmd.trim()} onClick={() => void onCopilot()}>
            {uiText('creatorCopilotApply')}
          </button>
        </div>
      )}

      {tab === 'quality' && (
        <div className="creator-studio__quality">
          <button type="button" className="btn" disabled={busy} onClick={() => void onQuality()}>
            {uiText('creatorQualityRun')}
          </button>
          {quality ? (
            <>
              <p className="creator-studio__score">
                {uiText('creatorQualityScore')} {uiText('creatorQualityScoreValue', { pct: Math.round(quality.score * 100) })}
              </p>
              <ul className="creator-studio__suggestions">
                {quality.suggestions.map((s) => (
                  <li key={s.id} className={`creator-studio__suggestion creator-studio__suggestion--${s.severity}`}>
                    {s.message}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}

      {tab === 'export' && <p className="creator-studio__export-hint">{uiText('creatorExportHint')}</p>}
    </section>
  )
}
