import { useUiText } from '../i18n/useAppI18n'
import type { StoryScene } from '../types/story'

type Props = {
  scenes: StoryScene[]
  activeSceneIndex?: number
  onSelectScene: (sceneIndex: number) => void
  emptyHint?: string
  sceneThumbUrl?: (scene: StoryScene) => string | undefined
  sceneDurationSec?: (scene: StoryScene) => number | undefined
}

function sceneTitle(scene: StoryScene, uiText: (k: string, p?: Record<string, string>) => string) {
  const t = scene.sceneTitle?.trim()
  if (t) return t
  return uiText('cineSceneNum', { n: String(scene.index) })
}

function statusLabel(
  scene: StoryScene,
  uiText: (k: string) => string
): string {
  const s = scene.productionStatus ?? scene.generationStatus
  if (!s) return uiText('sceneCardStatusDraft')
  const map: Record<string, string> = {
    complete: 'sceneCardStatusComplete',
    image: 'sceneCardStatusImage',
    image_failed: 'sceneCardStatusFailed',
    narration: 'sceneCardStatusNarration',
    motion: 'sceneCardStatusMotion',
    writing: 'sceneCardStatusWriting'
  }
  return uiText(map[s] ?? 'sceneCardStatusDraft')
}

export function StudioSceneCardsTab({
  scenes,
  activeSceneIndex,
  onSelectScene,
  emptyHint,
  sceneThumbUrl,
  sceneDurationSec
}: Props) {
  const uiText = useUiText()

  if (!scenes.length) {
    return (
      <p className="studio-scene-cards__empty">{emptyHint || uiText('studioScriptPlaceholder')}</p>
    )
  }

  return (
    <ul className="studio-scene-cards" role="list">
      {scenes.map((sc) => {
        const on = activeSceneIndex === sc.index
        const thumb = sceneThumbUrl?.(sc)
        const mood = sc.emotionalTone?.trim()
        const shot = sc.cameraDirection?.trim()
        const duration = sceneDurationSec?.(sc)
        return (
          <li key={sc.index}>
            <button
              type="button"
              role="listitem"
              className={`studio-scene-cards__card${on ? ' studio-scene-cards__card--on' : ' studio-scene-cards__card--compact'}`}
              onClick={() => onSelectScene(sc.index)}
            >
              <div className="studio-scene-cards__thumb-row">
                <span
                  className={`studio-scene-cards__thumb${thumb ? '' : ' studio-scene-cards__thumb--empty'}`}
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                  aria-hidden
                />
                <div className="studio-scene-cards__meta-col">
                  <div className="studio-scene-cards__head">
                    <span className="studio-scene-cards__num">{uiText('cineSceneNum', { n: String(sc.index) })}</span>
                    <span className="studio-scene-cards__title">{sceneTitle(sc, uiText)}</span>
                  </div>
                  <div className="studio-scene-cards__chips">
                    {mood ? <span className="studio-scene-cards__chip">{mood}</span> : null}
                    {shot ? <span className="studio-scene-cards__chip">{shot}</span> : null}
                    {duration != null ? (
                      <span className="studio-scene-cards__chip">
                        {uiText('sceneCardDuration', { sec: String(duration) })}
                      </span>
                    ) : null}
                    <span className="studio-scene-cards__chip studio-scene-cards__chip--status">
                      {statusLabel(sc, uiText)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
