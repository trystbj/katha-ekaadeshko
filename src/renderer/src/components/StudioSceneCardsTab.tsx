import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryScene } from '../types/story'

type Props = {
  scenes: StoryScene[]
  activeSceneIndex?: number
  onSelectScene: (sceneIndex: number) => void
  emptyHint?: string
}

function sceneTitle(scene: StoryScene, index: number, uiText: (k: string, p?: Record<string, string>) => string) {
  const t = scene.sceneTitle?.trim()
  if (t) return t
  const first = (scene.narrationText ?? scene.text).trim().split(/\s+/).slice(0, 4).join(' ')
  return first ? `${uiText('cineSceneNum', { n: String(scene.index) })}: ${first}…` : uiText('cineSceneNum', { n: String(scene.index) })
}

export function StudioSceneCardsTab({ scenes, activeSceneIndex, onSelectScene, emptyHint }: Props) {
  const uiText = useUiText()

  if (!scenes.length) {
    return (
      <p className="studio-scene-cards__empty">{emptyHint || uiText('studioScriptPlaceholder')}</p>
    )
  }

  return (
    <ul className="studio-scene-cards" role="list">
      {scenes.map((sc, i) => {
        const on = activeSceneIndex === sc.index
        const narration = (sc.narrationText ?? sc.text).trim()
        const dialogues = sc.dialogueLines ?? []
        return (
          <li key={sc.index}>
            <button
              type="button"
              role="listitem"
              className={`studio-scene-cards__card${on ? ' studio-scene-cards__card--on' : ''}`}
              onClick={() => onSelectScene(sc.index)}
            >
              <div className="studio-scene-cards__head">
                <span className="studio-scene-cards__num">{uiText('cineSceneNum', { n: String(sc.index) })}</span>
                <span className="studio-scene-cards__title">{sceneTitle(sc, i, uiText)}</span>
              </div>
              {narration ? <p className="studio-scene-cards__narration">{narration}</p> : null}
              {dialogues.length
                ? dialogues.map((d, di) => (
                    <p key={`${sc.index}-d-${di}`} className="studio-scene-cards__dialogue">
                      <span className="studio-scene-cards__speaker">{d.character}</span>
                      {Glyphs.colon}
                      {Glyphs.space}
                      {Glyphs.ldquo}
                      {d.line}
                      {Glyphs.rdquo}
                    </p>
                  ))
                : null}
              {sc.visualDescription?.trim() ? (
                <p className="studio-scene-cards__visual">{sc.visualDescription.trim()}</p>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
