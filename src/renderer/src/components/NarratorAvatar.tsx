import type { NarratorUiPreset } from '../constants/narrators'
import { NarratorAnimatedAvatar } from './NarratorAnimatedAvatar'

type Props = {
  preset: NarratorUiPreset
  selected?: boolean
}

/** Dicebear SVG presets use the lightweight animated avatar; raster URLs use the photo as-is. */
function useAnimatedSvgAvatar(portraitUrl: string): boolean {
  return portraitUrl.includes('dicebear.com') || /\.svg(\?|$)/i.test(portraitUrl)
}

/** Circular profile photo (personality) or gradient + initials. */
export function NarratorAvatar({ preset, selected }: Props) {
  const animatedSvg = useAnimatedSvgAvatar(preset.portraitImageUrl)
  return (
    <div
      className={`narrator-list__avatar-wrap ${selected ? 'narrator-list__avatar-wrap--selected' : ''}`}
    >
      <div
        className={`narrator-list__avatar narrator-list__avatar--hasphoto narrator-list__avatar--anim narrator-list__avatar--${preset.avatarVariant}`}
        aria-hidden
      >
        {animatedSvg ? (
          <NarratorAnimatedAvatar narratorId={preset.id} />
        ) : (
          <img
            src={preset.portraitImageUrl}
            alt=""
            className="narrator-list__avatar-img"
            draggable={false}
          />
        )}
        <div className="narrator-list__avatar-veil" />
      </div>
    </div>
  )
}
