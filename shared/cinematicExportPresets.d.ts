export const CINEMATIC_EXPORT_PRESETS: Record<
  string,
  {
    label: string
    secondsPerScene: number
    fps: number
    subtitleLinePct: number
    subtitleAlign: string
    transitionBias: string
    motionBias: string
    pacingNote: string
  }
>

export function resolveCinematicExportPreset(presetId?: string): {
  label: string
  secondsPerScene: number
  fps: number
  subtitleLinePct: number
  subtitleAlign: string
  transitionBias: string
  motionBias: string
  pacingNote: string
}
