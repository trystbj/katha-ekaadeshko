export function estimateSpokenDurationSec(
  text?: string,
  opts?: { minSec?: number; maxSec?: number; pauseSec?: number }
): number

export function attachSceneDurations(
  script: Array<Record<string, unknown>>
): Array<Record<string, unknown>>
