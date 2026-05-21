/**
 * Smart dialogue staging — camera angles, reaction beats, silence holds.
 */

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<{ dialogue?: Array<{ character?: string; line?: string }> }>} script
 */
export function applyDialogueStagingToScenes(enrichedScenes, script) {
  return enrichedScenes.map((sc, i) => {
    const row = script[i] || {}
    const lines = Array.isArray(row.dialogue) ? row.dialogue.filter((d) => d?.line) : []
    if (!lines.length) return sc

    const shots = []
    shots.push({ type: 'establishing', durationMs: 400 })
    lines.forEach((d, li) => {
      shots.push({
        type: li % 2 === 0 ? 'over_shoulder' : 'close_up',
        character: d.character,
        durationMs: Math.min(2200, 800 + String(d.line).length * 28),
        zoomOnEmotion: li === lines.length - 1
      })
      if (li < lines.length - 1) {
        shots.push({ type: 'reaction', durationMs: 320, character: d.character })
      }
    })
    if (lines.length >= 2) {
      shots.push({ type: 'silence_beat', durationMs: 480 })
    }

    return {
      ...sc,
      dialogueStaging: {
        shots,
        cameraSwitchCount: shots.length,
        emphasizeFaces: true,
        pauseDuringSilenceMs: 420
      },
      camera: {
        ...(sc.camera || {}),
        shotType: shots.find((s) => s.type === 'close_up') ? 'close_emotional' : sc.camera?.shotType,
        dialogueActive: true
      }
    }
  })
}
