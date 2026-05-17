/**
 * Pluggable TTS provider contract (OpenAI today; ElevenLabs/Azure/Google later).
 *
 * @typedef {object} VoiceSynthesisRequest
 * @property {string} text
 * @property {string} [narratorId]
 * @property {Record<string, unknown>} [input]
 * @property {Record<string, unknown>} [scriptRow]
 * @property {import('../voiceDirector.js').buildVoiceDirection} [voiceDirection]
 *
 * @typedef {object} VoiceProvider
 * @property {string} id
 * @property {(req: VoiceSynthesisRequest) => Promise<string>} synthesize
 */

export {}
