import type { SocialAccountConnection, SocialPlatformId } from '../../../../core/social/socialPublishTypes'

const STORAGE_KEY = 'katha_social_accounts_v1'

type Store = Record<SocialPlatformId, SocialAccountConnection>

function emptyStore(): Store {
  return {
    youtube_shorts: { platform: 'youtube_shorts', status: 'disconnected' },
    tiktok: { platform: 'tiktok', status: 'disconnected' },
    instagram_reel: { platform: 'instagram_reel', status: 'disconnected' },
    facebook: { platform: 'facebook', status: 'disconnected' }
  }
}

export function loadSocialAccounts(): Store {
  if (typeof localStorage === 'undefined') return emptyStore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    return { ...emptyStore(), ...(JSON.parse(raw) as Store) }
  } catch {
    return emptyStore()
  }
}

export function saveSocialAccounts(store: Store): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function linkSocialAccount(platform: SocialPlatformId, displayName?: string): Store {
  const store = loadSocialAccounts()
  store[platform] = {
    platform,
    status: 'linked',
    displayName: displayName || platform,
    linkedAt: new Date().toISOString(),
    tokenRef: `local_${platform}_${Date.now()}`
  }
  saveSocialAccounts(store)
  return store
}

export function unlinkSocialAccount(platform: SocialPlatformId): Store {
  const store = loadSocialAccounts()
  store[platform] = { platform, status: 'disconnected' }
  saveSocialAccounts(store)
  return store
}

export function isPlatformLinked(platform: SocialPlatformId): boolean {
  return loadSocialAccounts()[platform]?.status === 'linked'
}
