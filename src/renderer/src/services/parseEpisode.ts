import type { EpisodePacing, StoryEpisode, StoryScene } from '../types/story'

function parsePacing(s: string): EpisodePacing {
  const t = s.trim()
  if (t === 'Action' || t === 'Emotional' || t === 'Normal' || t === 'Climax') return t
  return 'Normal'
}

function parseDuration(line: string): number {
  const m = line.match(/(\d+)\s*s/i) || line.match(/(\d+)/)
  const n = m ? parseInt(m[1], 10) : 60
  return Math.min(120, Math.max(40, n))
}

export function parseStructuredEpisode(raw: string, episodeNumber: number): StoryEpisode {
  const scenes: StoryScene[] = []
  let pacing: EpisodePacing = 'Normal'
  let estimatedDurationSec = 60
  let cliffhanger = ''
  const lines = raw.split(/\r?\n/)
  let i = 0
  let currentScene: Partial<StoryScene> | null = null

  const flushScene = (): void => {
    if (currentScene && currentScene.text != null && currentScene.character) {
      scenes.push({
        index: scenes.length + 1,
        lineType: currentScene.lineType === 'Thought' ? 'Thought' : 'Dialogue',
        character: String(currentScene.character),
        text: String(currentScene.text),
        emoji: currentScene.emoji
      })
    }
    currentScene = null
  }

  while (i < lines.length) {
    const line = lines[i].trim()
    const epMatch = line.match(/^Episode:\s*(\d+)/i)
    if (epMatch) {
      flushScene()
      i++
      continue
    }
    const typeMatch = line.match(/^Type:\s*(.+)$/i)
    if (typeMatch && !line.toLowerCase().startsWith('scene')) {
      const val = typeMatch[1].trim()
      if (['Action', 'Emotional', 'Normal', 'Climax'].includes(val)) {
        pacing = parsePacing(val)
        i++
        continue
      }
    }
    const durMatch = line.match(/^Estimated Duration:\s*(.+)$/i)
    if (durMatch) {
      estimatedDurationSec = parseDuration(durMatch[1])
      i++
      continue
    }
    const cliff = line.match(/^Cliffhanger:\s*(.+)$/i)
    if (cliff) {
      flushScene()
      cliffhanger = cliff[1].trim()
      i++
      continue
    }
    const sceneHead = line.match(/^Scene\s*(\d+)\s*:/i)
    if (sceneHead) {
      flushScene()
      currentScene = { index: parseInt(sceneHead[1], 10) }
      i++
      continue
    }
    const st = line.match(/^Type:\s*(Dialogue|Thought)\s*$/i)
    if (st && currentScene) {
      currentScene.lineType = st[1] as 'Dialogue' | 'Thought'
      i++
      continue
    }
    const ch = line.match(/^Character:\s*(.+)$/i)
    if (ch && currentScene) {
      currentScene.character = ch[1].trim()
      i++
      continue
    }
    const tx = line.match(/^Text:\s*(.+)$/i)
    if (tx && currentScene) {
      currentScene.text = tx[1].trim()
      i++
      continue
    }
    const em = line.match(/^Emoji:\s*(\S+)\s*$/i)
    if (em && currentScene) {
      currentScene.emoji = em[1].trim().slice(0, 8)
      i++
      continue
    }
    i++
  }
  flushScene()

  if (!cliffhanger && scenes.length) {
    cliffhanger = '…'
  }

  return {
    number: episodeNumber,
    pacing,
    estimatedDurationSec,
    scenes: scenes.length ? scenes : fallbackScenes(raw, episodeNumber),
    cliffhanger: cliffhanger || 'The next moment changes everything.',
    rawStructured: raw,
    status: 'done'
  }
}

function fallbackScenes(raw: string, episodeNumber: number): StoryScene[] {
  return [
    {
      index: 1,
      lineType: 'Dialogue',
      character: 'Narrator',
      text: raw.slice(0, 400) || `Episode ${episodeNumber} (parse fallback — edit or regenerate).`,
      emoji: undefined
    }
  ]
}

export function fingerprintFromEpisode(ep: StoryEpisode): string {
  const parts = ep.scenes.map((s) => `${s.character}:${s.text}`.toLowerCase().replace(/\s+/g, ' '))
  return parts.join('|').slice(0, 2000)
}
