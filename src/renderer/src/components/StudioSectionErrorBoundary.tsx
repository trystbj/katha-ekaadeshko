import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useUiText } from '../i18n/useAppI18n'

type Props = {
  section: string
  children: ReactNode
  onResetKey?: string | number
}

type State = {
  error: Error | null
}

function StudioSectionErrorFallback({
  section,
  onReload
}: {
  section: string
  onReload: () => void
}) {
  const uiText = useUiText()
  return (
    <div className="studio-section-error" role="alert">
      <p className="studio-section-error__title">{uiText('studioSectionError')}</p>
      <p className="studio-section-error__section">{section}</p>
      <button type="button" className="btn btn-ghost btn-small" onClick={onReload}>
        {uiText('studioSectionReload')}
      </button>
    </div>
  )
}

export class StudioSectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[katha:studio-section]', this.props.section, error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.onResetKey !== this.props.onResetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <StudioSectionErrorFallback
          section={this.props.section}
          onReload={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
