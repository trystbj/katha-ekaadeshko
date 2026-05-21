import { useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { AnimatePresence, motion } from 'framer-motion'
import type { StoryScene } from '../types/story'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { StreamRevealState } from '../store/useStudioStore'
import { useStudioStore } from '../store/useStudioStore'
import { liveRevealPhaseKey } from '../utils/liveRevealDocument'

type Props = {
  scenes: StoryScene[]
  rawStructured?: string
  busy: boolean
  streamLines: string[]
  /** Live typing pass after stream JSON returns (initial Generate Story). */
  streamReveal?: StreamRevealState | null
  focusedSpeaker?: string | null
  onSceneFocus?: (speaker: string, sceneIndex: number) => void
  /** Overrides default empty-state copy (e.g. mock UI placeholder). */
  emptyHint?: string
  /**
   * Scene | Script | Voice panel: live stream during generation; after generate,
   * scene staging + dialogue only (narration belongs in Story Monitor / storyboard).
   */
  scriptVoicePanel?: boolean
}

export function LiveScriptPreview({
  scenes,
  rawStructured,
  busy,
  streamLines,
  streamReveal,
  focusedSpeaker,
  onSceneFocus,
  emptyHint,
  scriptVoicePanel = false
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const streamText = useMemo(() => streamLines.filter(Boolean).join('\n'), [streamLines])
  const [typedLen, setTypedLen] = useState(0)
  const revealPreRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!busy || !streamText.length || streamReveal) {
      setTypedLen(0)
      return
    }
    setTypedLen(0)
    if (reduced) {
      setTypedLen(streamText.length)
      return
    }
    const step = 3
    const ms = 38
    const id = window.setInterval(() => {
      setTypedLen((n) => (n >= streamText.length ? n : Math.min(streamText.length, n + step)))
    }, ms)
    return () => window.clearInterval(id)
  }, [busy, streamText, reduced, streamReveal])

  useEffect(() => {
    if (!streamReveal) return
    const el = revealPreRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth'
    })
  }, [streamReveal?.visibleLen, streamReveal, reduced])

  const showRevealStream = Boolean(streamReveal)
  const showJobStream = Boolean(busy) && streamText.length > 0 && !showRevealStream
  const showScenes =
    scenes.length > 0 && !showJobStream && (!showRevealStream || scriptVoicePanel)

  const revealSlice = streamReveal ? streamReveal.fullDoc.slice(0, streamReveal.visibleLen) : ''
  const revealPhaseKey = streamReveal ? liveRevealPhaseKey(streamReveal.fullDoc, streamReveal.visibleLen) : 'liveGenPhaseTitle'

  const abortPipeline = () => useStudioStore.getState().abortGenerationInFlight()

  return (
    <div className="live-script-preview">
      {showRevealStream && streamReveal ? (
        <div className="live-script-preview__stream" aria-live="polite">
          <div className="live-script-preview__pulse-row">
            <span className="live-script-preview__pulse-dot" />
            <span className="live-script-preview__pulse-label">{uiText(revealPhaseKey)}</span>
          </div>
          <pre ref={revealPreRef} className="live-script-preview__typewriter live-script-preview__typewriter--reveal">
            {revealSlice}
            {!streamReveal.paused && streamReveal.visibleLen < streamReveal.fullDoc.length ? (
              <span className="live-script-preview__caret" aria-hidden>
                {Glyphs.pipeMarker}
              </span>
            ) : null}
          </pre>
          <div className="live-script-preview__reveal-toolbar">
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
            <button type="button" className="btn btn-ghost btn-small" onClick={() => useStudioStore.getState().toggleStreamRevealTypingSound()}>
              {streamReveal.typingSound ? uiText('liveGenTypingSoundDisable') : uiText('liveGenTypingSoundEnable')}
            </button>
          </div>
        </div>
      ) : null}

      {showJobStream ? (
        <div className="live-script-preview__stream" aria-live="polite">
          <div className="live-script-preview__pulse-row">
            <span className="live-script-preview__pulse-dot" />
            <span className="live-script-preview__pulse-label">{uiText('scriptLiveGeneratingHint')}</span>
          </div>
          <pre className="live-script-preview__typewriter">{streamText.slice(0, typedLen)}</pre>
          <div className="live-script-preview__reveal-toolbar">
            <button type="button" className="btn btn-ghost btn-small" onClick={abortPipeline}>
              {uiText('liveGenStopPipeline')}
            </button>
          </div>
        </div>
      ) : null}

      {showScenes ? (
        <motion.ul className="live-script-preview__blocks" layout={false}>
          <AnimatePresence initial={!reduced}>
            {scenes.map((s) => {
              const focused =
                focusedSpeaker &&
                s.character.trim().toLowerCase() === focusedSpeaker.trim().toLowerCase()
              const isNarrator =
                s.character.trim().toLowerCase() === 'narrator' ||
                s.character.trim().toLowerCase() === 'narration'
              const narrationBody = (s.narrationText ?? s.text).trim()
              const dialogueLines = s.dialogueLines ?? []
              const sceneStaging = (s.visualDescription ?? '').trim()
              const voiceOnly = scriptVoicePanel
              const sceneStoryBody = voiceOnly
                ? sceneStaging ||
                  (dialogueLines.length
                    ? ''
                    : narrationBody && !isNarrator
                      ? narrationBody
                      : '')
                : narrationBody
              return (
                <motion.li
                  key={s.index}
                  layout={false}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={
                    reduced
                      ? undefined
                      : {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.35, delay: Math.min(0.35, s.index * 0.04) }
                        }
                  }
                  className={`live-script-preview__block ${focused ? 'live-script-preview__block--focus' : ''} ${
                    isNarrator ? 'live-script-preview__block--narrator' : ''
                  }`}
                  onClick={() => onSceneFocus?.(s.character, s.index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSceneFocus?.(s.character, s.index)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="live-script-preview__who">
                    {voiceOnly ? uiText('cineSceneNum', { n: s.index }) : s.character}
                    {!voiceOnly && s.lineType === 'Thought' ? (
                      <span className="live-script-preview__thought-tag">{uiText('scriptThoughtTag')}</span>
                    ) : null}
                    {Glyphs.colon}
                  </span>
                  {sceneStoryBody ? (
                    <span
                      className={
                        voiceOnly
                          ? 'live-script-preview__line live-script-preview__line--scene-story'
                          : 'live-script-preview__line'
                      }
                    >
                      {voiceOnly ? (
                        sceneStoryBody
                      ) : (
                        <>
                          {Glyphs.ldquo}
                          {sceneStoryBody}
                          {Glyphs.rdquo}
                        </>
                      )}
                      {!voiceOnly && s.emoji ? (
                        <span aria-hidden>
                          {Glyphs.space}
                          {s.emoji}
                        </span>
                      ) : null}
                    </span>
                  ) : voiceOnly ? (
                    <span className="live-script-preview__line live-script-preview__line--scene-story live-script-preview__line--muted">
                      {uiText('scriptSceneVoiceEmpty')}
                    </span>
                  ) : null}
                  {dialogueLines.length
                    ? dialogueLines.map((d, di) => (
                        <span key={`${s.index}-d-${di}`} className="live-script-preview__dialogue">
                          <span className="live-script-preview__who">
                            {d.character}
                            {Glyphs.colon}
                          </span>
                          <span className="live-script-preview__line">
                            {Glyphs.ldquo}
                            {d.line}
                            {Glyphs.rdquo}
                          </span>
                        </span>
                      ))
                    : null}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      ) : null}

      {!showJobStream && !showRevealStream && !showScenes ? (
        rawStructured && rawStructured.trim() ? (
          <pre className="script-pre live-script-preview__raw">{rawStructured}</pre>
        ) : (
          <p className="live-script-preview__empty">{emptyHint ?? uiText('scriptPreviewEmpty')}</p>
        )
      ) : null}

      {showScenes && rawStructured && rawStructured.trim() ? (
        <details className="live-script-preview__details">
          <summary>{uiText('scriptRawStructuredToggle')}</summary>
          <pre className="script-pre live-script-preview__raw">{rawStructured}</pre>
        </details>
      ) : null}
    </div>
  )
}
