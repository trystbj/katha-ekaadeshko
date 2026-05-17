import { useCallback, useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import type { PublishDraft, PublishPlatformId } from '../types/videoStudio'
import { useSocialPublishStore } from '../store/useSocialPublishStore'
import { fetchShortsOptimization, fetchSocialCaptions } from '../social/socialApi'
import { linkSocialAccount, loadSocialAccounts, unlinkSocialAccount } from '../social/socialAccounts'
import type { SocialAccountConnection } from '../../../../core/social/socialPublishTypes'
import { enqueueBackgroundPublish } from '../social/uploadQueue'
import { platformLabelKey } from '../utils/platformLabelKey'

const ALL_PLATFORMS: PublishPlatformId[] = ['tiktok', 'youtube_shorts', 'instagram_reel', 'facebook']

type Props = {
  project: ProjectState
  episode: StoryEpisode | null
  scenes: StoryScene[]
  videoUrl: string
  publish: PublishDraft
  patchPublish: (partial: Partial<PublishDraft>) => void
  genre: string
  theme: string
  storyLanguage: string
}

export function SocialPublishExtras({
  project,
  episode,
  scenes,
  videoUrl,
  publish,
  patchPublish,
  genre,
  theme,
  storyLanguage
}: Props) {
  const uiText = useUiText()
  const [accounts, setAccounts] = useState(() => loadSocialAccounts())
  const [busy, setBusy] = useState(false)

  const multiTargets = useSocialPublishStore((s) => s.multiPublishTargets)
  const toggleMulti = useSocialPublishStore((s) => s.toggleMultiTarget)
  const shortsReport = useSocialPublishStore((s) => s.shortsReport)
  const setShortsReport = useSocialPublishStore((s) => s.setShortsReport)
  const backgroundJobs = useSocialPublishStore((s) => s.backgroundJobs)

  useEffect(() => {
    if (!episode?.scenes?.length) return
    let cancelled = false
    void fetchShortsOptimization(episode)
      .then((r) => {
        if (!cancelled) setShortsReport(r)
      })
      .catch(() => {
        if (!cancelled) setShortsReport(null)
      })
    return () => {
      cancelled = true
    }
  }, [episode, setShortsReport])

  const onLink = useCallback(
    (platform: PublishPlatformId) => {
      const ok = window.confirm(uiText('publishConnectConfirm'))
      if (!ok) return
      setAccounts(linkSocialAccount(platform))
      patchPublish({
        linkedYoutube: platform === 'youtube_shorts' ? true : publish.linkedYoutube,
        linkedTiktok: platform === 'tiktok' ? true : publish.linkedTiktok,
        linkedInstagram: platform === 'instagram_reel' ? true : publish.linkedInstagram,
        linkedFacebook: platform === 'facebook' ? true : publish.linkedFacebook
      })
    },
    [patchPublish, publish, uiText]
  )

  const onAiCaptions = useCallback(async () => {
    setBusy(true)
    try {
      const caps = await fetchSocialCaptions({
        storyTitle: project.bible?.title || project.title || '',
        genre,
        theme,
        sceneTexts: scenes.map((s) => s.text),
        platform: publish.activePlatform,
        language: storyLanguage
      })
      patchPublish({
        title: caps.title,
        hookLine: caps.hookLine,
        description: `${caps.description}\n\n${caps.engagementHook}`,
        hashtags: caps.hashtags,
        metadataGeneratedAt: new Date().toISOString()
      })
    } finally {
      setBusy(false)
    }
  }, [genre, patchPublish, project, publish.activePlatform, scenes, storyLanguage, theme])

  const applyClipThumb = useCallback(
    (startSec: number) => {
      patchPublish({ thumbnailFrameSec: startSec })
    },
    [patchPublish]
  )

  const runMultiPublish = useCallback(() => {
    const linked = multiTargets.filter((p) => {
      const acc = accounts[p as keyof typeof accounts] as SocialAccountConnection
      return acc?.status === 'linked'
    })
    if (!linked.length) {
      patchPublish({ jobStatus: 'failed', jobDetail: uiText('publishErrNeedLink') })
      return
    }
    patchPublish({ jobStatus: 'uploading', jobDetail: uiText('socialPublishBackgroundStart') })
    void enqueueBackgroundPublish({
      platforms: linked,
      projectId: project.id,
      videoUrl,
      publish,
      onStage: () => {
        patchPublish({ jobStatus: 'uploading', jobDetail: uiText('socialPublishBackgroundProgress') })
      }
    }).then(() => {
      patchPublish({ jobStatus: 'published', jobDetail: uiText('publishDoneComposer') })
    })
  }, [accounts, multiTargets, patchPublish, project.id, publish, uiText, videoUrl])

  const activeJobs = backgroundJobs.filter((j) => j.status !== 'published' && j.status !== 'failed')

  return (
    <div className="social-publish-extras">
      <h5 className="social-publish-extras__title">{uiText('socialMultiPublishTitle')}</h5>
      <p className="social-publish-extras__lead">{uiText('socialMultiPublishLead')}</p>
      <div className="social-publish-extras__targets">
        {ALL_PLATFORMS.map((p) => (
          <label key={p} className="social-publish-extras__check">
            <input
              type="checkbox"
              checked={multiTargets.includes(p)}
              onChange={() => toggleMulti(p)}
            />
            <span>{uiText(platformLabelKey(p))}</span>
          </label>
        ))}
      </div>
      <button type="button" className="btn btn-small" onClick={() => void runMultiPublish()}>
        {uiText('socialPublishAllCta')}
      </button>

      {activeJobs.length ? (
        <ul className="social-publish-extras__jobs" aria-live="polite">
          {activeJobs.map((j) => (
            <li key={j.id}>
              {uiText('socialJobProgress', {
                platform: uiText(platformLabelKey(j.platform)),
                stage: j.stage,
                pct: Math.round(j.progress * 100)
              })}
            </li>
          ))}
        </ul>
      ) : null}

      <h5 className="social-publish-extras__title">{uiText('socialAccountsTitle')}</h5>
      <div className="social-publish-extras__accounts">
        {ALL_PLATFORMS.map((p) => {
          const acc = accounts[p]
          const linked = acc?.status === 'linked'
          return (
            <div key={p} className="social-publish-extras__account-row">
              <span>{uiText(platformLabelKey(p))}</span>
              {linked ? (
                <>
                  <span className="publish-panel__linked">{uiText('publishLinkedBadge')}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAccounts(unlinkSocialAccount(p))}>
                    {uiText('socialDisconnect')}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLink(p)}>
                  {uiText('publishConnectBtn', { platform: uiText(platformLabelKey(p)) })}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <h5 className="social-publish-extras__title">{uiText('socialShortsOptimizerTitle')}</h5>
      {shortsReport ? (
        <>
          <p className="social-publish-extras__meta">
            {uiText('socialShortsPeakScene', { n: shortsReport.emotionalPeakSceneIndex })}
            {uiText('creatorMetaJoin')}
            {uiText('socialShortsPacingScore', { pct: Math.round(shortsReport.pacingScore * 100) })}
          </p>
          <ul className="social-publish-extras__clips">
            {shortsReport.clips.map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong>
                {uiText('creatorMetaJoin')}
                {uiText('socialClipRange', { start: c.startSec, end: c.endSec })}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyClipThumb(c.startSec)}>
                  {uiText('socialUseAsThumb')}
                </button>
                <p className="social-publish-extras__reason">{c.reason}</p>
              </li>
            ))}
          </ul>
          {shortsReport.tips.length ? (
            <ul className="social-publish-extras__tips">
              {shortsReport.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="social-publish-extras__meta">{uiText('socialShortsLoading')}</p>
      )}

      <div className="post-export-dock__actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void onAiCaptions()}>
          {uiText('socialAiCaptions')}
        </button>
      </div>
    </div>
  )
}
