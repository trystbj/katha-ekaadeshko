/** Map backend / busy label to a 0..6 step for the generation checklist UI. */
export function stageToStepIndex(
  jobStage: string | undefined,
  jobProgress: number,
  busyLabel: string | null,
  tick: number
): number {
  if (jobStage) {
    const s = jobStage.toLowerCase()
    if (/character|cast|portrait|leonardo/i.test(s)) return 1
    if (/scene|still|shot|visual|design|image \d/i.test(s)) return 2
    if (/dialogue|script|line/i.test(s)) return 3
    if (/voice|tts|narrat/i.test(s)) return 4
    if (/video|render|ffmpeg|encode|1080p|4k|upscale|uploading|downloading/i.test(s)) return 5
    if (/final|complete|done/i.test(s)) return 6
    if (/story|bible|outline|writing|starting/i.test(s)) return 0
    const p = Math.max(0, Math.min(99, jobProgress))
    return Math.min(6, Math.floor((p / 100) * 7))
  }
  if (busyLabel?.includes('bible')) return 0
  if (busyLabel?.includes('episode')) return Math.min(3, 2 + (tick % 2))
  if (busyLabel?.includes('leonardo')) return 2
  if (busyLabel?.includes('generating')) return Math.min(5, 3 + (tick % 3))
  return Math.min(6, Math.floor(tick / 2) % 7)
}

export function isVideoOrTranscodeStage(stage: string | undefined, busyLabel: string | null): boolean {
  if (stage && /video|render|ffmpeg|encode|1080p|4k|upscale|upload|download|image \d/i.test(stage)) return true
  if (busyLabel && /video|ffmpeg|render/i.test(busyLabel)) return true
  return false
}

export function formatDurationShort(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '0:00'
  const s = Math.floor(totalSec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `0:${r.toString().padStart(2, '0')}`
}
