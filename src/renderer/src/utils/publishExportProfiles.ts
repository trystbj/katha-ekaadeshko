import type { PublishExportQualityMode, PublishPlatformId } from '../types/videoStudio'

/** Structured hints for optional FFmpeg delivery pass — always derived from master MP4 when re-encoding. */
export type PublishEncodePlan = {
  platform: PublishPlatformId
  qualityMode: PublishExportQualityMode
  masterFirst: true
  /** x264 CRF lower = higher quality (approximate visual QP). */
  videoCrf: number
  videoPreset: 'slow' | 'medium' | 'fast'
  x264Passes: 1 | 2
  audioKbps: number
  audioCodec: 'aac'
  /** Avoid resizing away from native vertical pixel dimensions when possible */
  scalePolicy: string
  subtitleNote: string
  platformNotes: string[]
}

const PLATFORM_NOTES: Record<PublishPlatformId, string[]> = {
  youtube_shorts: [
    'Prefer native 9:16 resolution from master — avoid downscaling before upload.',
    'Use high bitrate / low CRF so Shorts has headroom before platform transcoding.',
    'AAC 256 kbps stereo keeps narration and music detail.'
  ],
  tiktok: [
    'Use container-friendly MP4 (H.264 + AAC); avoid unnecessary second-generation rescale.',
    'Keep motion smooth: do not drop frames below native fps when re-encoding.',
    'Preserve subtitles as separate .srt/.vtt plus optional burn-in only from master.'
  ],
  instagram_reel: [
    'Target IG-friendly max dimension without softening contrast — mild sharpening only if needed.',
    'Protect grading: avoid stacking heavy filters on top of an already compressed MP4.'
  ],
  facebook: [
    'Upload highest-quality MP4 once — Facebook will transcode; supply generous bitrate on your side.'
  ]
}

function tier(platform: PublishPlatformId, mode: PublishExportQualityMode): Omit<PublishEncodePlan, 'platform' | 'qualityMode'> {
  switch (mode) {
    case 'maximum':
      return {
        masterFirst: true,
        videoCrf: platform === 'youtube_shorts' ? 16 : 17,
        videoPreset: 'slow',
        x264Passes: 1,
        audioKbps: 256,
        audioCodec: 'aac',
        scalePolicy: 'Keep original width×height from master render when aspect matches vertical 9:16.',
        subtitleNote: 'Burn-in only from master + vector-friendly ASS/SRT where supported.',
        platformNotes: PLATFORM_NOTES[platform]
      }
    case 'balanced':
      return {
        masterFirst: true,
        videoCrf: 20,
        videoPreset: 'medium',
        x264Passes: 1,
        audioKbps: 192,
        audioCodec: 'aac',
        scalePolicy: 'Resize only if platform hard-limit requires it; otherwise keep native.',
        subtitleNote: 'Prefer soft subtitles sidecar to retain sharpness.',
        platformNotes: PLATFORM_NOTES[platform]
      }
    case 'small':
      return {
        masterFirst: true,
        videoCrf: 23,
        videoPreset: 'fast',
        x264Passes: 1,
        audioKbps: 160,
        audioCodec: 'aac',
        scalePolicy: 'May resize/bitrate-cap for smaller files — expect visible softening after platforms recompress.',
        subtitleNote: 'Sidecar captions recommended; aggressive compression hurts burned text.',
        platformNotes: PLATFORM_NOTES[platform]
      }
  }
}

export function resolvePublishEncodePlan(
  platform: PublishPlatformId,
  mode: PublishExportQualityMode
): PublishEncodePlan {
  const t = tier(platform, mode)
  return {
    platform,
    qualityMode: mode,
    ...t
  }
}

export function publishEncodePlanClipboardBlock(plan: PublishEncodePlan): string {
  const lines = [
    `Platform: ${plan.platform}`,
    `Quality mode: ${plan.qualityMode}`,
    'Workflow: master render MP4 → optional delivery transcode (never chain off a lossy preview).',
    `Video: libx264 CRF ${plan.videoCrf}, preset ${plan.videoPreset}, passes ${plan.x264Passes}`,
    `Audio: ${plan.audioCodec} ${plan.audioKbps} kbps`,
    `Scaling: ${plan.scalePolicy}`,
    `Subtitles: ${plan.subtitleNote}`,
    ...plan.platformNotes.map((n) => `• ${n}`)
  ]
  return lines.join('\n')
}
