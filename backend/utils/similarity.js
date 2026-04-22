// Simple fingerprinting to reduce repetition.
// We intentionally do NOT store full stories, only a short stable digest.

export function fingerprintStory(story) {
  const s =
    `${story?.title || ''} | ${story?.setting || ''} | ${story?.story || ''}`
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .slice(0, 5000)
  return fnv1a(s)
}

export function ngramSignature(story, { n = 5, limit = 6000 } = {}) {
  const text =
    `${story?.title || ''}\n${story?.setting || ''}\n${story?.story || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f\u3040-\u30ff\u4e00-\u9fff\u0600-\u06ff\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit)

  const grams = new Set()
  for (let i = 0; i <= text.length - n; i++) {
    grams.add(text.slice(i, i + n))
  }
  // return a compact array; still not reversible content
  return Array.from(grams).slice(0, 5000)
}

export function jaccard(a, b) {
  const A = a instanceof Set ? a : new Set(a)
  const B = b instanceof Set ? b : new Set(b)
  if (A.size === 0 && B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

function fnv1a(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

