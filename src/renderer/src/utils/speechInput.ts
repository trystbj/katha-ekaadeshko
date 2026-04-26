/**
 * Chromium Web Speech constructors are on `window` but omitted from default `lib.dom` typings.
 * Uses DOM lib types for `SpeechRecognitionResultList` / `SpeechRecognitionResult`.
 */

export interface IdeaSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((ev: IdeaSpeechRecognitionEvent) => void) | null
  onerror: ((ev: IdeaSpeechErrorEvent) => void) | null
  onend: (() => void) | null
}

export interface IdeaSpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

export interface IdeaSpeechErrorEvent {
  readonly error?: string
}

type IdeaSpeechRecognitionCtor = new () => IdeaSpeechRecognition

export function getSpeechRecognitionCtor(): IdeaSpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: IdeaSpeechRecognitionCtor
    webkitSpeechRecognition?: IdeaSpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechRecognitionAvailable(): boolean {
  return typeof window !== 'undefined' && getSpeechRecognitionCtor() != null
}
