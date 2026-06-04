/**
 * Deterministic placeholder still when Leonardo fails (manual regen later).
 * @param {number} sceneNum
 * @param {string} [hint]
 */
export function buildScenePlaceholderImageUrl(sceneNum, hint = '') {
  const label = `Scene ${sceneNum}`
  const sub = String(hint || 'Regenerate when ready').slice(0, 48)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#3d4a62"/><stop offset="100%" stop-color="#5a6a82"/>
  </linearGradient></defs>
  <rect width="720" height="1280" fill="url(#g)"/>
  <text x="360" y="600" fill="#c8d0e0" font-family="system-ui,sans-serif" font-size="42" text-anchor="middle">${label}</text>
  <text x="360" y="660" fill="#8a94a8" font-family="system-ui,sans-serif" font-size="22" text-anchor="middle">${sub}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
