/** Shape of `evt.result` from `/api/jobs-stream-generate` (pipeline JSON). */
export interface JobsStreamGenerateResult {
  story: {
    title: string
    setting: string
    characters: Array<{ name: string; role: string; traits: string }>
  }
  script: Array<{ narration: string; scene?: number; visual_description?: string }>
  images?: Array<{
    image_url?: string
    imageUrl?: string
    scene?: string | number
    prompt?: string
  }>
}
