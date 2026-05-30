/**
 * In-process generation locks — prevent duplicate Leonardo calls per scene.
 */

const locks = new Map()

function key(projectId, sceneIndex) {
  return `${String(projectId || 'default')}:scene:${sceneIndex}`
}

/**
 * @param {string} projectId
 * @param {number} sceneIndex 1-based
 * @returns {boolean} true if lock acquired
 */
export function tryAcquireSceneGenerationLock(projectId, sceneIndex) {
  const k = key(projectId, sceneIndex)
  const cur = locks.get(k)
  if (cur?.isGenerating) return false
  locks.set(k, { sceneId: sceneIndex, isGenerating: true, isCompleted: false, startedAt: Date.now() })
  return true
}

export function markSceneGenerationComplete(projectId, sceneIndex) {
  const k = key(projectId, sceneIndex)
  locks.set(k, { sceneId: sceneIndex, isGenerating: false, isCompleted: true, completedAt: Date.now() })
}

export function releaseSceneGenerationLock(projectId, sceneIndex) {
  locks.delete(key(projectId, sceneIndex))
}

export function isSceneGenerationLocked(projectId, sceneIndex) {
  const cur = locks.get(key(projectId, sceneIndex))
  return Boolean(cur?.isGenerating)
}

export function clearProjectGenerationLocks(projectId) {
  const prefix = `${String(projectId || 'default')}:`
  for (const k of locks.keys()) {
    if (k.startsWith(prefix)) locks.delete(k)
  }
}
