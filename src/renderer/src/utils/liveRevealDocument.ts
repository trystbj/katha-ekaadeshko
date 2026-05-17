import type { JobsStreamGenerateResult } from '../types/kathaGenerate'

/** Single markdown-ish document typed live after pipeline JSON returns. */
export function buildLiveRevealDocument(out: JobsStreamGenerateResult): string {
  const { story, script } = out
  const chunks: string[] = []

  chunks.push('# Story Title')
  chunks.push(String(story.title || '').trim() || '—')
  chunks.push('')

  chunks.push('# Story Summary')
  chunks.push(String(story.setting || '').trim() || '—')
  chunks.push('')

  chunks.push('# Characters')
  if (story.characters?.length) {
    for (const c of story.characters) {
      chunks.push(`- **${c.name}** (${c.role}) — ${c.traits}`)
    }
  } else {
    chunks.push('—')
  }
  chunks.push('')

  chunks.push('# Full Story')
  const prose = String(story.setting || '').trim()
  const paras = prose.split(/\n\n+/).filter(Boolean)
  chunks.push(...(paras.length ? paras : [prose || '—']))
  chunks.push('')

  chunks.push('# Scene Script & Dialogue')
  if (script?.length) {
    script.forEach((row, i) => {
      const n = typeof row.scene === 'number' ? row.scene : i + 1
      const nar = typeof row.narration === 'string' ? row.narration.trim() : ''
      chunks.push(`## Scene ${n}`)
      chunks.push(`**Narration:** ${nar || '—'}`)
      chunks.push('')
    })
  } else {
    chunks.push('—')
    chunks.push('')
  }

  chunks.push('# Narration Script')
  if (script?.length) {
    script.forEach((row, i) => {
      const n = typeof row.scene === 'number' ? row.scene : i + 1
      const nar = typeof row.narration === 'string' ? row.narration.trim() : ''
      chunks.push(`Scene ${n}: ${nar || '—'}`)
    })
  } else {
    chunks.push('—')
  }
  chunks.push('')

  chunks.push('# Visual Prompt Notes')
  let visualLines = 0
  if (script?.length) {
    for (let i = 0; i < script.length; i++) {
      const row = script[i]
      const n = typeof row.scene === 'number' ? row.scene : i + 1
      const vd = typeof row.visual_description === 'string' ? row.visual_description.trim() : ''
      if (!vd) continue
      chunks.push(`Scene ${n}: ${vd}`)
      visualLines++
    }
  }
  if (visualLines === 0) chunks.push('—')

  return chunks.join('\n')
}

/** Map typed progress to i18n key for subtle status line. */
export function liveRevealPhaseKey(full: string, visibleLen: number): string {
  const head = full.slice(0, Math.max(0, visibleLen))
  if (!head.includes('# Story Summary')) return 'liveGenPhaseTitle'
  if (!head.includes('# Characters')) return 'liveGenPhaseSummary'
  if (!head.includes('# Full Story')) return 'liveGenPhaseCharacters'
  if (!head.includes('# Scene Script & Dialogue')) return 'liveGenPhaseStory'
  if (!head.includes('# Narration Script')) return 'liveGenPhaseScript'
  if (!head.includes('# Visual Prompt Notes')) return 'liveGenPhaseNarration'
  return 'liveGenPhaseVisuals'
}
