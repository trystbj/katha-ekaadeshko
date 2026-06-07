import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { sceneGenerationDiagnostics } from '../utils/unifiedSceneState'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  lastError?: string | null
}

export function SceneGenerationDiagnosticsStrip({ project, episode, lastError }: Props) {
  const uiText = useUiText()
  const diag = sceneGenerationDiagnostics(project, episode)

  return (
    <div className="scene-gen-diagnostics" role="status">
      <span className="scene-gen-diagnostics__title">{uiText('sceneGenDiagTitle')}</span>
      <ul className="scene-gen-diagnostics__list">
        <li>
          {uiText('sceneGenDiagCompleted')}: {diag.completed}/{diag.total}
        </li>
        <li>
          {uiText('sceneGenDiagFailed')}: {diag.failed}
        </li>
        <li>
          {uiText('sceneGenDiagRemaining')}: {diag.remaining}
        </li>
      </ul>
      {lastError ? <p className="scene-gen-diagnostics__error">{lastError}</p> : null}
    </div>
  )
}
