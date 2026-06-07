import type { JobsStreamGenerateResult } from '../types/kathaGenerate'
import type { ProjectState, StoryEpisode } from '../types/story'

export interface StoryReadingModel {
  title: string
  episodeLabel?: string
  summary: string
  setting: string
  fullStory: string
  characters: Array<{ name: string; role?: string; traits?: string }>
  genre?: string
  length?: string
}

function parsePipelineSnapshot(rawStructured?: string): JobsStreamGenerateResult | null {
  if (!rawStructured?.trim()) return null
  try {
    const parsed = JSON.parse(rawStructured) as JobsStreamGenerateResult
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function episodeOutlineLabel(project: ProjectState, episodeNumber: number): string | undefined {
  const beat = project.bible?.outline?.find((o) => o.episode === episodeNumber)?.beat?.trim()
  if (beat) return `Episode ${episodeNumber}: ${beat}`
  if (episodeNumber > 1) return `Episode ${episodeNumber}`
  return undefined
}

/** Extract the canonical English reading view from project + episode pipeline snapshot. */
export function extractStoryReadingModel(
  project: ProjectState | null,
  episode: StoryEpisode | null | undefined
): StoryReadingModel | null {
  if (!project) return null

  const snapshot = parsePipelineSnapshot(episode?.rawStructured)
  const story = snapshot?.story
  const meta = snapshot?.metadata

  const title =
    String(story?.title || project.bible?.title || project.title || '').trim() ||
    project.title.trim()
  const setting = String(story?.setting || project.bible?.concept || '').trim()
  const proseRaw = String((story as { story?: string } | undefined)?.story || '').trim()
  const fullStory = proseRaw || setting
  if (!fullStory) return null

  const summary = proseRaw ? setting : setting.split(/\n\n+/)[0]?.trim() || setting

  const characters = Array.isArray(story?.characters)
    ? story.characters
        .map((c) => ({
          name: String(c.name || '').trim(),
          role: String(c.role || '').trim() || undefined,
          traits: String(c.traits || '').trim() || undefined
        }))
        .filter((c) => c.name.length > 0)
    : (project.bible?.characters ?? []).map((c) => ({
        name: c.name,
        role: c.role,
        traits: c.personality
      }))

  const genre =
    String(meta?.genre || meta?.theme || '').trim() ||
    undefined
  const length =
    String(meta?.length || meta?.longStoryIntelligence?.pacingProfile || '').trim() ||
    undefined

  return {
    title,
    episodeLabel: episode ? episodeOutlineLabel(project, episode.number) : undefined,
    summary,
    setting,
    fullStory,
    characters,
    genre,
    length
  }
}

export function splitStoryParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const paras = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  return paras.length ? paras : [trimmed]
}

export function buildStoryExportText(
  model: StoryReadingModel,
  opts?: { languageLabel?: string; bodyOverride?: string }
): string {
  const body = opts?.bodyOverride ?? model.fullStory
  const lines: string[] = []

  lines.push(model.title)
  if (model.episodeLabel) lines.push(model.episodeLabel)
  if (opts?.languageLabel) lines.push(`Language: ${opts.languageLabel}`)
  lines.push('')

  if (model.summary && model.summary !== body) {
    lines.push('Story Summary')
    lines.push(model.summary)
    lines.push('')
  }

  if (model.genre) lines.push(`Genre: ${model.genre}`)
  if (model.length) lines.push(`Length: ${model.length}`)
  if (model.genre || model.length) lines.push('')

  if (model.setting && model.setting !== body && model.setting !== model.summary) {
    lines.push('Setting')
    lines.push(model.setting)
    lines.push('')
  }

  lines.push('Full Story')
  lines.push(body)
  lines.push('')

  if (model.characters.length) {
    lines.push('Characters')
    for (const c of model.characters) {
      const extra = [c.role, c.traits].filter(Boolean).join(' — ')
      lines.push(extra ? `- ${c.name} (${extra})` : `- ${c.name}`)
    }
  }

  return lines.join('\n')
}

export function downloadStoryText(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
