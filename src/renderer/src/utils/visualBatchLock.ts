const batchLocks = new Set<string>()

export function tryAcquireVisualBatchLock(projectId: string): boolean {
  const id = String(projectId || 'studio').trim()
  if (batchLocks.has(id)) return false
  batchLocks.add(id)
  return true
}

export function releaseVisualBatchLock(projectId: string): void {
  batchLocks.delete(String(projectId || 'studio').trim())
}
