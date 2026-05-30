/** Map pipeline SSE stage/message blobs to Help-style phase hints (English-ish regex). */
export function sseLiveStatusHint(stage: string, message: string): string | null {
  const blob = `${stage}\n${message}`.toLowerCase()
  if (/master_context|character memory|character lock/.test(blob)) return 'liveGenSseMasterContext'
  if (/script_resume|continuing from saved/.test(blob)) return 'liveGenSseScriptResume'
  if (/scene_generat|scene_complete|scene \d|image \d+\//.test(blob)) return 'liveGenSseSceneImage'
  if (/narrat|tts|voiceover/.test(blob)) return 'liveGenSseNarration'
  if (/ffmpeg|render|video/.test(blob)) return 'liveGenSseVideoRender'
  if (/long_story|narrative_structure|scene_outline|context_memory|analyzing story seed|mapping narrative|planning \d+ cinematic/.test(blob)) {
    return 'liveGenSseLongStory'
  }
  if (/prompt|seed|understand|parse/.test(blob)) return 'liveGenSseUnderstanding'
  if (/world|bible|setting|concept|blueprint/.test(blob)) return 'liveGenSseWorld'
  if (/character|cast|persona|voice/.test(blob)) return 'liveGenSseCharacters'
  if (/dialogue|dialog|speech/.test(blob)) return 'liveGenSseDialogue'
  if (/script_review|review before|screenplay ready/.test(blob)) return 'liveGenSseScriptReview'
  if (/scene|shot|screenplay|script(?!ure)/.test(blob)) return 'liveGenSseScenes'
  if (/polish|refine|edit|touch/.test(blob)) return 'liveGenSsePolish'
  if (/visual|image|still|leonardo|prompt/.test(blob)) return 'liveGenSseVisuals'
  if (/final|complete|done|upload/.test(blob)) return 'liveGenSseFinal'
  return null
}
