import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BRAND_TITLE_STARDUST_LOOP_MS,
  BRAND_TITLE_STARDUST_SEQUENCE_MS,
  BRAND_TITLE_STARDUST_IDLE_MS,
  BRAND_TITLE_STARDUST_DISSOLVE_MS,
  BRAND_TITLE_STARDUST_SMOKE_TRANSITION_MS,
  BRAND_TITLE_STARDUST_SMOKE_HOLD_MS,
  BRAND_TITLE_STARDUST_SMOKE_RISE_MS,
  BRAND_TITLE_STARDUST_GHOST_MS,
  BRAND_TITLE_STARDUST_STARFALL_MS,
  BRAND_TITLE_STARDUST_STAR_GATHER_MS,
  BRAND_TITLE_STARDUST_STAR_FORM_MS,
  BRAND_TITLE_STARDUST_STAR_POLISH_MS,
  BRAND_TITLE_STARDUST_SETTLE_MS,
  BRAND_TITLE_STARDUST_MAX_PARTICLES,
  BRAND_TITLE_STARDUST_MAX_SMOKE,
  BRAND_TITLE_STARDUST_SMOKE_PER_LETTER_CAP,
  BRAND_TITLE_STARDUST_STAR_ANCHORS_PER_LETTER_CAP,
  BRAND_TITLE_STARDUST_MAX_FX_RADIUS_CSSPX,
  BRAND_TITLE_STARDUST_SAMPLE_STEP_CSSPX,
  BRAND_TITLE_STARDUST_STAGGER_MIN_MS,
  BRAND_TITLE_STARDUST_STAGGER_MAX_MS,
  BRAND_TITLE_TEXT,
  BRAND_TITLE_STARDUST_DEFER_MS,
} from '../constants/brandTitleStardustConfig'
import '../styles/brand-title-stardust.css'

