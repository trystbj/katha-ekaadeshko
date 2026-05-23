import { useCallback } from 'react'
import { useUiText, type UiTranslateFn } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { NARRATOR_UI_PRESETS, normalizeNarratorId } from '../constants/narrators'
import { STYLE_WIREFRAME_LABEL_KEY } from '../constants/styleWireframeOrder'
import { useStudioStore } from '../store/useStudioStore'
import type { WorkspaceSlotSnapshot } from '../types/workspaceSlot'
import {
  slotPosterUrl,
  slotProgressPercent,
  slotPublishPublished
} from '../utils/workspaceSlotSnapshot'
import '../styles/workspace-slots-dashboard.css'

function narratorLabel(id: string, translate: UiTranslateFn): string {
  const canon = normalizeNarratorId(id)
  const p = NARRATOR_UI_PRESETS.find((x) => x.id === canon)
  return p ? `${p.displayName} · ${translate(p.descriptorKey)}` : canon
}

function slotTitle(slot: WorkspaceSlotSnapshot, index: number, translate: UiTranslateFn): string {
  return (
    slot.meta.displayTitle?.trim() ||
    slot.project?.title?.trim() ||
    translate('workspaceSlotN', { n: index + 1 })
  )
}

export function WorkspaceSlotsDashboard() {
  const uiText = useUiText()
  const slots = useStudioStore((s) => s.workspaceSlots)
  const activeIx = useStudioStore((s) => s.activeWorkspaceSlotIndex)
  const runtime = useStudioStore((s) => s.workspaceRuntime)
  const busy = useStudioStore((s) => s.busy)
  const setError = useStudioStore((s) => s.setError)
  const switchWorkspaceSlot = useStudioStore((s) => s.switchWorkspaceSlot)
  const clearWorkspaceSlot = useStudioStore((s) => s.clearWorkspaceSlot)
  const setWorkspaceSlotArchived = useStudioStore((s) => s.setWorkspaceSlotArchived)
  const renameWorkspaceSlot = useStudioStore((s) => s.renameWorkspaceSlot)
  const createNewWorkspaceProject = useStudioStore((s) => s.createNewWorkspaceProject)

  const activate = useCallback(
    (ix: number) => {
      const r = switchWorkspaceSlot(ix)
      if (r === 'busy') setError(uiText('workspaceSwitchBusy'))
      if (r === 'invalid') setError(uiText('workspaceSwitchInvalid'))
    },
    [switchWorkspaceSlot, setError, uiText]
  )

  return (
    <div className="workspace-slots-dash">
      <p className="workspace-slots-dash__intro">{uiText('workspaceSlotsIntro')}</p>
      <div className="workspace-slots-dash__grid">
        {slots
          .map((slot, ix) => ({ slot, ix }))
          .filter(({ slot, ix }) => {
            const hasStory = Boolean(slot.project || slot.studio.idea.trim())
            return hasStory || ix === activeIx
          })
          .map(({ slot, ix }) => {
          const isActive = ix === activeIx
          const hasStory = Boolean(slot.project || slot.studio.idea.trim())
          const rt = runtime[ix]
          const busySlot = rt?.busy
          const paused = !isActive && hasStory && !busySlot
          const rendering = Boolean(busySlot && (busySlot.includes('render') || busySlot.includes('leonardo')))
          const completed = slot.project?.status === 'completed'
          const published = slotPublishPublished(slot.project)
          const archived = Boolean(slot.meta.archived)
          const poster = slotPosterUrl(slot.project)
          const pct = slotProgressPercent(slot.project)
          const ep = slot.selectedEpisode
          const styleKey = slot.studio.styleId
          const styleLabel =
            styleKey && styleKey in STYLE_WIREFRAME_LABEL_KEY
              ? uiText(STYLE_WIREFRAME_LABEL_KEY[styleKey as keyof typeof STYLE_WIREFRAME_LABEL_KEY])
              : styleKey || '—'

          return (
            <div
              key={ix}
              className={`workspace-slots-card${isActive ? ' workspace-slots-card--active' : ''}${archived ? ' workspace-slots-card--archived' : ''}`}
            >
              <div
                className="workspace-slots-card__poster"
                style={
                  poster
                    ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.82)), url(${poster})` }
                    : undefined
                }
              >
                <span className="workspace-slots-card__slot-label">{uiText('workspaceSlotN', { n: ix + 1 })}</span>
              </div>
              <div className="workspace-slots-card__body">
                <h4 className="workspace-slots-card__title">{slotTitle(slot, ix, uiText)}</h4>
                <div className="workspace-slots-card__badges">
                  {isActive ? <span className="workspace-slots-badge workspace-slots-badge--active">{uiText('workspaceBadgeActive')}</span> : null}
                  {paused ? <span className="workspace-slots-badge workspace-slots-badge--paused">{uiText('workspaceBadgePaused')}</span> : null}
                  {rendering ? <span className="workspace-slots-badge workspace-slots-badge--render">{uiText('workspaceBadgeRendering')}</span> : null}
                  {completed ? <span className="workspace-slots-badge workspace-slots-badge--done">{uiText('workspaceBadgeCompleted')}</span> : null}
                  {published ? <span className="workspace-slots-badge workspace-slots-badge--pub">{uiText('workspaceBadgePublished')}</span> : null}
                  {archived ? <span className="workspace-slots-badge workspace-slots-badge--arc">{uiText('workspaceBadgeArchived')}</span> : null}
                </div>
                <dl className="workspace-slots-card__meta">
                  <div>
                    <dt>{uiText('workspaceMetaEpisode')}</dt>
                    <dd>{ep != null ? ep : '—'}</dd>
                  </div>
                  <div>
                    <dt>{uiText('workspaceMetaProgress')}</dt>
                    <dd>
                      {pct}
                      {Glyphs.percent}
                    </dd>
                  </div>
                  <div>
                    <dt>{uiText('workspaceMetaEdited')}</dt>
                    <dd>
                      {slot.meta.lastEditedAt && Number.isFinite(Date.parse(slot.meta.lastEditedAt))
                        ? new Date(slot.meta.lastEditedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{uiText('workspaceMetaNarrator')}</dt>
                    <dd>{narratorLabel(slot.studio.narratorId, uiText)}</dd>
                  </div>
                  <div>
                    <dt>{uiText('workspaceMetaStyle')}</dt>
                    <dd>{styleLabel}</dd>
                  </div>
                </dl>
                <div className="workspace-slots-card__actions">
                  {!isActive ? (
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={archived}
                      title={archived ? uiText('workspaceArchivedHint') : uiText('workspaceResumeHint')}
                      onClick={() => activate(ix)}
                    >
                      {uiText('workspaceOpenSlot')}
                    </button>
                  ) : (
                    <span className="workspace-slots-card__active-cap">{uiText('workspaceSlotLive')}</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      const next = window.prompt(uiText('workspaceRenamePrompt'), slotTitle(slot, ix, uiText))
                      if (next != null && next.trim()) renameWorkspaceSlot(ix, next.trim())
                    }}
                  >
                    {uiText('workspaceRename')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => setWorkspaceSlotArchived(ix, !archived)}
                  >
                    {archived ? uiText('workspaceUnarchive') : uiText('workspaceArchive')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      if (!window.confirm(uiText('workspaceClearConfirm'))) return
                      clearWorkspaceSlot(ix)
                    }}
                  >
                    {uiText('workspaceDelete')}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {slots.some((s) => !s.project && !s.studio.idea.trim()) ? (
        <div className="workspace-slots-dash__new">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              const r = createNewWorkspaceProject()
              if (!r.ok) {
                setError(uiText('workspaceDuplicateFull'))
                return
              }
              activate(r.index)
            }}
          >
            {uiText('newProject')}
          </button>
        </div>
      ) : null}
      <p className="workspace-slots-dash__foot">{uiText('workspaceSlotsFoot')}</p>
    </div>
  )
}
