import { createJsonHandler } from './_lib/http.js'
import { providerAvailability } from '../core/providers/aiProviderRegistry.js'

export default createJsonHandler({
  methods: ['GET', 'HEAD'],
  async run() {
    const providers = providerAvailability()
    return {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      env: process.env.VERCEL_ENV || 'development',
      providers,
      tts: providers.tts,
      ready: Boolean(providers.openai || providers.gemini || providers.deepseek)
    }
  }
})
