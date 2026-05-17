import type { WorkspaceSlotSnapshot } from '../types/workspaceSlot'

const KEY = 'katha:workspace-slots:v1'

export type PersistedWorkspaceFile = {
  v: 1
  activeIndex: number
  slots: WorkspaceSlotSnapshot[]
}

export function loadWorkspaceSlotsDisk(): PersistedWorkspaceFile | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as PersistedWorkspaceFile
    if (o?.v !== 1 || !Array.isArray(o.slots) || o.slots.length !== 5) return null
    return o
  } catch {
    return null
  }
}

export function saveWorkspaceSlotsDisk(data: PersistedWorkspaceFile): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}
