/**
 * Global multilingual TTS delivery locks — native pronunciation, rhythm, cultural flow.
 * Replaces per-language one-offs; `nepaliTtsInstructions.js` delegates here for `ne`.
 */

function baseLang(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0] || 'en'
}

/** @type {Record<string, (opts: { extendedPreview?: boolean }) => string>} */
const PROFILES = {
  ne: (opts) =>
    [
      'Nepali language lock: native Kathmandu-standard Nepali — NOT Hindi, NOT English syllable stress.',
      'Devanagari: crisp retroflex ट ठ ड ढ ण; correct छौँ, जाँदै, गर्छु; pure vowels on तपाईँ, कथा, मिठो.',
      'Rhythm: natural Nepali melody, smooth clause linking, light breath between phrases.',
      'Dialogue: spoken Nepali lines must sound like real conversation — idiomatic, emotionally colored, not literal translation or textbook grammar.',
      opts.extendedPreview
        ? 'Extended preview: unhurried cinematic pace; full vowels; showcase calm, suspense, and warmth in one take.'
        : 'Every line: authentic Nepali storytelling cadence — oral-tradition warmth without dragging.'
    ].join(' '),

  hi: (opts) =>
    [
      'Hindi lock: standard Indian Hindi — natural Delhi-influenced clarity, not Nepali or English stress.',
      'Devanagari: clear त, थ, ड, ढ; correct verb endings; natural compound stress on कहानी, दिल, रात.',
      'Emotional flow: Bollywood-adjacent warmth when tender; restrained drama on suspense — never caricature.',
      opts.extendedPreview ? 'Preview: demonstrate calm narration, emotional lift, and soft suspense spacing.' : ''
    ]
      .filter(Boolean)
      .join(' '),

  en: (opts) =>
    [
      'English lock: neutral cinematic audiobook English — conversational, warm, not radio-announcer.',
      'Prosody: natural British-Indian or neutral international clarity as text implies; avoid exaggerated regional mimicry.',
      'Pacing: film-narrator flow — phrase-level breathing, soft sentence landings, dynamic but human.',
      opts.extendedPreview ? 'Preview: showcase calm opening, suspense tightening, and warm resolution.' : ''
    ]
      .filter(Boolean)
      .join(' '),

  ja: () =>
    'Japanese lock: native Tokyo-standard rhythm — mora-timed flow, polite narrative register unless text is casual; gentle pitch accent; no English stress patterns.',

  ko: () =>
    'Korean lock: native Seoul conversational rhythm — natural 받침 releases, emotional vowel length on key words; avoid flat English pacing.',

  zh: () =>
    'Chinese lock: Mandarin standard — natural tone sandhi, measured clause rhythm, cinematic clarity without staccato English cuts.',

  es: () =>
    'Spanish lock: neutral Latin American cinematic Spanish — rolling r when natural, warm vowels, fluid clause linking.',

  fr: () =>
    'French lock: standard Parisian narrative French — liaison where natural, intimate literary pacing, soft phrase endings.',

  de: () =>
    'German lock: standard Hochdeutsch narration — clear consonants, warm storyteller pacing, not news-anchor stiff.',

  ar: () =>
    'Arabic lock: modern standard Arabic storytelling — flowing emphatic rhythm, respectful emotional contour, clear articulation.',

  bn: () =>
    'Bengali lock: native West Bengal / Bangladesh storytelling rhythm — soft rolling phrases, emotional vowel length, no Hindi bleed.',

  th: () =>
    'Thai lock: native central Thai tone contours — natural tone rules, gentle pauses at phrase boundaries, warm narrator presence.',

  vi: () =>
    'Vietnamese lock: southern/central neutral tones — natural six-tone melody in narration, smooth emotional arcs.',

  ru: () =>
    'Russian lock: native literary Russian — rich vowel shading, emotional weight on key words, unhurried cinematic phrasing.',

  pt: () =>
    'Portuguese lock: Brazilian cinematic Portuguese — warm nasal vowels, fluid emotional storytelling rhythm.',

  it: () =>
    'Italian lock: native expressive Italian narration — musical phrase endings, natural double consonants, warm intimacy.',

  tr: () =>
    'Turkish lock: Istanbul standard — vowel harmony respected, natural agglutinative phrase rhythm, warm storyteller tone.',

  pl: () =>
    'Polish lock: native literary Polish — clear consonant clusters, emotional softness on endings, not monotone.',

  ur: () =>
    'Urdu lock: native literary Urdu — Persian-influenced warmth, clear retroflex and emphatic sounds, poetic cadence when appropriate.',

  fa: () =>
    'Persian lock: native Farsi storytelling — soft poetic rhythm, clear vowels, emotional intimacy without melodrama.',

  he: () =>
    'Hebrew lock: modern Israeli narrative Hebrew — natural stress, clear articulation, warm conversational flow.',

  id: () =>
    'Indonesian lock: native Bahasa Indonesia — even syllable timing, warm oral storytelling, gentle emotional rises.',

  ms: () =>
    'Malay lock: native standard Malay — smooth clause rhythm, warm narrator presence, clear emotional contour.',

  nl: () =>
    'Dutch lock: native Netherlands Dutch — clear consonants, warm understated storytelling, natural phrase melody.',

  sv: () =>
    'Swedish lock: native Stockholm Swedish — light melodic intonation, soft phrase endings, intimate clarity.',

  cs: () =>
    'Czech lock: native literary Czech — clear consonants, warm emotional phrasing, natural stress patterns.',

  el: () =>
    'Greek lock: native modern Greek — musical vowel flow, emotional emphasis on key words, cinematic warmth.',

  uk: () =>
    'Ukrainian lock: native literary Ukrainian — soft melodic intonation, emotional authenticity, clear consonants.'
}

/**
 * @param {string} [storyLanguage]
 * @param {{ extendedPreview?: boolean }} [opts]
 * @returns {string}
 */
export function getLanguageDeliveryBlock(storyLanguage, opts = {}) {
  const base = baseLang(storyLanguage)
  const fn = PROFILES[base]
  if (fn) return fn(opts)
  if (!base) return ''
  return `Language lock (${base}): native-speaker accurate pronunciation and cultural emotional rhythm — avoid English prosody contamination unless text is explicitly bilingual.`
}

/** @param {string} code */
export function supportsRichLanguageProfile(code) {
  return Boolean(PROFILES[baseLang(code)])
}
