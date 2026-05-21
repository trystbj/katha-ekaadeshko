import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryScene } from '../types/story'
import type { StreamRevealState } from '../store/useStudioStore'
import { useStudioStore } from '../store/useStudioStore'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import {
  activeNarrationSceneIndex,
  liveScriptPhaseKey,
  scenesForLiveScriptPanel
} from '../utils/liveGenerationPresentation'
import { cinematicStageLabelKey } from '../utils/cinematicStageLabel'
import '../styles/live-generation-script-panel.css'

type JobSlice = { stage: string; progress: number } | null

type Props = {
  scenes: StoryScene[]
  busy: boolean
  streamReveal?: StreamRevealState | null
  job?: JobSlice
  focusedSpeaker?: string | null
  onSceneFocus?: (speaker: string, sceneIndex: number) => void
  emptyHint?: string
}

function SceneScriptCard({
  scene,
  focused,
  writing,
  onSceneFocus
}: {
  scene: StoryScene
  focused: boolean
  writing: boolean
  onSceneFocus?: (speaker: string, sceneIndex: number) => void
}) {
  const uiText = useUiText()
  const title = (scene.sceneTitle ?? '').trim() || uiText('cineSceneNum', { n: scene.index })
  const dialogueLines = scene.dialogueLines ?? []
  const narration = (scene.narrationText ?? scene.text).trim()
  const staging = (scene.visualDescription ?? '').trim()
  const emotion = (scene.emotionalTone ?? '').trim()
  const environment = (scene.environment ?? '').trim()
  const camera = (scene.cameraDirection ?? '').trim()
  const actions = (scene.characterActions ?? '').trim()

  return (
    <motion.li
      layout={false}
      initial={writing ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className={`live-gen-scene-card${focused ? ' live-gen-scene-card--focus' : ''}${writing ? ' live-gen-scene-card--writing' : ''}`}
      onClick={() => onSceneFocus?.(scene.character, scene.index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSceneFocus?.(scene.character, scene.index)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="live-gen-scene-card__head">
        <span className="live-gen-scene-card__num">{uiText('cineSceneNum', { n: scene.index })}</span>
        <h4 className="live-gen-scene-card__title">{title}</h4>
        {emotion ? (
          <span className="live-gen-scene-card__emotion" title={uiText('scriptReviewEmotion')}>
            {emotion}
          </span>
        ) : null}
      </header>
      {dialogueLines.length ? (
        <div className="live-gen-scene-card__block">
          <span className="live-gen-scene-card__label">{uiText('scriptReviewDialogue')}</span>
          {dialogueLines.map((d, di) => (
            <p key={`d-${scene.index}-${di}`} className="live-gen-scene-card__dialogue">
              <span className="live-gen-scene-card__who">{d.character}</span>
              {Glyphs.colon}
              {Glyphs.space}
              {Glyphs.ldquo}
              {d.line}
              {Glyphs.rdquo}
            </p>
          ))}
        </div>
      ) : null}
      {staging ? (
        <div className="live-gen-scene-card__block">
          <span className="live-gen-scene-card__label">{uiText('scriptReviewEditStaging')}</span>
          <p className="live-gen-scene-card__body">{staging}</p>
        </div>
      ) : null}
      {actions ? (
        <div className="live-gen-scene-card__block">
          <span className="live-gen-scene-card__label">{uiText('scriptReviewActions')}</span>
          <p className="live-gen-scene-card__body">{actions}</p>
        </div>
      ) : null}
      {environment ? (
        <div className="live-gen-scene-card__block">
          <span className="live-gen-scene-card__label">{uiText('scriptReviewLocation')}</span>
          <p className="live-gen-scene-card__body">{environment}</p>
        </div>
      ) : null}
      {camera ? (
        <div className="live-gen-scene-card__block">
          <span className="live-gen-scene-card__label">{uiText('scriptReviewCamera')}</span>
          <p className="live-gen-scene-card__body">{camera}</p>
        </div>
      ) : null}
      {!dialogueLines.length && !staging && !narration ? (
        <p className="live-gen-scene-card__muted">{uiText('scriptSceneVoiceEmpty')}</p>
      ) : null}
    </motion.li>
  )
}

export function LiveGenerationScriptPanel({
  scenes,
  busy,
  streamReveal,
  job,
  focusedSpeaker,
  onSceneFocus,
  emptyHint
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const isLive = busy || Boolean(streamReveal)
  const visibleScenes = useMemo(
    () => scenesForLiveScriptPanel(scenes, streamReveal),
    [scenes, streamReveal]
  )
  const narrationSceneIx = useMemo(
    () => activeNarrationSceneIndex(scenes, streamReveal),
    [scenes, streamReveal]
  )
  const narrationScene = scenes.find((s) => s.index === narrationSceneIx) ?? visibleScenes[visibleScenes.length - 1]
  const narrationBody = narrationScene
    ? (narrationScene.narrationText ?? narrationScene.text).trim()
    : ''
  const phaseKey = liveScriptPhaseKey(streamReveal ?? null)
  const stageKey = job?.stage ? cinematicStageLabelKey(job.stage, '') : phaseKey
  const progressPct =
    typeof job?.progress === 'number' && Number.isFinite(job.progress)
      ? Math.round(job.progress)
      : streamReveal && streamReveal.fullDoc.length > 0
        ? Math.round((streamReveal.visibleLen / streamReveal.fullDoc.length) * 100)
        : null

  const showScenes = visibleScenes.length > 0
  const showEmpty = !showScenes && !isLive

  const abortPipeline = () => useStudioStore.getState().abortGenerationInFlight()

  return (
    <div className="live-gen-script-panel">
      <section className="live-gen-script-panel__section" aria-labelledby="live-gen-scene-script-heading">
        <header className="live-gen-script-panel__section-head">
          <h4 id="live-gen-scene-script-heading" className="live-gen-script-panel__section-title">
            {uiText('liveGenSectionSceneScript')}
          </h4>
          {isLive ? (
            <span className="live-gen-script-panel__status-chip" aria-live="polite">
              <span className="live-gen-script-panel__pulse" aria-hidden />
              {uiText(stageKey)}
            </span>
          ) : showScenes ? (
            <span className="live-gen-script-panel__status-chip live-gen-script-panel__status-chip--ready">
              {uiText('liveGenScriptPersisted')}
            </span>
          ) : null}
        </header>

        {isLive && !showScenes ? (
          <p className="live-gen-script-panel__waiting">{uiText('liveGenSceneScriptWaiting')}</p>
        ) : null}

        {showScenes ? (
          <ul className="live-gen-script-panel__scenes">
            <AnimatePresence initial={!reduced}>
              {visibleScenes.map((s, i) => {
                const focused =
                  Boolean(focusedSpeaker) &&
                  s.character.trim().toLowerCase() === focusedSpeaker!.trim().toLowerCase()
                const writing = Boolean(streamReveal) && i === visibleScenes.length - 1
                return (
                  <SceneScriptCard
                    key={s.index}
                    scene={s}
                    focused={focused}
                    writing={writing}
                    onSceneFocus={onSceneFocus}
                  />
                )
              })}
            </AnimatePresence>
          </ul>
        ) : null}

        {streamReveal ? (
          <div className="live-gen-script-panel__reveal-toolbar">
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => useStudioStore.getState().setStreamRevealPaused(!streamReveal.paused)}
            >
              {streamReveal.paused ? uiText('liveGenContinue') : uiText('liveGenPause')}
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => useStudioStore.getState().skipStreamRevealToEnd()}>
              {uiText('liveGenSkipReveal')}
            </button>
          </div>
        ) : busy ? (
          <div className="live-gen-script-panel__reveal-toolbar">
            <button type="button" className="btn btn-ghost btn-small" onClick={abortPipeline}>
              {uiText('liveGenStopPipeline')}
            </button>
          </div>
        ) : null}
      </section>

      <section className="live-gen-script-panel__section live-gen-script-panel__section--voice" aria-labelledby="live-gen-voice-heading">
        <header className="live-gen-script-panel__section-head">
          <h4 id="live-gen-voice-heading" className="live-gen-script-panel__section-title">
            {uiText('liveGenSectionVoiceNarration')}
          </h4>
          {progressPct != null && isLive ? (
            <span className="live-gen-script-panel__progress">{progressPct}{Glyphs.percent}</span>
          ) : null}
        </header>

        <div className="live-gen-voice-box" aria-live="polite">
          {narrationScene ? (
            <>
              <div className="live-gen-voice-box__meta">
                <span className="live-gen-voice-box__speaker">{uiText('cineNarratorAi')}</span>
                {narrationScene.emotionalTone ? (
                  <span className="live-gen-voice-box__emotion">{narrationScene.emotionalTone}</span>
                ) : null}
                {isLive ? (
                  <span className="live-gen-voice-box__status">{uiText('liveGenVoiceDrafting')}</span>
                ) : (
                  <span className="live-gen-voice-box__status live-gen-voice-box__status--ready">
                    {uiText('liveGenVoiceReady')}
                  </span>
                )}
              </div>
              <p className="live-gen-voice-box__line">
                {narrationBody || (isLive ? uiText('liveGenVoiceWaiting') : uiText('scriptSceneVoiceEmpty'))}
                {isLive && narrationBody && streamReveal && !streamReveal.paused ? (
                  <span className="live-gen-voice-box__caret" aria-hidden>
                    {Glyphs.pipeMarker}
                  </span>
                ) : null}
              </p>
            </>
          ) : (
            <p className="live-gen-voice-box__empty">{isLive ? uiText('liveGenVoiceWaiting') : uiText('scriptSceneVoiceEmpty')}</p>
          )}
        </div>
      </section>

      {showEmpty ? <p className="live-gen-script-panel__empty">{emptyHint ?? uiText('scriptPreviewEmpty')}</p> : null}
    </div>
  )
}
