type GenPayload = {
  prompt: string
  modelId?: string
  width?: number
  height?: number
  seed?: number
}

type GenResult = { imageUrl: string; seed?: number; generationId?: string }

const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1'

export async function leonardoGenerateImage(apiKey: string, p: GenPayload): Promise<GenResult> {
  const width = p.width ?? 832
  const height = p.height ?? 1216
  /** Lucid Origin — see https://docs.leonardo.ai/docs/commonly-used-api-values */
  const modelId = p.modelId || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'

  const createRes = await fetch(`${LEONARDO_API}/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: p.prompt,
      modelId,
      width,
      height,
      num_images: 1,
      contrast: 3.5,
      alchemy: true,
      ...(p.seed != null ? { seed: p.seed } : {})
    })
  })

  if (!createRes.ok) {
    const t = await createRes.text()
    throw new Error(`Leonardo create: ${createRes.status} ${t}`)
  }

  const created = (await createRes.json()) as {
    sdGenerationJob?: { generationId?: string }
  }
  const generationId = created.sdGenerationJob?.generationId
  if (!generationId) throw new Error('Leonardo: no generationId')

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500))
    const gRes = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!gRes.ok) continue
    const g = (await gRes.json()) as Record<string, unknown>
    const root =
      (g.generations_by_pk as Record<string, unknown> | undefined) ||
      (g.generation as Record<string, unknown> | undefined) ||
      g
    const status = root?.status as string | undefined
    const imgs = root?.generated_images as { url?: string; seed?: number }[] | undefined
    if (status === 'COMPLETE' && imgs?.[0]?.url) {
      return {
        imageUrl: imgs[0].url,
        seed: imgs[0].seed ?? p.seed,
        generationId
      }
    }
    if (status === 'FAILED') throw new Error('Leonardo generation failed')
  }

  throw new Error('Leonardo: timeout waiting for image')
}
