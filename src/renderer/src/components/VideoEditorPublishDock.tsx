import { useCallback, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { ProjectState, StoryScene } from '../types/story'
import { newProjectId } from '../types/story'
import type { VideoFilterPreset, VideoMotionPreset, VideoStudioDraft } from '../types/videoStudio'
import {
  defaultVideoStudioState,
  defaultVideoStudioDraft,
  normalizeVideoStudioDraft
} from '../types/videoStudio'
import { PublishPanel } from './PublishPanel'
import { scenesToWebVtt, scenesToSrt, scenesSecondaryToWebVtt, SECONDS_PER_RENDER_SCENE } from '../utils/scenesWebVtt'
import { buildSubtitleVttLook } from '../utils/buildSubtitleVttLook'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { resolvePublishEncodePlan } from '../utils/publishExportProfiles'

const FILTERS: VideoFilterPreset[] = [
  'none',
  'cinematic',
  'warm',
  'cold',
  'moody',
  'dreamy',
  'vintage',
  'anime_pop',
  'noir',
  'vibrant',
  'dramatic',
  'horror_dark',
  'folk_warm',
  'mystical_glow',
  'custom_stack'
]

const MOTIONS: VideoMotionPreset[] = [
  'static',
  'slow_zoom_in',
  'cinematic_push',
  'pull_out',
  'parallax_float',
  'tilt_dramatic',
  'orbit_soft',
  'handheld_micro',
  'smooth_pan',
  'shake_dramatic',
  'ai_auto_motion'
]

type Props = {
  project: ProjectState
  scenes: StoryScene[]
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  videoUrl: string
  episodeNumber?: number | null
}

export function VideoEditorPublishDock({ project, scenes, patchProject, videoUrl, episodeNumber = null }: Props) {
  const uiText = useUiText()
  const [publishMountKey, setPublishMountKey] = useState(0)

  const vs = ensureVideoStudio(project)
  const d = vs.draft

  const patchDraft = useCallback(
    (partial: Partial<VideoStudioDraft>) => {
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          videoStudio: {
            ...base,
            draft: {
              ...base.draft,
              ...partial,
              recipe: { ...base.draft.recipe, ...(partial.recipe ?? {}) },
              tiktok: { ...base.draft.tiktok, ...(partial.tiktok ?? {}) },
              publish: partial.publish ? { ...base.draft.publish, ...partial.publish } : base.draft.publish
            }
          }
        }
      })
    },
    [patchProject]
  )

  const pushSnapshot = useCallback(
    (label: string) => {
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        const snap = {
          savedAt: new Date().toISOString(),
          label,
          draft: JSON.parse(JSON.stringify(base.draft)) as VideoStudioDraft
        }
        const history = [snap, ...base.history].slice(0, 24)
        return { ...p, updatedAt: new Date().toISOString(), videoStudio: { ...base, history } }
      })
    },
    [patchProject]
  )

  const duplicateProject = useCallback(() => {
    patchProject((p) => {
      const guess = `${p.bible?.title || p.title || 'Story'} (copy)`.slice(0, 120)
      return {
        ...p,
        id: newProjectId(),
        title: guess,
        updatedAt: new Date().toISOString(),
        videoStudio: defaultVideoStudioState(guess)
      }
    })
    setPublishMountKey((k) => k + 1)
  }, [patchProject])

  const resetDraft = useCallback(() => {
    const guess = (project.bible?.title || project.title || '').trim()
    patchProject((p) => ({
      ...p,
      updatedAt: new Date().toISOString(),
      videoStudio: { ...ensureVideoStudio(p), draft: defaultVideoStudioDraft(guess) }
    }))
    setPublishMountKey((k) => k + 1)
  }, [patchProject, project.bible?.title, project.title])

  const autoEnhance = useCallback(() => {
    patchDraft({
      autoEnhanceLastRun: new Date().toISOString(),
      motionGlobal: 'ai_auto_motion',
      recipe: {
        ...d.recipe,
        cinematicTransitions: true,
        fadeInSec: Math.max(d.recipe.fadeInSec, 0.35),
        fadeOutSec: Math.max(d.recipe.fadeOutSec, 0.35),
        sharpenPreview: Math.min(2, d.recipe.sharpenPreview + 0.5)
      },
      editorNotes: [
        d.editorNotes,
        `[auto ${new Date().toISOString()}] ${uiText('videoAutoEnhanceLog')}`
      ]
        .filter(Boolean)
        .join('\n')
    })
  }, [d.editorNotes, d.recipe, patchDraft, uiText])

  const downloadBlob = (blob: Blob, name: string) => {
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = name
    a.click()
    URL.revokeObjectURL(u)
  }

  const exportCaptions = useCallback(() => {
    const st = vs.subtitleStudio
    const look = buildSubtitleVttLook(st)
    const baseName = `${project.title || 'katha'}-captions`
    if (st.separateTrackFormat === 'srt') {
      const body = scenesToSrt(scenes, SECONDS_PER_RENDER_SCENE, st)
      downloadBlob(new Blob([body], { type: 'application/x-subrip;charset=utf-8' }), `${baseName}.srt`)
    } else {
      const body = scenesToWebVtt(scenes, SECONDS_PER_RENDER_SCENE, look, st)
      downloadBlob(new Blob([body], { type: 'text/vtt;charset=utf-8' }), `${baseName}.vtt`)
    }
    if (st.dualLangEnabled) {
      const sec = scenesSecondaryToWebVtt(scenes, SECONDS_PER_RENDER_SCENE, look, st)
      if (sec) {
        downloadBlob(
          new Blob([sec], { type: 'text/vtt;charset=utf-8' }),
          `${baseName}-secondary-${st.dualLangCode}.vtt`
        )
      }
    }
  }, [project.title, scenes, vs.subtitleStudio])

  const exportSrtish = useCallback(() => {
    const st = vs.subtitleStudio
    const body = scenesToSrt(scenes, SECONDS_PER_RENDER_SCENE, st)
    downloadBlob(new Blob([body], { type: 'application/x-subrip;charset=utf-8' }), `${project.title || 'katha'}-captions.srt`)
  }, [project.title, scenes, vs.subtitleStudio])

  const exportRecipe = useCallback(() => {
    const pub = d.publish
    const mode = pub.exportQualityMode ?? 'maximum'
    const encodePlan = resolvePublishEncodePlan(pub.activePlatform, mode)
    const payload = JSON.stringify(
      {
        version: 2,
        projectId: project.id,
        title: project.title,
        videoUrl,
        draft: d,
        exportQualityMode: mode,
        publishEncodePlan: encodePlan,
        scenes: scenes.map((s) => ({ index: s.index, text: s.text }))
      },
      null,
      2
    )
    downloadBlob(new Blob([payload], { type: 'application/json' }), `${project.title || 'katha'}-edit-recipe.json`)
  }, [d, project.id, project.title, scenes, videoUrl])

  const historyLabels = useMemo(() => vs.history.slice(0, 8), [vs.history])

  const restoreSnapshot = useCallback(
    (ix: number) => {
      const snap = vs.history[ix]
      if (!snap) return
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        const guess = (p.bible?.title || p.title || '').trim()
        const raw = JSON.parse(JSON.stringify(snap.draft)) as VideoStudioDraft
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          videoStudio: { ...base, draft: normalizeVideoStudioDraft(raw, guess) }
        }
      })
      setPublishMountKey((k) => k + 1)
    },
    [patchProject, vs.history]
  )

  return (
    <div className="post-export-dock">
      <h4 className="post-export-dock__section-title">{uiText('videoDockEditorTitle')}</h4>
      <div className="post-export-dock__grid">
        <label className="post-export-dock__field">
          <span>{uiText('videoTrimStart')}</span>
          <input
            type="number"
            min={0}
            step={0.1}
            className="select"
            value={d.trimStartSec}
            onChange={(e) => patchDraft({ trimStartSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoTrimEnd')}</span>
          <input
            type="number"
            min={0}
            step={0.1}
            className="select"
            value={d.trimEndSec}
            onChange={(e) => patchDraft({ trimEndSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoSplitAt')}</span>
          <input
            type="number"
            min={0}
            step={0.25}
            className="select"
            placeholder={uiText('unitsSecondsShort')}
            value={d.splitAtSec ?? ''}
            onChange={(e) =>
              patchDraft({
                splitAtSec: e.target.value === '' ? null : Math.max(0, Number(e.target.value))
              })
            }
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoFilterPreset')}</span>
          <select className="select" value={d.filterId} onChange={(e) => patchDraft({ filterId: e.target.value as VideoFilterPreset })}>
            {FILTERS.map((id) => (
              <option key={id} value={id}>
                {uiText(`videoFilter_${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoMotionGlobal')}</span>
          <select className="select" value={d.motionGlobal} onChange={(e) => patchDraft({ motionGlobal: e.target.value as VideoMotionPreset })}>
            {MOTIONS.map((id) => (
              <option key={id} value={id}>
                {uiText(`videoMotion_${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoWatermark')}</span>
          <input
            type="text"
            className="select"
            maxLength={48}
            placeholder={uiText('videoWatermarkPh')}
            value={d.recipe.watermarkText}
            onChange={(e) =>
              patchDraft({
                recipe: { ...d.recipe, watermarkText: e.target.value }
              })
            }
          />
        </label>
      </div>

      <details>
        <summary>{uiText('videoDockAdvancedTools')}</summary>
        <div className="post-export-dock__grid" style={{ marginTop: 10 }}>
          <label className="post-export-dock__field">
            <span>{uiText('videoFadeIn')}</span>
            <input
              type="number"
              min={0}
              step={0.05}
              className="select"
              value={d.recipe.fadeInSec}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, fadeInSec: Math.max(0, Number(e.target.value) || 0) }
                })
              }
            />
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('videoFadeOut')}</span>
            <input
              type="number"
              min={0}
              step={0.05}
              className="select"
              value={d.recipe.fadeOutSec}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, fadeOutSec: Math.max(0, Number(e.target.value) || 0) }
                })
              }
            />
          </label>
          <label className="post-export-dock__field tw-flex-row tw-items-center tw-gap-2">
            <input
              type="checkbox"
              checked={d.recipe.dissolveBetweenScenes}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, dissolveBetweenScenes: e.target.checked }
                })
              }
            />
            <span>{uiText('videoDissolveScenes')}</span>
          </label>
          <label className="post-export-dock__field tw-flex-row tw-items-center tw-gap-2">
            <input
              type="checkbox"
              checked={d.recipe.letterbox}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, letterbox: e.target.checked }
                })
              }
            />
            <span>{uiText('videoLetterbox')}</span>
          </label>
          <label className="post-export-dock__field tw-flex-row tw-items-center tw-gap-2">
            <input
              type="checkbox"
              checked={d.recipe.cinematicTransitions}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, cinematicTransitions: e.target.checked }
                })
              }
            />
            <span>{uiText('videoCinematicTransitions')}</span>
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('videoVignette')}</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={d.recipe.vignette}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, vignette: Number(e.target.value) }
                })
              }
            />
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('videoGrain')}</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={d.recipe.grain}
              onChange={(e) =>
                patchDraft({
                  recipe: { ...d.recipe, grain: Number(e.target.value) }
                })
              }
            />
          </label>
        </div>
      </details>

      <div className="post-export-dock__actions">
        <button type="button" className="btn btn-small" onClick={autoEnhance}>
          {uiText('videoAutoEnhance')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => pushSnapshot(uiText('videoSnapshotManual'))}>
          {uiText('videoSaveSnapshot')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={resetDraft}>
          {uiText('videoResetDraft')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={duplicateProject}>
          {uiText('videoDuplicateProject')}
        </button>
      </div>

      {historyLabels.length ? (
        <details style={{ marginTop: 10 }}>
          <summary>{uiText('videoVersionHistory')}</summary>
          <ul className="tw-mt-2 tw-space-y-1 tw-text-sm" style={{ color: 'var(--muted)' }}>
            {historyLabels.map((s, i) => (
              <li key={`${s.savedAt}-${i}`}>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => restoreSnapshot(i)}>
                  {s.label}
                  {Glyphs.space}
                  {Glyphs.middot}
                  {Glyphs.space}
                  {new Date(s.savedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <PublishPanel
        key={publishMountKey}
        project={project}
        scenes={scenes}
        episode={
          episodeNumber != null
            ? project.episodes.find((e) => e.number === episodeNumber) ?? null
            : project.episodes[0] ?? null
        }
        videoUrl={videoUrl}
        publish={d.publish}
        tiktokLegacy={d.tiktok}
        editorNotes={d.editorNotes}
        patchDraft={patchDraft}
      />

      <h4 className="post-export-dock__section-title" style={{ marginTop: 20 }}>
        {uiText('videoDockExportTitle')}
      </h4>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 10 }}>{uiText('videoPublishExplain')}</p>
      <div className="post-export-dock__actions">
        <button type="button" className="btn btn-small" onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}>
          {uiText('videoExportMp4')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={exportCaptions}>
          {uiText('videoExportVtt')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={exportSrtish}>
          {uiText('videoExportCaptionTxt')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={exportRecipe}>
          {uiText('videoExportRecipe')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled title={uiText('videoExportBurnedHint')}>
          {uiText('videoExportBurned')}
        </button>
      </div>
    </div>
  )
}
