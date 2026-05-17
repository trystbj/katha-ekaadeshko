import { create } from 'zustand'
import type {
  PreviewQualityTier,
  ProductionWorkflowMode,
  BackgroundRenderJob,
  LiveFeedbackReport
} from '../../../../core/realtime/productionTypes'
import { defaultPreviewTierForMode } from '../../../../core/realtime/previewQualityProfiles'
import { detectDeviceOptimizationProfile } from '../../../../core/realtime/autoOptimization'

export interface ProductionPipelineStore {
  productionMode: ProductionWorkflowMode
  previewTier: PreviewQualityTier
  liveRevision: number
  activeSceneIndex: number
  backgroundJobs: BackgroundRenderJob[]
  liveFeedback: LiveFeedbackReport | null
  setProductionMode: (m: ProductionWorkflowMode) => void
  setPreviewTier: (t: PreviewQualityTier) => void
  bumpLiveRevision: (sceneIndex?: number) => void
  setActiveSceneIndex: (ix: number) => void
  setLiveFeedback: (r: LiveFeedbackReport | null) => void
  upsertBackgroundJob: (job: BackgroundRenderJob) => void
  removeBackgroundJob: (id: string) => void
  deviceTier: ReturnType<typeof detectDeviceOptimizationProfile>
}

export const useProductionPipelineStore = create<ProductionPipelineStore>((set) => ({
  productionMode: 'production',
  previewTier: defaultPreviewTierForMode('production'),
  liveRevision: 0,
  activeSceneIndex: 1,
  backgroundJobs: [],
  liveFeedback: null,
  deviceTier: detectDeviceOptimizationProfile(),
  setProductionMode: (m) =>
    set({
      productionMode: m,
      previewTier: defaultPreviewTierForMode(m)
    }),
  setPreviewTier: (t) => set({ previewTier: t }),
  bumpLiveRevision: (sceneIndex) =>
    set((s) => ({
      liveRevision: s.liveRevision + 1,
      activeSceneIndex: sceneIndex ?? s.activeSceneIndex
    })),
  setActiveSceneIndex: (ix) => set({ activeSceneIndex: ix }),
  setLiveFeedback: (r) => set({ liveFeedback: r }),
  upsertBackgroundJob: (job) =>
    set((s) => {
      const rest = s.backgroundJobs.filter((j) => j.id !== job.id)
      return { backgroundJobs: [...rest, job] }
    }),
  removeBackgroundJob: (id) =>
    set((s) => ({ backgroundJobs: s.backgroundJobs.filter((j) => j.id !== id) }))
}))
