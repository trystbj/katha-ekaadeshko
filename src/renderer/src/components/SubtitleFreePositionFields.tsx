import { useCallback, type KeyboardEvent } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { resetSubtitleFreePosition } from '../types/subtitleStudio'
import {
  clampSubtitlePosition,
  nudgeSubtitlePosition,
  resolveSubtitleFreePosition,
  SUBTITLE_SAFE_AREA,
  type SubtitleFreePosition
} from '../utils/subtitleFreePosition'

type Props = {
  studio: SubtitleStudioState
  disabled?: boolean
  onPatch: (patch: Partial<SubtitleStudioState>) => void
  className?: string
  showDragHint?: boolean
}

export function SubtitleFreePositionFields({
  studio,
  disabled = false,
  onPatch,
  className = '',
  showDragHint = false
}: Props) {
  const uiText = useUiText()
  const pos = resolveSubtitleFreePosition(studio)

  const applyPosition = useCallback(
    (next: SubtitleFreePosition) => {
      onPatch({
        positionXPct: next.positionXPct,
        positionYPct: next.positionYPct
      })
    },
    [onPatch]
  )

  const onCoordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const nudged = nudgeSubtitlePosition(pos, e.key, e.shiftKey)
    if (!nudged) return
    e.preventDefault()
    applyPosition(nudged)
  }

  return (
    <div className={`subtitle-free-position-fields ${className}`.trim()}>
      {showDragHint ? (
        <p className="subtitle-free-position-fields__hint">{uiText('subtitlePositionDragHint')}</p>
      ) : null}
      <label className="subtitle-free-position-fields__field">
        <span>{uiText('subtitlePositionX')}</span>
        <input
          type="number"
          className="select subtitle-free-position-fields__num"
          min={SUBTITLE_SAFE_AREA.minX}
          max={SUBTITLE_SAFE_AREA.maxX}
          step={1}
          disabled={disabled}
          value={pos.positionXPct}
          onChange={(e) => {
            const x = Number(e.target.value)
            if (!Number.isFinite(x)) return
            applyPosition(clampSubtitlePosition(x, pos.positionYPct))
          }}
          onKeyDown={onCoordKeyDown}
          aria-label={uiText('subtitlePositionX')}
        />
      </label>
      <label className="subtitle-free-position-fields__field">
        <span>{uiText('subtitlePositionY')}</span>
        <input
          type="number"
          className="select subtitle-free-position-fields__num"
          min={SUBTITLE_SAFE_AREA.minY}
          max={SUBTITLE_SAFE_AREA.maxY}
          step={1}
          disabled={disabled}
          value={pos.positionYPct}
          onChange={(e) => {
            const y = Number(e.target.value)
            if (!Number.isFinite(y)) return
            applyPosition(clampSubtitlePosition(pos.positionXPct, y))
          }}
          onKeyDown={onCoordKeyDown}
          aria-label={uiText('subtitlePositionY')}
        />
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={disabled}
        onClick={() => onPatch(resetSubtitleFreePosition())}
      >
        {uiText('subtitlePositionReset')}
      </button>
    </div>
  )
}
