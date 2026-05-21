import { useCallback, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import {
  productionStageLabelKey,
  sceneStatusLabelKey,
  patchSceneProductionStatus
} from '../utils/productionWorkflow'
import type { ProductionStage, SceneProductionStatus } from '../types/story'
import { fetchRegenerationPlan } from '../creator/creatorApi'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  busyLabel: string | null
  onGenerateVisuals: (opts?: { sceneIndices?: number[] }) => void
  onNextScene: (sceneIndex: number) => void
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
}

const STAGE_ORDER: ProductionStage[] = [
  'writing',
  'script_review',
  'visual_generation',
  'narration_motion',
  'video_assembly',
  'export_complete'
]

export function ScriptReviewWorkspace({
  project,
  episode,
  busyLabel,
  onGenerateVisuals,
  onNextScene,
  patchProject
}: Props) {
  const uiText = useUiText()
  const [expandedIx, setExpandedIx] = useState<number | null>(episode.scenes[0]?.index ?? null)
  const [activeScene, setActiveScene] = useState(episode.scenes[0]?.index ?? 1)
  const busy = Boolean(busyLabel)

  const currentStage = project.productionStage ?? 'script_review'

  const patchScene = useCallback(
    (sceneIndex: number, patch: Partial<StoryScene>) => {
      patchProject((p) => ({
        ...p,
        episodes: p.episodes.map((e) =>
          e.number === episode.number
            ? {
                ...e,
                scenes: e.scenes.map((s) => (s.index === sceneIndex ? { ...s, ...patch } : s))
              }
            : e
        ),
        updatedAt: new Date().toISOString()
      }))
    },
    [episode.number, patchProject]
  )

  const setSceneStatus = useCallback(
    (sceneIndex: number, status: SceneProductionStatus) => {
      patchProject((p) => ({
        ...p,
        episodes: p.episodes.map((e) =>
          e.number === episode.number
            ? { ...e, scenes: patchSceneProductionStatus(e.scenes, sceneIndex, status) }
            : e
        ),
        updatedAt: new Date().toISOString()
      }))
    },
    [episode.number, patchProject]
  )

  const approvedIndices = useMemo(
    () =>
      episode.scenes
        .filter((s) => s.productionStatus === 'scene_approved' || s.productionStatus === 'queued')
        .map((s) => s.index),
    [episode.scenes]
  )

  const handleRegenerateScene = useCallback(
    async (sceneIndex: number) => {
      const rowIx = episode.scenes.findIndex((s) => s.index === sceneIndex)
      if (rowIx < 0) return
      try {
        await fetchRegenerationPlan('full_scene', rowIx + 1, episode, { execute: false })
        patchScene(sceneIndex, { productionStatus: 'awaiting_review' })
      } catch {
        /* plan-only stub — user can edit manually */
      }
    },
    [episode, patchScene]
  )

  return (
    <div className="script-review-workspace">
      <header className="script-review-workspace__head">
        <h2 className="script-review-workspace__title">{uiText('scriptReviewTitle')}</h2>
        <p className="script-review-workspace__subtitle">{uiText('scriptReviewSubtitle')}</p>
        <p className="script-review-workspace__status" role="status">
          {uiText(productionStageLabelKey(currentStage))} · {uiText('scriptReviewAwaitingUser')}
        </p>
      </header>

      <nav className="script-review-workspace__stages" aria-label={uiText('productionStagesNav')}>
        {STAGE_ORDER.map((st, i) => {
          const on = st === currentStage || (currentStage === 'script_review' && st === 'script_review')
          const done =
            STAGE_ORDER.indexOf(currentStage) > i ||
            (currentStage === 'script_review' && i === 0)
          return (
            <span
              key={st}
              className={`script-review-workspace__stage${on ? ' script-review-workspace__stage--on' : ''}${done ? ' script-review-workspace__stage--done' : ''}`}
            >
              {uiText(productionStageLabelKey(st))}
            </span>
          )
        })}
      </nav>

      <div className="script-review-workspace__actions script-review-workspace__actions--global">
        <button
          type="button"
          className="btn btn-generate-cta"
          disabled={busy}
          onClick={() => onGenerateVisuals()}
        >
          {uiText('scriptReviewGenerateAllVisuals')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || !approvedIndices.length}
          onClick={() => onGenerateVisuals({ sceneIndices: approvedIndices })}
        >
          {uiText('scriptReviewGenerateApproved')}
        </button>
      </div>

      <div className="script-review-workspace__scenes" role="list">
        {episode.scenes.map((sc) => {
          const open = expandedIx === sc.index
          const status = sc.productionStatus ?? 'awaiting_review'
          return (
            <article
              key={sc.index}
              role="listitem"
              className={`script-review-scene-card${open ? ' script-review-scene-card--open' : ''}${activeScene === sc.index ? ' script-review-scene-card--active' : ''}`}
            >
              <header className="script-review-scene-card__head">
                <button
                  type="button"
                  className="script-review-scene-card__toggle"
                  onClick={() => {
                    setExpandedIx(open ? null : sc.index)
                    setActiveScene(sc.index)
                  }}
                >
                  <span className="script-review-scene-card__num">{sc.index}</span>
                  <span className="script-review-scene-card__title">
                    {sc.sceneTitle || uiText('cineSceneNum', { n: String(sc.index) })}
                  </span>
                  <span className="script-review-scene-card__badge">{uiText(sceneStatusLabelKey(status))}</span>
                </button>
              </header>

              {open ? (
                <div className="script-review-scene-card__body">
                  {sc.emotionalTone ? (
                    <p>
                      <strong>{uiText('scriptReviewEmotion')}</strong> {sc.emotionalTone}
                    </p>
                  ) : null}
                  {sc.visualDescription ? (
                    <p>
                      <strong>{uiText('scriptReviewEnvironment')}</strong> {sc.visualDescription}
                    </p>
                  ) : null}
                  {sc.environment ? (
                    <p>
                      <strong>{uiText('scriptReviewLocation')}</strong> {sc.environment}
                    </p>
                  ) : null}
                  {sc.cameraDirection ? (
                    <p>
                      <strong>{uiText('scriptReviewCamera')}</strong> {sc.cameraDirection}
                    </p>
                  ) : null}
                  {sc.characterActions ? (
                    <p>
                      <strong>{uiText('scriptReviewActions')}</strong> {sc.characterActions}
                    </p>
                  ) : null}
                  {sc.narrationText ? (
                    <p>
                      <strong>{uiText('scriptReviewNarration')}</strong> {sc.narrationText}
                    </p>
                  ) : null}
                  {sc.dialogueLines?.length ? (
                    <div>
                      <strong>{uiText('scriptReviewDialogue')}</strong>
                      <ul className="script-review-scene-card__dialogue">
                        {sc.dialogueLines.map((d, i) => (
                          <li key={i}>
                            <span className="script-review-scene-card__speaker">{d.character}:</span> {d.line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <label className="script-review-scene-card__edit-label">
                    {uiText('scriptReviewEditStaging')}
                    <textarea
                      className="idea-input script-review-scene-card__edit"
                      value={sc.visualDescription ?? ''}
                      rows={3}
                      onChange={(e) => patchScene(sc.index, { visualDescription: e.target.value })}
                    />
                  </label>
                </div>
              ) : null}

              <footer className="script-review-scene-card__actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setExpandedIx(sc.index)
                    setActiveScene(sc.index)
                  }}
                >
                  {uiText('scriptReviewEdit')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => void handleRegenerateScene(sc.index)}
                >
                  {uiText('regenerateScene')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setSceneStatus(sc.index, 'scene_approved')}
                >
                  {uiText('scriptReviewApprove')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setSceneStatus(sc.index, 'skipped')}
                >
                  {uiText('scriptReviewSkip')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setSceneStatus(sc.index, 'queued')}
                >
                  {uiText('scriptReviewQueue')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => onGenerateVisuals({ sceneIndices: [sc.index] })}
                >
                  {uiText('scriptReviewGenerateScene')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => onNextScene(sc.index)}
                >
                  {uiText('scriptReviewNext')}
                </button>
              </footer>
            </article>
          )
        })}
      </div>
    </div>
  )
}
