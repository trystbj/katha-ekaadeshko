import { useEffect } from 'react'
import { subscribeLivePreview } from './livePreviewBus'
import { useProductionPipelineStore } from '../store/useProductionPipelineStore'

/** Wire live preview bus → production store revision counter. */
export function useLivePreviewSync(): number {
  const liveRevision = useProductionPipelineStore((s) => s.liveRevision)
  const bump = useProductionPipelineStore((s) => s.bumpLiveRevision)

  useEffect(() => {
    return subscribeLivePreview((ev) => {
      if (ev.type === 'revision_bump') bump(ev.sceneIndex)
      if (ev.type === 'seek_scene') useProductionPipelineStore.getState().setActiveSceneIndex(ev.sceneIndex)
    })
  }, [bump])

  return liveRevision
}
