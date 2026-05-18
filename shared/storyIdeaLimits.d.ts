export declare const STORY_IDEA_MIN_CHARS: 2
export declare const STORY_IDEA_MAX_CHARS: 10000
export declare const STORY_IDEA_SOFT_WARN_CHARS: 6000
export declare const SEED_LINE_PIPELINE_MAX_CHARS: 6000

export declare function clampStoryIdea(text: unknown): string
export declare function compactSeedLineForPipeline(seedLine: string, max?: number): string
export declare function isStoryIdeaSoftWarn(length: number): boolean
