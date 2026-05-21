import { useCallback, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { CinematicStoryboardTileModel } from '../utils/cinematicStoryboardSceneModel'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { storyboardSubtitleOverlayStyle, storyboardSubtitlePositionClass } from '../utils/storyboardSubtitleOverlay'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
type ViewMode = 'compact' | 'cinematic'

type Props = {
  model: CinematicStoryboardTileModel
  active: boolean
  expanded: boolean
  viewMode: ViewMode
  subtitleStudio: SubtitleStudioState
  narratorLabel: string
  narrationAudioUrl?: string
  onSelect: () => void
  onToggleExpand: () => void
  onRegenerateScene?: (sceneIndex: number) => void
}

const STATUS_I18N: Record<string, string> = {
  generated: 'cineStatusGenerated',
  rendering: 'cineStatusRendering',
  narration_synced: 'cineStatusNarration',
  subtitle_synced: 'cineStatusSubtitle',
  export_ready: 'cineStatusExportReady',
  rendered: 'cineStatusRendered'
}

function motionPreviewClass(preset: string | undefined): string {
  const p = String(preset || 'static')
  const map: Record<string, string> = {
    slow_zoom_in: 'cinematic-player__motion-layer--slow_zoom_in',
    cinematic_push: 'cinematic-player__motion-layer--cinematic_push',
    pull_out: 'cinematic-player__motion-layer--pull_out',
    parallax_float: 'cinematic-player__motion-layer--parallax_float',
    smooth_pan: 'cinematic-player__motion-layer--smooth_pan',
    handheld_micro: 'cinematic-player__motion-layer--handheld_micro',
    shake_dramatic: 'cinematic-player__motion-layer--shake_dramatic'
  }
  return map[p] || ''
}

export function CinematicStoryboardTile({
  model,
  active,
  expanded,
  viewMode,
  subtitleStudio,
  narratorLabel,
  narrationAudioUrl,
  onSelect,
  onToggleExpand,
  onRegenerateScene
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const [hover, setHover] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { scene, imageUrl, plan } = model
  const showMiniMotion = hover && !reduced && imageUrl
  const motionClass = motionPreviewClass(plan?.motion?.preset)
  const narrationBody = (scene.narrationText ?? scene.text).trim()
  const dialogueLines = scene.dialogueLines ?? []
  const sceneTitle = (scene.sceneTitle ?? '').trim() || uiText('cineSceneNum', { n: scene.index })
  const emotion = (scene.emotionalTone ?? '').trim()
  const environment = (scene.environment ?? '').trim()
  const camera = (scene.cameraDirection ?? '').trim()
  const actions = (scene.characterActions ?? '').trim()

  const playNarration = useCallback(() => {
    const url = narrationAudioUrl?.trim()
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio(url)
    const a = audioRef.current
    a.currentTime = 0
    void a.play().catch(() => {})
  }, [narrationAudioUrl])

  const subtitleLine =
    subtitleStudio.subtitlesOn && scene.text.trim()
      ? scene.text.trim()
      : ''

  return (
    <article
      className={`cine-sb-tile${active ? ' cine-sb-tile--active' : ''}${expanded ? ' cine-sb-tile--expanded' : ''}${viewMode === 'cinematic' ? ' cine-sb-tile--cinematic' : ''}${!imageUrl ? ' cine-sb-tile--no-img' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="cine-sb-tile__connector" aria-hidden />

      <button type="button" className="cine-sb-tile__select" onClick={onSelect}>
        <div className="cine-sb-tile__frame">
          {imageUrl ? (
            <div
              className={`cine-sb-tile__img-wrap${showMiniMotion && motionClass ? ` ${motionClass}` : ''}`}
              style={{ backgroundImage: `url(${imageUrl})` }}
              role="img"
              aria-label={sceneTitle}
            />
          ) : (
            <div className="cine-sb-tile__img-placeholder" />
          )}
          <span className="cine-sb-tile__scene-num">
            {uiText('cineSceneNum', { n: scene.index })}
          </span>
          {subtitleLine && subtitleStudio.subtitlesOn ? (
            <div
              className={`cine-sb-tile__sub-overlay ${storyboardSubtitlePositionClass(subtitleStudio.positionPreset)}`}
              style={storyboardSubtitleOverlayStyle(subtitleStudio)}
            >
              {subtitleLine.slice(0, viewMode === 'compact' ? 72 : 140)}
              {subtitleLine.length > 140 ? '…' : ''}
            </div>
          ) : null}
        </div>

        <div className="cine-sb-tile__body">
          <div className="cine-sb-tile__tags">
            {model.tagKeys.map((key) => (
              <span key={key} className="cine-sb-tile__tag">
                {uiText(key)}
              </span>
            ))}
          </div>

          <p className="cine-sb-tile__narration">{narrationBody}</p>

          {dialogueLines.length
            ? dialogueLines.map((d, di) => (
                <p key={`dlg-${scene.index}-${di}`} className="cine-sb-tile__dialogue">
                  <span className="cine-sb-tile__dialogue-who">{d.character}</span>
                  {Glyphs.colon}
                  {Glyphs.space}
                  {Glyphs.ldquo}
                  {d.line}
                  {Glyphs.rdquo}
                </p>
              ))
            : null}

          {(expanded || viewMode === 'cinematic') && scene.visualDescription ? (
            <p className="cine-sb-tile__visual">{scene.visualDescription}</p>
          ) : null}

          <div className="cine-sb-tile__meta-row">
            <span className="cine-sb-tile__meta" title={uiText(model.motionKey)}>
              {uiText(model.motionKey)}
            </span>
            <span className="cine-sb-tile__meta">{uiText(model.transitionKey)}</span>
            <span className="cine-sb-tile__meta">
              {model.durationSec}s{Glyphs.space}
              {Glyphs.middot}
              {Glyphs.space}
              {uiText(model.moodKey)}
            </span>
          </div>

          <div className="cine-sb-tile__voice">
            <span className="cine-sb-tile__voice-ic" aria-hidden>
              ♪
            </span>
            {narratorLabel}
            {plan?.subtitle?.leadInMs != null ? (
              <span className="cine-sb-tile__timing">
                {Glyphs.middot}
                {Glyphs.space}+{plan.subtitle.leadInMs}ms
              </span>
            ) : null}
          </div>

          {model.castLabels.length ? (
            <div className="cine-sb-tile__cast">
              {model.castLabels.map((label) => (
                <span key={label} className="cine-sb-tile__cast-chip">
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="cine-sb-tile__statuses">
            {model.statuses.map((s) => (
              <span key={s} className={`cine-sb-tile__status cine-sb-tile__status--${s}`}>
                {uiText(STATUS_I18N[s] ?? s)}
              </span>
            ))}
          </div>

          <div className="cine-sb-tile__actions">
            <button
              type="button"
              className="btn btn-ghost btn-small"
              disabled={!narrationAudioUrl?.trim()}
              title={uiText('cinePlayNarration')}
              onClick={(e) => {
                e.stopPropagation()
                playNarration()
              }}
            >
              {uiText('cinePlayNarration')}
            </button>
            {onRegenerateScene ? (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={(e) => {
                  e.stopPropagation()
                  onRegenerateScene(scene.index)
                }}
              >
                {uiText('cineRegenerateScene')}
              </button>
            ) : null}
          </div>
        </div>
      </button>

      <button
        type="button"
        className="cine-sb-tile__expand btn btn-ghost btn-small"
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand()
        }}
      >
        {expanded ? uiText('cineTileCollapse') : uiText('cineTileExpand')}
      </button>
    </article>
  )
}
