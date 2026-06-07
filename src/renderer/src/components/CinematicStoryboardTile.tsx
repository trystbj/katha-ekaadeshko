import { useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { CinematicStoryboardTileModel } from '../utils/cinematicStoryboardSceneModel'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

import type { SceneImageStatus } from '../utils/sceneImageStatus'

type Props = {
  model: CinematicStoryboardTileModel
  active: boolean
  expanded: boolean
  subtitleStudio: SubtitleStudioState
  onSelect: () => void
  onToggleExpand: () => void
  onRegenerateScene?: () => void
  onGenerateSceneImage?: () => void
  onReplaceImage?: () => void
  imageStatus?: SceneImageStatus
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

function normSceneLine(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Story Monitor body copy — never composed playback text when dialogue is shown separately. */
function sceneSummary(scene: CinematicStoryboardTileModel['scene'], maxLen = 220): string {
  const title = scene.sceneTitle?.trim() || ''
  const narration = (scene.narrationText ?? '').trim()
  const visual = scene.visualDescription?.trim() || ''
  const dialogue = scene.dialogueLines ?? []

  let body = narration
  if (!body) {
    if (dialogue.length) {
      body = visual || dialogue.map((d) => d.line.trim()).find(Boolean) || ''
    } else {
      body = (scene.text ?? '').trim() || visual
    }
  }

  const nt = normSceneLine(title)
  const nb = normSceneLine(body)
  if (nt && nb) {
    if (nb === nt) body = ''
    else if (nb.startsWith(nt)) {
      body = body.slice(title.length).replace(/^[\s:—–-]+/, '').trim()
    }
  }

  if (!body) return visual
  return body.length > maxLen ? `${body.slice(0, maxLen).trim()}…` : body
}

function monitorDialogueLines(
  scene: CinematicStoryboardTileModel['scene'],
  summary: string
): Array<{ character: string; line: string }> {
  const narration = normSceneLine((scene.narrationText ?? '').trim())
  const sum = normSceneLine(summary.replace(/\u2026$/, '').trim())
  return (scene.dialogueLines ?? []).filter((d) => {
    const line = d.line.trim()
    if (!line) return false
    const n = normSceneLine(line)
    if (narration && n === narration) return false
    if (sum && n === sum) return false
    return true
  })
}

export function CinematicStoryboardTile({
  model,
  active,
  expanded,
  onSelect,
  onToggleExpand,
  onRegenerateScene,
  onGenerateSceneImage,
  onReplaceImage,
  imageStatus,
  busy = false
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const [hover, setHover] = useState(false)
  const { scene, imageUrl, plan } = model
  const showMiniMotion = hover && !reduced && imageUrl && active

  const sceneTitle =
    scene.sceneTitle?.trim() || uiText('cineSceneNum', { n: String(scene.index) })
  const summary = sceneSummary(scene)
  const dialogueLines = monitorDialogueLines(scene, summary)
  const mood =
    scene.emotionalTone?.trim() || (plan?.emotion ? uiText(`cineMood_${plan.emotion}`) : '')
  const shot = scene.cameraDirection?.trim() || uiText('cineShotWideNatural')
  const primaryStatus = model.statuses.includes('generated')
    ? 'generated'
    : model.statuses[model.statuses.length - 1]

  if (!active) {
    return (
      <article
        className="cine-sb-tile cine-sb-tile--collapsed"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button type="button" className="cine-sb-tile__collapsed-btn" onClick={onSelect}>
          <span className="cine-sb-tile__collapsed-kicker">
            {uiText('cineSceneNum', { n: String(scene.index) })}
          </span>
          <span className="cine-sb-tile__collapsed-title">{sceneTitle}</span>
          <span
            className="cine-sb-tile__collapsed-thumb"
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
          />
        </button>
      </article>
    )
  }

  return (
    <article
      className={`cine-sb-tile cine-sb-tile--active cine-sb-tile--cinematic${expanded ? ' cine-sb-tile--expanded' : ''}${!imageUrl ? ' cine-sb-tile--no-img' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button type="button" className="cine-sb-tile__select" onClick={onSelect}>
        <div className="cine-sb-tile__frame">
          {imageUrl ? (
            <div
              className={`cine-sb-tile__img-wrap${showMiniMotion ? ' cine-sb-tile__img-wrap--hover' : ''}`}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="cine-sb-tile__img-placeholder">
              {imageStatus === 'failed' ? (
                <p className="cine-sb-tile__img-failed-msg">{uiText('visualStorySceneFailedShort')}</p>
              ) : null}
            </div>
          )}
          <span className="cine-sb-tile__scene-badge">
            {uiText('cineSceneNum', { n: String(scene.index) })}
          </span>
        </div>

        <div className="cine-sb-tile__body">
          <h4 className="cine-sb-tile__scene-title">{sceneTitle}</h4>

          {summary ? <p className="cine-sb-tile__summary">{summary}</p> : null}

          <div className="cine-sb-tile__facts">
            {mood ? (
              <span className="cine-sb-tile__fact">
                <span className="cine-sb-tile__fact-label">{uiText('aiDirectorMood')}</span>
                {mood}
              </span>
            ) : null}
            <span className="cine-sb-tile__fact">
              <span className="cine-sb-tile__fact-label">{uiText('cineShotLabel')}</span>
              {shot}
            </span>
            <span className="cine-sb-tile__fact">
              <span className="cine-sb-tile__fact-label">{uiText('cineDurationLabel')}</span>
              {model.durationSec}s
            </span>
          </div>

          {model.tagKeys.length ? (
            <div className="cine-sb-tile__tags">
              {model.tagKeys.map((key) => (
                <span key={key} className="cine-sb-tile__tag">
                  {uiText(key)}
                </span>
              ))}
            </div>
          ) : null}

          {dialogueLines.length && expanded
            ? dialogueLines.map((d, di) => (
                <p key={`dlg-${scene.index}-${di}`} className="cine-sb-tile__dialogue">
                  <span className="cine-sb-tile__dialogue-who">{d.character}</span>
                  {Glyphs.colon} {Glyphs.ldquo}
                  {d.line}
                  {Glyphs.rdquo}
                </p>
              ))
            : null}

          <div className="cine-sb-tile__status-row">
            <span className={`cine-sb-tile__status-pill cine-sb-tile__status-pill--${primaryStatus}`}>
              {uiText(STATUS_I18N[primaryStatus] ?? primaryStatus)}
            </span>
          </div>
        </div>
      </button>

      <div className="cine-sb-tile__actions">
        <button
          type="button"
          className="btn btn-ghost btn-small cine-sb-tile__action-btn"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
        >
          {uiText('cineActionDetails')}
        </button>
        {onGenerateSceneImage && imageStatus !== 'completed' ? (
          <button
            type="button"
            className="btn btn-ghost btn-small cine-sb-tile__action-btn"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onGenerateSceneImage()
            }}
          >
            {uiText('cineActionGenerateImage')}
          </button>
        ) : null}
        {onRegenerateScene && imageStatus === 'completed' ? (
          <button
            type="button"
            className="btn btn-ghost btn-small cine-sb-tile__action-btn"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onRegenerateScene()
            }}
          >
            {uiText('cineActionRegenerateImage')}
          </button>
        ) : null}
        {onReplaceImage && !onGenerateSceneImage ? (
          <button
            type="button"
            className="btn btn-ghost btn-small cine-sb-tile__action-btn"
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
