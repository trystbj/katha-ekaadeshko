# Voice director — global cinematic narrator

Provider-agnostic AI narration layer for Katha Ekadeshko (web + future Tauri desktop).

## Modules

| Layer | Location |
|-------|----------|
| Shared types | `core/voice/types.ts` |
| Voice profile | `backend/voice/voiceProfile.js`, `src/renderer/src/voice/voiceProfile.ts` |
| **Global cinematic director** | `backend/voice/cinematicNarrationDirector.js` |
| Emotion engine | `backend/voice/emotionNarrationEngine.js` |
| Multilingual delivery | `backend/voice/languageDeliveryProfiles.js` |
| Human speech realism | `backend/voice/humanSpeechRealism.js` |
| Dialogue hints | `backend/voice/dialogueNarrationHints.js` |
| Pronunciation preprocess | `backend/voice/pronunciationPreprocessor.js` |
| Cinematic preview scripts | `backend/voice/narratorPreviewScripts.js` |
| Scene adaptation (genre/emotion) | `backend/utils/narrationSceneAdaptation.js` |
| Voice director API | `backend/voice/voiceDirector.js` |
| TTS providers | `backend/voice/providers/` |
| Subtitle timing | `src/renderer/src/voice/subtitleTimingAdapter.ts` |

## Integration

- **Pipeline TTS**: `ttsService.js` → `openaiTtsProvider` → `buildGlobalNarrationPlan` + preprocessed text.
- **Preview scripts (all story languages)**: `core/voice/previewScriptLocales.js`, `core/voice/previewLanguage.js`
- **Narrator preview**: `narratorPreviewTts.js` — story-language cinematic script + global director.
- **LLM prompts**: `generationBlueprint.js` + `voiceDirectorBlueprintSection` when `autoVoiceDirector` is true.
- **API**: `GET /api/narrator-preview?narratorId=&storyLanguage=` (optional `uiLang`, `narrationLanguage`).

## Adding a language

Extend `languageDeliveryProfiles.js` `PROFILES` with native rhythm + pronunciation lock.

## Adding a TTS provider

Implement `synthesize()` in `backend/voice/providers/`, register in `registry.js`, set `TTS_PROVIDER`.

Do not hardcode provider logic in the orchestrator or renderer.
