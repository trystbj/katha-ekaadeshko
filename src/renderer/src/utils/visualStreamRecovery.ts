export type PipelineImageRow = {
  scene?: string | number
  image_url?: string
  imageUrl?: string
  prompt?: string
}

export function hasUsablePipelineImages(images: PipelineImageRow[] = []): boolean {
  return images.some((r) => Boolean(String(r.image_url || r.imageUrl || '').trim()))
}

export function mergePipelineImageRows(
  existing: PipelineImageRow[],
  row: PipelineImageRow,
  sceneNum: number
): PipelineImageRow[] {
  const url = row.image_url || row.imageUrl
  if (!url) return existing
  const next = [...existing]
  const ix = next.findIndex((r) => Number(r.scene) === sceneNum)
  const normalized = { ...row, scene: sceneNum, image_url: url, imageUrl: url }
  if (ix >= 0) next[ix] = normalized
  else next.push(normalized)
  return next
}

export function pipelineImagesFromStore(
  project: { assets?: { kind?: string; key?: string; url?: string }[] } | null | undefined,
  episodeScenes: { index: number }[]
): PipelineImageRow[] {
  if (!project?.assets?.length) return []
  const rows: PipelineImageRow[] = []
  for (const s of episodeScenes) {
    const key = `scene:${s.index}`
    const hit = project.assets.find((a) => a.kind === 'scene' && a.key === key && a.url)
    if (hit?.url) rows.push({ scene: s.index, image_url: hit.url, imageUrl: hit.url })
  }
  return rows
}
