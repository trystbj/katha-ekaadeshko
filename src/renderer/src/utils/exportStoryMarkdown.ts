import type { ProjectState } from '../types/story'
import type { ProjectStatus } from '../types/story'
import { uiTextGlobal } from '../i18n/uiTextGlobal'
import { i18nEpisodePacingLabel } from './i18nEpisodePacing'

function tp(key: string, opts?: Record<string, string | number>): string {
  return uiTextGlobal(key, opts)
}

function projectStatusLabel(s: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    new: 'statusNew',
    in_progress: 'statusProgress',
    completed: 'statusDone'
  }
  return tp(map[s])
}

function episodeExportStatusLabel(s: 'draft' | 'done' | 'current'): string {
  const map = {
    draft: 'exportMarkdownEpisodeStatusDraft',
    done: 'exportMarkdownEpisodeStatusDone',
    current: 'exportMarkdownEpisodeStatusCurrent'
  } as const
  return tp(map[s])
}

/**
 * Human-readable script export (Markdown) for a full project.
 */
export function projectToMarkdown(p: ProjectState): string {
  const lines: string[] = []
  const esc = (s: string) => s.replace(/\r\n/g, '\n')

  lines.push(`# ${esc(p.title)}`)
  lines.push('')
  lines.push(
    tp('exportMarkdownProjectMeta', {
      statusLabel: tp('exportMarkdownLabelStatus'),
      status: projectStatusLabel(p.status),
      updatedLabel: tp('exportMarkdownLabelUpdated'),
      date: p.updatedAt?.slice(0, 10) || tp('uiEmDash')
    })
  )
  lines.push('')

  if (p.bible) {
    const b = p.bible
    lines.push(`## ${tp('exportMarkdownHeadingBible')}`)
    lines.push('')
    lines.push(`*${esc(b.title)}*`)
    lines.push('')
    lines.push(esc(b.concept))
    lines.push('')
    lines.push(`### ${tp('characters')}`)
    lines.push('')
    for (const c of b.characters) {
      lines.push(`- **${esc(c.name)}** — ${esc(c.personality)}`)
    }
    lines.push('')
    if (b.outline?.length) {
      lines.push(`### ${tp('exportMarkdownHeadingEpisodeOutline')}`)
      lines.push('')
      for (const o of b.outline) {
        lines.push(tp('exportMarkdownOutlineBullet', { episode: o.episode, beat: esc(o.beat) }))
      }
      lines.push('')
    }
  }

  if (p.episodes?.length) {
    for (const ep of [...p.episodes].sort((a, b) => a.number - b.number)) {
      lines.push(`## ${tp('exportMarkdownEpisodeHeading', { n: ep.number })}`)
      lines.push('')
      lines.push(
        `*${tp('exportMarkdownEpisodeMeta', {
          pacingLabel: tp('exportMarkdownLabelPacing'),
          pacing: i18nEpisodePacingLabel(ep.pacing),
          sec: ep.estimatedDurationSec,
          statusLabel: tp('exportMarkdownLabelStatus'),
          status: episodeExportStatusLabel(ep.status)
        })}*`
      )
      lines.push('')
      for (const s of ep.scenes) {
        const shot = s.visualDescription ? ` — *${esc(s.visualDescription)}*` : ''
        const thought = s.lineType === 'Thought' ? tp('exportMarkdownThoughtWrapped') : ''
        const sceneHead = tp('exportMarkdownSceneHeading', { index: s.index, character: esc(s.character) })
        lines.push(`${sceneHead}${shot}  \n${thought}${esc(s.text)}${s.emoji ? ` ${s.emoji}` : ''}`)
        lines.push('')
      }
      lines.push(tp('exportMarkdownCliffhangerLine', { text: esc(ep.cliffhanger) }))
      lines.push('')
    }
  } else {
    lines.push(tp('exportMarkdownNoEpisodes'))
    lines.push('')
  }

  if (p.memorySummary?.trim()) {
    lines.push(`## ${tp('exportMarkdownHeadingContinuity')}`)
    lines.push('')
    lines.push(esc(p.memorySummary))
    lines.push('')
  }

  return lines.join('\n').trim() + '\n'
}

export function downloadMarkdownFile(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function safeFilenameFromTitle(title: string): string {
  const raw = title.trim() || tp('exportMarkdownDefaultFilenameSlug')
  return raw
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .toLowerCase()
}
