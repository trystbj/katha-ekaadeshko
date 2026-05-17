/**
 * Future community / sharing architecture stubs (not a social platform).
 */

/**
 * @param {string} [projectId]
 * @param {object} [story]
 * @param {string} [genre]
 */
export function buildCommunityFoundationMeta(projectId, story, genre) {
  const tags = []
  if (genre) tags.push(String(genre).toLowerCase().replace(/\s+/g, '_').slice(0, 32))
  if (story?.title) tags.push('story')
  if (typeof story?.setting === 'string' && /nepal/i.test(story.setting)) tags.push('nepal')

  return {
    architectureVersion: 1,
    publishReady: false,
    remixTemplateId: null,
    suggestedTags: tags.slice(0, 8),
    creatorProfileSlot: projectId ? `project:${projectId}` : null
  }
}
