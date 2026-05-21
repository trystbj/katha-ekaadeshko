export type NamingPolicyMode = 'names' | 'pronoun_only' | 'anonymous'

export function analyzeNamingPolicy(
  seedLine?: string,
  theme?: string
): { mode: NamingPolicyMode; label: string; blueprintLines: string[] }

export function sanitizeStoryCharacters(
  characters: Array<{ name?: string; role?: string; traits?: string }>,
  policy: { mode: string }
): Array<{ name: string; role: string; traits: string }>

export function buildCharacterIdentityMemory(
  characters?: Array<{
    name?: string
    role?: string
    traits?: string
    visualIdentity?: string
    baseImagePrompt?: string
  }>
): Array<{
  slot: number
  label: string
  gender: string
  role: string
  visualIdentity: string
  baseImagePrompt: string
  hair?: string
  clothing?: string
}>

export function pickCastSlotsForScriptRow(
  scriptRow: Record<string, unknown>,
  memory: ReturnType<typeof buildCharacterIdentityMemory>
): number[]

export function leonardoIdentityBlockForScriptRow(
  scriptRow: Record<string, unknown>,
  memory: ReturnType<typeof buildCharacterIdentityMemory>
): string
