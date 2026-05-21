/**
 * TTS service (pluggable).
 *
 * Default: OpenAI TTS via voice provider registry (requires TTS_API_KEY or OPENAI_API_KEY).
 * Swap provider with TTS_PROVIDER env — implement new providers under backend/voice/providers/.
 */

import { getVoiceProvider } from '../voice/providers/registry.js'
import {
  buildCharacterVoiceCast,
  multiVoiceEnabled,
  voiceForCharacter
} from '../cinematic/multiCharacterVoice.js'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function ttsGenerateForScript({ script, input, req, story }) {
  // Serverless default: no local file writes; keep free tier simple.
  if (process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1') return []
  const provider = getVoiceProvider()
  if (!provider) return []

  const voiceCast = buildCharacterVoiceCast(story, input)
  const useMultiVoice = multiVoiceEnabled(input)

  const out = []
  for (const s of script) {
    const narration =
      String(s.composed_narration || '').trim() || String(s.narration || '').trim()
    if (!narration) continue
    try {
      console.info('[katha:story-writing]', 'tts_scene', {
        scene: s.scene,
        chars: narration.length,
        dialogueLines: Array.isArray(s.dialogue) ? s.dialogue.length : 0
      })
      const audio_url = await ttsOne({ text: narration, input, req, scene: s.scene, scriptRow: s })
      if (audio_url) out.push({ scene: s.scene, audio_url, role: 'narrator' })

      if (useMultiVoice && Array.isArray(s.dialogue) && s.dialogue.length) {
        for (let di = 0; di < s.dialogue.length; di++) {
          const line = s.dialogue[di]
          const who = String(line?.character || '').trim()
          const text = String(line?.line || '').trim()
          if (!text || /^narrat/i.test(who)) continue
          const overrideVoice = voiceForCharacter(who, voiceCast)
          const clip = await ttsOne({
            text,
            input,
            scriptRow: s,
            overrideVoice,
            deliveryRole: `${who}: ${voiceCast.find((c) => c.characterName === who)?.deliveryHints || 'character'}`
          })
          if (clip) {
            out.push({
              scene: s.scene,
              audio_url: clip,
              role: 'dialogue',
              character: who,
              lineIndex: di
            })
          }
          await sleep(40)
        }
      }
    } catch (e) {
      // TTS is optional. If the provider is quota-limited or blocked, skip audio instead of failing the whole pipeline.
      const msg = e instanceof Error ? e.message : String(e)
      if (
        msg.includes(' 401:') ||
        msg.includes(' 403:') ||
        msg.includes(' 429:') ||
        msg.includes('insufficient_quota') ||
        msg.toLowerCase().includes('quota')
      ) {
        return out
      }
      throw e
    }
    await sleep(50)
  }
  return out
}

async function ttsOne({ text, input, scriptRow, overrideVoice, deliveryRole }) {
  const provider = getVoiceProvider()
  if (!provider) return ''
  return provider.synthesize({
    text,
    narratorId: input?.narratorId,
    input,
    scriptRow,
    overrideVoice,
    deliveryRole
  })
}

/** Single-scene TTS for live regeneration. */
export async function ttsGenerateForScene({ scriptRow, input, req }) {
  const narration =
    String(scriptRow?.composed_narration || '').trim() ||
    String(scriptRow?.narration || '').trim()
  if (!narration) return ''
  return ttsOne({ text: narration, input, scriptRow })
}
