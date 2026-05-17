# Voice director (Phase 2)

Provider-agnostic AI narration layer for Katha Ekadeshko.

## Modules

| Layer | Location |
|-------|----------|
| Shared types | `core/voice/types.ts` |
| Voice profile (language, gender, age, emotion, style) | `backend/voice/voiceProfile.js`, `src/renderer/src/voice/voiceProfile.ts` |
| Voice director (scene delivery + blueprint) | `backend/voice/voiceDirector.js`, `src/renderer/src/voice/voiceDirector.ts` |
| TTS providers | `backend/voice/providers/` (`registry.js`, `openaiTtsProvider.js`) |
| Subtitle timing adapter | `src/renderer/src/voice/subtitleTimingAdapter.ts` |

## Integration

- **Pipeline TTS**: `backend/services/ttsService.js` → `getVoiceProvider()` → OpenAI (default).
- **LLM prompts**: `generationBlueprint.js` injects voice director lock when `autoVoiceDirector` is true.
- **API**: `POST /api/jobs-stream-generate` accepts `narration`, `autoVoiceDirector`, `narratorGenderPreference`.
- **UI**: Story generation defaults → “Auto cinematic voice (AI director)” toggle; language picker unchanged.
- **Subtitles**: `scenesWebVtt.ts` uses emotion-aware per-scene duration when voice context is passed.

## Adding a provider

1. Implement `synthesize({ text, narratorId, input, scriptRow })` in `backend/voice/providers/`.
2. Register in `registry.js`.
3. Set `TTS_PROVIDER` env var.

Do not hardcode provider logic in the orchestrator or renderer.
