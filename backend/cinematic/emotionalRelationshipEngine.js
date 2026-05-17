/**
 * Evolving emotional relationship graph between characters.
 */

function clamp(n) {
  return Math.min(1, Math.max(0, n))
}

/**
 * @param {object} [story]
 * @param {Array<{ narration?: string }>} [script]
 * @param {Array<object>} [priorEdges]
 */
export function buildRelationshipGraph(story, script, priorEdges = []) {
  const names = []
  const chars = Array.isArray(story?.characters) ? story.characters : []
  for (const c of chars) {
    if (c?.name) names.push(String(c.name).trim())
  }
  if (names.length < 2 && names.length === 1) return []

  const edgeMap = new Map()
  for (const e of priorEdges || []) {
    if (!e?.from || !e?.to) continue
    edgeMap.set(`${e.from}::${e.to}`, { ...e })
  }

  const rows = Array.isArray(script) ? script : []
  let blob = ''
  for (const r of rows) blob += `${r.narration || ''} `

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      const key = `${a}::${b}`
      const rev = `${b}::${a}`
      const base = edgeMap.get(key) ||
        edgeMap.get(rev) || {
          from: a,
          to: b,
          trust: 0.5,
          loyalty: 0.5,
          fear: 0.1,
          romance: 0,
          rivalry: 0.1,
          traumaBond: 0,
          admiration: 0.4,
          hatred: 0,
          dependence: 0.2
        }

      const pairBlob = blob
      if (new RegExp(`${a}.*${b}|${b}.*${a}`, 'i').test(pairBlob) || names.length === 2) {
        if (/\b(trust|believe|faith|ally)\b/i.test(pairBlob)) base.trust = clamp(base.trust + 0.12)
        if (/\b(betray|traitor|lied|deceived)\b/i.test(pairBlob)) {
          base.trust = clamp(base.trust - 0.25)
          base.traumaBond = clamp(base.traumaBond + 0.2)
        }
        if (/\b(love|kiss|romance|heart)\b/i.test(pairBlob)) base.romance = clamp(base.romance + 0.2)
        if (/\b(rival|compete|envy)\b/i.test(pairBlob)) base.rivalry = clamp(base.rivalry + 0.15)
        if (/\b(hate|despise|enemy)\b/i.test(pairBlob)) base.hatred = clamp(base.hatred + 0.2)
        if (/\b(afraid|fear) of\b/i.test(pairBlob)) base.fear = clamp(base.fear + 0.15)
        if (/\b(admire|respect|hero)\b/i.test(pairBlob)) base.admiration = clamp(base.admiration + 0.12)
        if (/\b(depend|need you|cannot live)\b/i.test(pairBlob)) base.dependence = clamp(base.dependence + 0.15)
        if (/\b(loyal|swear|protect)\b/i.test(pairBlob)) base.loyalty = clamp(base.loyalty + 0.12)
      }
      edgeMap.set(key, base)
    }
  }

  return [...edgeMap.values()].slice(0, 24)
}

/** Prose for blueprint. */
export function relationshipBlueprintBlock(edges) {
  if (!edges?.length) return ''
  const lines = ['CHARACTER RELATIONSHIPS (evolving — affect dialogue tone and behavior):']
  for (const e of edges.slice(0, 8)) {
    const bits = []
    if (e.trust > 0.65) bits.push('high trust')
    if (e.trust < 0.35) bits.push('low trust')
    if (e.romance > 0.4) bits.push('romantic tension')
    if (e.rivalry > 0.5) bits.push('rivalry')
    if (e.hatred > 0.45) bits.push('hostility')
    if (e.traumaBond > 0.35) bits.push('shared trauma')
    lines.push(`- ${e.from} ↔ ${e.to}: ${bits.length ? bits.join(', ') : 'neutral'}`)
  }
  return lines.join('\n').slice(0, 1400)
}

/**
 * Adjust scene acting/camera from dominant relationship tension.
 * @param {object} scene
 * @param {Array<object>} edges
 */
export function applyRelationshipInfluenceToScene(scene, edges) {
  if (!edges?.length || !scene) return scene
  const maxRivalry = Math.max(...edges.map((e) => e.rivalry ?? 0))
  const maxRomance = Math.max(...edges.map((e) => e.romance ?? 0))
  const minTrust = Math.min(...edges.map((e) => e.trust ?? 0.5))

  if (maxRivalry > 0.55 && scene.camera) {
    scene.camera.shakeIntensity = Math.min(1, (scene.camera.shakeIntensity ?? 0) + 0.1)
  }
  if (maxRomance > 0.45 && scene.acting) {
    scene.acting.gestureIntensity = Math.min(1, (scene.acting.gestureIntensity ?? 0.4) + 0.08)
  }
  if (minTrust < 0.3 && scene.music) {
    scene.music.intensity = Math.min(1, (scene.music.intensity ?? 0.5) + 0.08)
  }
  return scene
}
