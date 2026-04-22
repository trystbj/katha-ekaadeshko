import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { storyRoutes } from './routes/storyRoutes.js'
import { errorMiddleware } from './utils/errorMiddleware.js'
import { ensureMemoryStore } from './utils/memoryStore.js'
import { ensurePublicDirs } from './utils/storage.js'
import { requestIdMiddleware } from './utils/requestId.js'
import { rateLimitMiddleware } from './utils/rateLimit.js'
import { securityHeadersMiddleware } from './utils/securityHeaders.js'

dotenv.config()

const app = express()
app.disable('x-powered-by')

app.use(securityHeadersMiddleware)
app.use(requestIdMiddleware)
app.use(rateLimitMiddleware)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: false }))

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.length === 0) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('CORS blocked'), false)
    },
    credentials: true
  })
)

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/public', express.static('public', { maxAge: '7d', etag: true, immutable: false }))
app.use('/api', storyRoutes)
app.use(errorMiddleware)

await ensureMemoryStore()
await ensurePublicDirs()

const port = Number(process.env.PORT || 5000)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[katha-backend] listening on :${port}`)
})

