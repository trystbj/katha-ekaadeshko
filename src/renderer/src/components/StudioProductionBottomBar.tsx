import { useUiText } from '../i18n/useAppI18n'

type Props = {
  savedLabel?: string
  disabled?: boolean
  rendering?: boolean
  onAdvancedEditor: () => void
  onExportProject: () => void
  onGenerateVideo: () => void
}

export function StudioProductionBottomBar({
  savedLabel,
  disabled = false,
  rendering = false,
  onAdvancedEditor,
  onExportProject,
  onGenerateVideo
}: Props) {
  const uiText = useUiText()

  return (
    <footer className="studio-production-bar" role="contentinfo">
      <div className="studio-production-bar__status">
        {savedLabel ? (
          <>
            <span className="studio-production-bar__saved-dot" aria-hidden />
            <span>{savedLabel}</span>
          </>
        ) : null}
      </div>
      <div className="studio-production-bar__actions">
        <button
          type="button"
          className="btn btn-ghost studio-production-bar__btn"
          disabled={disabled}
          onClick={onAdvancedEditor}
        >
          <span className="studio-production-bar__btn-ic" aria-hidden>
            ⚙
          </span>
          {uiText('studioBarAdvancedEditor')}
        </button>
        <button
          type="button"
          className="btn btn-ghost studio-production-bar__btn"
          disabled={disabled}
          onClick={onExportProject}
        >
          <span className="studio-production-bar__btn-ic" aria-hidden>
            ↑
          </span>
          {uiText('studioBarExportProject')}
        </button>
        <button
          type="button"
          className="btn btn-generate-cta studio-production-bar__btn studio-production-bar__btn--primary"
          disabled={disabled}
          onClick={onGenerateVideo}
        >
          {rendering ? uiText('storyboardRendering') : uiText('studioBarGenerateVideo')}
        </button>
      </div>
    </footer>
  )
}
