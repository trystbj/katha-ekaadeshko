/**
 * Shrink POST bodies before Zod — large reference image data URLs can exceed serverless limits.
 */

export function slimGenerateRequestBody(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const body = { ...raw }

  if (body.characterReference && typeof body.characterReference === 'object') {
    const cref = { ...body.characterReference }
    if (Array.isArray(cref.images)) {
      cref.images = cref.images.slice(0, 3).map((img) => ({
        id: img?.id,
        role: img?.role,
        filename: img?.filename
      }))
    }
    body.characterReference = cref
  }

  if (Array.isArray(body.bibleCharacters)) {
    body.bibleCharacters = body.bibleCharacters.slice(0, 12).map((c) => {
      if (!c || typeof c !== 'object') return c
      const { referenceImages, ...rest } = c
      return {
        ...rest,
        referenceImageCount: Array.isArray(referenceImages) ? referenceImages.length : 0
      }
    })
  }

  return body
}
