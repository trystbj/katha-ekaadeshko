import { useUiText } from '../i18n/useAppI18n'

type Props = {
  visible: boolean
  onBack: () => void
}

/** Single minimal back control for the preview column. */
export function PreviewWorkspaceBackButton({ visible, onBack }: Props) {
  const uiText = useUiText()
  if (!visible) return null
  return (
    <button
      type="button"
      className="preview-workspace-back"
      onClick={onBack}
      aria-label={uiText('previewWorkspaceBackAria')}
      title={uiText('previewWorkspaceBackAria')}
    >
      <span className="preview-workspace-back__glyph" aria-hidden>
        ←
      </span>
    </button>
  )
}
