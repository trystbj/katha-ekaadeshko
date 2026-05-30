/**
 * AI Intent Analyzer — runs before story generation to extract structured production intent.
 */

import { openaiJson } from '../openaiService.js'
import { geminiJson } from '../geminiService.js'
import { deepseekJson } from '../deepseekService.js'
import { safeLog } from '../../../api/_lib/log.js'
import {
  buildHeuristicDirectives,
  normalizeProductionDirectives,
  productionDirectivesPromptBlock
} from './productionDirectives.js'
import { runMultiAgentCouncil } from './multiAgentCouncil.js'
import {
  englishOutputEnforcementBlock,
  regionalCultureContextLine
} from '../../../shared/outputLanguageLock.js'

const PROVIDERS = [
  { id: 'openai', hasKey: () => Boolean(process.env.OPENAI_API_KEY), fn: openaiJson },
  { id: 'gemini', hasKey: () => Boolean(process.env.GEMINI_API_KEY), fn: geminiJson },
  { id: 'deepseek', hasKey: () => Boolean(process.env.DEEPSEEK_API_KEY), fn: deepseekJson }
]

async function aiJsonIntent({ prompt }) {
  const errors = []
  for (const p of PROVIDERS) {
    if (!p.hasKey()) continue
    try {
      const json = await p.fn({
        purpose: 'intent_analyzer',
        schemaHint: 'ProductionIntent',
        prompt
      })
      return { json, provider: p.id }
    } catch (e) {
      errors.push(e)
      continue
    }
  }
  return null
}

function buildIntentPrompt(input, blueprintSnippet = '') {
  const seed = String(input.seedLine || input.theme || '').trim().slice(0, 2000)
  const regional = regionalCultureContextLine(input.storyLanguage, input.country)
  return `${englishOutputEnforcementBlock(regional)}

You are the AI Intent Analyzer for a cinematic storytelling studio.
Analyze the user's creative intent BEFORE any story is written.
All JSON string values you return must be written in English.

USER SEED / IDEA:
${seed}

STUDIO LOCKS:
- Country/region context: ${input.country || 'unspecified'}
- Genre: ${input.genre || 'unspecified'}
- Theme: ${input.theme || 'unspecified'}
- Story tone: ${input.storyTone || 'unspecified'}
- Visual style id: ${input.styleId || 'unspecified'}
- Aspect: ${input.aspectMode || 'vertical_9_16'}
- Regional cultural atmosphere (NOT output language): ${regional}
${blueprintSnippet ? `\n${blueprintSnippet.slice(0, 1200)}\n` : ''}

Return JSON ONLY:
{
  "genre": "",
  "emotion": "",
  "pacing": "",
  "visualStyle": "",
  "cameraStyle": "",
  "dialogueStyle": "",
  "animationStyle": "",
  "targetPlatform": "",
  "narrationTone": "",
  "lightingStyle": "",
  "motionIntensity": "",
  "sceneMood": "",
  "generationMode": "fast" | "cinematic",
  "directorNotes": "2-4 sentences: emotional goals, pacing, continuity expectations",
  "userGoals": ["..."],
  "continuityExpectations": ["..."]
}`
}

/**
 * @param {object} input normalized pipeline input
 * @param {{ onProgress?: (p: object) => void, blueprintBlock?: string }} [opts]
 */
export async function analyzeProductionIntent(input, opts = {}) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
  const heuristic = buildHeuristicDirectives(input)

  if (onProgress) {
    onProgress({ stage: 'intent', progress: 4, message: 'Analyzing cinematic intent…' })
  }

  let directives = heuristic
  let intentProvider = 'heuristic'
  const useLlm = process.env.KATHA_INTENT_LLM === '1'

  if (useLlm) {
    try {
      const prompt = buildIntentPrompt(input, String(input.__generationBlueprint || '').slice(0, 800))
      const hit = await aiJsonIntent({ prompt })
      if (hit?.json) {
        directives = normalizeProductionDirectives({ ...heuristic, ...hit.json })
        intentProvider = hit.provider
      }
    } catch (e) {
      safeLog('warn', 'intent_analyzer_llm_fallback', {
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }

  const agentCouncil = runMultiAgentCouncil({ input, directives })
  const promptBlock = productionDirectivesPromptBlock(directives)

  return {
    directives,
    agentCouncil,
    promptBlock,
    intentProvider,
    analyzedAt: new Date().toISOString()
  }
}
