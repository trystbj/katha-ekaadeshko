const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1'

function requireKey() {
  const key = process.env.LEONARDO_API_KEY
  if (!key) throw new Error('LEONARDO_API_KEY is missing')
  return key
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function leonardoGenerateForScript({ script, input }) {
  // Serverless-safe: Leonardo returns hosted URLs; no local storage required.
  // You can disable explicitly if desired.
  if (process.env.KATHA_DISABLE_LEONARDO === '1') return []
  // If no key, just return empty array (backend still returns story/script/audio).
  if (!process.env.LEONARDO_API_KEY) return []
  const modelId = process.env.LEONARDO_MODEL_ID || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'

  const out = []
  for (const s of script) {
    const prompt = buildScenePrompt(s, input)
    const { imageUrl } = await generateOne({ prompt, modelId })
    out.push({ scene: s.scene, image_url: imageUrl, prompt })
  }
  return out
}

function buildScenePrompt(scene, input) {
  // Keep it deterministic-ish so visuals stay coherent.
  return [
    `cinematic illustration, ${input.genre}, ${input.theme}`,
    `Scene: ${scene.visual_description}`,
    `No text, no watermark, high detail, consistent characters`
  ].join('. ')
}

async function generateOne({ prompt, modelId }) {
  const key = requireKey()
  const createRes = await fetch(`${LEONARDO_API}/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      modelId,
      num_images: 1,
      width: 832,
      height: 1216,
      alchemy: true,
      contrast: 3.5
    })
  })
  if (!createRes.ok) throw new Error(`Leonardo create ${createRes.status}: ${await createRes.text()}`)
  const created = await createRes.json()
  const generationId = created?.sdGenerationJob?.generationId
  if (!generationId) throw new Error('Leonardo: missing generationId')

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(2500)
    const gRes = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (!gRes.ok) continue
    const g = await gRes.json()
    const root = g?.generations_by_pk || g?.generation || g
    const status = root?.status
    const imgs = root?.generated_images
    if (status === 'COMPLETE' && imgs?.[0]?.url) return { imageUrl: imgs[0].url, generationId }
    if (status === 'FAILED') throw new Error('Leonardo: generation failed')
  }
  throw new Error('Leonardo: timeout')
}

