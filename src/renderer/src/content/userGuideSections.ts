/** Structured Help Center — English only. */

import type { GuideSection } from './guideTypes'

export type { GuideBlock, GuideSection } from './guideTypes'
export { guideSectionSearchBlob } from './guideTypes'

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'welcome',
    title: 'Welcome to Katha Ekadeshko',
    blocks: [
      {
        type: 'p',
        text:
          'Katha Ekadeshko (कथा एकादेशको) is an AI cinematic storytelling studio. You provide a story seed, style, and language; the platform automatically directs narration, camera motion, subtitles, soundtrack, atmosphere, and episodic continuity — like a film team working behind the scenes.'
      },
      {
        type: 'ul',
        items: [
          'AI-directed storytelling — stories, scripts, and episodes generated with cinematic pacing.',
          'Automatic narration — voice matching for language, tone, and optional gender preference.',
          'Visual styles — from soft fantasy to realistic, comic panels, or your own custom look.',
          'Cinematic playback — motion, environment, expressions, and effects sync to each scene.',
          'Subtitles — emotion-aware timing, presets, dual-language options, and WebVTT export.',
          'Render pipeline — queue vertical video; local worker for highest-quality exports.',
          'Projects — five parallel workspace slots, cloud save when signed in, episodic memory.',
          'Future-ready — modular providers for TTS, images, render, and desktop (Tauri) without changing your workflow.'
        ]
      },
      {
        type: 'p',
        text:
          'You control the creative intent (seed, genre, style, narrator). The AI handles cinematic orchestration — you do not need to manually time camera moves, music swells, or acting beats.'
      }
    ]
  },
  {
    id: 'quick-start',
    title: 'Quick Start (step-by-step)',
    blocks: [
      {
        type: 'p',
        text:
          'Follow these steps the first time you open the studio. You can revisit any step later; the checklist shows what is still missing before Generate.'
      },
      {
        type: 'h4',
        text: 'Step 1 — Write your story seed / use the mic'
      },
      {
        type: 'p',
        text:
          'Enter a short seed (two or more characters of text). Tap the microphone to dictate; interim text appears live in the box. Tap again to stop. Use voice commands where supported for punctuation and editing.'
      },
      {
        type: 'h4',
        text: 'Step 2 — Choose genre'
      },
      {
        type: 'p',
        text:
          'Pick chips that reflect horror, romance, myth, adventure, or similar. Genre merges into prompts so the model respects tone and stakes.'
      },
      {
        type: 'h4',
        text: 'Step 3 — Choose region'
      },
      {
        type: 'p',
        text:
          'Region/country anchors locale detail — names, rituals, settings — without overriding your explicit story language.'
      },
      {
        type: 'h4',
        text: 'Step 4 — Choose language'
      },
      {
        type: 'p',
        text:
          'Story language drives generated dialogue and narration. App menus use the UI language from Settings independently.'
      },
      {
        type: 'h4',
        text: 'Step 5 — Choose visual style'
      },
      {
        type: 'p',
        text:
          'Pick a style card before Generate: Soft Anime Fantasy, Cozy Storybook, Cinematic, Realistic, Comic, or Custom look. Each preset changes palette, lighting, and emotional framing for stills and playback.'
      },
      {
        type: 'h4',
        text: 'Step 6 — Choose narrator & voice options'
      },
      {
        type: 'p',
        text:
          'Select a narrator preset and preview when online TTS is available. Enable “Auto cinematic voice” (recommended) so delivery, emotion, and subtitle timing adapt per scene. Optional gender preference steers casting when set to something other than Auto.'
      },
      {
        type: 'h4',
        text: 'Step 7 — Customize settings'
      },
      {
        type: 'p',
        text:
          'Open Settings from the Story Monitor toolbar for region/language alignment, API mode hints, and account sign-in.'
      },
      {
        type: 'h4',
        text: 'Step 8 — Generate story'
      },
      {
        type: 'p',
        text:
          'Use Generate on the bible first. The pipeline allocates characters, continuity, and episode scaffolding.'
      },
      {
        type: 'h4',
        text: 'Step 9 — Generate visuals'
      },
      {
        type: 'p',
        text:
          'After scenes exist, request stills; align aspect ratio (vertical vs horizontal) for your target platform early.'
      },
      {
        type: 'h4',
        text: 'Step 10 — Render video'
      },
      {
        type: 'p',
        text:
          'Queue a render job; local worker builds may be required for highest resolutions. Watch progress in the banner.'
      },
      {
        type: 'h4',
        text: 'Step 11 — Edit video'
      },
      {
        type: 'p',
        text:
          'Use trim, pacing tweaks, and filters in the post-export workspace when exposed for your build.'
      },
      {
        type: 'h4',
        text: 'Step 12 — Add subtitles'
      },
      {
        type: 'p',
        text:
          'Turn subtitles on for playback, choose a preset for readability, adjust timing if cues drift, export WebVTT when needed.'
      },
      {
        type: 'h4',
        text: 'Step 13 — Export / publish'
      },
      {
        type: 'p',
        text:
          'Export Markdown scripts and media bundles; connect publishing targets to push Shorts-style clips with AI-assisted titles and hashtags, edited before upload.'
      }
    ]
  },
  {
    id: 'ai-cinematic',
    title: 'AI cinematic systems (automatic)',
    blocks: [
      {
        type: 'p',
        text:
          'After you generate a story, the cinematic director analyzes each scene and orchestrates layers together. No manual timeline editing is required for standard use.'
      },
      {
        type: 'h4',
        text: 'What the AI directs automatically'
      },
      {
        type: 'ul',
        items: [
          'Camera — zoom, pan, parallax, focus shifts, impact framing, subtle breathing and shake.',
          'Acting — posture, idle motion, gesture intensity, reaction delays, stillness for emotional beats.',
          'Narration & voice — scene emotion, pacing, language-aware delivery when auto voice is on.',
          'Subtitles — lead-in timing, emphasis, and styles synced to narration emotion.',
          'Soundtrack — theme tags (mystery, battle, emotional piano, etc.) and transitions per scene.',
          'Ambience & SFX — beds and spot effects mixed under dialogue.',
          'Environment — fog, rain, wind, particles, lighting mood reacting to story text.',
          'Visual effects — rain, glow, speed lines, light rays scaled to device performance.',
          'Pacing — tension curve, pauses, cliffhanger hooks at episode end.',
          'Continuity — memory of promises, trauma, relationships, and world state across episodes.'
        ]
      },
      {
        type: 'h4',
        text: 'Evolution layer (long-form series)'
      },
      {
        type: 'p',
        text:
          'For serialized projects, the engine also tracks world simulation (weather, war, damaged locations), relationship trust/rivalry, thematic symbolism, flashback/dream treatments, director personality (inferred from style + genre), and gradual art evolution (warmth/contrast across the episode).'
      },
      {
        type: 'h4',
        text: 'Playback & motion'
      },
      {
        type: 'p',
        text:
          'In the cinematic player, motion preset “AI auto motion” follows the director plan per scene. You can still override filters, speed, and per-scene motion in the video studio when exposed. Reduced-motion OS settings lower effect intensity automatically.'
      },
      {
        type: 'h4',
        text: 'Timeline sync'
      },
      {
        type: 'p',
        text:
          'Subtitles, scene chapters, and cinematic overlays share one playback timeline derived from the director plan (per-scene duration and subtitle lead-in). Preview stays aligned with the render slideshow when the plan is present.'
      },
      {
        type: 'h4',
        text: 'Scene orchestration pipeline'
      },
      {
        type: 'p',
        text:
          'Each generation runs a unified pipeline: scene breakdown (dialogue, action, emotional, suspense beats) → emotion analysis → narration planning → camera/acting/expression → ambience & music → transitions → master timeline → render assembly. Scenes are the fundamental cinematic unit; all layers sync automatically.'
      }
    ]
  },
  {
    id: 'projects-continuity',
    title: 'Projects & episodic continuity',
    blocks: [
      {
        type: 'ul',
        items: [
          'Five workspace slots — run parallel story experiments; each slot keeps its own project, style, and narrator draft.',
          'Autosave — when signed in, projects sync to the cloud; local state still works offline for the UI shell.',
          'Memory summary — after generation, continuity notes feed the next episode’s prompts (character traits, emotional history, world events).',
          'World & relationships — war, damaged villages, trust, and rivalry persist when you continue a chain.',
          'Exports — Markdown script export; rendered MP4 when the worker completes a job.',
          'Episode chain — enable serialized storytelling so cliffhangers and tone carry forward.'
        ]
      },
      {
        type: 'p',
        text:
          'Continue project reloads bible, episodes, narration settings, and memory. Generate the next chapter with the same style and narrator for best consistency.'
      }
    ]
  },
  {
    id: 'render-export',
    title: 'Render & export',
    blocks: [
      {
        type: 'p',
        text:
          'Generation produces story JSON, script rows, scene stills, narration audio, and a cinematic director plan. Rendering queues a job processed by your local worker (FFmpeg) when configured.'
      },
      {
        type: 'ul',
        items: [
          'Queue render from the studio after scenes and assets exist.',
          'Worker claims jobs via Supabase — keep worker.env aligned with Vercel WORKER_TOKEN and APP_BASE_URL.',
          'Subtitles burn in or play as WebVTT tracks depending on export settings.',
          'Post-export workspace — preview with cinematic overlays, subtitle studio, trim and filters when available.',
          'Troubleshooting — see README for render_jobs schema, worker claim errors, and progress columns.'
        ]
      }
    ]
  },
  {
    id: 'narrator-guide',
    title: 'Narrator guide',
    blocks: [
      {
        type: 'p',
        text:
          'Each narrator profile bundles gendered voice identity, baseline pacing, and emotional bias — documentary warmth vs cinematic gravity vs bright youth.'
      },
      {
        type: 'h4',
        text: 'Preview'
      },
      {
        type: 'p',
        text:
          'Play the short sample to hear consonants, breath noise, and rhythm. If preview fails, verify keys/services on the host or accept browser fallback speech.'
      },
      {
        type: 'h4',
        text: 'Which narrator for which story'
      },
      {
        type: 'ul',
        items: [
          'Epic myth / trailer cadence — deeper cinematic male presets.',
          'Slice-of-life or diary fiction — softer intimate female presets.',
          'Newsy neutral exposition — crisp articulate presets.',
          'YA adventure — brighter energetic presets.'
        ]
      },
      {
        type: 'h4',
        text: 'Auto cinematic voice (recommended)'
      },
      {
        type: 'p',
        text:
          'When enabled, the voice director adjusts delivery per scene (fear, joy, suspense) and aligns subtitle timing. Story tone chips (warm, tense, epic, …) still bias the overall arc.'
      },
      {
        type: 'h4',
        text: 'Language matching'
      },
      {
        type: 'p',
        text:
          'Story language locks generated prose and narration. UI menus use the separate app language from Settings.'
      }
    ]
  },
  {
    id: 'style-guide',
    title: 'Visual style presets',
    blocks: [
      {
        type: 'p',
        text:
          'Styles steer image prompts and cinematic director personality. Pick one card before Generate; you can change it later but regenerating stills keeps continuity best when the style stays stable.'
      },
      {
        type: 'h4',
        text: 'Soft Anime Fantasy'
      },
      {
        type: 'p',
        text: 'Painterly warmth, cozy emotional lighting, dreamlike environments — romance, folk fantasy, gentle adventure.'
      },
      {
        type: 'h4',
        text: 'Cozy Storybook'
      },
      {
        type: 'p',
        text: 'Hand-drawn storybook feel, soft nature ambience, friendly motion — family tales, humor, educational stories.'
      },
      {
        type: 'h4',
        text: 'Cinematic'
      },
      {
        type: 'p',
        text: 'Filmic framing, strong contrast, dramatic closeups — trailers, mythic quests, emotional action.'
      },
      {
        type: 'h4',
        text: 'Realistic'
      },
      {
        type: 'p',
        text: 'Photorealistic humans, film-quality lighting, natural color grading — drama, documentary tone, grounded emotional stakes with cinematic framing.'
      },
      {
        type: 'h4',
        text: 'Comic'
      },
      {
        type: 'p',
        text: 'Motion-comic panels, bold staging, dynamic transitions — graphic novel energy, punchy beats.'
      },
      {
        type: 'h4',
        text: 'Custom look'
      },
      {
        type: 'p',
        text:
          'Describe your own visual direction in a short prompt (required). Recent prompts are saved for 30 days. Press Enter or OK to dismiss the panel while keeping Custom selected.'
      }
    ]
  },
  {
    id: 'music-sound',
    title: 'Music & sound guide',
    blocks: [
      {
        type: 'p',
        text:
          'Background beds adapt to genre metadata — tension lifts under cliffhangers, ambience thins for dialogue-forward beats.'
      },
      {
        type: 'h4',
        text: 'SFX'
      },
      {
        type: 'p',
        text:
          'Spot effects emphasize transitions (doors, weather, impacts). Loudness rides duck under narration when sidechain logic applies.'
      },
      {
        type: 'h4',
        text: 'Control'
      },
      {
        type: 'ul',
        items: [
          'Toggle narration and music separately when those controls appear in your player.',
          'Use OS mixer if clips peak despite normalization.',
          'Re-render if you swap narrator mid-series — loudness targets may shift.'
        ]
      }
    ]
  },
  {
    id: 'subtitle-guide',
    title: 'Subtitle guide',
    blocks: [
      {
        type: 'ul',
        items: [
          'Enable subtitles — toggle playback captions so cues generated from scene narration appear.',
          'Style subtitles — pick presets adjusting color, outline, size, and vertical anchor.',
          'Position subtitles — safe-area presets keep text inside vertical crops.',
          'Export subtitle file — download WebVTT for external editors or platforms.'
        ]
      },
      {
        type: 'p',
        text:
          'Cue timing follows narration length per scene; if drift occurs, use timing adjustment flows referenced in Troubleshooting.'
      }
    ]
  },
  {
    id: 'video-editor',
    title: 'Video editor guide',
    blocks: [
      {
        type: 'ul',
        items: [
          'Trim — remove leader/trailer silence.',
          'Cut — drop redundant beats between chapters.',
          'Speed change — subtle acceleration for montages.',
          'Filters — grade consistency across episodic drops.',
          'Effects — transitions layered sparingly to preserve dialogue clarity.',
          'Publish — push via linked accounts once metadata validates.'
        ]
      },
      {
        type: 'p',
        text:
          'Exact controls depend on your deployment (cloud-only vs local worker). Prefer non-destructive edits until final QC.'
      }
    ]
  },
  {
    id: 'publish-guide',
    title: 'Social publishing guide',
    blocks: [
      {
        type: 'p',
        text:
          'After your cinematic MP4 is ready, the post-export workspace includes a Direct publish panel for short-form platforms. AI fills titles, hooks, captions, and hashtags — you review everything before anything goes live.'
      },
      {
        type: 'h4',
        text: 'Supported platforms'
      },
      {
        type: 'ul',
        items: [
          'TikTok — hook-first caption, hashtags, cover frame, privacy.',
          'YouTube Shorts — title, description, tags, visibility, thumbnail second.',
          'Instagram Reels — caption blocks and cover frame.',
          'Facebook Reels — headline, description, audience visibility.'
        ]
      },
      {
        type: 'h4',
        text: 'Workflow'
      },
      {
        type: 'ol',
        items: [
          'Preview the finished video in the cinematic player.',
          'Open Direct publish — metadata auto-fills when render completes.',
          'Connect each platform account once (OAuth-ready architecture; composer assist today).',
          'Pick a destination tab or select multiple platforms for background publish.',
          'Edit caption, hook, and hashtags; run AI social captions or Shorts optimizer tips.',
          'Publish — opens the platform composer with metadata on your clipboard.'
        ]
      },
      {
        type: 'h4',
        text: 'Shorts optimizer & clips'
      },
      {
        type: 'p',
        text:
          'The Shorts optimizer suggests viral moments (opening hook, emotional peak, cliffhanger teaser) and lets you set thumbnail seconds from clip starts. Use export quality presets (maximum recommended) for platform-safe encoding hints.'
      },
      {
        type: 'h4',
        text: 'Before upload'
      },
      {
        type: 'ul',
        items: [
          'Confirm vertical 9:16 if the platform requires it.',
          'Review policy compliance for hashtags and hooks.',
          'Spot-check subtitle burn-in vs player captions.',
          'Keep narration/music rights clear for your territory.'
        ]
      }
    ]
  },
  {
    id: 'web-desktop',
    title: 'Web & desktop versions',
    blocks: [
      {
        type: 'p',
        text:
          'Katha Ekadeshko is a hybrid cinematic studio: use it in the browser (Vercel-hosted) or as a desktop app (Tauri wrapper). The same UI, cinematic pipeline, and project format apply to both.'
      },
      {
        type: 'h4',
        text: 'Web app (browser)'
      },
      {
        type: 'ul',
        items: [
          'Best for quick access — open your deployment URL, sign in, generate.',
          'APIs run on Vercel; no local install required for story generation.',
          'Pair with a local render worker on any PC for FFmpeg exports.',
          'Five workspace slots autosave in the browser; cloud sync when signed in.'
        ]
      },
      {
        type: 'h4',
        text: 'Desktop app (Tauri)'
      },
      {
        type: 'ul',
        items: [
          'Same studio UI packaged as a native window (Windows, macOS, Linux).',
          'Ideal when the render worker runs on the same machine — faster exports and file access.',
          'Build from source: npm run build, then npm run desktop:build (see project README).',
          'Offline: UI shell works offline; generation still needs API keys online unless you add a local backend later.'
        ]
      },
      {
        type: 'h4',
        text: 'Compatibility'
      },
      {
        type: 'p',
        text:
          'Projects created on web load on desktop and vice versa when using cloud save or exported JSON. Cinematic director plans, creator edits, and publish drafts travel with the project.'
      }
    ]
  },
  {
    id: 'account-cloud-worker',
    title: 'Account, cloud save & render worker',
    blocks: [
      {
        type: 'h4',
        text: 'Sign-in & cloud projects'
      },
      {
        type: 'p',
        text:
          'Sign in from Settings when Supabase is configured on your deployment. Cloud projects sync story bible, episodes, memory, and preferences. Workspace slots still keep up to five parallel experiments on this device.'
      },
      {
        type: 'h4',
        text: 'API keys (hosting)'
      },
      {
        type: 'ul',
        items: [
          'Story AI — at least one of OpenAI, Gemini, or DeepSeek on Vercel.',
          'Scene stills — optional Leonardo API key.',
          'Supabase — URL + anon key (browser) and service role (server + worker).',
          'Worker — shared WORKER_TOKEN between Vercel and worker/.env.'
        ]
      },
      {
        type: 'h4',
        text: 'Local render worker'
      },
      {
        type: 'p',
        text:
          'For highest-quality MP4 exports, run worker/worker.js on a PC with FFmpeg. Copy worker/.env.example, set APP_BASE_URL to your live site, and match WORKER_TOKEN. The worker claims jobs from Supabase render_jobs and uploads finished video URLs.'
      },
      {
        type: 'h4',
        text: 'Recovery'
      },
      {
        type: 'p',
        text:
          'If a cloud project fails to open, the app repairs missing arrays automatically. Use workspace slot history and Markdown export as backups before risky experiments.'
      }
    ]
  },
  {
    id: 'full-workflow',
    title: 'End-to-end creator workflow',
    blocks: [
      {
        type: 'p',
        text: 'Professional flow from idea to published Short — AI handles orchestration; you steer creative intent.'
      },
      {
        type: 'ol',
        items: [
          'Create or pick a workspace slot — set UI language, story language, region, genre.',
          'Write seed + pick visual style + narrator — Generate story (bible + episode).',
          'Review script monitor — edit characters if needed, generate scene stills.',
          'Queue render — local worker produces MP4 with narration and cinematic timing.',
          'Post-export — cinematic player, subtitle studio, trim/filters, live production modes.',
          'Creator studio — refine scenes, co-pilot, partial regen, quality review without full regen.',
          'Direct publish — TikTok, Shorts, Reels, Facebook with AI metadata.',
          'Continue episodic chain — memory and world state carry to the next episode.'
        ]
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    blocks: [
      {
        type: 'p',
        text: 'If something breaks, try the matching playbook before filing feedback.'
      },
      {
        type: 'h4',
        text: 'Mic not working'
      },
      {
        type: 'ul',
        items: [
          'Check microphone permission in the browser/OS privacy settings.',
          'Stop dictation and start again so recognition reinitializes.',
          'Reconnect USB or Bluetooth headsets that enumerate late.'
        ]
      },
      {
        type: 'h4',
        text: 'Voice preview not playing'
      },
      {
        type: 'ul',
        items: [
          'Verify narrator voice assets loaded — retry sample after network settles.',
          'Reload the sample clip; fall back to browser speech preview when offline-only.'
        ]
      },
      {
        type: 'h4',
        text: 'Video render stuck'
      },
      {
        type: 'ul',
        items: [
          'Retry or dequeue then requeue the render job.',
          'Check storage quotas on worker disk / bucket.',
          'Clear stale browser cache for asset manifests.'
        ]
      },
      {
        type: 'h4',
        text: 'Style mismatch'
      },
      {
        type: 'ul',
        items: [
          'Reselect style preset then regenerate frames.',
          'Enable strict style lock cues when prompts drift toward realism.'
        ]
      },
      {
        type: 'h4',
        text: 'Subtitle sync issue'
      },
      {
        type: 'ul',
        items: ['Adjust subtitle timing offsets in subtitle tooling.', 'Regenerate narration pacing first if drift is systemic.']
      },
      {
        type: 'h4',
        text: 'Publish failed'
      },
      {
        type: 'ul',
        items: [
          'Reconnect OAuth accounts under publishing settings.',
          'Verify connectivity and retry upload.',
          'Inspect quota/rate-limit banners from the provider.'
        ]
      },
      {
        type: 'h4',
        text: 'Low performance'
      },
      {
        type: 'ul',
        items: [
          'Reduce preview resolution.',
          'Close competing GPU-heavy tabs or apps.',
          'Prefer wired networking during renders.'
        ]
      },
      {
        type: 'h4',
        text: 'No sound'
      },
      {
        type: 'ul',
        items: ['Confirm narration/music toggles are not muted.', 'Raise OS output device volume.', 'Detach conflicting HDMI audio sinks.']
      },
      {
        type: 'h4',
        text: 'App crash'
      },
      {
        type: 'ul',
        items: [
          'Reopen the saved project from Projects.',
          'Restore autosaved drafts where Recovery prompts appear.',
          'Clear corrupted local drafts only after exporting backups.'
        ]
      }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    blocks: [
      {
        type: 'h4',
        text: 'Do I need API keys?'
      },
      {
        type: 'p',
        text:
          'Online text generation requires at least one configured provider on hosted deployments; offline/dev setups mirror README paths.'
      },
      {
        type: 'h4',
        text: 'Can I mix languages in one story?'
      },
      {
        type: 'p',
        text:
          'Yes — choose the dominant story language, then edit dialogue for code-switching. Speech recognition quality varies by browser.'
      },
      {
        type: 'h4',
        text: 'Where do episodes save?'
      },
      {
        type: 'p',
        text:
          'Signed-in sessions sync cloud autosaves; exports remain local downloads unless uploaded.'
      },
      {
        type: 'h4',
        text: 'Why did my render queue pause?'
      },
      {
        type: 'p',
        text:
          'Workers poll jobs — sleeping PCs or exhausted GPUs pause progress until the client reconnects.'
      }
    ]
  },
  {
    id: 'tips',
    title: 'Tips & best practices',
    blocks: [
      {
        type: 'ul',
        items: [
          'Draft seeds as loglines before expanding tone chips.',
          'Generate bible → skim continuity notes → lock characters before heavy visual passes.',
          'Keep custom style sentences short and noun-heavy for diffusion fidelity.',
          'Batch-export Markdown between milestone episodes.',
          'Use subtitle presets early so readability survives aggressive vertical crops.',
          'Preview narrator samples at the target playback volume.'
        ]
      }
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    blocks: [
      {
        type: 'p',
        text:
          'Shortcuts vary slightly by surface (Electron vs browser). Focus an overlay before relying on Escape.'
      },
      {
        type: 'ul',
        items: [
          'Escape — closes fullscreen image viewer and several modal overlays.',
          'Arrow Left / Right — cycle images while fullscreen viewer is open.',
          'Tab / Shift+Tab — move focus across interactive controls.',
          'Enter / Space — activate focused buttons and episode rows when keyboard navigation is enabled.'
        ]
      },
      {
        type: 'p',
        text:
          'Story Monitor search and locale menus listen for Escape to dismiss — match OS caret browsing settings if focus traps occur.'
      }
    ]
  },
  {
    id: 'live-production',
    title: 'Live production & preview',
    blocks: [
      {
        type: 'p',
        text:
          'After export, the preview column supports live cinematic playback. Quick mode uses lighter effects for fast iteration; Production mode uses fuller orchestration in preview.'
      },
      {
        type: 'ul',
        items: [
          'Live production bar — switch Quick vs Production and preview quality tier.',
          'Timeline sync — creator edits refresh subtitles and scrub boundaries without full regeneration.',
          'Creator studio → Live tab — emotion/pacing visualizer and continuous AI feedback.',
          'Background render — export can queue while you keep editing (when render API is connected).'
        ]
      }
    ]
  },
  {
    id: 'creator-studio',
    title: 'Creator studio (refinement)',
    blocks: [
      {
        type: 'p',
        text:
          'After an episode is generated, open Creator studio in the Story Monitor. AI automation stays on — you refine individual scenes without regenerating the whole project.'
      },
      {
        type: 'ul',
        items: [
          'Storyboard — scene cards with beat type and duration.',
          'Scene — edit narration text; plan partial regen (visuals, narration, subtitles, soundtrack, camera, pacing).',
          'Timeline — lightweight view of narration, subtitles, and music layers per scene.',
          'Co-pilot — type natural commands (e.g. “make this sadder”, “slow narration”); patches sync to the cinematic plan.',
          'Quality — heuristic review with improvement suggestions.',
          'Undo / redo — up to 24 snapshots stored in project.creatorStudio history.'
        ]
      }
    ]
  },
  {
    id: 'changelog',
    title: 'Updates / changelog',
    blocks: [
      {
        type: 'p',
        text: 'Recent highlights (representative; your installed build may differ slightly):'
      },
      {
        type: 'ul',
        items: [
          'May 2026 — v1.0 production release: hybrid web + Tauri desktop, build stamp 3.0.',
          'May 2026 — Direct social publishing: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels.',
          'May 2026 — AI cinematic director v4: reasoning, world simulation, relationships, symbolism, flashbacks.',
          'May 2026 — Creator studio + live production: co-pilot, smart regen, real-time preview sync.',
          'May 2026 — Scene orchestration pipeline, timeline sync v2, stabilization and project recovery.',
          'May 2026 — Auto cinematic voice director, emotion-aware subtitles, provider-agnostic TTS.',
          'Custom style panel, parallel workspace slots, episodic memory, Help Center guide.'
        ]
      }
    ]
  }
]

export function guideSectionsForUiLanguage(_lng?: string): GuideSection[] {
  return USER_GUIDE_SECTIONS
}
