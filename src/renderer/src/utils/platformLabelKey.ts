import type { PublishPlatformId } from '../types/videoStudio'

type PlatformLabelKey =
  | 'publishPlatformYoutube'
  | 'publishPlatformTiktok'
  | 'publishPlatformInstagram'
  | 'publishPlatformFacebook'

export function platformLabelKey(platform: PublishPlatformId): PlatformLabelKey {
  switch (platform) {
    case 'youtube_shorts':
      return 'publishPlatformYoutube'
    case 'instagram_reel':
      return 'publishPlatformInstagram'
    case 'facebook':
      return 'publishPlatformFacebook'
    default:
      return 'publishPlatformTiktok'
  }
}
