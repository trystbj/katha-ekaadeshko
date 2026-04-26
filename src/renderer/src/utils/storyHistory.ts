import type { ProjectState } from '../types/story'

type KathaHistory = {
  storyHistorySave?: (p: ProjectState) => Promise<boolean>
  authGetSession?: () => Promise<{ user?: { id: string } | null }>
  projectsSave?: (p: ProjectState) => Promise<boolean>
}

export async function pushStoryToHistory(project: ProjectState | null) {
  if (!project?.id || !project.bible) return
  const k = window.katha as KathaHistory | undefined
  if (!k?.storyHistorySave) return
  try {
    await k.storyHistorySave({ ...project, updatedAt: new Date().toISOString() })
  } catch {
    /* ignore */
  }
}

/** Optional cloud copy when the user is signed in (Supabase). */
export async function pushStoryToCloudIfSignedIn(project: ProjectState | null) {
  if (!project?.id || !project.bible) return
  const k = window.katha as KathaHistory | undefined
  if (!k?.authGetSession || !k?.projectsSave) return
  try {
    const sess = await k.authGetSession()
    if (!sess?.user) return
    await k.projectsSave({ ...project, updatedAt: new Date().toISOString() })
  } catch {
    /* ignore */
  }
}
