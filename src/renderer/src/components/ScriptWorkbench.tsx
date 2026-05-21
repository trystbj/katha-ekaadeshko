import { useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryScene } from '../types/story'
import { LiveScriptPreview } from './LiveScriptPreview'

type Tab = 'story' | 'script' | 'dialogue' | 'shots' | 'narration' | 'prompt'

type Props = {
  project: ProjectState | null
  scenes: StoryScene[]
  rawStructured?: string
  busy: boolean
  streamLines: string[]
  focusedSpeaker?: string | null
  onSceneFocus?: (speaker: string) => void
  onSaveDraft?: () => void | Promise<void>
  onScrollRegenerate?: () => void
}

function downloadText(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ScriptWorkbench({
  project,
  scenes,
  rawStructured,
  busy,
  streamLines,
  focusedSpeaker,
  onSceneFocus,
  onSaveDraft,
  onScrollRegenerate
}: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<Tab>('dialogue')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const scriptFlat = useMemo(
    () =>
      scenes
        .map((s) => `${s.character}${s.lineType === 'Thought' ? ' (thought)' : ''}: ${s.text}`)
        .join('\n'),
    [scenes]
  )

  const storyTabText = useMemo(() => {
    const b = project?.bible
    if (!b) return ''
    const beats = b.outline?.slice(0, 12).map((o) => `E${o.episode}: ${o.beat}`).join('\n') ?? ''
    return `${b.title}\n\n${b.concept}\n\n${beats}`
  }, [project?.bible])

  const shotsText = useMemo(
    () =>
      scenes
        .map((s, i) => (s.visualDescription ? `Shot ${i + 1}: ${s.visualDescription}` : ''))
        .filter(Boolean)
        .join('\n\n'),
    [scenes]
  )

  const narrationText = useMemo(
    () =>
      scenes
        .filter((s) => /narrat/i.test(s.character))
        .map((s) => `${s.character}: ${s.text}`)
        .join('\n'),
    [scenes]
  )

  const promptText = useMemo(() => rawStructured?.trim() || '', [rawStructured])

  const bodyForTab = useMemo(() => {
    switch (tab) {
      case 'story':
        return storyTabText
      case 'script':
        return editing ? draft : scriptFlat
      case 'dialogue':
        return scriptFlat
      case 'shots':
        return shotsText
      case 'narration':
        return narrationText
      default:
        return promptText
    }
  }, [tab, storyTabText, scriptFlat, shotsText, narrationText, promptText, editing, draft])

  const beginEdit = () => {
    setDraft(scriptFlat)
    setEditing(true)
  }

  const tabBtn = (k: Tab, label: string) => (
    <button
      key={k}
      type="button"
      role="tab"
      aria-selected={tab === k}
      className={`script-workbench__tab ${tab === k ? 'script-workbench__tab--on' : ''}`}
      onClick={() => {
        setTab(k)
        setEditing(false)
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="script-workbench">
      <div className="script-workbench__tabs" role="tablist">
        {tabBtn('story', uiText('scriptTabStory'))}
        {tabBtn('script', uiText('scriptTabScript'))}
        {tabBtn('dialogue', uiText('scriptTabDialogue'))}
        {tabBtn('shots', uiText('scriptTabShots'))}
        {tabBtn('narration', uiText('scriptTabNarration'))}
        {tabBtn('prompt', uiText('scriptTabPrompt'))}
      </div>

      <div className="script-workbench__toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => void navigator.clipboard.writeText(bodyForTab)}
          disabled={!bodyForTab}
        >
          {uiText('scriptActionCopy')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() =>
            downloadText(`katha-script-${project?.title || 'draft'}.txt`, bodyForTab)
          }
          disabled={!bodyForTab}
        >
          {uiText('scriptActionExport')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void onSaveDraft?.()}>
          {uiText('scriptActionSaveDraft')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onScrollRegenerate}>
          {uiText('scriptActionRegenerate')}
        </button>
        {tab === 'script' ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => (editing ? setEditing(false) : beginEdit())}
          >
            {editing ? uiText('scriptActionDoneEdit') : uiText('scriptActionEdit')}
          </button>
        ) : null}
      </div>

      <div className="script-workbench__body">
        {tab === 'dialogue' ? (
          <LiveScriptPreview
            scriptVoicePanel
            scenes={scenes}
            rawStructured={rawStructured}
            busy={busy}
            streamLines={streamLines}
            focusedSpeaker={focusedSpeaker}
            onSceneFocus={onSceneFocus}
          />
        ) : tab === 'script' && editing ? (
          <textarea
            className="idea-input script-workbench__textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          <pre className="script-pre script-workbench__pre">{bodyForTab || uiText('scriptPreviewEmpty')}</pre>
        )}
      </div>
    </div>
  )
}
