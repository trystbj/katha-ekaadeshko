import { useUiText } from '../i18n/useAppI18n'
import type { CinematicScenePlan } from '../../../../core/cinematic/types'
import type { StoryScene } from '../types/story'
import { motionIndicatorLabel, transitionHintFromPlan } from '../utils/cinematicSceneTags'

type Props = {
  scene: StoryScene | null | undefined
  plan: CinematicScenePlan | null | undefined
}

const LIGHTING_KEYS: Record<string, string> = {
  bright: 'aiDirectorLighting_bright',
  neutral: 'aiDirectorLightingNeutral',
  dim: 'aiDirectorLighting_dim',
  dark: 'aiDirectorLighting_dark',
  mystic: 'aiDirectorLighting_mystic'
}

function lightingLabel(plan: CinematicScenePlan | null | undefined, uiText: (k: string) => string): string {
  const mood = plan?.environment?.lightingMood
  if (!mood) return uiText('aiDirectorLightingNeutral')
  return uiText(LIGHTING_KEYS[mood] ?? 'aiDirectorLightingNeutral')
}

export function SceneAiDirectorStrip({ scene, plan }: Props) {
  const uiText = useUiText()
  if (!scene) return null

  const mood = scene.emotionalTone?.trim() || (plan?.emotion ? uiText(`cineMood_${plan.emotion}`) : uiText('cineMood_neutral'))
  const camera = scene.cameraDirection?.trim() || uiText('aiDirectorCameraAuto')
  const lighting = lightingLabel(plan, uiText)
  const pacing =
    plan && plan.tension > 0.65
      ? uiText('aiDirectorPacingFast')
      : plan && plan.tension < 0.35
        ? uiText('aiDirectorPacingSlow')
        : uiText('aiDirectorPacingMedium')
  const transition = uiText(transitionHintFromPlan(plan ?? null))
  const motion = uiText(motionIndicatorLabel(plan?.motion?.preset))

  const rows: { label: string; value: string }[] = [
    { label: uiText('aiDirectorMood'), value: mood },
    { label: uiText('aiDirectorCamera'), value: camera },
    { label: uiText('aiDirectorLighting'), value: lighting },
    { label: uiText('aiDirectorEmotion'), value: plan?.emotion ? uiText(`cineMood_${plan.emotion}`) : mood },
    { label: uiText('aiDirectorPacing'), value: pacing },
    { label: uiText('aiDirectorTransition'), value: transition },
    { label: uiText('aiDirectorMotion'), value: motion }
  ]

  return (
    <div className="scene-ai-director" role="region" aria-label={uiText('aiDirectorTitle')}>
      <h4 className="scene-ai-director__title">{uiText('aiDirectorTitle')}</h4>
      <dl className="scene-ai-director__grid">
        {rows.map((r) => (
          <div key={r.label} className="scene-ai-director__row">
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
