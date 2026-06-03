/**
 * Coerce script LLM output to a row array (models sometimes wrap or truncate).
 * @param {unknown} json
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeScriptJson(json) {
  if (Array.isArray(json)) return json.filter(Boolean)
  if (json && typeof json === 'object') {
    const o = /** @type {Record<string, unknown>} */ (json)
    if (Array.isArray(o.scenes)) return o.scenes.filter(Boolean)
    if (Array.isArray(o.script)) return o.script.filter(Boolean)
    if (Array.isArray(o.rows)) return o.rows.filter(Boolean)
    if (Array.isArray(o.data)) return o.data.filter(Boolean)
    if (Array.isArray(o.scene_list)) return o.scene_list.filter(Boolean)
    if (Array.isArray(o.screenplay)) return o.screenplay.filter(Boolean)
  }
  return []
}
