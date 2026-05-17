import { useUiText } from '../i18n/useAppI18n'
import { SAMPLE_IDEA_KEYS } from '../constants/storySeedSamples'
import { useStudioStore } from '../store/useStudioStore'

type Tone = '' | 'warm' | 'tense' | 'epic' | 'tender' | 'whimsical' | 'noir'

type Props = {
  busy: boolean
  onRandomIdea: () => void
}

export function StorySeedEnhancements({ busy, onRandomIdea }: Props) {
  const uiText = useUiText()
  const idea = useStudioStore((s) => s.idea)
  const setIdea = useStudioStore((s) => s.setIdea)
  const storyTone = useStudioStore((s) => s.storyTone)
  const setStoryTone = useStudioStore((s) => s.setStoryTone)
  const episodeChainPreferred = useStudioStore((s) => s.episodeChainPreferred)
  const setEpisodeChainPreferred = useStudioStore((s) => s.setEpisodeChainPreferred)

  const tones: { id: Tone; key: string }[] = [
    { id: '', key: 'toneNeutral' },
    { id: 'warm', key: 'toneWarm' },
    { id: 'tense', key: 'toneTense' },
    { id: 'epic', key: 'toneEpic' },
    { id: 'tender', key: 'toneTender' },
    { id: 'whimsical', key: 'toneWhimsical' },
    { id: 'noir', key: 'toneNoir' }
  ]

  const enhance = () => {
    const core = idea.trim()
    const bundle = [
      core,
      '',
      uiText('promptEnhancerDirectorNotes'),
      uiText('promptEnhancerBulletAnchorVisual'),
      uiText('promptEnhancerBulletDialogueVertical')
    ].join('\n')
    setIdea(bundle.slice(0, 500))
  }

  return (
    <div className="story-seed-enhancements">
      <div className="story-seed-enhancements__row">
        <span className="story-seed-enhancements__label">{uiText('aiSuggestionChips')}</span>
        <div className="genre-strip">
          {SAMPLE_IDEA_KEYS.map((key) => {
            const line = uiText(key)
            return (
              <button
                key={key}
                type="button"
                className="genre-chip"
                disabled={Boolean(busy)}
                onClick={() => setIdea(line.slice(0, 500))}
              >
                {line.length > 48 ? `${line.slice(0, 46)}…` : line}
              </button>
            )
          })}
          <button type="button" className="genre-chip genre-chip--on" disabled={Boolean(busy)} onClick={onRandomIdea}>
            {uiText('randomIdeaBtn')}
          </button>
        </div>
      </div>

      <div className="story-seed-enhancements__row">
        <span className="story-seed-enhancements__label">{uiText('toneLabel')}</span>
        <div className="genre-strip">
          {tones.map((x) => (
            <button
              key={x.id || 'neutral'}
              type="button"
              className={`genre-chip ${storyTone === x.id ? 'genre-chip--on' : ''}`}
              disabled={Boolean(busy)}
              onClick={() => setStoryTone(x.id)}
            >
              {uiText(x.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="story-seed-enhancements__row story-seed-enhancements__row--toggle">
        <label className="story-seed-enhancements__toggle">
          <input
            type="checkbox"
            checked={episodeChainPreferred}
            disabled={Boolean(busy)}
            onChange={(e) => setEpisodeChainPreferred(e.target.checked)}
          />
          <span className="story-seed-enhancements__episode-chain-label">{uiText('episodeChainToggle')}</span>
        </label>
        <button type="button" className="btn btn-ghost btn-small" disabled={Boolean(busy)} onClick={enhance}>
          {uiText('promptEnhancer')}
        </button>
      </div>

      <p className="story-seed-enhancements__hint">{uiText('multilingualStoryHint')}</p>
    </div>
  )
}
