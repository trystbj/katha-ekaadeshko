function extractDataPayload(frame: string): string {
  const lines = frame.split(/\r?\n/).filter(Boolean)
  let payload = ''
  for (const line of lines) {
    if (line.startsWith('data:')) {
      payload += line.slice(5).trimStart()
    }
  }
  return payload
}

/** Parse SSE `data:` frames from a buffer; returns unconsumed tail (may be partial frame). */
export function drainSseBuffer(buf: string): { events: Record<string, unknown>[]; rest: string } {
  const events: Record<string, unknown>[] = []
  const endsFrame = buf.endsWith('\n\n') || buf.endsWith('\r\n\r\n')
  const parts = buf.split(/\r?\n\r?\n/)
  const completeCount = endsFrame ? parts.length : Math.max(0, parts.length - 1)

  for (let i = 0; i < completeCount; i++) {
    const json = extractDataPayload(parts[i] || '')
    if (!json) continue
    try {
      events.push(JSON.parse(json) as Record<string, unknown>)
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e
    }
  }

  const rest = endsFrame ? '' : parts[parts.length - 1] || ''
  return { events, rest }
}
