import type { ProjectState } from '../types/story'

const STORAGE_PREFIX = 'katha:auto-char-portraits:'

export function charactersNeedingPortraits(project: ProjectState | null | undefined) {
  if (!project?.bible?.characters?.length) return []
  return project.bible.characters.filter((c) => !c.baseImageUrl?.trim())
}

export function autoPortraitStorageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`
}

export function hasAutoPortraitRun(projectId: string): boolean {
  try {
    return sessionStorage.getItem(autoPortraitStorageKey(projectId)) === '1'
  } catch {
    return false
  }
}

export function markAutoPortraitRun(projectId: string) {
  try {
    sessionStorage.setItem(autoPortraitStorageKey(projectId), '1')
  } catch {
    /* ignore */
  }
}
