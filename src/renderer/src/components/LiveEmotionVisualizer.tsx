import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { extractEmotionArc } from '../../../../core/realtime/emotionVisualizer'
import '../styles/live-production.css'

type Props = {
  plan: Record<string, unknown> | null | undefined
  sceneCount: number
  activeSceneIndex?: number
}

function barHeight(v: number) {
  return `${Math.round(Math.max(0.08, v) * 100)}%`
}

export function LiveEmotionVisualizer({ plan, sceneCount, activeSceneIndex }: Props) {
  const uiText = useUiText()
  const arc = useMemo(() => extractEmotionArc(plan, sceneCount), [plan, sceneCount])

  if (!arc.length) {
    return <p className="live-viz__empty">{uiText('liveVizNoData')}</p>
  }

  return (
    <div className="live-viz" aria-label={uiText('liveVizTitle')}>
      <div className="live-viz__legend">
        <span className="live-viz__key live-viz__key--emotion">{uiText('liveVizEmotion')}</span>
        <span className="live-viz__key live-viz__key--pace">{uiText('liveVizPacing')}</span>
        <span className="live-viz__key live-viz__key--music">{uiText('liveVizSoundtrack')}</span>
        <span className="live-viz__key live-viz__key--tension">{uiText('liveVizTension')}</span>
      </div>
      <div className="live-viz__grid">
        {arc.map((pt) => (
          <div
            key={pt.sceneIndex}
            className={`live-viz__col${activeSceneIndex === pt.sceneIndex ? ' live-viz__col--active' : ''}`}
            title={pt.beatType ?? uiText('creatorSceneLabel', { n: pt.sceneIndex })}
          >
            <span className="live-viz__scene-num">{pt.sceneIndex}</span>
            <div className="live-viz__bars">
              <span className="live-viz__bar live-viz__bar--emotion" style={{ height: barHeight(pt.emotionalIntensity) }} />
              <span className="live-viz__bar live-viz__bar--pace" style={{ height: barHeight(pt.pacingIntensity) }} />
              <span className="live-viz__bar live-viz__bar--music" style={{ height: barHeight(pt.soundtrackEnergy) }} />
              <span className="live-viz__bar live-viz__bar--tension" style={{ height: barHeight(pt.tension) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
