/**
 * Performance + stability hints for large projects (client/worker metadata).
 */

/**
 * @param {object} params
 */
export function buildPerformancePlan(params) {
  const sceneCount = params.sceneCount ?? 0
  const assetCount = params.assetCount ?? sceneCount
  return {
    version: 1,
    lazySceneLoad: sceneCount > 8,
    previewCache: true,
    assetCacheKey: params.projectId ? `proj:${params.projectId}` : undefined,
    backgroundRenderRecommended: sceneCount > 6,
    memoryCleanupAfterRender: true,
    maxConcurrentPreviews: sceneCount > 12 ? 2 : 4,
    persistPreviewUrls: true,
    renderQueuePriority: 'stable',
    chunkScenes: sceneCount > 16 ? 8 : sceneCount,
    estimatedAssetMb: assetCount * 1.2
  }
}
