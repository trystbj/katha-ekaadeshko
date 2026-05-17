import type { ProjectState } from '../../src/renderer/src/types/story'

export type ProjectId = string

export type ProjectMeta = {
  id: ProjectId
  title: string
  status: string
  updatedAt: string
}

export interface ProjectPersistence {
  listProjects(): Promise<ProjectMeta[]>
  loadProject(id: ProjectId): Promise<ProjectState>
  saveProject(project: ProjectState): Promise<void>
  deleteProject(id: ProjectId): Promise<void>
}

