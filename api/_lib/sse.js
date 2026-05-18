/** Server-sent events helpers — flush each frame so Vercel/proxies don't buffer until timeout. */

export function initSseResponse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
}

export function sseWrite(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
  if (typeof res.flush === 'function') {
    res.flush()
  }
}
