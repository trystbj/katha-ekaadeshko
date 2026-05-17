/** Nepali app title — single source for canvas sampling + DOM */
export const BRAND_TITLE_TEXT = 'कथा एकादेशको'

/** Delay heavy title canvas loop so the studio shell stays interactive on first paint. */
export const BRAND_TITLE_STARDUST_DEFER_MS = 5_000

/**
 * idle → dissolve → drift_tail → smoke_hold → smoke_rise → ghost → sandfall → gather → form → polish → settle
 */
export const BRAND_TITLE_STARDUST_IDLE_MS = 3_600

/** Letters morph into dense dark smoke (per-letter stagger inside window) */
export const BRAND_TITLE_STARDUST_DISSOLVE_MS = 5_000

/** Dense charcoal builds after global dissolve window ends */
export const BRAND_TITLE_STARDUST_SMOKE_TRANSITION_MS = 1_100

/** Dense cloud holds ~1s */
export const BRAND_TITLE_STARDUST_SMOKE_HOLD_MS = 1_050

/** Cloud lifts upward and feathers out */
export const BRAND_TITLE_STARDUST_SMOKE_RISE_MS = 2_650

/** Ghost silhouette memory imprint */
export const BRAND_TITLE_STARDUST_GHOST_MS = 700

/** Celestial sandfall */
export const BRAND_TITLE_STARDUST_STARFALL_MS = 2_850

export const BRAND_TITLE_STARDUST_STAR_GATHER_MS = 2_650

export const BRAND_TITLE_STARDUST_STAR_FORM_MS = 4_400

export const BRAND_TITLE_STARDUST_STAR_POLISH_MS = 1_300

export const BRAND_TITLE_STARDUST_SETTLE_MS = 900

/** One full dissolve → reform timeline (ms); after this we hold idle until `LOOP_MS` wraps */
export const BRAND_TITLE_STARDUST_SEQUENCE_MS =
  BRAND_TITLE_STARDUST_IDLE_MS +
  BRAND_TITLE_STARDUST_DISSOLVE_MS +
  BRAND_TITLE_STARDUST_SMOKE_TRANSITION_MS +
  BRAND_TITLE_STARDUST_SMOKE_HOLD_MS +
  BRAND_TITLE_STARDUST_SMOKE_RISE_MS +
  BRAND_TITLE_STARDUST_GHOST_MS +
  BRAND_TITLE_STARDUST_STARFALL_MS +
  BRAND_TITLE_STARDUST_STAR_GATHER_MS +
  BRAND_TITLE_STARDUST_STAR_FORM_MS +
  BRAND_TITLE_STARDUST_STAR_POLISH_MS +
  BRAND_TITLE_STARDUST_SETTLE_MS

/** Wall-clock repeat: full cinematic plays, then idle pad until the next 2‑minute boundary */
export const BRAND_TITLE_STARDUST_LOOP_MS = 120_000

export const BRAND_TITLE_STARDUST_MAX_PARTICLES = 34
export const BRAND_TITLE_STARDUST_MAX_SMOKE = 10_500
export const BRAND_TITLE_STARDUST_SMOKE_PER_LETTER_CAP = 520

export const BRAND_TITLE_STARDUST_STAR_ANCHORS_PER_LETTER_CAP = 156

export const BRAND_TITLE_STARDUST_SAMPLE_STEP_CSSPX = 2

export const BRAND_TITLE_STARDUST_MAX_FX_RADIUS_CSSPX = 28

export const BRAND_TITLE_STARDUST_STAGGER_MIN_MS = 52
export const BRAND_TITLE_STARDUST_STAGGER_MAX_MS = 148
