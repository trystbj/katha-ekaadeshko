import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useEffect, useState } from 'react'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { STUDIO_SEASON_PRESETS, normalizeStudioSeasonId } from '../constants/studioSeasonThemes'
import type { StoryCharacter, StoryScene } from '../types/story'
import { RenderVideoPlayback } from './RenderVideoPlayback'
import { VoiceReactiveBars } from './VoiceReactiveBars'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export type PreviewStageTab = 'video' | 'character' | 'scene' | 'dialogue'

type Props = {
  seasonId: StudioSeasonId
  sceneUrls: string[]
  busy: boolean
  jobProgress?: number
  sectionClassName?: string
  videoUrl?: string | null
  storyLanguage: string
  scenes: StoryScene[]
  characters: StoryCharacter[]
}

const TABS: PreviewStageTab[] = ['video', 'character', 'scene', 'dialogue']

export function DynamicPreviewStage({
  seasonId,
  sceneUrls,
  busy,
  jobProgress,
  sectionClassName = 'studio-mock-preview-wrap workspace-premium__stage',
  videoUrl,
  storyLanguage,
  scenes,
  characters
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const [tab, setTab] = useState<PreviewStageTab>('scene')
  const [charIx, setCharIx] = useState(0)

  const preset = STUDIO_SEASON_PRESETS[normalizeStudioSeasonId(seasonId)]
  const hero = sceneUrls[0]
  const pct = typeof jobProgress === 'number' ? Math.min(100, Math.max(0, jobProgress)) : undefined
  const line = scenes.find((s) => String(s.text || '').trim().length > 0) ?? scenes[0]
  const ch = characters[charIx]

  useEffect(() => {
    if (videoUrl) setTab('video')
  }, [videoUrl])

  const tabLabel = (k: PreviewStageTab) => {
    switch (k) {
      case 'video':
        return uiText('previewTabVideo')
      case 'character':
        return uiText('previewTabCharacter')
      case 'scene':
        return uiText('previewTabScene')
      default:
        return uiText('previewTabDialogue')
    }
  }

  return (
    <section className={sectionClassName}>
      <h3 className="tw-text-xs tw-font-bold tw-tracking-[0.12em] tw-uppercase tw-text-amber-200/90 tw-mb-2">
        {uiText('previewStageTitle')}
      </h3>

      <div className="dynamic-preview__tabs" role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`dynamic-preview__tab ${tab === k ? 'dynamic-preview__tab--on' : ''}`}
            onClick={() => setTab(k)}
          >
            {tabLabel(k)}
          </button>
        ))}
      </div>

      <div className={`dynamic-preview__stage ${busy ? 'dynamic-preview__stage--busy' : ''}`}>
        <div className="dynamic-preview__aspect">
          <AnimatePresence mode="wait">
            {tab === 'video' ? (
              <motion.div
                key="video"
                className="dynamic-preview__pane"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
              >
                {videoUrl ? (
                  <div className="dynamic-preview__video-shell">
                    <RenderVideoPlayback videoUrl={videoUrl} scenes={scenes} storyLanguage={storyLanguage} />
                    <div className="dynamic-preview__video-extra">
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => {
                          const el = document.querySelector('.render-playback__video') as HTMLVideoElement | null
                          el?.requestFullscreen?.()
                        }}
                      >
                        {uiText('previewFullscreen')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dynamic-preview__placeholder dynamic-preview__placeholder--video">
                    <div className="dynamic-preview__placeholder-media" />
                    <button type="button" className="dynamic-preview__big-play" disabled aria-disabled>
                      ▶
                    </button>
                    <p className="dynamic-preview__placeholder-caption">{uiText('previewVideoPlaceholder')}</p>
                    <div className="dynamic-preview__fake-scrub">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={busy ? Math.min(100, (pct ?? 30)) : 0}
                        readOnly
                        aria-label={uiText('previewTimeline')}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}

            {tab === 'character' ? (
              <motion.div
                key="character"
                className="dynamic-preview__pane dynamic-preview__pane--character"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
              >
                {characters.length ? (
                  <>
                    <div className="dynamic-preview__char-stage">
                      <motion.div
                        className="dynamic-preview__char-breathe"
                        animate={
                          reduced ? undefined : { scale: [1, 1.02, 1], y: [0, -3, 0] }
                        }
                        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {ch?.baseImageUrl ? (
                          <img src={ch.baseImageUrl} alt={ch.name} className="dynamic-preview__char-img" />
                        ) : (
                          <div className="dynamic-preview__char-silhouette" />
                        )}
                        {!reduced ? <span className="dynamic-preview__blink" aria-hidden /> : null}
                      </motion.div>
                      <div className="dynamic-preview__char-meta">
                        <div className="dynamic-preview__char-name">{ch?.name ?? '—'}</div>
                        <p className="dynamic-preview__char-bio">
                          {(ch?.personality || '').slice(0, 120)}
                          {(ch?.personality?.length ?? 0) > 120 ? '…' : ''}
                        </p>
                        <VoiceReactiveBars active={busy} />
                        <div className="dynamic-preview__char-nav">
                          <button
                            type="button"
                            className="btn btn-ghost btn-small"
                            onClick={() => setCharIx((i) => (i + characters.length - 1) % characters.length)}
                          >
                            {Glyphs.chevronLeft}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-small"
                            onClick={() => setCharIx((i) => (i + 1) % characters.length)}
                          >
                            {Glyphs.chevronRight}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="dynamic-preview__empty">{uiText('previewNoCharacters')}</p>
                )}
              </motion.div>
            ) : null}

            {tab === 'scene' ? (
              <motion.div
                key="scene"
                className="dynamic-preview__pane"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
              >
                <div className="dynamic-preview__scene-wrap">
                  <motion.div
                    className="dynamic-preview__scene-media"
                    style={{
                      backgroundImage: hero
                        ? `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url(${hero})`
                        : `${preset.overlay}, url(${preset.heroUrl})`
                    }}
                    animate={
                      reduced ? undefined : { scale: [1, 1.04, 1], x: ['0%', '-1.5%', '0%'], y: ['0%', '0.5%', '0%'] }
                    }
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="dynamic-preview__fog" aria-hidden />
                  <div className="dynamic-preview__rays" aria-hidden />
                  {busy ? (
                    <>
                      <div className="preview-stage__scan" />
                      <div className="preview-stage__progress">
                        <div
                          className={`preview-stage__progress-fill${pct != null ? ' preview-stage__progress-fill--fixed' : ''}`}
                          style={pct != null ? { width: `${pct}%`, animation: 'none' } : undefined}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="preview-stage__caption">
                    {busy
                      ? uiText('previewStageGenerating')
                      : hero
                        ? uiText('previewStageSceneHint')
                        : uiText('previewStageIdleHint')}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {tab === 'dialogue' ? (
              <motion.div
                key="dialogue"
                className="dynamic-preview__pane dynamic-preview__pane--dialogue"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
              >
                <div className="dynamic-preview__dialogue-avatar" aria-hidden>
                  {(line?.character || '?').slice(0, 1)}
                </div>
                <div className="dynamic-preview__subs">
                  <span className="dynamic-preview__subs-who">{line?.character ?? '—'}</span>
                  <p className="dynamic-preview__subs-text">
                    {line?.text ? `“${line.text}”` : uiText('previewDialoguePlaceholder')}
                  </p>
                </div>
                <VoiceReactiveBars active={Boolean(line?.text && line.text.trim())} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

    </section>
  )
}
