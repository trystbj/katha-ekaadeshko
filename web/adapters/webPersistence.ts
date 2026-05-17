import type { ProjectPersistence, ProjectMeta } from '../../core/persistence/types'
import type { ProjectState } from '../../src/renderer/src/types/story'

/**
 * Web persistence delegates to `window.katha` (Supabase-backed when configured).
 * This keeps the UI/core schema identical while allowing a desktop implementation later.
 */
export function webPersistence(): ProjectPersistence {
  return {
    listProjects: async (): Promise<ProjectMeta[]> => {
      const k = window.katha
      if (!k?.projectsList) return []
      return await k.projectsList()
    },
    loadProject: async (id: string): Promise<ProjectState> => {
      const k = window.katha
      if (!k?.projectsLoad) throw new Error('projectsLoad not available')
      return await k.projectsLoad(id)
    },
    saveProject: async (project: ProjectState) => {
      const k = window.katha
      if (!k?.projectsSave) throw new Error('projectsSave not available')
      await k.projectsSave(project)
    },
    deleteProject: async (id: string) => {
      const k = window.katha
      if (!k?.projectsDelete) throw new Error('projectsDelete not available')
      await k.projectsDelete(id)
    }
  }
}

