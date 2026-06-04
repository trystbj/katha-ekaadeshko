import { createJsonHandler } from '../_lib/http.js'
import { providerAvailability } from '../../core/providers/aiProviderRegistry.js'
import { buildInfoPayload } from '../_lib/buildInfo.js'

export default createJsonHandler({
  methods: ['GET', 'HEAD'],
  async run() {
    const providers = providerAvailability()
    const ready = Boolean(providers.openai || providers.gemini || providers.deepseek)
    return {
      ok: true,
      ...buildInfoPayload(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      providers,
      tts: providers.tts,
      ready,
      storyAiReady: ready,
      leonardoReady:
        Boolean(process.env.LEONARDO_API_KEY) && process.env.KATHA_DISABLE_LEONARDO !== '1'
    }
  }
})
