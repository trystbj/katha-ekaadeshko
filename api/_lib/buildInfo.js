/** Deploy stamp surfaced in /api/health and SSE errors (verify prod picked up latest API). */

export const KATHA_API_BUILD =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.KATHA_BUILD_ID ||
  `local-${new Date().toISOString().slice(0, 10)}`

export function buildInfoPayload() {
  return {
    build: KATHA_API_BUILD,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  }
}
