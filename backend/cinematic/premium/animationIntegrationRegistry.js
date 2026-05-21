/**
 * Future-ready animation integration slots (lip sync, i2v, facial motion).
 */

/**
 * @param {Array<object>} enrichedScenes
 * @param {object} [story]
 * @param {Array<object>} [voiceCast]
 */
export function buildAnimationIntegrationRegistry(enrichedScenes, story, voiceCast = []) {
  const chars = Array.isArray(story?.characters) ? story.characters : []
  return {
    architectureVersion: 1,
    providerSlots: {
      imageToVideo: 'i2v:default',
      facialAnimation: 'face_anim:default',
      lipSync: 'lipsync:default',
      bodyMotion: 'motion:default'
    },
    perScene: enrichedScenes.map((sc, i) => ({
      sceneIndex: sc.sceneIndex ?? i + 1,
      lipSyncReady: Boolean(sc.dialogueStaging || voiceCast.length),
      facialTrackSlot: `face:scene_${i + 1}`,
      motionSlot: sc.motion?.preset || 'static',
      depthParallax: sc.camera?.parallaxDepth ?? 0.25,
      expressionDriver: sc.expression?.mood || 'neutral'
    })),
    castSlots: chars.slice(0, 8).map((c) => ({
      name: c.name,
      identitySlot: `anim:${String(c.name).replace(/\s+/g, '_')}`,
      lipSyncSlot: `lipsync:${String(c.name).replace(/\s+/g, '_')}`
    }))
  }
}
