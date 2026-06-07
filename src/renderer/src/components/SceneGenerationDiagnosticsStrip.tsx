import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import type { ProjectState, StoryEpisode } from '../types/story'
import { sceneGenerationDiagnostics } from '../utils/unifiedSceneState'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  lastError?: string | null
}

export function SceneGenerationDiagnosticsStrip({ project, episode, lastError }: Props) {
  const uiText = useUiText()
  const visualDiagnostics = useStudioStore((s) => s.visualDiagnostics)
  const diag = sceneGenerationDiagnostics(project, episode, {
    visualDiagnostics,
    lastError
  })

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
        {diag.currentScene != null ? (
          <li>
            {uiText('sceneGenDiagCurrentScene')}: {uiText('sceneGenDiagSceneLabel', { n: String(diag.currentScene) })}
          </li>
        ) : null}
        {diag.retryAttempt != null ? (
          <li>
            {uiText('sceneGenDiagRetry')}: {diag.retryAttempt}/{diag.maxRetries}
          </li>
        ) : null}
      </ul>
      {diag.lastError ? (
        <p className="scene-gen-diagnostics__error">
          {uiText('sceneGenDiagLastError')}: {diag.lastError}
        </p>
      ) : null}
    </div>
  )
}
