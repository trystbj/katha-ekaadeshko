export function mergeResults(original, validated, enhanced) {
  // Priority:
  // - Take DeepSeek for corrections (logic) where present
  // - Then apply Gemini enhancements where not conflicting
  // - Preserve original intent

  const base = { ...original }
  const v = validated && typeof validated === 'object' ? validated : {}
  const e = enhanced && typeof enhanced === 'object' ? enhanced : {}

  // Title/setting: prefer validated if it fixed contradictions; else enhanced if it improves clarity; else original.
  base.title = pickNonEmpty(v.title, e.title, base.title)
  base.setting = pickNonEmpty(v.setting, e.setting, base.setting)

  // Characters: prefer validated list (consistency). If Gemini adds detail, merge traits.
  const vChars = Array.isArray(v.characters) ? v.characters : Array.isArray(base.characters) ? base.characters : []
  const eChars = Array.isArray(e.characters) ? e.characters : []
  base.characters = mergeCharacters(vChars, eChars)

  // Story: apply validated story (logic-corrected), then lightly prefer enhanced if longer/better but still consistent.
  const vStory = typeof v.story === 'string' && v.story.trim() ? v.story.trim() : ''
  const eStory = typeof e.story === 'string' && e.story.trim() ? e.story.trim() : ''
  const oStory = typeof base.story === 'string' ? base.story.trim() : ''
  const corrected = vStory || oStory
  base.story = chooseStory(corrected, eStory)

  return base
}

function pickNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function mergeCharacters(validated, enhanced) {
  const byName = new Map()
  for (const c of validated) {
    if (!c || !c.name) continue
    byName.set(String(c.name).toLowerCase(), sanitizeChar(c))
  }
  for (const c of enhanced) {
    if (!c || !c.name) continue
    const k = String(c.name).toLowerCase()
    const prev = byName.get(k)
    if (!prev) byName.set(k, sanitizeChar(c))
    else {
      byName.set(k, {
        ...prev,
        role: prev.role || c.role || '',
        traits: mergeTraits(prev.traits, c.traits)
      })
    }
  }
  return Array.from(byName.values())
}

function sanitizeChar(c) {
  return {
    name: String(c.name || '').trim(),
    role: String(c.role || '').trim(),
    traits: String(c.traits || '').trim()
  }
}

function mergeTraits(a, b) {
  const aa = String(a || '').trim()
  const bb = String(b || '').trim()
  if (!aa) return bb
  if (!bb) return aa
  if (aa.toLowerCase() === bb.toLowerCase()) return aa
  return `${aa}; ${bb}`
}

function chooseStory(corrected, enhanced) {
  if (!enhanced) return corrected
  // Prefer enhanced if it is not drastically shorter and seems to add depth.
  if (enhanced.length >= Math.max(400, corrected.length * 0.85)) return enhanced
  return corrected
}

