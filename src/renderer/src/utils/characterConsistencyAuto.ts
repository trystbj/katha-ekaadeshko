import type { CharacterConsistencyLocks, ProjectState } from '../types/story'
import { DEFAULT_CHARACTER_CONSISTENCY_LOCKS } from '../types/story'

/** All consistency dimensions enforced automatically by the pipeline. */
export const AUTO_CHARACTER_CONSISTENCY_LOCKS: CharacterConsistencyLocks = {
  lockFace: true,
  lockHair: true,
  lockClothing: true,
  lockAge: true,
  lockVoice: true,
  lockPersonality: true
}

export function withAutoCharacterConsistency(project: ProjectState): ProjectState {
  return {
    ...project,
    characterConsistencyLocks: AUTO_CHARACTER_CONSISTENCY_LOCKS
  }
}

export function mergeConsistencyLocks(
  locks: CharacterConsistencyLocks | undefined
): CharacterConsistencyLocks {
  return { ...DEFAULT_CHARACTER_CONSISTENCY_LOCKS, ...AUTO_CHARACTER_CONSISTENCY_LOCKS, ...locks }
}
