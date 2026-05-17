/**
 * Preview TTS line by UI language. Sync display strings in i18n.
 * `ne` / `hi` use Devanagari for the app name.
 */

export const PREVIEW_UI_LANGS = ['en', 'ne', 'hi']

/**
 * @param {string} [uiLang] 2-char or full BCP47
 * @returns {{ text: string, useNepaliNameInstruction: boolean }}
 */
export function getPreviewTtsInput(uiLang) {
  const l = (typeof uiLang === 'string' ? uiLang : 'en').toLowerCase().slice(0, 2)
  if (l === 'ne') {
    return {
      text: 'नमस्ते, यो कथा एकादेशको मा तपाईंको कथाका लागि कसरी सुनाउने भन्ने यो छोटो नमुना हो।',
      useNepaliNameInstruction: false
    }
  }
  if (l === 'hi') {
    return {
      text: 'नमस्ते, कथा एकादेशको ऐप में मैं आपकी कहानी ऐसे सुनाऊँगा, यह एक छोटा नमूना है।',
      useNepaliNameInstruction: false
    }
  }
  // English: ask model to not flatten the title
  return {
    text: "Hello — this is a quick sample of how I'll voice your story in Katha Ekadeshko.",
    useNepaliNameInstruction: true
  }
}
