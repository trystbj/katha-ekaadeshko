import type { ReactNode } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { StoryScene } from '../types/story'

type Props = {
  scene: StoryScene
  collapsed?: boolean
  focused?: boolean
  onFocus?: () => void
}

function SceneSection({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <div className="script-scene-section">
      <h4 className="script-scene-section__label">{label}</h4>
      <div className="script-scene-section__body">{children}</div>
    </div>
  )
}

/** Structured scene preview — title, emotion, environment, narration, dialogue, visual notes. */
export function ScriptSceneStructuredCard({ scene, collapsed, focused, onFocus }: Props) {
  const uiText = useUiText()
  const narration = (scene.narrationText ?? scene.text).trim()
  const dialogueLines = scene.dialogueLines ?? []
  const visualNotes = scene.visualDescription?.trim()

  if (collapsed) {
    return (
      <li
        className={`live-script-preview__block live-script-preview__block--collapsed${focused ? ' live-script-preview__block--focus' : ''}`}
        onClick={onFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onFocus?.()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className="live-script-preview__who">
          {scene.sceneTitle?.trim() || uiText('cineSceneNum', { n: scene.index })}
        </span>
      </li>
    )
  }

  return (
    <li
      className={`live-script-preview__block live-script-preview__block--structured${focused ? ' live-script-preview__block--focus' : ''}`}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onFocus?.()
        }
      }}
      role="article"
      tabIndex={0}
    >
      <SceneSection label={uiText('scriptSceneSectionTitle')}>
        <p className="script-scene-section__title">
          {scene.sceneTitle?.trim() || uiText('cineSceneNum', { n: scene.index })}
        </p>
      </SceneSection>

      <SceneSection label={uiText('scriptReviewEmotion').replace(/:$/, '')}>
        {scene.emotionalTone?.trim() ? <p>{scene.emotionalTone}</p> : null}
      </SceneSection>

      <SceneSection label={uiText('scriptReviewLocation').replace(/:$/, '')}>
        {scene.environment?.trim() ? <p>{scene.environment}</p> : null}
      </SceneSection>

      <SceneSection label={uiText('scriptReviewNarration').replace(/:$/, '')}>
        {narration ? <p>{narration}</p> : null}
      </SceneSection>

      <SceneSection label={uiText('scriptReviewDialogue').replace(/:$/, '')}>
        {dialogueLines.length ? (
          <ul className="script-scene-section__dialogue">
            {dialogueLines.map((d, i) => (
              <li key={i}>
                <strong>{d.character}:</strong> {d.line}
              </li>
            ))}
          </ul>
        ) : null}
      </SceneSection>

      <SceneSection label={uiText('scriptSceneSectionVisual')}>
        {visualNotes ? <p>{visualNotes}</p> : null}
      </SceneSection>

      {scene.cameraDirection?.trim() ? (
        <SceneSection label={uiText('scriptReviewCamera').replace(/:$/, '')}>
          <p>{scene.cameraDirection}</p>
        </SceneSection>
      ) : null}

      {scene.characterActions?.trim() ? (
        <SceneSection label={uiText('scriptReviewActions').replace(/:$/, '')}>
          <p>{scene.characterActions}</p>
        </SceneSection>
      ) : null}
    </li>
  )
}
