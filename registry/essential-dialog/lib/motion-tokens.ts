import type { Transition } from "motion/react"

/* ---------------------------------------------------------------------------
 * Motion tokens — one language everywhere.
 *
 * Chosen by PURPOSE rather than by taste, so components feel related without
 * moving identically. The curve should match what the object is doing:
 *
 *   entrances and exits ....... EASE_OUT      respond immediately, settle quietly
 *   already on screen ......... EASE_IN_OUT   accelerate and decelerate
 *   progress .................. linear        (nothing here needs it)
 *   pressable surfaces ........ SPRING_PRESS  fast, weighted feedback
 *   shared spatial surfaces ... SPRING_LAYOUT continuous movement
 * ------------------------------------------------------------------------- */

/** Entrances and exits. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Objects already on screen, moving from one place to another. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

/**
 * Shared surfaces and indicators that need continuous spatial movement — the
 * morph itself.
 *
 * TODO: seeded from the values tuned on the debug bench, NOT from the design
 * system's own definition, which has not landed here yet. Swapping it is a
 * one-line change and costs nothing measurable: renderer tracing across
 * `bounce` 0 → 0.6 moved the total 191ms → 199ms, and across `visualDuration`
 * 0.2 → 0.7 moved it 198ms → 209ms, with identical style and paint counts. The
 * shape of this spring is a design decision, not a performance one.
 */
export const SPRING_LAYOUT = {
  type: "spring",
  visualDuration: 0.35,
  bounce: 0.3,
} as const satisfies Transition

/**
 * Fast, weighted feedback for buttons and other pressable surfaces — and for
 * the drag settling back when a dismiss is not carried through.
 *
 * TODO: same as SPRING_LAYOUT — awaiting the system's own definition.
 */
export const SPRING_PRESS = {
  type: "spring",
  visualDuration: 0.4,
  bounce: 0.18,
} as const satisfies Transition

/**
 * Starting points, not targets to hit mechanically. Under 300ms is the default
 * for interface motion; a modal is allowed more because it has space to
 * explain.
 */
export const DURATION = {
  /** Backdrop arriving. Quick — it is context, not the subject. */
  backdropIn: 0.12,
  /** Backdrop leaving, delayed so the surface is on its way first. */
  backdropOut: 0.25,
  /** The trigger's colour handing over to the surface's. */
  colorHandover: 0.13,
  /** Opacity-only entrance under reduced motion. */
  reducedIn: 0.2,
  /** Opacity-only exit under reduced motion. */
  reducedOut: 0.15,
} as const
