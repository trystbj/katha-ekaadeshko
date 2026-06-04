export type VisualSceneDiagnostic = {
  scene: number
  promptLength: number
  provider: string
  status: 'queued' | 'generating' | 'complete' | 'failed' | 'placeholder'
  retryCount: number
  durationMs: number
  errorCode?: string
  errorMessage?: string
  imageUrl?: string
}
