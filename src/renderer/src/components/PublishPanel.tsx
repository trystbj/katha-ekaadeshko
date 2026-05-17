import { useCallback, useEffect, useRef } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { ProjectState, StoryScene } from '../types/story'
import type { PublishDraft, PublishPlatformId, TikTokPublishDraft, VideoStudioDraft } from '../types/videoStudio'
import { composeExportPresetSummary } from '../types/videoStudio'
import { generatePublishMetadata } from '../utils/generatePublishMetadata'
import { publishEncodePlanClipboardBlock, resolvePublishEncodePlan } from '../utils/publishExportProfiles'
import { useStudioStore } from '../store/useStudioStore'
import { SocialPublishExtras } from './SocialPublishExtras'
import type { StoryEpisode } from '../types/story'

const PLATFORMS: { id: PublishPlatformId; labelKey: string; short: string }[] = [
  { id: 'youtube_shorts', labelKey: 'publishPlatformYoutube', short: 'YT' },
  { id: 'tiktok', labelKey: 'publishPlatformTiktok', short: 'TT' },
  { id: 'instagram_reel', labelKey: 'publishPlatformInstagram', short: 'IG' },
  { id: 'facebook', labelKey: 'publishPlatformFacebook', short: 'FB' }
]

function composerUrl(id: PublishPlatformId): string {
  switch (id) {
    case 'youtube_shorts':
      return 'https://studio.youtube.com'
    case 'tiktok':
      return 'https://www.tiktok.com/upload'
    case 'instagram_reel':
      return 'https://www.instagram.com/create/select/'
    case 'facebook':
      return 'https://www.facebook.com/reel/create/'
    default:
      return 'https://studio.youtube.com'
  }
}

