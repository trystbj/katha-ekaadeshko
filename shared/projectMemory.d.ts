export function buildProjectMemoryPatch(
  project: Record<string, unknown>,
  episode?: Record<string, unknown>,
  pipelineMeta?: Record<string, unknown>
): Record<string, unknown>

export function mergeProjectMemoryIntoPreferences(
  creatorPreferences?: Record<string, unknown>,
  projectMemory?: Record<string, unknown>
): Record<string, unknown>
