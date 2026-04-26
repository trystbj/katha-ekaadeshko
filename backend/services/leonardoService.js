const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1'

function requireKey() {
  const key = process.env.LEONARDO_API_KEY
  if (!key) throw new Error('LEONARDO_API_KEY is missing')
  return key
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function leonardoGenerateForScript({ script, input, onProgress }) {
  // Serverless-safe: Leonardo returns hosted URLs; no local storage required.
  // You can disable explicitly if desired.
  if (process.env.KATHA_DISABLE_LEONARDO === '1') return []
  // If no key, just return empty array (backend still returns story/script/audio).
  if (!process.env.LEONARDO_API_KEY) return []
  const modelId = process.env.LEONARDO_MODEL_ID || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'

  const out = []
  for (let i = 0; i < script.length; i++) {
    const s = script[i]
    const prompt = buildScenePrompt(s, input)
    const { imageUrl } = await generateOne({ prompt, modelId })
    out.push({ scene: s.scene, image_url: imageUrl, prompt })
    if (onProgress) {
      onProgress({
        stage: 'images',
        progress: Math.round(((i + 1) / Math.max(1, script.length)) * 100),
        message: `Image ${i + 1}/${script.length}`
      })
    }
  }
  return out
}

export async function leonardoGenerateOne({ prompt, width, height, seed }) {
  if (process.env.KATHA_DISABLE_LEONARDO === '1') return { imageUrl: '', seed }
  if (!process.env.LEONARDO_API_KEY) throw new Error('LEONARDO_API_KEY is missing')
  const modelId = process.env.LEONARDO_MODEL_ID || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'
  const r = await generateOne({
    prompt,
    modelId,
    width: typeof width === 'number' ? width : 832,
    height: typeof height === 'number' ? height : 1216,
    seed
  })
  return { imageUrl: r.imageUrl, seed: r.seed ?? seed }
}

function buildScenePrompt(scene, input) {
  // Keep it deterministic-ish so visuals stay coherent.
  return [
    `cinematic illustration, ${input.genre}, ${input.theme}`,
    `Scene: ${scene.visual_description}`,
    `No text, no watermark, high detail, consistent characters`
  ].join('. ')
}

async function generateOne({ prompt, modelId, width, height, seed }) {
  const key = requireKey()
  const modelName = String(process.env.LEONARDO_MODEL_NAME || '').toLowerCase().trim()
  // Some Leonardo models (e.g. Kino 2.1) don't support Alchemy.
  const allowAlchemy = !(modelName.includes('kino') && modelName.includes('2.1'))
  const alchemy = process.env.LEONARDO_ALCHEMY
    ? process.env.LEONARDO_ALCHEMY === '1'
    : allowAlchemy

  const create = async (alchemyFlag) => {
    const createRes = await fetch(`${LEONARDO_API}/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        modelId,
        num_images: 1,
        width,
        height,
        alchemy: alchemyFlag,
        contrast: 3.5,
        ...(typeof seed === 'number' ? { seed } : {})
      })
    })
    const txt = await createRes.text()
    return { ok: createRes.ok, status: createRes.status, txt }
  }

  let createdTxt = null
  let createdJson = null
  {
    const r1 = await create(alchemy)
    if (!r1.ok) {
      // If the model rejects Alchemy (e.g. Kino 2.1), retry once with alchemy disabled.
      const isAlchemyUnsupported =
        r1.status === 400 && r1.txt.toLowerCase().includes('alchemy is not enabled')
      if (alchemy && isAlchemyUnsupported) {
        const r2 = await create(false)
        if (!r2.ok) throw new Error(`Leonardo create ${r2.status}: ${r2.txt}`)
        createdTxt = r2.txt
      } else {
        throw new Error(`Leonardo create ${r1.status}: ${r1.txt}`)
      }
    } else {
      createdTxt = r1.txt
    }
    createdJson = JSON.parse(createdTxt)
  }

  const created = createdJson
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
    if (status === 'COMPLETE' && imgs?.[0]?.url)
      return { imageUrl: imgs[0].url, generationId, seed: root?.seed }
    if (status === 'FAILED') throw new Error('Leonardo: generation failed')
  }
  throw new Error('Leonardo: timeout')
}