function isLinked(pub: PublishDraft, id: PublishPlatformId): boolean {
  switch (id) {
    case 'youtube_shorts':
      return pub.linkedYoutube
    case 'tiktok':
      return pub.linkedTiktok
    case 'instagram_reel':
      return pub.linkedInstagram
    case 'facebook':
      return pub.linkedFacebook
    default:
      return false
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

type Props = {
  project: ProjectState
  scenes: StoryScene[]
  episode?: StoryEpisode | null
  videoUrl: string
  publish: PublishDraft
  tiktokLegacy: TikTokPublishDraft
  editorNotes: string
  patchDraft: (partial: Partial<VideoStudioDraft>) => void
}

export function PublishPanel({
  project,
  scenes,
  episode = null,
  videoUrl,
  publish,
  tiktokLegacy,
  editorNotes,
  patchDraft
}: Props) {
  const uiText = useUiText()
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendTheme = useStudioStore((s) => s.backendTheme)
  const storyCountry = useStudioStore((s) => s.storyCountry)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)
  const cancelledRef = useRef(false)
  const metadataFillOnceRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    metadataFillOnceRef.current = false
  }, [videoUrl, project.id])

  const patchPublish = useCallback(
    (partial: Partial<PublishDraft>) => {
      const merged: PublishDraft = { ...publish, ...partial }
      const tiktokSync =
        merged.activePlatform === 'tiktok'
          ? {
              tiktok: {
                ...tiktokLegacy,
                title: merged.title.slice(0, 220),
                caption: merged.description,
                hashtags: merged.hashtags,
                coverTimeSec: merged.thumbnailFrameSec,
                scheduledAt: merged.scheduledAt,
                privacy:
                  (merged.privacy === 'private'
                    ? 'private'
                    : merged.privacy === 'followers'
                      ? 'followers'
                      : 'public') as TikTokPublishDraft['privacy']
              }
            }
          : {}
      patchDraft({
        publish: merged,
        ...tiktokSync
      })
    },
    [patchDraft, publish, tiktokLegacy]
  )

  useEffect(() => {
    if (!videoUrl || publish.metadataGeneratedAt || metadataFillOnceRef.current) return
    metadataFillOnceRef.current = true
    const bible = project.bible
    const meta = generatePublishMetadata({
      storyTitle: bible?.title || project.title || '',
      concept: bible?.concept || '',
      genre: backendGenre || '',
      theme: backendTheme || '',
      language: storyLanguage || '',
      country: storyCountry || '',
      userIdea: bible?.userIdea || '',
      sceneTexts: scenes.map((s) => s.text)
    })
    patchPublish({
      ...meta,
      exportPresetSummary: composeExportPresetSummary(
        publish.activePlatform,
        publish.exportQualityMode ?? 'maximum'
      ),
      metadataGeneratedAt: new Date().toISOString()
    })
    // One-shot auto metadata when render completes; avoids overwriting user edits on publish prop churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit patchPublish / publish fields
  }, [videoUrl, project.id, publish.metadataGeneratedAt, backendGenre, backendTheme, storyLanguage, storyCountry, project.bible, project.title, scenes])

  const regenerateMetadata = useCallback(() => {
    const bible = project.bible
    const meta = generatePublishMetadata({
      storyTitle: bible?.title || project.title || '',
      concept: bible?.concept || '',
      genre: backendGenre || '',
      theme: backendTheme || '',
      language: storyLanguage || '',
      country: storyCountry || '',
      userIdea: bible?.userIdea || '',
      sceneTexts: scenes.map((s) => s.text)
    })
    patchPublish({
      ...meta,
      exportPresetSummary: composeExportPresetSummary(
        publish.activePlatform,
        publish.exportQualityMode ?? 'maximum'
      ),
      metadataGeneratedAt: new Date().toISOString()
    })
  }, [
    backendGenre,
    backendTheme,
    patchPublish,
    publish.activePlatform,
    publish.exportQualityMode,
    project.bible,
    project.title,
    scenes,
    storyCountry,
    storyLanguage
  ])

  const selectPlatform = useCallback(
    (id: PublishPlatformId) => {
      patchPublish({
        activePlatform: id,
        exportPresetSummary: composeExportPresetSummary(id, publish.exportQualityMode ?? 'maximum')
      })
    },
    [patchPublish, publish.exportQualityMode]
  )

  const connectPlatform = useCallback(
    (id: PublishPlatformId) => {
      const ok = window.confirm(uiText('publishConnectConfirm'))
      if (!ok) return
      patchPublish({
        linkedYoutube: id === 'youtube_shorts' ? true : publish.linkedYoutube,
        linkedTiktok: id === 'tiktok' ? true : publish.linkedTiktok,
        linkedInstagram: id === 'instagram_reel' ? true : publish.linkedInstagram,
        linkedFacebook: id === 'facebook' ? true : publish.linkedFacebook,
        jobStatus: 'idle',
        jobDetail: uiText('publishLinkedMock')
      })
    },
    [patchPublish, publish, uiText]
  )

  const copyHashtags = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publish.hashtags)
    } catch {
      /* ignore */
    }
  }, [publish.hashtags])

  const copyFullDraft = useCallback(async () => {
    const qMode = publish.exportQualityMode ?? 'maximum'
    const encodePlan = resolvePublishEncodePlan(publish.activePlatform, qMode)
    const body = [
      publish.title,
      '',
      publish.hookLine,
      '',
      publish.description,
      '',
      publish.hashtags,
      '',
      `SEO: ${publish.seoKeywords}`,
      '',
      `Thumb @ ${publish.thumbnailFrameSec}s`,
      '',
      `${uiText('videoPrivacyLabel')}: ${publish.privacy}`,
      '',
      '———',
      publishEncodePlanClipboardBlock(encodePlan)
    ].join('\n')
    try {
      await navigator.clipboard.writeText(body)
    } catch {
      /* ignore */
    }
  }, [publish, uiText])

  const improveCaptionAi = useCallback(async () => {
    try {
      const k = window.katha
      if (!k?.aiComplete) throw new Error('offline')
      const r = await k.aiComplete({
        system:
          'You polish short-form video captions. Output ONLY the caption text, no quotes. Keep hashtags line last if present.',
        user: `Platform: ${publish.activePlatform}.\nHook: ${publish.hookLine}\nCaption draft:\n${publish.description}\n\nHashtags line:\n${publish.hashtags}`,
        preferProvider: 'gemini',
        maxTokens: 600
      })
      const text = String(r.text || '').trim()
      if (text) patchPublish({ description: text.slice(0, 2200) })
    } catch {
      patchPublish({
        description: `${publish.description}\n\n— ${uiText('publishAiPolishFallback')}`
      })
    }
  }, [patchPublish, publish.activePlatform, publish.description, publish.hashtags, publish.hookLine, uiText])

  const runPublish = useCallback(async () => {
    if (!isLinked(publish, publish.activePlatform)) {
      patchPublish({
        jobStatus: 'failed',
        jobDetail: uiText('publishErrNeedLink')
      })
      return
    }
    const qMode = publish.exportQualityMode ?? 'maximum'
    const stages: Array<{ status: PublishDraft['jobStatus']; ms: number; detail: string }> = [
      { status: 'preparing', ms: 500, detail: uiText('publishStagePrepare') },
      {
        status: 'optimizing',
        ms: 550,
        detail:
          qMode === 'maximum'
            ? uiText('publishStageOptimizeMax')
            : uiText('publishStageOptimizeTier', { tier: uiText(`publishQualityLabel_${qMode}`) })
      },
      { status: 'uploading', ms: 600, detail: uiText('publishStageUpload') },
      { status: 'processing', ms: 450, detail: uiText('publishStageProcess') }
    ]
    for (const row of stages) {
      if (cancelledRef.current) return
      patchPublish({ jobStatus: row.status, jobDetail: row.detail })
      await sleep(row.ms)
    }
    if (cancelledRef.current) return
    await copyFullDraft()
    window.open(composerUrl(publish.activePlatform), '_blank', 'noopener,noreferrer')
    patchPublish({
      jobStatus: 'published',
      jobDetail: uiText('publishDoneComposer')
    })
  }, [copyFullDraft, patchPublish, publish, uiText])

  const retryPublish = useCallback(() => {
    patchPublish({ jobStatus: 'idle', jobDetail: '' })
  }, [patchPublish])

  const savePublishDraft = useCallback(() => {
    patchDraft({
      editorNotes: [editorNotes, `[publish draft ${new Date().toISOString()}]`].filter(Boolean).join('\n')
    })
  }, [editorNotes, patchDraft])

  const statusTone =
    publish.jobStatus === 'failed'
      ? 'publish-status--fail'
      : publish.jobStatus === 'published'
        ? 'publish-status--ok'
        : publish.jobStatus !== 'idle'
          ? 'publish-status--run'
          : ''

  return (
    <section className="publish-panel" aria-label={uiText('publishPanelTitle')}>
      <h4 className="post-export-dock__section-title">{uiText('publishPanelTitle')}</h4>
      <p className="publish-panel__lead">{uiText('publishPanelLead')}</p>

      <div className="publish-strip" role="tablist" aria-label={uiText('publishPlatformPick')}>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={publish.activePlatform === p.id}
            className={`publish-strip__btn ${publish.activePlatform === p.id ? 'publish-strip__btn--on' : ''}`}
            onClick={() => selectPlatform(p.id)}
          >
            <span className={`publish-strip__ic publish-strip__ic--${p.id}`}>{p.short}</span>
            <span className="publish-strip__lbl">{uiText(p.labelKey)}</span>
          </button>
        ))}
      </div>

      <p className="publish-panel__preset">{publish.exportPresetSummary}</p>

      <div className="publish-panel__connect-row">
        <span className="publish-panel__muted">
          {uiText('publishAccountLabel')}
          {Glyphs.colon}
        </span>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => connectPlatform(publish.activePlatform)}>
          {uiText('publishConnectBtn', { platform: uiText(PLATFORMS.find((x) => x.id === publish.activePlatform)?.labelKey || '') })}
        </button>
        {isLinked(publish, publish.activePlatform) ? (
          <span className="publish-panel__linked">{uiText('publishLinkedBadge')}</span>
        ) : (
          <span className="publish-panel__warn">{uiText('publishNotLinkedHint')}</span>
        )}
      </div>

      <div className={['publish-status', statusTone].filter(Boolean).join(' ')}>
        <strong>
          {uiText('publishStatusLabel')}
          {Glyphs.colon}
        </strong>{' '}
        <span>{uiText(`publishJob_${publish.jobStatus}`)}</span>
        {publish.jobDetail ? <div className="publish-status__detail">{publish.jobDetail}</div> : null}
        {publish.jobStatus === 'failed' ? (
          <button type="button" className="btn btn-small publish-status__retry" onClick={retryPublish}>
            {uiText('publishRetry')}
          </button>
        ) : null}
      </div>

      <div className="publish-preview-grid">
        <div className={`publish-preview-card publish-preview-card--${publish.activePlatform}`}>
          <div className="publish-preview-card__chrome">{uiText('publishPreviewChrome')}</div>
          <div className="publish-preview-card__thumb" />
          <div className="publish-preview-card__hook">{publish.hookLine || '—'}</div>
          <div className="publish-preview-card__title">{publish.title || '—'}</div>
          <div className="publish-preview-card__body">{truncatePreview(publish.description, publish.activePlatform)}</div>
          <div className="publish-preview-card__tags">{truncatePreview(publish.hashtags, publish.activePlatform)}</div>
        </div>
      </div>

      <div className="post-export-dock__grid" style={{ marginTop: 14 }}>
        <label className="post-export-dock__field">
          <span>{uiText('publishFieldTitle')}</span>
          <input
            type="text"
            className="select"
            maxLength={220}
            value={publish.title}
            onChange={(e) => patchPublish({ title: e.target.value })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('publishFieldHook')}</span>
          <input
            type="text"
            className="select"
            maxLength={160}
            value={publish.hookLine}
            onChange={(e) => patchPublish({ hookLine: e.target.value })}
          />
        </label>
        <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
          <span>{uiText('publishFieldDescription')}</span>
          <textarea
            className="idea-input"
            rows={4}
            maxLength={2400}
            value={publish.description}
            onChange={(e) => patchPublish({ description: e.target.value })}
          />
        </label>
        <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
          <span>{uiText('publishFieldHashtags')}</span>
          <textarea
            className="idea-input"
            rows={2}
            value={publish.hashtags}
            onChange={(e) => patchPublish({ hashtags: e.target.value })}
          />
        </label>
        <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
          <span>{uiText('publishFieldSeo')}</span>
          <textarea
            className="idea-input"
            rows={2}
            value={publish.seoKeywords}
            onChange={(e) => patchPublish({ seoKeywords: e.target.value })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('publishFieldThumbSec')}</span>
          <input
            type="number"
            min={0}
            step={0.25}
            className="select"
            value={publish.thumbnailFrameSec}
            onChange={(e) => patchPublish({ thumbnailFrameSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoPrivacyLabel')}</span>
          <select
            className="select"
            value={publish.privacy}
            onChange={(e) =>
              patchPublish({
                privacy: e.target.value as PublishDraft['privacy']
              })
            }
          >
            <option value="public">{uiText('videoPrivacyPublic')}</option>
            <option value="unlisted">{uiText('publishPrivacyUnlisted')}</option>
            <option value="followers">{uiText('videoPrivacyFollowers')}</option>
            <option value="private">{uiText('videoPrivacyPrivate')}</option>
          </select>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('videoSchedulePublish')}</span>
          <input
            type="datetime-local"
            className="select"
            value={publish.scheduledAt}
            onChange={(e) => patchPublish({ scheduledAt: e.target.value })}
          />
        </label>

        <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
          <span>{uiText('publishExportQuality')}</span>
          <select
            className="select"
            value={publish.exportQualityMode ?? 'maximum'}
            onChange={(e) => {
              const exportQualityMode = e.target.value as PublishDraft['exportQualityMode']
              patchPublish({
                exportQualityMode,
                exportPresetSummary: composeExportPresetSummary(publish.activePlatform, exportQualityMode)
              })
            }}
          >
            <option value="maximum">{uiText('publishQualityMaximum')}</option>
            <option value="balanced">{uiText('publishQualityBalanced')}</option>
            <option value="small">{uiText('publishQualitySmall')}</option>
          </select>
        </label>
        {(publish.exportQualityMode ?? 'maximum') !== 'maximum' ? (
          <p className="publish-panel__warn" style={{ gridColumn: '1 / -1', margin: 0 }}>
            {uiText('publishQualityWarn')}
          </p>
        ) : null}

        {publish.activePlatform === 'youtube_shorts' ? (
          <>
            <label className="post-export-dock__field">
              <span>{uiText('publishYoutubeTags')}</span>
              <input
                type="text"
                className="select"
                value={publish.youtubeTags}
                onChange={(e) => patchPublish({ youtubeTags: e.target.value })}
              />
            </label>
            <label className="post-export-dock__field">
              <span>{uiText('publishYoutubeCategory')}</span>
              <input
                type="text"
                className="select"
                value={publish.youtubeCategory}
                onChange={(e) => patchPublish({ youtubeCategory: e.target.value })}
              />
            </label>
          </>
        ) : null}

        {publish.activePlatform === 'tiktok' ? (
          <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
            <span>{uiText('publishTrendingSuggestions')}</span>
            <textarea
              className="idea-input"
              rows={2}
              value={publish.trendingSuggestions}
              onChange={(e) => patchPublish({ trendingSuggestions: e.target.value })}
            />
          </label>
        ) : null}

        {publish.activePlatform === 'instagram_reel' ? (
          <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
            <span>{uiText('publishInstagramBlocks')}</span>
            <textarea
              className="idea-input"
              rows={3}
              value={publish.instagramBlocks}
              onChange={(e) => patchPublish({ instagramBlocks: e.target.value })}
            />
          </label>
        ) : null}

        {publish.activePlatform === 'facebook' ? (
          <>
            <label className="post-export-dock__field">
              <span>{uiText('publishFacebookTitle')}</span>
              <input
                type="text"
                className="select"
                value={publish.facebookTitle}
                onChange={(e) => patchPublish({ facebookTitle: e.target.value })}
              />
            </label>
            <label className="post-export-dock__field" style={{ gridColumn: '1 / -1' }}>
              <span>{uiText('publishFacebookDesc')}</span>
              <textarea
                className="idea-input"
                rows={3}
                value={publish.facebookDescription}
                onChange={(e) => patchPublish({ facebookDescription: e.target.value })}
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="post-export-dock__actions publish-panel__actions">
        <button type="button" className="btn btn-small" onClick={regenerateMetadata}>
          {uiText('publishRegenerateMeta')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={savePublishDraft}>
          {uiText('publishSaveDraft')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void copyHashtags()}>
          {uiText('publishCopyTags')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void improveCaptionAi()}>
          {uiText('publishAiImprove')}
        </button>
        <button
          type="button"
          className="btn btn-generate-cta"
          onClick={() => void runPublish()}
          disabled={['preparing', 'optimizing', 'uploading', 'processing'].includes(publish.jobStatus)}
        >
          {uiText('publishPrimaryCta')}
        </button>
      </div>
      <SocialPublishExtras
        project={project}
        episode={episode}
        scenes={scenes}
        videoUrl={videoUrl}
        publish={publish}
        patchPublish={patchPublish}
        genre={backendGenre}
        theme={backendTheme}
        storyLanguage={storyLanguage}
      />

      <p className="publish-panel__footnote">{uiText('publishFootnote')}</p>
    </section>
  )
}

function truncatePreview(text: string, platform: PublishPlatformId): string {
  const t = text.replace(/\s+/g, ' ').trim()
  const max =
    platform === 'tiktok' ? 160 : platform === 'youtube_shorts' ? 120 : platform === 'instagram_reel' ? 180 : 200
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}
