import { useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { CinematicStoryboardTileModel } from '../utils/cinematicStoryboardSceneModel'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { storyboardSubtitleOverlayStyle } from '../utils/storyboardSubtitleOverlay'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { SmartSceneRegenMenu, type SmartRegenAction } from './SmartSceneRegenMenu'
type ViewMode = 'compact' | 'cinematic'

type Props = {
  model: CinematicStoryboardTileModel
  active: boolean
  expanded: boolean
  viewMode: ViewMode
  subtitleStudio: SubtitleStudioState
  narratorLabel: string
  onSelect: () => void
  onToggleExpand: () => void
  onRegenerateScene?: () => void
  onReplaceImage?: () => void
  onSmartRegen?: (action: SmartRegenAction) => void
  busy?: boolean
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
  onSelect,
  onToggleExpand,
  onRegenerateScene,
  onReplaceImage,
  onSmartRegen,
  busy = false
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const [hover, setHover] = useState(false)
  const { scene, imageUrl, plan } = model
  const showMiniMotion = hover && !reduced && imageUrl
  const motionClass = motionPreviewClass(plan?.motion?.preset)
  const sceneTitle =
    scene.sceneTitle?.trim() ||
    uiText('cineSceneNum', { n: String(scene.index) })
  const narrationBody = (scene.narrationText ?? scene.text).trim()
  const dialogueLines = scene.dialogueLines ?? []
  const showStoryCopy = active || expanded

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
            />
          ) : (
            <div className="cine-sb-tile__img-placeholder" />
          )}
          <span className="cine-sb-tile__scene-num">
            {uiText('cineSceneNum', { n: scene.index })}
          </span>
          {subtitleLine && subtitleStudio.subtitlesOn ? (
            <div className="cine-sb-tile__sub-overlay" style={storyboardSubtitleOverlayStyle(subtitleStudio)}>
              {subtitleLine.slice(0, viewMode === 'compact' ? 72 : 140)}
              {subtitleLine.length > 140 ? '…' : ''}
            </div>
          ) : null}
        </div>

        <div className="cine-sb-tile__body">
          <p className="cine-sb-tile__scene-title">{sceneTitle}</p>

          <div className="cine-sb-tile__tags">
            {model.tagKeys.map((key) => (
              <span key={key} className="cine-sb-tile__tag">
                {uiText(key)}
              </span>
            ))}
          </div>

          {showStoryCopy && narrationBody ? (
            <p className="cine-sb-tile__narration">{narrationBody}</p>
          ) : null}

          {showStoryCopy && dialogueLines.length
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

          {showStoryCopy && scene.visualDescription?.trim() ? (
            <p className="cine-sb-tile__visual">{scene.visualDescription.trim()}</p>
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
        </div>
      </button>

      <div className="cine-sb-tile__actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
        >
          {expanded ? uiText('cineTileCollapse') : uiText('cineTileExpand')}
        </button>
        {onSmartRegen ? (
          <SmartSceneRegenMenu
            disabled={busy}
            onAction={(action) => {
              onSmartRegen(action)
            }}
          />
        ) : null}
        {onRegenerateScene && !onSmartRegen ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onRegenerateScene()
            }}
          >
            {uiText('cineActionRegenerate')}
          </button>
        ) : null}
        {onReplaceImage && !onSmartRegen ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onReplaceImage()
            }}
          >
            {uiText('cineActionReplaceImage')}
          </button>
        ) : null}
      </div>
    </article>
  )
}
