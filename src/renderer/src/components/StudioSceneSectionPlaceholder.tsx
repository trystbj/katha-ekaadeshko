import { useUiText } from '../i18n/useAppI18n'

/** Shown in Scenes tab before story generation completes. */
export function StudioSceneSectionPlaceholder() {
  const uiText = useUiText()
  return (
    <p className="studio-scene-section__placeholder">{uiText('studioSceneSectionPreStory')}</p>
  )
}