function smoothstep01(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

function easeInOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

type InkRGB = { r: number; g: number; b: number }

function lerpInk(a: InkRGB, b: InkRGB, t: number): InkRGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function rgbaInk(c: InkRGB, alpha: number): string {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha})`
}

const INK_IVORY_A: InkRGB = { r: 255, g: 252, b: 242 }
const INK_IVORY_B: InkRGB = { r: 255, g: 244, b: 218 }
const INK_GOLD: InkRGB = { r: 228, g: 198, b: 132 }
const INK_CHAMPAGNE: InkRGB = { r: 242, g: 226, b: 188 }
const INK_AMBER: InkRGB = { r: 188, g: 132, b: 72 }
const INK_EMBER_EDGE: InkRGB = { r: 142, g: 88, b: 54 }
const INK_ASH_BROWN: InkRGB = { r: 118, g: 104, b: 94 }
const INK_CHARCOAL: InkRGB = { r: 62, g: 58, b: 56 }

/** Premium ivory → warm edge → charcoal dense smoke (letter becomes vapor). */
function sampleInkDissolve(u: number): InkRGB {
  const x = Math.min(1, Math.max(0, easeInOutCubic(u)))
  if (x < 0.18) {
    const t = x / 0.18
    return lerpInk(lerpInk(INK_IVORY_A, INK_CHAMPAGNE, t), INK_GOLD, t * 0.42)
  }
  if (x < 0.38) return lerpInk(INK_GOLD, INK_AMBER, (x - 0.18) / 0.2)
  if (x < 0.58) return lerpInk(INK_AMBER, INK_EMBER_EDGE, (x - 0.38) / 0.2)
  if (x < 0.78) return lerpInk(INK_EMBER_EDGE, INK_ASH_BROWN, (x - 0.58) / 0.2)
  return lerpInk(INK_ASH_BROWN, INK_CHARCOAL, (x - 0.78) / 0.22)
}

function inkGradientStop(u: number, bias: number): string {
  return rgbaInk(sampleInkDissolve(Math.min(1, Math.max(0, u + bias))), 1)
}

const LETTER_FACE_VARS = [
  '--bt-g0',
  '--bt-g1',
  '--bt-g2',
  '--bt-g3',
  '--bt-g4',
  '--bt-g5',
  '--bt-glow-a',
  '--bt-glow-b',
  '--bt-glow-c',
  '--bt-blur',
  '--bt-lift',
  '--bt-scale-y',
] as const

function clearLetterMorphVars(el: HTMLElement) {
  for (const k of LETTER_FACE_VARS) el.style.removeProperty(k)
}

/** Dissolve 0→1: solid readable ink → vapor blur → mostly smoke (canvas carries mass). */
function faceGlyphOpacityDissolve(u: number): number {
  const x = Math.min(1, Math.max(0, u))
  if (x < 0.11) return 1
  if (x < 0.5) return 1 - smoothstep01((x - 0.11) / 0.39) * 0.44
  return 0.56 * (1 - smoothstep01((x - 0.5) / 0.5))
}

/** Reform v 0→1: inverse of dissolve curve on eased timeline */
function faceGlyphOpacityReform(v: number): number {
  const x = easeInOutCubic(Math.min(1, Math.max(0, v)))
  return faceGlyphOpacityDissolve(1 - x)
}

/** Timeline shaping so smoke ramps with vapor phase then thins at tail */
function smokeStrengthDissolve(u: number): number {
  const x = Math.min(1, Math.max(0, u))
  let b = 1.26
  if (x < 0.2) b *= 0.5 + (x / 0.2) * 0.5
  if (x > 0.72) b *= 1 - smoothstep01((x - 0.72) / 0.28) * 0.5
  return b
}

function applyDissolveMorphGeometry(face: HTMLElement, u: number) {
  const x = Math.min(1, Math.max(0, u))
  let blur = 0
  if (x > 0.09) {
    const vv = smoothstep01(Math.min(1, (x - 0.09) / 0.52))
    blur = vv * 3.1 * (1 - smoothstep01(Math.max(0, (x - 0.7) / 0.3)) * 0.88)
  }
  face.style.setProperty('--bt-blur', `${blur}px`)

  const stretch = 1 + smoothstep01(Math.min(1, Math.max(0, (x - 0.22) / 0.52))) * 0.082
  face.style.setProperty('--bt-scale-y', String(stretch))

  const lift = smoothstep01(Math.min(1, Math.max(0, (x - 0.18) / 0.58))) * -6
  face.style.setProperty('--bt-lift', `${lift}px`)
}

function applyDissolveMorph(face: HTMLElement, uTimeline: number) {
  const u = Math.min(1, Math.max(0, uTimeline))
  applyDissolveInk(face, u)
  applyDissolveMorphGeometry(face, u)
}

function applyReformMorph(face: HTMLElement, vTimeline: number) {
  const v = Math.min(1, Math.max(0, vTimeline))
  applyReformInk(face, v)
  applyDissolveMorphGeometry(face, 1 - easeInOutCubic(v))
}

function applyDissolveInk(face: HTMLElement, uTimeline: number) {
  const u = Math.min(1, Math.max(0, uTimeline))
  face.style.setProperty('--bt-g0', inkGradientStop(u, -0.08))
  face.style.setProperty('--bt-g1', inkGradientStop(u, -0.02))
  face.style.setProperty('--bt-g2', inkGradientStop(u, 0.06))
  face.style.setProperty('--bt-g3', inkGradientStop(u, 0.14))
  face.style.setProperty('--bt-g4', inkGradientStop(u, 0.24))
  face.style.setProperty('--bt-g5', inkGradientStop(u, 0.34))
  const core = sampleInkDissolve(u)
  const emberHint = lerpInk(core, INK_EMBER_EDGE, 0.12 + u * 0.42)
  const glowFalloff = (1 - smoothstep01(Math.max(0, u - 0.35) / 0.55)) * (0.26 + u * 0.08)
  face.style.setProperty('--bt-glow-a', rgbaInk(emberHint, glowFalloff))
  face.style.setProperty(
    '--bt-glow-b',
    rgbaInk(lerpInk(core, INK_AMBER, 0.28 + u * 0.25), 0.14 + u * 0.08),
  )
  face.style.setProperty(
    '--bt-glow-c',
    rgbaInk(lerpInk(INK_IVORY_B, INK_CHARCOAL, u * 0.72), 0.12 + u * 0.06),
  )
}

/** Reform v 0→1: smoke → ash → amber → ivory (reverse of dissolve). */
function applyReformInk(face: HTMLElement, vTimeline: number) {
  const v = Math.min(1, Math.max(0, vTimeline))
  const u = 1 - easeInOutCubic(v)
  face.style.setProperty('--bt-g0', inkGradientStop(u, -0.08))
  face.style.setProperty('--bt-g1', inkGradientStop(u, -0.02))
  face.style.setProperty('--bt-g2', inkGradientStop(u, 0.06))
  face.style.setProperty('--bt-g3', inkGradientStop(u, 0.14))
  face.style.setProperty('--bt-g4', inkGradientStop(u, 0.24))
  face.style.setProperty('--bt-g5', inkGradientStop(u, 0.34))
  const silver = lerpInk(INK_CHARCOAL, INK_IVORY_B, v * 0.92)
  face.style.setProperty(
    '--bt-glow-a',
    rgbaInk(lerpInk(INK_ASH_BROWN, INK_CHAMPAGNE, v * 0.78), 0.12 + v * 0.18),
  )
  face.style.setProperty('--bt-glow-b', rgbaInk(lerpInk(silver, INK_IVORY_A, v), 0.11 + v * 0.13))
  face.style.setProperty(
    '--bt-glow-c',
    rgbaInk(lerpInk(INK_CHARCOAL, INK_IVORY_B, v * 0.88), 0.09 + v * 0.12),
  )
}

type SmokePalette = 'warm' | 'charcoal'

function drawSmokeParticleLayers(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  rad: number,
  a: number,
  trailAng: number,
  curl: number,
  now: number,
  p: Particle,
  sm: number,
  rgb: readonly [number, number, number],
  boost: number,
  palette: SmokePalette,
) {
  const [r, g, b] = rgb
  const B = Math.min(2.85, Math.max(0.35, boost))
  const dark = palette === 'charcoal'

  /* Layer 2 — volumetric core + broad haze */
  const outerCore = rad * 7.05
  const ox =
    px + Math.sin(p.seed * 2.12 + now * 0.00016) * rad * 0.38 + curl * rad * 0.058
  const oy = py - rad * 0.94 + Math.cos(p.seed * 1.48 + now * 0.00014) * rad * 0.21

  const gCore = ctx.createRadialGradient(ox, oy, 0, ox, oy, outerCore)
  if (dark) {
    gCore.addColorStop(0, `rgba(44,40,38,${a * 0.42 * sm * B})`)
    gCore.addColorStop(0.16, `rgba(62,56,52,${a * 0.22 * sm * B})`)
    gCore.addColorStop(0.4, `rgba(86,76,70,${a * 0.11 * sm * B})`)
    gCore.addColorStop(0.68, `rgba(118,110,104,${a * 0.045 * sm * B})`)
    gCore.addColorStop(1, 'rgba(132,126,120,0)')
  } else {
    gCore.addColorStop(0, `rgba(${r},${g},${b},${a * 0.34 * sm * B})`)
    gCore.addColorStop(0.18, `rgba(${r},${g},${b},${a * 0.14 * sm * B})`)
    gCore.addColorStop(0.42, `rgba(238,230,220,${a * 0.082 * sm * B})`)
    gCore.addColorStop(0.72, `rgba(226,218,208,${a * 0.032 * sm * B})`)
    gCore.addColorStop(1, 'rgba(218,210,200,0)')
  }
  ctx.fillStyle = gCore
  ctx.beginPath()
  ctx.ellipse(
    ox,
    oy,
    outerCore * 0.92,
    outerCore * 1.3,
    trailAng + curl * 0.082 + now * 0.00011,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  const hazeR = rad * 6.45
  const haze = ctx.createRadialGradient(px, py - rad * 0.98, 0, px, py - rad * 0.98, hazeR)
  if (dark) {
    haze.addColorStop(0, `rgba(96,88,82,${a * 0.068 * sm * B})`)
    haze.addColorStop(0.48, `rgba(118,112,106,${a * 0.034 * sm * B})`)
    haze.addColorStop(1, 'rgba(148,142,136,0)')
  } else {
    haze.addColorStop(0, `rgba(236,228,220,${a * 0.055 * sm * B})`)
    haze.addColorStop(0.5, `rgba(228,220,210,${a * 0.028 * sm * B})`)
    haze.addColorStop(1, 'rgba(220,212,204,0)')
  }
  ctx.fillStyle = haze
  ctx.beginPath()
  ctx.arc(px, py - rad * 0.78, hazeR, 0, Math.PI * 2)
  ctx.fill()

  /* Thin wispy trail */
  ctx.fillStyle = dark
    ? `rgba(108,100,94,${a * 0.1 * sm * B})`
    : `rgba(246,238,228,${a * 0.092 * sm * B})`
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(trailAng + curl * 0.095 + now * 0.000095)
  ctx.scale(0.22, 1.85)
  ctx.translate(-px, -py)
  ctx.beginPath()
  ctx.ellipse(px, py - rad * 1.14, rad * 3.05, rad * 8.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const gx =
    px - Math.sin(trailAng) * rad * 0.84 + Math.sin(now * 0.00038 + p.seed) * rad * 0.15
  const gy = py + Math.cos(trailAng) * rad * 0.54 - rad * 1.38
  const gWisp = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad * 4.65)
  if (dark) {
    gWisp.addColorStop(0, `rgba(92,84,78,${a * 0.12 * sm * B})`)
    gWisp.addColorStop(0.32, `rgba(112,104,96,${a * 0.068 * sm * B})`)
    gWisp.addColorStop(0.66, `rgba(148,142,136,${a * 0.03 * sm * B})`)
    gWisp.addColorStop(1, 'rgba(168,164,158,0)')
  } else {
    gWisp.addColorStop(0, `rgba(250,242,230,${a * 0.11 * sm * B})`)
    gWisp.addColorStop(0.34, `rgba(234,226,216,${a * 0.062 * sm * B})`)
    gWisp.addColorStop(0.68, `rgba(224,216,206,${a * 0.026 * sm * B})`)
    gWisp.addColorStop(1, 'rgba(216,208,198,0)')
  }
  ctx.fillStyle = gWisp
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(trailAng + curl * 0.105)
  ctx.scale(0.34, 1.72)
  ctx.translate(-px, -py)
  ctx.beginPath()
  ctx.ellipse(px, py - rad * 1.04, rad * 3.95, rad * 8.05, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  for (let s = 0; s < 4; s++) {
    const along = (s + 0.35) * rad * 1.02
    const perp = Math.sin(now * 0.00048 + p.seed * 2 + s * 1.63) * rad * 0.52
    const tx = px + Math.cos(trailAng) * along - Math.sin(trailAng) * perp * 0.44
    const ty = py + Math.sin(trailAng) * along * 0.78 + perp * 0.32 - s * rad * 0.048
    const rr = rad * (0.9 + s * 0.2)
    const ga = a * (0.078 - s * 0.009) * sm * B
    const gt = ctx.createRadialGradient(tx, ty, 0, tx, ty, rr * 2.95)
    if (dark) {
      gt.addColorStop(0, `rgba(132,124,118,${ga * 0.85})`)
      gt.addColorStop(0.46, `rgba(108,102,96,${ga * 0.48})`)
      gt.addColorStop(1, `rgba(92,88,84,0)`)
    } else {
      gt.addColorStop(0, `rgba(248,240,230,${ga})`)
      gt.addColorStop(0.46, `rgba(230,222,212,${ga * 0.5})`)
      gt.addColorStop(1, `rgba(220,212,204,0)`)
    }
    ctx.fillStyle = gt
    ctx.beginPath()
    ctx.arc(tx, ty, rr * 2.62, 0, Math.PI * 2)
    ctx.fill()
  }

  const mist = ctx.createRadialGradient(px, py - rad * 0.38, 0, px, py - rad * 0.38, rad * 8.05)
  if (dark) {
    mist.addColorStop(0, `rgba(88,82,78,${a * 0.032 * sm * B})`)
    mist.addColorStop(0.62, `rgba(112,106,100,${a * 0.014 * sm * B})`)
    mist.addColorStop(1, 'rgba(132,126,120,0)')
  } else {
    mist.addColorStop(0, `rgba(232,224,216,${a * 0.026 * sm * B})`)
    mist.addColorStop(0.62, `rgba(222,214,206,${a * 0.011 * sm * B})`)
    mist.addColorStop(1, 'rgba(214,206,198,0)')
  }
  ctx.fillStyle = mist
  ctx.beginPath()
  ctx.arc(px, py - rad * 0.52, rad * 7.85, 0, Math.PI * 2)
  ctx.fill()
}

function drawGhostSilhouette(
  ctx: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  lw: number,
  lh: number,
  dpr: number,
  u: number,
  globalFade: number,
  now: number,
  seed: number,
) {
  const xh =
    Math.sin(now * 0.0016 + seed * 3.1) * lw * 0.022 +
    Math.cos(now * 0.0011 + seed) * lh * 0.014
  const yh =
    Math.cos(now * 0.0014 + seed * 2.2) * lh * 0.018 +
    Math.sin(now * 0.0009 + seed * 1.7) * lw * 0.011
  const peak = Math.sin(Math.PI * Math.min(1, u * 1.06))
  let alpha = peak * 0.17 * globalFade
  if (u > 0.42) alpha *= 1 - smoothstep01((u - 0.42) / 0.58)
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  const gx = lw * 0.5 + xh
  const gy = lh * 0.48 + yh
  const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(lw, lh) * 0.58)
  grd.addColorStop(0, `rgba(206,200,194,${alpha * 1.65})`)
  grd.addColorStop(0.38, `rgba(178,172,166,${alpha * 1.05})`)
  grd.addColorStop(0.72, `rgba(154,148,142,${alpha * 0.42})`)
  grd.addColorStop(1, 'rgba(138,132,126,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, lw, lh)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0, lw, lh)
  ctx.restore()
}

/** Grapheme clusters — avoids splitting Devanagari combining marks */
function segmentGraphemes(input: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      return Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input),
        (s) => s.segment,
      )
    } catch {
      /* fall through */
    }
  }
  return Array.from(input)
}

function computeWave(n: number, phaseMs: number) {
  if (n <= 1) return { stagger: 0, tail: phaseMs }
  let stagger = Math.min(
    BRAND_TITLE_STARDUST_STAGGER_MAX_MS,
    Math.max(BRAND_TITLE_STARDUST_STAGGER_MIN_MS, Math.floor(phaseMs / (n + 3))),
  )
  let tail = phaseMs - (n - 1) * stagger
  const tailMin = 260
  if (tail < tailMin) {
    stagger = Math.max(36, Math.floor((phaseMs - tailMin) / Math.max(1, n - 1)))
    tail = Math.max(tailMin, phaseMs - (n - 1) * stagger)
  }
  return { stagger, tail: Math.min(phaseMs, tail) }
}

function fnv1a32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)!
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Letter indices in dissolve/reform stagger order (organic, stable per title). */
function seededLetterSlotOrder(n: number, salt: string): number[] {
  const slots = Array.from({ length: n }, (_, i) => i)
  let state = fnv1a32(`${salt}|${n}|${BRAND_TITLE_TEXT}`)
  for (let i = n - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    const a = slots[i]!
    slots[i] = slots[j]!
    slots[j] = a
  }
  return slots
}

/** rank[letterIndex] = wave slot 0 … n−1 */
function slotOrderToRanks(order: number[]): number[] {
  const ranks = new Array<number>(order.length)
  for (let slot = 0; slot < order.length; slot++) ranks[order[slot]!] = slot
  return ranks
}

type Particle = {
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rgb: readonly [number, number, number]
  seed: number
  smoke?: boolean
  /** Rare warm micro-ember in dust field */
  ember?: boolean
}

/** Dissolve tail uses charcoal particle tint; gradient finishes look in draw layer */
const SMOKE_RGB: readonly [number, number, number] = [96, 88, 82]

const EMBER_RGB: readonly [number, number, number] = [255, 242, 218]

/** Soft silver + champagne micro-sparkle dust */
const PALETTE: readonly (readonly [number, number, number])[] = [
  [244, 242, 238],
  [232, 230, 228],
  [220, 222, 226],
  [248, 244, 232],
  [238, 234, 226],
  [252, 250, 246],
]

/** Celestial sand — champagne gold / silver dust / pearl white / faint sapphire */
const STAR_RGB_GOLD: readonly [number, number, number] = [232, 196, 118]
const STAR_RGB_SILVER: readonly [number, number, number] = [226, 224, 232]
const STAR_RGB_WHITE: readonly [number, number, number] = [254, 252, 248]
const STAR_RGB_BLUE: readonly [number, number, number] = [178, 204, 228]

type GlyphAnchor = {
  hx: number
  hy: number
  rgb: readonly [number, number, number]
}

type StarParticle = {
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  seed: number
  rgb: readonly [number, number, number]
}

function pickStarRgb(li: number, ai: number): readonly [number, number, number] {
  const roll = (((ai * 7919 + li * 104729) % 100000) / 100000 + ((li * 97 + ai * 53) % 997) / 9970) % 1
  if (roll < 0.48) return STAR_RGB_GOLD
  if (roll < 0.74) return STAR_RGB_SILVER
  if (roll < 0.972) return STAR_RGB_WHITE
  return STAR_RGB_BLUE
}

function drawStarParticle(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: StarParticle,
  alpha: number,
  now: number,
  hover: number,
) {
  const tw = 0.82 + Math.sin(now * 0.0036 + s.seed * 4.1) * 0.14
  const a = alpha * tw
  const rr = s.r * (1 + hover * 0.12)
  const [r, g, b] = s.rgb
  ctx.globalCompositeOperation = 'lighter'
  const g0 = ctx.createRadialGradient(px, py, 0, px, py, rr * 5)
  g0.addColorStop(0, `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 36)},${Math.min(255, b + 28)},${a * 0.55})`)
  g0.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.32})`)
  g0.addColorStop(0.72, `rgba(${r},${g},${b},${a * 0.09})`)
  g0.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = g0
  ctx.beginPath()
  ctx.arc(px, py, rr * 4.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgba(255,252,244,${a * 0.42})`
  ctx.beginPath()
  ctx.arc(px, py, rr * 0.52, 0, Math.PI * 2)
  ctx.fill()
}

/** Soft ivory mist hugging forming glyphs during star_form / polish */
function drawFormationSmokeAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  intensity: number,
  globalFade: number,
) {
  const u = Math.min(1, Math.max(0, intensity)) * globalFade
  if (u < 0.03) return
  ctx.globalCompositeOperation = 'source-over'
  const rad = span * 0.52
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
  gr.addColorStop(0, `rgba(236,228,218,${u * 0.085})`)
  gr.addColorStop(0.45, `rgba(226,218,208,${u * 0.038})`)
  gr.addColorStop(1, 'rgba(218,210,200,0)')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.fill()
}

type LetterMeta = {
  grapheme: string
  wordIndex: number
  flatIndex: number
}

export function BrandTitleStardust() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLSpanElement | null>(null)
  const letterWrapRef = useRef<(HTMLSpanElement | null)[]>([])
  const letterCanvasRef = useRef<(HTMLCanvasElement | null)[]>([])
  const letterFaceRef = useRef<(HTMLSpanElement | null)[]>([])
  const particlesRef = useRef<Particle[][]>([])
  const glyphAnchorsRef = useRef<GlyphAnchor[][]>([])
  const starsRef = useRef<StarParticle[][]>([])
  const starsSpawnedRef = useRef(false)
  const letterGlyphMaskRef = useRef<(HTMLCanvasElement | null)[]>([])
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const reducedMotionRef = useRef(false)
  const hoverBloomRef = useRef(0)
  const rafRef = useRef(0)
  const lastNowRef = useRef(0)
  const [stardustLoopActive, setStardustLoopActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const enable = () => {
      if (!cancelled) setStardustLoopActive(true)
    }
    const timeoutId = window.setTimeout(enable, BRAND_TITLE_STARDUST_DEFER_MS)
    const idleId =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(enable, { timeout: BRAND_TITLE_STARDUST_DEFER_MS })
        : 0
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      if (idleId && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId)
    }
  }, [])

  const { wordRows, letterCount, flatLetters } = useMemo(() => {
    const words = BRAND_TITLE_TEXT.trim().split(/\s+/).filter(Boolean)
    const rows: { wordIndex: number; letters: LetterMeta[] }[] = []
    let flat = 0
    for (let wi = 0; wi < words.length; wi++) {
      const graphemes = segmentGraphemes(words[wi]!)
      const letters: LetterMeta[] = graphemes.map((grapheme) => ({
        grapheme,
        wordIndex: wi,
        flatIndex: flat++,
      }))
      rows.push({ wordIndex: wi, letters })
    }
    const lettersFlat = rows.flatMap((r) => r.letters)
    return { wordRows: rows, letterCount: flat, flatLetters: lettersFlat }
  }, [])

  const dissolveRankByLetter = useMemo(() => {
    if (letterCount === 0) return []
    return slotOrderToRanks(seededLetterSlotOrder(letterCount, 'dissolve'))
  }, [letterCount])

  const starFormRankByLetter = useMemo(() => {
    if (letterCount === 0) return []
    return slotOrderToRanks(seededLetterSlotOrder(letterCount, 'starform'))
  }, [letterCount])

  const sampleGlyphs = useCallback(() => {
    const n = letterCount
    if (n === 0) return

    let off = offscreenRef.current
    if (!off) {
      off = document.createElement('canvas')
      offscreenRef.current = off
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const dustBudget = Math.max(2, Math.floor(BRAND_TITLE_STARDUST_MAX_PARTICLES / n))
    const smokeBudget = Math.min(
      BRAND_TITLE_STARDUST_SMOKE_PER_LETTER_CAP,
      Math.max(48, Math.floor(BRAND_TITLE_STARDUST_MAX_SMOKE / n)),
    )
    const nextParticles: Particle[][] = Array.from({ length: n }, () => [])
    const nextAnchors: GlyphAnchor[][] = Array.from({ length: n }, () => [])

    for (let li = 0; li < n; li++) {
      const wrap = letterWrapRef.current[li]
      const face = letterFaceRef.current[li]
      if (!wrap || !face) continue

      const logicalW = Math.max(1, Math.ceil(wrap.clientWidth))
      const logicalH = Math.max(1, Math.ceil(wrap.clientHeight))

      off.width = Math.floor(logicalW * dpr)
      off.height = Math.floor(logicalH * dpr)

      const ctx = off.getContext('2d', { willReadFrequently: true })
      if (!ctx) continue

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, off.width, off.height)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cs = getComputedStyle(face)
      const fontWeight = cs.fontWeight || '800'
      const fontSize = cs.fontSize
      const fontFamily = cs.fontFamily || "'Mukta', 'Noto Sans Devanagari', sans-serif"
      ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#ffffff'

      const grapheme = flatLetters[li]?.grapheme ?? ''
      const m = ctx.measureText(grapheme)
      const ascent = m.actualBoundingBoxAscent ?? parseFloat(fontSize) * 0.72
      const descent = m.actualBoundingBoxDescent ?? parseFloat(fontSize) * 0.26
      const tw = m.width
      const baselineY = logicalH - descent - (logicalH - ascent - descent) * 0.06
      const ox = Math.max(0, (logicalW - tw) * 0.5)

      ctx.fillText(grapheme, ox, baselineY)

      const img = ctx.getImageData(0, 0, off.width, off.height)
      const data = img.data

      const sampleAlpha = (lx: number, ly: number) => {
        if (lx < 0 || ly < 0 || lx >= logicalW || ly >= logicalH) return 0
        const bx = Math.min(off.width - 1, Math.floor(lx * dpr))
        const by = Math.min(off.height - 1, Math.floor(ly * dpr))
        return data[(by * off.width + bx) * 4 + 3]
      }

      const glyphStep = BRAND_TITLE_STARDUST_SAMPLE_STEP_CSSPX
      const pts: { x: number; y: number }[] = []
      for (let y = 0; y < logicalH; y += glyphStep) {
        for (let x = 0; x < logicalW; x += glyphStep) {
          if (sampleAlpha(x, y) > 120) pts.push({ x, y })
        }
      }

      let dustPick = pts
      if (dustPick.length > dustBudget) {
        const stride = Math.ceil(dustPick.length / dustBudget)
        dustPick = dustPick.filter((_, i) => i % stride === 0).slice(0, dustBudget)
      }

      const edgePts: { x: number; y: number }[] = []
      for (const p of pts) {
        if (sampleAlpha(p.x, p.y) <= 120) continue
        const neighborLow =
          sampleAlpha(p.x - glyphStep, p.y) < 90 ||
          sampleAlpha(p.x + glyphStep, p.y) < 90 ||
          sampleAlpha(p.x, p.y - glyphStep) < 90 ||
          sampleAlpha(p.x, p.y + glyphStep) < 90
        if (neighborLow) edgePts.push(p)
      }

      /* Smoke emitters across full glyph body so the letter reads as turning into vapor */
      let smokePick = pts
      if (smokePick.length > smokeBudget) {
        let stride = Math.ceil(smokePick.length / smokeBudget)
        let pool: { x: number; y: number }[] = pts
        if (stride > 3) {
          const coarseStep = Math.min(4, glyphStep + 1)
          const coarsePts: { x: number; y: number }[] = []
          for (let y = 0; y < logicalH; y += coarseStep) {
            for (let x = 0; x < logicalW; x += coarseStep) {
              if (sampleAlpha(x, y) > 120) coarsePts.push({ x, y })
            }
          }
          if (coarsePts.length > 0) {
            pool = coarsePts
            stride = Math.ceil(pool.length / smokeBudget)
          }
        }
        smokePick = pool.filter((_, i) => i % stride === 0).slice(0, smokeBudget)
      }

      /* Few edge strands for silhouette wisps */
      const edgeStride = Math.max(1, Math.ceil(edgePts.length / Math.max(8, Math.floor(smokeBudget * 0.14))))
      const edgeExtras = edgePts.filter((_, i) => i % edgeStride === 0).slice(0, Math.floor(smokeBudget * 0.12))
      const smokeSeen = new Set(smokePick.map((q) => `${q.x},${q.y}`))
      for (const e of edgeExtras) {
        const k = `${e.x},${e.y}`
        if (!smokeSeen.has(k) && smokePick.length < smokeBudget) {
          smokePick.push(e)
          smokeSeen.add(k)
        }
      }

      const out: Particle[] = []
      let i = 0
      for (const p of dustPick) {
        const rng = ((i * 9301 + 49297 + li * 97) % 233280) / 233280
        const rng2 = ((i * 4529 + 78497 + li * 53) % 233280) / 233280
        const rng3 = ((i * 6121 + li * 173) % 233280) / 233280
        const ember = rng3 < 0.0009
        const rgb = ember ? EMBER_RGB : PALETTE[i % PALETTE.length]!
        out.push({
          hx: p.x,
          hy: p.y,
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          r: ember ? 0.12 + rng * 0.18 : 0.14 + rng * 0.22,
          rgb,
          seed: rng * Math.PI * 2 + rng2 + li,
          smoke: false,
          ember,
        })
        i += 1
      }

      for (const p of smokePick) {
        const rng = ((i * 9301 + 49297 + li * 97) % 233280) / 233280
        const rng2 = ((i * 4529 + 78497 + li * 53) % 233280) / 233280
        out.push({
          hx: p.x,
          hy: p.y,
          x: p.x + (rng - 0.5) * 0.55,
          y: p.y + (rng2 - 0.5) * 0.55,
          vx: 0,
          vy: 0,
          r: 0.72 + rng * 1.05,
          rgb: SMOKE_RGB,
          seed: rng * Math.PI * 2 + rng2 + li,
          smoke: true,
        })
        i += 1
      }

      nextParticles[li] = out

      while (letterGlyphMaskRef.current.length <= li) letterGlyphMaskRef.current.push(null)
      let glyphMask = letterGlyphMaskRef.current[li]
      if (!glyphMask) {
        glyphMask = document.createElement('canvas')
        letterGlyphMaskRef.current[li] = glyphMask
      }
      glyphMask.width = off.width
      glyphMask.height = off.height
      const mx = glyphMask.getContext('2d')
      if (mx) mx.drawImage(off, 0, 0)

      let anchorPick = pts
      const anchorBudget = Math.min(
        BRAND_TITLE_STARDUST_STAR_ANCHORS_PER_LETTER_CAP,
        anchorPick.length || 1,
      )
      if (anchorPick.length > anchorBudget) {
        const stride = Math.ceil(anchorPick.length / anchorBudget)
        anchorPick = anchorPick.filter((_, ai) => ai % stride === 0).slice(0, anchorBudget)
      }
      nextAnchors[li] = anchorPick.map((pt, ai) => ({
        hx: pt.x,
        hy: pt.y,
        rgb: pickStarRgb(li, ai),
      }))
    }

    particlesRef.current = nextParticles
    glyphAnchorsRef.current = nextAnchors
  }, [letterCount, flatLetters])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const onMq = () => {
      reducedMotionRef.current = mq.matches
      if (mq.matches) sampleGlyphs()
    }
    mq.addEventListener('change', onMq)
    return () => mq.removeEventListener('change', onMq)
  }, [sampleGlyphs])

  useEffect(() => {
    if (!stardustLoopActive) return
    const track = trackRef.current
    if (!track) return

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => sampleGlyphs())
      ro.observe(track)
    }

    const onResize = () => sampleGlyphs()
    window.addEventListener('resize', onResize)

    requestAnimationFrame(() => sampleGlyphs())
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => sampleGlyphs())
    }

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [sampleGlyphs, stardustLoopActive])

  useEffect(() => {
    const n = letterCount
    if (n === 0 || !stardustLoopActive) return

    const loopMs = BRAND_TITLE_STARDUST_LOOP_MS
    const sequenceMs = BRAND_TITLE_STARDUST_SEQUENCE_MS
    const idleEnd = BRAND_TITLE_STARDUST_IDLE_MS
    const dissolveEndGlobal = idleEnd + BRAND_TITLE_STARDUST_DISSOLVE_MS
    const smokeGatherEnd = dissolveEndGlobal + BRAND_TITLE_STARDUST_SMOKE_TRANSITION_MS
    const smokeHoldEnd = smokeGatherEnd + BRAND_TITLE_STARDUST_SMOKE_HOLD_MS
    const smokeRiseEnd = smokeHoldEnd + BRAND_TITLE_STARDUST_SMOKE_RISE_MS
    const ghostEnd = smokeRiseEnd + BRAND_TITLE_STARDUST_GHOST_MS
    const starfallEnd = ghostEnd + BRAND_TITLE_STARDUST_STARFALL_MS
    const gatherEnd = starfallEnd + BRAND_TITLE_STARDUST_STAR_GATHER_MS
    const formEndGlobal = gatherEnd + BRAND_TITLE_STARDUST_STAR_FORM_MS
    const polishEnd = formEndGlobal + BRAND_TITLE_STARDUST_STAR_POLISH_MS

    const { stagger: stDiss, tail: tailDiss } = computeWave(n, BRAND_TITLE_STARDUST_DISSOLVE_MS)
    const { stagger: stForm, tail: tailForm } = computeWave(n, BRAND_TITLE_STARDUST_STAR_FORM_MS)

    const dRank = dissolveRankByLetter
    const fRank = starFormRankByLetter

    const dissolveStart = (i: number) => idleEnd + dRank[i]! * stDiss
    const dissolveEndForLetter = (i: number) => dissolveStart(i) + tailDiss

    const formStart = (i: number) => gatherEnd + fRank[i]! * stForm
    const formEndForLetter = (i: number) => formStart(i) + tailForm

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick)
      const dt = Math.min(0.05, lastNowRef.current ? (now - lastNowRef.current) / 1000 : 1 / 60)
      lastNowRef.current = now

      const hover = hoverBloomRef.current
      hoverBloomRef.current = Math.max(0, hoverBloomRef.current - dt * 1.2)

      const tCycle = now % loopMs
      /* Pad remainder of each 2‑min wall loop with idle (same visuals as cycle start). */
      const t = tCycle >= sequenceMs ? 0 : tCycle
      const maxFxR = BRAND_TITLE_STARDUST_MAX_FX_RADIUS_CSSPX
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      const globalPhase =
        t < idleEnd
          ? 'idle'
          : t < dissolveEndGlobal
            ? 'dissolve'
            : t < smokeGatherEnd
              ? 'smoke_gather'
              : t < smokeHoldEnd
                ? 'smoke_hold'
                : t < smokeRiseEnd
                  ? 'smoke_rise'
                  : t < ghostEnd
                    ? 'ghost_memory'
                    : t < starfallEnd
                      ? 'sandfall'
                      : t < gatherEnd
                        ? 'gather'
                        : t < formEndGlobal
                          ? 'star_form'
                          : t < polishEnd
                            ? 'star_polish'
                            : 'settle'

      wrapRef.current?.setAttribute('data-stardust-phase', globalPhase)

      let globalCanvasFade = 1
      if (t >= polishEnd) {
        const u = (t - polishEnd) / BRAND_TITLE_STARDUST_SETTLE_MS
        globalCanvasFade = 1 - easeOutCubic(u)
      }

      if (t < idleEnd) {
        starsSpawnedRef.current = false
        starsRef.current = Array.from({ length: n }, () => [])
      } else if (t >= ghostEnd && t < gatherEnd && !starsSpawnedRef.current) {
        starsSpawnedRef.current = true
        for (let si = 0; si < n; si++) {
          const w = letterWrapRef.current[si]
          const anchors = glyphAnchorsRef.current[si] ?? []
          if (!w || anchors.length === 0) {
            starsRef.current[si] = []
            continue
          }
          const lw = Math.max(1, w.clientWidth)
          const lh = Math.max(1, w.clientHeight)
          const band = lh * 0.92 + 52
          const stars: StarParticle[] = []
          for (let k = 0; k < anchors.length; k++) {
            const a = anchors[k]!
            const r1 = ((k * 5023 + si * 97) % 4099) / 4099
            const r2 = ((k * 7919 + si * 131) % 5189) / 5189
            const r3 = ((k * 9311 + si * 173) % 5779) / 5779
            const r4 = ((k * 6829 + si * 211) % 4519) / 4519
            const r5 = ((k * 5399 + si * 241) % 4999) / 4999
            stars.push({
              hx: a.hx,
              hy: a.hy,
              x: a.hx + (r1 - 0.5) * lw * 0.72,
              y: -22 - r2 * band,
              vx: (r3 - 0.5) * 26,
              vy: 32 + r4 * 44,
              r: 0.34 + r5 * 0.52,
              seed: r4 * Math.PI * 2 + r5 + si + k * 0.01,
              rgb: a.rgb,
            })
          }
          starsRef.current[si] = stars
        }
      }

      if (reducedMotionRef.current) {
        for (let i = 0; i < n; i++) {
          const fe = letterFaceRef.current[i]
          if (fe) {
            fe.style.setProperty('opacity', '1')
            clearLetterMorphVars(fe)
          }
          const c = letterCanvasRef.current[i]
          if (c) {
            c.style.display = 'none'
            c.style.opacity = '0'
            c.style.visibility = 'hidden'
          }
          letterWrapRef.current[i]?.setAttribute('data-letter-phase', 'idle')
        }
        wrapRef.current?.setAttribute('data-stardust-phase', 'idle')
        return
      }

      if (t < idleEnd) {
        const layers = particlesRef.current
        for (let i = 0; i < n; i++) {
          const parts = layers[i] ?? []
          for (const p of parts) {
            p.x = p.hx
            p.y = p.hy
            p.vx = 0
            p.vy = 0
          }
          const feI = letterFaceRef.current[i]
          if (feI) {
            feI.style.setProperty('opacity', '1')
            clearLetterMorphVars(feI)
          }
          letterWrapRef.current[i]?.setAttribute('data-letter-phase', 'idle')
          const c = letterCanvasRef.current[i]
          const ctx = c?.getContext('2d', { alpha: true })
          if (c && ctx) {
            c.style.display = 'none'
            c.style.opacity = '0'
            c.style.visibility = 'hidden'
            ctx.clearRect(0, 0, c.width, c.height)
          }
        }
        return
      }

      for (let i = 0; i < n; i++) {
        const canvas = letterCanvasRef.current[i]
        const face = letterFaceRef.current[i]
        const wrap = letterWrapRef.current[i]
        const ctx = canvas?.getContext('2d', { alpha: true })
        const parts = particlesRef.current[i] ?? []
        if (!canvas || !ctx || !face || !wrap) continue

        const ds = dissolveStart(i)
        const de = dissolveEndForLetter(i)

        let cx = 0
        let cy = 0
        const np = parts.length
        if (np > 0) {
          for (const p of parts) {
            cx += p.x
            cy += p.y
          }
          cx /= np
          cy /= np
        } else {
          cx = wrap.clientWidth * 0.5
          cy = wrap.clientHeight * 0.5
        }

        if (t < ds) {
          for (const p of parts) {
            p.x = p.hx
            p.y = p.hy
            p.vx = 0
            p.vy = 0
          }
          face.style.opacity = '1'
          clearLetterMorphVars(face)
          wrap.setAttribute('data-letter-phase', 'idle')
          canvas.style.display = 'none'
          canvas.style.opacity = '0'
          canvas.style.visibility = 'hidden'
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          continue
        }

        let faceOp: number
        let letterPhase:
          | 'idle'
          | 'dissolve'
          | 'drift'
          | 'smoke_gather'
          | 'smoke_hold'
          | 'smoke_rise'
          | 'ghost'
          | 'sandfall'
          | 'gather'
          | 'star_form'
          | 'star_polish'
          | 'settle'

        const fs = formStart(i)
        const fe = formEndForLetter(i)

        if (t < de) {
          const u = (t - ds) / Math.max(1e-6, tailDiss)
          faceOp = faceGlyphOpacityDissolve(u)
          letterPhase = 'dissolve'
        } else if (t < fs) {
          faceOp = 0
          if (t < dissolveEndGlobal) letterPhase = 'drift'
          else if (t < smokeGatherEnd) letterPhase = 'smoke_gather'
          else if (t < smokeHoldEnd) letterPhase = 'smoke_hold'
          else if (t < smokeRiseEnd) letterPhase = 'smoke_rise'
          else if (t < ghostEnd) letterPhase = 'ghost'
          else if (t < starfallEnd) letterPhase = 'sandfall'
          else if (t < gatherEnd) letterPhase = 'gather'
          else letterPhase = 'gather'
        } else if (t < fe) {
          const fv = (t - fs) / Math.max(1e-6, tailForm)
          faceOp = faceGlyphOpacityReform(fv)
          letterPhase = 'star_form'
        } else if (t < polishEnd) {
          faceOp = 1
          letterPhase = 'star_polish'
        } else if (t < polishEnd + BRAND_TITLE_STARDUST_SETTLE_MS) {
          faceOp = 1
          letterPhase = 'settle'
        } else {
          faceOp = 1
          letterPhase = 'idle'
        }

        face.style.opacity = String(faceOp)
        wrap.setAttribute('data-letter-phase', letterPhase)

        if (letterPhase === 'dissolve') {
          applyDissolveMorph(face, (t - ds) / Math.max(1e-6, tailDiss))
        } else if (letterPhase === 'star_form' && t >= fs) {
          applyReformMorph(face, (t - fs) / Math.max(1e-6, tailForm))
        } else if (letterPhase === 'star_polish' || letterPhase === 'settle') {
          applyReformMorph(face, 1)
        } else {
          clearLetterMorphVars(face)
        }

        if (globalCanvasFade < 0.012) {
          canvas.style.display = 'none'
          canvas.style.opacity = '0'
          canvas.style.visibility = 'hidden'
          continue
        }

        let smokeBoost: number
        if (letterPhase === 'dissolve') {
          smokeBoost = smokeStrengthDissolve((t - ds) / Math.max(1e-6, tailDiss))
        } else if (letterPhase === 'drift') {
          smokeBoost = 1.18
        } else if (letterPhase === 'smoke_gather') {
          smokeBoost = 1.42
        } else if (letterPhase === 'smoke_hold') {
          smokeBoost = 1.36
        } else if (letterPhase === 'smoke_rise') {
          const rp = (t - smokeHoldEnd) / Math.max(1e-6, smokeRiseEnd - smokeHoldEnd)
          smokeBoost = (1 - smoothstep01(rp)) * 1.22 + 0.07
        } else {
          smokeBoost = 0
        }

        if (t < de) {
          const u = (t - ds) / Math.max(1e-6, tailDiss)
          const ue = easeInOutCubic(u)
          const liftSmoke = 11 + 24 * ue
          const liftDust = 3.8 * ue
          const spreadSmoke = 8 + 13 * ue
          const spreadDust = 2.6 * ue
          for (const p of parts) {
            const lift = p.smoke ? liftSmoke : liftDust
            const spread = p.smoke ? spreadSmoke : spreadDust
            const ang = p.seed * 4.15 + ue * 0.28
            const wobble = Math.sin(p.seed * 8.8 + u * Math.PI * 1.35) * 0.42 * ue
            const tx =
              p.hx + Math.cos(ang) * spread * 0.32 + wobble * (p.smoke ? 0.48 : 0.22)
            const ty = p.hy - lift + Math.sin(ang * 0.65) * spread * 0.11 * ue
            const ease = 0.095
            p.x += (tx - p.x) * ease
            p.y += (ty - p.y) * ease
            p.vx = (tx - p.x) * 0.032
            p.vy = (ty - p.y) * 0.032
          }
        } else if (t < dissolveEndGlobal) {
          const swirl = 5.8 * dt * 60
          const driftU = (t - de) / Math.max(1e-6, dissolveEndGlobal - de)
          const riseSmoke = 0.0085 + 0.0055 * Math.sin(driftU * Math.PI)
          const riseDust = -0.0024
          const turb = Math.sin(now * 0.00038 + de * 1e-6) * 0.003
          for (const p of parts) {
            const dx = p.x - cx
            const dy = p.y - cy
            const len = Math.hypot(dx, dy) || 1
            const sw = p.smoke ? 0.72 : 1
            p.vx +=
              (-dy / len) * swirl * 0.0062 * sw +
              Math.sin(now * 0.00062 + p.seed * 1.2) * (p.smoke ? 0.0062 : 0.0075) +
              turb * (p.smoke ? 1.28 : 0.55)
            p.vy +=
              (dx / len) * swirl * 0.0062 * sw +
              Math.cos(now * 0.00052 + p.seed * 1.05) * (p.smoke ? 0.0054 : 0.0074) +
              (p.smoke ? -riseSmoke : riseDust)
            const damp = p.smoke ? 0.982 : 0.978
            p.vx *= damp
            p.vy *= damp
            const spd = p.smoke ? 14 : 17
            p.x += p.vx * dt * spd
            p.y += p.vy * dt * spd
          }
        } else if (t < smokeGatherEnd) {
          const swirl = 6.4 * dt * 60
          const driftU = (t - dissolveEndGlobal) / Math.max(1e-6, smokeGatherEnd - dissolveEndGlobal)
          const riseSmoke = 0.0095 + 0.0042 * Math.sin(driftU * Math.PI)
          const turb = Math.sin(now * 0.00036 + de * 1e-6) * 0.0034
          for (const p of parts) {
            const dx = p.x - cx
            const dy = p.y - cy
            const len = Math.hypot(dx, dy) || 1
            const sw = p.smoke ? 0.68 : 1
            p.vx +=
              (-dy / len) * swirl * 0.0065 * sw +
              Math.sin(now * 0.00058 + p.seed * 1.18) * (p.smoke ? 0.0066 : 0.0072) +
              turb * (p.smoke ? 1.35 : 0.5)
            p.vy +=
              (dx / len) * swirl * 0.0065 * sw +
              Math.cos(now * 0.00048 + p.seed) * (p.smoke ? 0.0058 : 0.007) -
              (p.smoke ? riseSmoke : 0.002)
            const damp = p.smoke ? 0.981 : 0.978
            p.vx *= damp
            p.vy *= damp
            const spd = p.smoke ? 14 : 16
            p.x += p.vx * dt * spd
            p.y += p.vy * dt * spd
          }
        } else if (t < smokeHoldEnd) {
          const swirl = 4.2 * dt * 60
          const driftU = (t - smokeGatherEnd) / Math.max(1e-6, smokeHoldEnd - smokeGatherEnd)
          const riseSmoke = 0.0058 + 0.0038 * Math.sin(driftU * Math.PI)
          const turb = Math.sin(now * 0.00032 + de * 1e-6) * 0.0026
          for (const p of parts) {
            const dx = p.x - cx
            const dy = p.y - cy
            const len = Math.hypot(dx, dy) || 1
            const sw = p.smoke ? 0.76 : 1
            p.vx +=
              (-dy / len) * swirl * 0.0052 * sw +
              Math.sin(now * 0.00052 + p.seed * 1.12) * (p.smoke ? 0.005 : 0.0064) +
              turb * (p.smoke ? 1.12 : 0.42)
            p.vy +=
              (dx / len) * swirl * 0.0052 * sw +
              Math.cos(now * 0.00044 + p.seed) * (p.smoke ? 0.0045 : 0.0059) -
              (p.smoke ? riseSmoke : 0.0016)
            const damp = p.smoke ? 0.984 : 0.981
            p.vx *= damp
            p.vy *= damp
            const spd = p.smoke ? 12 : 14
            p.x += p.vx * dt * spd
            p.y += p.vy * dt * spd
          }
        } else if (t < smokeRiseEnd) {
          const swirl = 3.6 * dt * 60
          const riseProg = (t - smokeHoldEnd) / Math.max(1e-6, smokeRiseEnd - smokeHoldEnd)
          const liftBoost = 0.011 + riseProg * 0.018
          const turb = Math.sin(now * 0.0004 + de * 1e-6) * 0.0022 * (1 - riseProg * 0.65)
          for (const p of parts) {
            const dx = p.x - cx
            const dy = p.y - cy
            const len = Math.hypot(dx, dy) || 1
            const sw = p.smoke ? 0.78 : 1
            p.vx +=
              (-dy / len) * swirl * 0.0044 * sw +
              Math.sin(now * 0.00048 + p.seed) * (p.smoke ? 0.0042 : 0.0058) +
              turb * (p.smoke ? 0.95 : 0.38)
            p.vy +=
              (dx / len) * swirl * 0.0044 * sw -
              (p.smoke ? liftBoost : 0.0022)
            const damp = p.smoke ? 0.986 : 0.983
            p.vx *= damp
            p.vy *= damp
            const spd = p.smoke ? 13 + riseProg * 5 : 13
            p.x += p.vx * dt * spd
            p.y += p.vy * dt * spd
          }
        } else if (t < ghostEnd) {
          for (const p of parts) {
            p.vx *= 0.91
            p.vy *= 0.91
            p.x += (p.hx - p.x) * 0.02
            p.y += (p.hy - p.y) * 0.02
          }
        } else if (t >= ghostEnd && t < polishEnd) {
          const stars = starsRef.current[i] ?? []
          const sdt = dt
          if (t < starfallEnd) {
            for (const s of stars) {
              s.vy += 52 * sdt
              s.vx += Math.sin(now * 0.00105 + s.seed * 2.9) * 16 * sdt
              s.vy += Math.cos(now * 0.00088 + s.seed * 1.7) * 7 * sdt
              s.x += s.vx * sdt
              s.y += s.vy * sdt
              s.vx *= 0.996
            }
          } else if (t < gatherEnd) {
            const gProg = (t - starfallEnd) / Math.max(1e-6, gatherEnd - starfallEnd)
            for (const s of stars) {
              const dx = s.hx - s.x
              const dy = s.hy - s.y
              const len = Math.hypot(dx, dy) || 1
              const tx = -dy / len
              const ty = dx / len
              const attract = 102 + gProg * 128
              const spin = (1 - gProg * 0.58) * 82 * sdt
              s.vx += (dx / len) * attract * sdt + tx * spin
              s.vy += (dy / len) * attract * sdt + ty * spin * 0.8
              s.vx *= 0.992
              s.vy *= 0.992
              s.x += s.vx * sdt
              s.y += s.vy * sdt
            }
          } else if (t < formEndGlobal) {
            const u = easeInOutCubic((t - gatherEnd) / Math.max(1e-6, formEndGlobal - gatherEnd))
            const k = 11 + u * 42
            for (const s of stars) {
              const dx = s.hx - s.x
              const dy = s.hy - s.y
              s.vx += dx * k * sdt
              s.vy += dy * k * sdt
              s.vx *= 0.888
              s.vy *= 0.888
              s.x += s.vx * sdt * 27
              s.y += s.vy * sdt * 27
              if (u > 0.86) {
                s.x += dx * 0.082
                s.y += dy * 0.082
              }
            }
          } else {
            for (const s of stars) {
              const dx = s.hx - s.x
              const dy = s.hy - s.y
              s.vx += dx * 28 * sdt
              s.vy += dy * 28 * sdt
              s.vx *= 0.902
              s.vy *= 0.902
              s.x += s.vx * sdt * 15 + dx * sdt * 9
              s.y += s.vy * sdt * 15 + dy * sdt * 9
            }
          }
        } else {
          for (const s of starsRef.current[i] ?? []) {
            const dx = s.hx - s.x
            const dy = s.hy - s.y
            s.x += dx * 0.16
            s.y += dy * 0.16
            s.vx *= 0.78
            s.vy *= 0.78
          }
          for (const p of parts) {
            p.vx *= 0.887
            p.vy *= 0.887
            p.x += (p.hx - p.x) * 0.082
            p.y += (p.hy - p.y) * 0.082
          }
        }

        if (t < ghostEnd) {
          for (const p of parts) {
            const rdx = p.x - p.hx
            const rdy = p.y - p.hy
            const d = Math.hypot(rdx, rdy)
            if (d > maxFxR) {
              const s = maxFxR / d
              p.x = p.hx + rdx * s
              p.y = p.hy + rdy * s
              p.vx *= 0.81
              p.vy *= 0.81
            }
          }
        }

        if (letterPhase === 'ghost') {
          clearLetterMorphVars(face)
          canvas.classList.remove('brand-title-stardust__letter-canvas--dark-smoke')
          const mask = letterGlyphMaskRef.current[i]
          const lw = Math.max(1, Math.ceil(wrap.clientWidth))
          const lh = Math.max(1, Math.ceil(wrap.clientHeight))
          if (!mask) {
            canvas.style.display = 'none'
            canvas.style.visibility = 'hidden'
            continue
          }
          canvas.style.display = 'block'
          canvas.style.visibility = 'visible'
          canvas.style.opacity = String(globalCanvasFade)
          canvas.style.left = '0'
          canvas.style.top = '0'
          canvas.style.width = `${lw}px`
          canvas.style.height = `${lh}px`
          canvas.width = Math.floor(lw * dpr)
          canvas.height = Math.floor(lh * dpr)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, lw + 2, lh + 2)
          const uGhost = (t - smokeRiseEnd) / Math.max(1e-6, BRAND_TITLE_STARDUST_GHOST_MS)
          drawGhostSilhouette(ctx, mask, lw, lh, dpr, uGhost, globalCanvasFade, now, i * 9.31 + 0.73)
          continue
        }

        if (
          letterPhase === 'smoke_gather' ||
          letterPhase === 'smoke_hold' ||
          letterPhase === 'smoke_rise'
        ) {
          canvas.classList.add('brand-title-stardust__letter-canvas--dark-smoke')
        } else {
          canvas.classList.remove('brand-title-stardust__letter-canvas--dark-smoke')
        }

        const twinkle = 0.93 + Math.sin(now * 0.0032) * 0.042
        const hb = 1 + hover * 0.2

        const drawSmokeLayer =
          letterPhase === 'dissolve' ||
          letterPhase === 'drift' ||
          letterPhase === 'smoke_gather' ||
          letterPhase === 'smoke_hold' ||
          letterPhase === 'smoke_rise'
        const starsDraw = starsRef.current[i] ?? []
        const drawStarLayer =
          t >= ghostEnd && globalCanvasFade > 0.015 && starsDraw.length > 0

        const smokePalette: SmokePalette =
          letterPhase === 'dissolve' || letterPhase === 'drift' ? 'warm' : 'charcoal'

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        const alphaFloor =
          letterPhase === 'smoke_rise'
            ? 0.003 + (1 - smokeBoost) * 0.012
            : letterPhase === 'smoke_hold'
              ? 0.005
              : 0.012

        if (drawSmokeLayer) {
          for (const p of parts) {
            const amp = p.smoke ? 0.96 : 0.21
            const baseA =
              twinkle * hb * amp * (0.52 + Math.sin(now * 0.004 + p.seed * 3.2) * 0.16)
            const charcoalFade =
              letterPhase === 'smoke_gather' ||
              letterPhase === 'smoke_hold' ||
              letterPhase === 'smoke_rise'
                ? smokeBoost * (p.smoke ? 1.15 : 0.65)
                : 1
            const smokeFade = charcoalFade
            if (baseA * smokeFade < alphaFloor) continue
            const rad = p.smoke
              ? p.r * (1 + hover * 0.12) * 19.6
              : p.r * (1 + hover * 0.18) * 1.05
            const pad = 1
            minX = Math.min(minX, p.x - rad - pad)
            minY = Math.min(minY, p.y - rad - pad)
            maxX = Math.max(maxX, p.x + rad + pad)
            maxY = Math.max(maxY, p.y + rad + pad)
          }
        }

        if (drawStarLayer) {
          for (const s of starsDraw) {
            const halo = s.r * 11
            const pad = 2
            minX = Math.min(minX, s.x - halo - pad)
            minY = Math.min(minY, s.y - halo - pad)
            maxX = Math.max(maxX, s.x + halo + pad)
            maxY = Math.max(maxY, s.y + halo + pad)
          }
        }

        if (!Number.isFinite(minX)) {
          canvas.style.display = 'none'
          canvas.style.opacity = '0'
          canvas.style.visibility = 'hidden'
          continue
        }

        const bw = Math.max(1, Math.ceil(maxX - minX))
        const bh = Math.max(1, Math.ceil(maxY - minY))

        canvas.width = Math.floor(bw * dpr)
        canvas.height = Math.floor(bh * dpr)
        canvas.style.left = `${minX}px`
        canvas.style.top = `${minY}px`
        canvas.style.width = `${bw}px`
        canvas.style.height = `${bh}px`

        canvas.style.display = 'block'
        canvas.style.visibility = 'visible'
        canvas.style.opacity = String(globalCanvasFade)

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = 'source-over'

        if (drawSmokeLayer) {
          for (const p of parts) {
            const px = p.x - minX
            const py = p.y - minY
            const amp = p.smoke ? 0.96 : 0.21
            const baseA =
              twinkle * hb * amp * (0.52 + Math.sin(now * 0.004 + p.seed * 3.2) * 0.16)
            const charcoalMul =
              letterPhase === 'smoke_gather' ||
              letterPhase === 'smoke_hold' ||
              letterPhase === 'smoke_rise'
                ? smokeBoost * (p.smoke ? 1.1 : 0.62)
                : 1
            const a = Math.min(1, Math.max(0, baseA)) * globalCanvasFade * charcoalMul
            if (a < alphaFloor) continue

            const [r, g, b] = p.rgb

            if (p.smoke) {
              ctx.globalCompositeOperation =
                smokePalette === 'charcoal' ? 'source-over' : 'lighter'
              const sm = 1.42
              const rad = p.r * (1 + hover * 0.11)
              const vx = p.vx * 30 + Math.sin(now * 0.00045 + p.seed * 2.2) * 0.014
              const vy = p.vy * 30 - 0.072
              const trailAng = Math.atan2(vy, vx + 1e-5)
              const curl =
                Math.sin(now * 0.00058 + p.seed * 3.4) * 0.52 +
                Math.cos(now * 0.00036 + p.seed) * 0.33

              drawSmokeParticleLayers(
                ctx,
                px,
                py,
                rad,
                a,
                trailAng,
                curl,
                now,
                p,
                sm,
                [r, g, b],
                smokeBoost,
                smokePalette,
              )
            } else if (p.ember) {
              ctx.globalCompositeOperation = 'source-over'
              const rad = p.r * (1 + hover * 0.12)
              ctx.fillStyle = `rgba(255,238,220,${a * 0.014})`
              ctx.beginPath()
              ctx.arc(px, py, rad * 0.72, 0, Math.PI * 2)
              ctx.fill()
              ctx.fillStyle = `rgba(255,244,228,${a * 0.055})`
              ctx.beginPath()
              ctx.arc(px, py, rad * 0.22, 0, Math.PI * 2)
              ctx.fill()
            } else {
              ctx.globalCompositeOperation = 'source-over'
              const rad = p.r * (1 + hover * 0.16)
              ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.032})`
              ctx.beginPath()
              ctx.arc(px, py, rad * 0.88, 0, Math.PI * 2)
              ctx.fill()

              ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.078})`
              ctx.beginPath()
              ctx.arc(px, py, rad * 0.42, 0, Math.PI * 2)
              ctx.fill()

              ctx.fillStyle = `rgba(250,244,236,${a * 0.18})`
              ctx.beginPath()
              ctx.arc(px, py, rad * 0.14, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }

        if (drawStarLayer) {
          const anchorsAura = glyphAnchorsRef.current[i] ?? []
          let acx = 0
          let acy = 0
          if (anchorsAura.length > 0) {
            for (const an of anchorsAura) {
              acx += an.hx
              acy += an.hy
            }
            acx /= anchorsAura.length
            acy /= anchorsAura.length
          }

          if (t >= gatherEnd && t <= polishEnd && anchorsAura.length > 0) {
            const auraI =
              smoothstep01((t - gatherEnd) / Math.max(1e-6, formEndGlobal - gatherEnd)) * 0.9 + 0.08
            drawFormationSmokeAura(
              ctx,
              acx - minX,
              acy - minY,
              wrap.clientWidth,
              auraI,
              globalCanvasFade,
            )
          }

          const starAlphaMul =
            t < starfallEnd ? 0.92 : t < gatherEnd ? 1 : t < formEndGlobal ? 1.05 : t < polishEnd ? 1 : 0.88

          for (const s of starsDraw) {
            const px = s.x - minX
            const py = s.y - minY
            const a =
              Math.min(1, Math.max(0, twinkle * hb * 0.82)) * globalCanvasFade * starAlphaMul
            if (a < 0.008) continue
            drawStarParticle(ctx, px, py, s, a, now, hover)
          }
        }
      }
    }

    lastNowRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [letterCount, dissolveRankByLetter, starFormRankByLetter, stardustLoopActive])

  const onEnter = () => {
    if (!reducedMotionRef.current) hoverBloomRef.current = 1
  }

  return (
    <div
      ref={wrapRef}
      id="brand-title-root"
      className="studio-mock-logo-dev studio-mock-logo-dev--hero brand-title-stardust"
      data-stardust-phase="idle"
      lang="ne"
      aria-label={BRAND_TITLE_TEXT}
      onMouseEnter={onEnter}
    >
      <span ref={trackRef} className="brand-title-stardust__track">
        {wordRows.map((row, ri) => (
          <span key={row.wordIndex} className="brand-title-stardust__word">
            {row.letters.map((L) => (
              <span
                key={L.flatIndex}
                ref={(el) => {
                  letterWrapRef.current[L.flatIndex] = el
                }}
                className="brand-title-stardust__letter"
              >
                <canvas
                  ref={(el) => {
                    letterCanvasRef.current[L.flatIndex] = el
                  }}
                  className="brand-title-stardust__letter-canvas"
                  aria-hidden
                  tabIndex={-1}
                />
                <span
                  ref={(el) => {
                    letterFaceRef.current[L.flatIndex] = el
                  }}
                  className="brand-title-stardust__letter-face"
                >
                  {L.grapheme}
                </span>
              </span>
            ))}
            {ri < wordRows.length - 1 ? (
              <span className="brand-title-stardust__space"> </span>
            ) : null}
          </span>
        ))}
      </span>
    </div>
  )
}
