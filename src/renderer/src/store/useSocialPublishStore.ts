import { create } from 'zustand'
import type { PublishPlatformId } from '../types/videoStudio'
import type { ShortsOptimizationReport, SocialPublishJob } from '../../../../core/social/socialPublishTypes'

export interface SocialPublishStore {
  multiPublishTargets: PublishPlatformId[]
  backgroundJobs: SocialPublishJob[]
  shortsReport: ShortsOptimizationReport | null
  toggleMultiTarget: (platform: PublishPlatformId) => void
  setMultiTargets: (platforms: PublishPlatformId[]) => void
  upsertJob: (job: SocialPublishJob) => void
  removeJob: (id: string) => void
  setShortsReport: (r: ShortsOptimizationReport | null) => void
}

export const useSocialPublishStore = create<SocialPublishStore>((set) => ({
  multiPublishTargets: ['tiktok'],
  backgroundJobs: [],
  shortsReport: null,
  toggleMultiTarget: (platform) =>
    set((s) => {
      const has = s.multiPublishTargets.includes(platform)
      const next = has
        ? s.multiPublishTargets.filter((p) => p !== platform)
        : [...s.multiPublishTargets, platform]
      return { multiPublishTargets: next.length ? next : [platform] }
    }),
  setMultiTargets: (platforms) =>
    set({ multiPublishTargets: platforms.length ? platforms : ['tiktok'] }),
  upsertJob: (job) =>
    set((s) => ({
      backgroundJobs: [...s.backgroundJobs.filter((j) => j.id !== job.id), job]
    })),
  removeJob: (id) =>
    set((s) => ({ backgroundJobs: s.backgroundJobs.filter((j) => j.id !== id) })),
  setShortsReport: (r) => set({ shortsReport: r })
}))
