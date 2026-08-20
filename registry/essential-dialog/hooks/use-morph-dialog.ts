"use client"

import * as React from "react"
import {
  animate,
  frame,
  useAnimationFrame,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from "motion/react"

import {
  DURATION,
  EASE_IN_OUT,
  EASE_OUT,
  SPRING_LAYOUT,
  SPRING_PRESS,
} from "@/registry/essential-dialog/lib/motion-tokens"

/* ---------------------------------------------------------------------------
 * SPIKE — the essential-dialog morph, re-driven by Motion instead of GSAP Flip.
 *
 * Not a line-by-line port, because the two engines animate different things.
 * GSAP Flip animates a real width and height, so the GSAP hook has to pin the
 * surface out of flow, freeze the content at a fixed size so it cannot reflow
 * mid-morph, and hand the box back to CSS on arrival. Motion's projection
 * engine animates a TRANSFORM: the surface keeps its resting layout box the
 * whole time and is merely scaled down onto the trigger.
 *
 * GONE, because they only existed to survive a changing layout box:
 *   pin() · freezeChild() · thawChild() · the settle-to-CSS handover
 *
 * KEPT, because they are properties of the EFFECT rather than of the engine:
 *   · the content is a measured miniature — scale and opacity derived from the
 *     live box every frame, never from a clock, so it plays identically in
 *     reverse and an interrupted morph is already correct
 *   · a round trigger grows as a circle, radius derived from the box
 *   · the trigger is taken away for the length of the morph, transition first
 *   · the close is shorter than the open, and evenly eased rather than mirrored
 *   · touch-action switches when the content overflows
 *
 * NEW, and none of it optional:
 *   · an invisible placeholder over the trigger — a shared layout transition
 *     needs a real node on both sides, and cannot be handed a bare DOMRect
 *   · a second scale axis on the content, to undo the projection's non-uniform
 *     scale before shrinking it to a miniature
 *   · every measurement read in postRender, after Motion has written
 *   · the drag's transform has to stay in the form projection expects at all
 *     times — bakeDrag() has no late equivalent here; see onDrag()
 * ------------------------------------------------------------------------- */

/* anything a person can type in, press or select owns the gesture */
const INTERACTIVE =
  "input, textarea, select, button, a, label, summary, video, audio, [contenteditable], [role='button'], [role='slider'], [role='textbox'], [data-no-drag]"

export type MorphDialogOptions = {
  /** Seconds. Spring `visualDuration` for the trigger → dialog morph. */
  openDuration?: number
  /** Seconds. Shorter than `openDuration` on purpose — see the GSAP hook. */
  closeDuration?: number
  /**
   * 0–1. Motion's spring overshoot. 0 is the closest match to the GSAP curve;
   * anything above ~0.2 turns the arrival into a bounce, which reads as playful
   * rather than physical at this size.
   */
  bounce?: number
  /** Radial px the surface must travel before release dismisses it. */
  dismissDistance?: number
  /** px per ms, so a flick counts even when it barely moves. */
  dismissSpeed?: number
  /** scale = 1 - distance / dragFalloff, floored at .3 */
  dragFalloff?: number
  /** Drag-to-dismiss. Always off under `prefers-reduced-motion`. */
  draggable?: boolean
  /**
   * Click the backdrop — anywhere outside the surface — to dismiss. Escape is
   * unaffected either way; turn this off for a dialog whose answer you actually
   * need, and leave it on for one a person can walk away from.
   */
  dismissOnOutsideClick?: boolean
  /** Take the trigger away for as long as the dialog is up. */
  hideTrigger?: boolean
  /** `true`, a px breakpoint, or any media query string. */
  fullscreen?: boolean | number | string
  /** Outline every layer and log what the morph measured. */
  debug?: boolean
  onOpenChange?: (open: boolean) => void
}

const DEFAULTS = {
  /* The morph is a shared spatial surface, so its shape comes from the token
     rather than from numbers written here. */
  openDuration: SPRING_LAYOUT.visualDuration,
  closeDuration: 0.45,
  bounce: SPRING_LAYOUT.bounce,
  dismissDistance: 100,
  dismissSpeed: 0.5,
  dragFalloff: 415,
  draggable: true,
  dismissOnOutsideClick: true,
  hideTrigger: true,
  fullscreen: false as boolean | number | string,
  debug: false,
}

function resolveOptions(o: MorphDialogOptions) {
  return {
    openDuration: o.openDuration ?? DEFAULTS.openDuration,
    closeDuration: o.closeDuration ?? DEFAULTS.closeDuration,
    bounce: o.bounce ?? DEFAULTS.bounce,
    dismissDistance: o.dismissDistance ?? DEFAULTS.dismissDistance,
    dismissSpeed: o.dismissSpeed ?? DEFAULTS.dismissSpeed,
    dragFalloff: o.dragFalloff ?? DEFAULTS.dragFalloff,
    draggable: o.draggable ?? DEFAULTS.draggable,
    dismissOnOutsideClick:
      o.dismissOnOutsideClick ?? DEFAULTS.dismissOnOutsideClick,
    hideTrigger: o.hideTrigger ?? DEFAULTS.hideTrigger,
    fullscreen: o.fullscreen ?? DEFAULTS.fullscreen,
    debug: o.debug ?? DEFAULTS.debug,
    onOpenChange: o.onOpenChange,
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * Computed border-radius in px, plus whether it is "fully round" — at or past
 * half the shorter side. Unchanged from the GSAP hook: this is a fact about the
 * trigger, not about the animation engine.
 */
function radiusOf(cs: CSSStyleDeclaration, width: number, height: number) {
  const short = Math.min(width, height)
  const half = short / 2
  const raw = cs.borderTopLeftRadius
  const value = parseFloat(raw)
  if (!Number.isFinite(value)) return { px: half, round: true }
  const px = raw.endsWith("%") ? (short * value) / 100 : value
  return { px: Math.min(px, half), round: px >= half - 0.5 }
}

const ALWAYS = "always"
function fullscreenQuery(value: boolean | number | string) {
  if (value === false || value === "") return null
  if (value === true) return ALWAYS
  if (typeof value === "number") return `(max-width: ${value - 0.02}px)`
  return value
}

type Origin = {
  /** The trigger's own background, so the box starts the trigger's colour. */
  background: string
  /**
   * The colour the surface rests at, resolved to a concrete value. Motion cannot
   * interpolate INTO a `var()` — but it does not have to: the computed value of
   * a custom property already has its own var() substituted, so reading
   * --essential-dialog-surface off the <dialog> yields a real colour that a
   * tween can land on. That is what lets the surface animate its own background
   * instead of needing a coloured overlay faded off the top of it.
   */
  restingBackground: string
  /** Whether the trigger is a circle or a pill — logged, and see the note in
      `open()` about what Motion can and cannot do with that. */
  round: boolean
  /**
   * The radius the dialog rests at, in px. Read at click time off the <dialog>
   * rather than off the surface: the surface does not exist yet, and once it
   * does its radius is an inline value Motion is animating.
   */
  restingRadius: number
}

export function useMorphDialog(options: MorphDialogOptions = {}) {
  const optsRef = React.useRef(resolveOptions(options))
  React.useEffect(() => {
    optsRef.current = resolveOptions(options)
  })

  const [isOpen, setIsOpen] = React.useState(false)
  /* Read at the moment of the click, then handed to the surface as `initial`.
     State rather than a ref: the surface mounts in the very next render and has
     to see these values on its first frame. */
  const [origin, setOrigin] = React.useState<Origin | null>(null)

  const windowRef = React.useRef<HTMLDivElement | null>(null)
  /* The invisible box over the trigger. The frame loop has to reach it: during
     the close it is projected onto exactly the same rendered box as the surface
     and crossfaded in on top of it, so anything that does not match — its
     radius, its colour — is a visible seam. */
  const originRef = React.useRef<HTMLDivElement | null>(null)
  const dialogRef = React.useRef<HTMLDialogElement | null>(null)
  /* Touch has to choose between dragging the dialog and scrolling its content,
     and it chooses through touch-action — Chrome cancels the pointer the moment
     it decides the gesture belongs to a scroller. So the window is touch-action:
     none while its content fits (drag from anywhere), and pan-y once it
     overflows (scroll the content, flick sideways to dismiss). Unchanged from
     the GSAP build: this is a browser behaviour, not an engine one. */
  const markScrollable = React.useCallback(() => {
    const win = windowRef.current
    if (!win) return
    win.dataset.scrollable = String(win.scrollHeight - win.clientHeight > 1)
  }, [])
  const surfaceRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const triggerHostRef = React.useRef<HTMLElement | null>(null)

  const reduced = useReducedMotion() ?? false

  /* --------------------------------------------------------- fullscreen -- */

  const query = fullscreenQuery(options.fullscreen ?? DEFAULTS.fullscreen)
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (!query || query === ALWAYS) return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query]
  )
  const read = React.useCallback(() => {
    if (!query) return false
    if (query === ALWAYS) return true
    return window.matchMedia(query).matches
  }, [query])
  const fullscreen = React.useSyncExternalStore(
    subscribe,
    read,
    () => query === ALWAYS
  )

  /* ------------------------------------------------------ shared layout -- */

  /* One id per instance, so two dialogs on a page can never claim each other's
     origin. Motion pairs the placeholder over the trigger with the surface in
     the dialog by this string alone. */
  const layoutId =
    "essential-dialog-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")

  /* ------------------------------------------------------------- values -- */

  /* The three things derived from the live box each frame. Motion values, not
     state: they are written sixty times a second and must never re-render. */
  /* TWO axes, not one. Motion's own answer to scale distortion is `layout` on
     the child, which counter-scales it — but about the projection's own origin,
     so the content ends up pinned to a corner of the box rather than centred in
     it, which is not what a miniature of a dialog should do. Deriving the
     counter-scale here instead costs one extra motion value and is exact:
     scaleX = k/Px and scaleY = k/Py, about the child's own centre, composes with
     the parent's (Px, Py) to a uniform k about the centre of the on-screen box. */
  /* ONE value carrying a composed `transform` string, not two numeric ones.
     Motion's individual transform props (`scaleX`, `x`, …) are applied through
     CSS variables so that they can be composed independently, and a CSS
     variable is a style resolution the compositor cannot skip — Motion's own
     performance guidance says to write the full string when a value is on a hot
     path. This one is written on every frame of every morph, which is as hot as
     it gets. */
  const contentTransform = useMotionValue("scale(1,1)")
  const contentOpacity = useMotionValue(0)
  /* Transparent except during the close. See close() for why. */
  const originBackground = useMotionValue("rgba(0,0,0,0)")
  /* The surface's own colour, as a value this hook owns rather than a target
     Motion owns. That distinction is the whole reason it is here: a colour in
     the `animate` prop is Motion's, and Motion keeps re-applying the value it
     landed on, so the surface can never be handed back to CSS and a resting
     dialog stops following a theme change. Set to "" on arrival, the inline
     declaration disappears and the class — a live `var()` — takes over again. */
  const surfaceBackground = useMotionValue("")

  /* The drag lives on the surface itself — see the note in startDrag. */
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  /* A plain value written from the gesture, NOT a useTransform of x and y —
     which is what it wants to be, and was, until the close after a drag turned
     out to need x and y rewritten without the scale moving with them. See the
     transform-origin note in close(). */
  const dragScale = useMotionValue(1)
  /* Where on the surface the drag was grabbed, and half its layout box —
     everything the per-frame compensation below needs, captured once so the
     gesture never has to touch the layout. */
  const grabRef = React.useRef({ x: 0, y: 0, halfW: 0, halfH: 0 })

  /* ------------------------------------------------------------ measure -- */

  /* The surface's resting layout box. ResizeObserver reports the BORDER box,
     which transforms do not touch — so this stays the resting size even while
     the projection has the element scaled down onto a 47px button. That is the
     whole reason this file has no freezeChild(): the DOM box never changes, so
     the content never reflows and never has to be frozen. */
  const restingRef = React.useRef<{ w: number; h: number } | null>(null)
  /* Whether the origin is round, and the radius the dialog rests at. */
  const shapeRef = React.useRef<{
    round: boolean
    /** The trigger's own radius in px, clamped to half its shorter side. */
    origin: number
    /** The radius the dialog rests at, in px. */
    target: number
  } | null>(null)
  /* The largest the box gets during THIS morph, as a fraction of the resting
     box: 1 opening, the drag's scale when closing from a dragged-down dialog. */
  const kRefRef = React.useRef(1)
  /* Only measure while something is actually moving. */
  const morphingRef = React.useRef(false)
  /* The trigger's box, kept from the click. The surface's very first frame
     cannot be measured — at the moment its ref fires, Motion has not applied the
     projection transform yet, so the element still reports its resting box and
     every value derived from it comes out as "already arrived". Seeding that one
     frame from the box the morph is starting FROM is the difference between a
     dialog that grows out of a button and a dialog that flashes at full size
     inside one for a frame and then grows. */
  const originBoxRef = React.useRef<{ w: number; h: number } | null>(null)
  const closingRef = React.useRef(false)
  /* Whether a projection transform has actually been seen on the element yet.
     `transform: none` is ambiguous — Motion writes it both BEFORE the morph
     starts and again the moment it finishes — so "no transform" can only be
     read as arrival once there has been something to arrive from. Without this
     the very first frame after mount concludes the morph is already over and
     the dialog snaps open with no animation at all. */
  const sawTransformRef = React.useRef(false)
  /* The last values actually written to the DOM. A spring spends most of its
     life settling by fractions of a pixel, and every write — even to the same
     visible result — is a style recalculation and a repaint. Rounding to the
     smallest difference a screen can show and skipping the rest is free. */
  const wroteRef = React.useRef({ t: "", o: -1, r: "" })

  const lastLogRef = React.useRef(0)
  const log = React.useCallback(
    (label: string, data?: unknown | (() => unknown), throttleMs = 0) => {
      if (!optsRef.current.debug) return
      if (throttleMs) {
        const now = performance.now()
        if (now - lastLogRef.current < throttleMs) return
        lastLogRef.current = now
      }
      const payload = typeof data === "function" ? (data as () => unknown)() : data
      console.log(
        `%c[essential-dialog]%c ${label}`,
        "color:#09ee61;font-weight:600",
        "color:inherit",
        payload ?? ""
      )
    },
    []
  )

  /**
   * The per-frame derivation, unchanged in spirit from the GSAP hook: scale,
   * opacity and radius are read off the box, never off the clock, so they play
   * identically in reverse and a morph interrupted halfway is already correct.
   *
   * What IS different is where the numbers come from. Under GSAP the surface's
   * on-screen size and its layout size were the same thing. Here the surface's
   * layout size is always the resting size and the projection supplies a scale,
   * so `Px`/`Py` below ARE Motion's projection scale, measured back out of the
   * rendered box rather than read from a private API.
   */
  const fitFrame = React.useCallback((override?: { w: number; h: number }) => {
    const surface = surfaceRef.current
    const resting = restingRef.current
    if (!surface || !resting || !resting.w || !resting.h) return

    /* READ THE MATRIX, DO NOT MEASURE THE BOX. This runs in postRender, one step
       after Motion has written every transform on the page — so a
       getBoundingClientRect here forces a synchronous layout on every frame of
       every morph, which is the single thing Motion's performance guidance is
       most insistent about avoiding. The surface has no transformed ancestor
       (the centring div above it is deliberately left untransformed), so its own
       inline matrix IS the projection scale, drag included, and reading an
       inline style string costs nothing at all. Falling back to the measurement
       only if the transform is ever something DOMMatrix cannot parse. */
    let sx = 1
    let sy = 1
    /* Whether a projection transform was actually on the element this frame. */
    let live = false
    if (!override) {
      const t = surface.style.transform
      if (t && t !== "none") {
        try {
          const m = new DOMMatrixReadOnly(t)
          sx = m.a
          sy = m.d
        } catch {
          /* Only if Motion ever writes something DOMMatrix cannot parse. Costs
             a forced layout, but on a frame that would otherwise be wrong. */
          const r = surface.getBoundingClientRect()
          sx = r.width / resting.w
          sy = r.height / resting.h
        }
        sawTransformRef.current = true
        live = true
      }
    }
    const s = override
      ? { width: override.w, height: override.h }
      : { width: resting.w * sx, height: resting.h * sy }
    if (!s.width || !s.height) return

    const px = s.width / resting.w
    const py = s.height / resting.h
    /* One uniform factor, so the miniature keeps the dialog's proportions at
       every size. Motion's own counter-scale on the window above has already
       undone the non-uniform part; this is what stops a wide trigger showing a
       stretched dialog rather than a small one. */
    const k = Math.min(px, py)
    const coverage = k / Math.max(px, py)

    const fit = clamp01((coverage - 0.8) / 0.2)
    const kn = k / (kRefRef.current || 1)
    const room = clamp01((kn - 0.45) / 0.35)

    /* Quantised, then compared: below a thousandth of a scale factor and a
       two-hundredth of an alpha there is nothing on screen to see, and the
       write costs a style pass either way. */
    const nextTransform = `scale(${(k / px).toFixed(4)},${(k / py).toFixed(4)})`
    if (nextTransform !== wroteRef.current.t) {
      wroteRef.current.t = nextTransform
      contentTransform.set(nextTransform)
    }
    const nextOpacity = Math.round(fit * room * 200) / 200
    if (nextOpacity !== wroteRef.current.o) {
      wroteRef.current.o = nextOpacity
      contentOpacity.set(nextOpacity)
    }

    /* RADIUS, written straight to the element rather than through a motion
       value or the `style` prop — and that is the point of the exercise.
       Hand Motion a borderRadius and it does something reasonable for free: it
       tweens the trigger's radius to the dialog's and corrects both for the
       projection scale, so the corner stays a corner. But a tween between two
       numbers is exactly what a round trigger cannot survive — 24px is a circle
       on a 48px button and a rounding error on a 400px dialog, so the box
       squares off within a few frames of leaving the trigger. Measured here
       instead, a circle grows as a circle and a pill as a pill, and the dialog's
       own radius only takes over once there is enough box to read as a corner.
       Taking the property back means doing Motion's scale correction by hand
       too: `w / h` in a border-radius is the horizontal and vertical radii, and
       dividing each by its own projection axis is what lands `want` px on
       screen. Nothing else writes to borderRadius, so there is no fight. */
    const shape = shapeRef.current
    if (shape) {
      /* How far along the morph is, 0 at the trigger and 1 at the box's largest
         — normalised against the trigger's own scale rather than against zero,
         because `k` never reaches 0: at the trigger it is already whatever
         fraction of the dialog the button happens to be. Threshold it against a
         raw k instead and the handover happens at a different point for a small
         button than for a big one. */
      const ob = originBoxRef.current
      const kMin = ob ? Math.min(ob.w / resting.w, ob.h / resting.h) : 0
      const span = Math.max((kRefRef.current || 1) - kMin, 1e-6)
      const p = clamp01((k - kMin) / span)

      const half = Math.min(s.width, s.height) / 2
      let want: number
      if (shape.round) {
        /* A circle grows as a circle, a pill as a pill: as round as the box's
           own shorter side allows, relaxing into the dialog's radius only once
           there is enough box for it to read as a corner. */
        const t = clamp01((p - 0.05) / 0.5)
        const eased = t * t * (3 - 2 * t) // smoothstep, so both ends are calm
        want = Math.min(half, half + (shape.target - half) * eased)
      } else {
        /* Two absolute radii, handed over early — a straight tween is exactly
           right when neither end is round. */
        const t = clamp01(p / 0.18)
        want = Math.min(half, shape.origin + (shape.target - shape.origin) * t)
      }
      const nextRadius = `${(want / px).toFixed(2)}px / ${(want / py).toFixed(2)}px`
      if (nextRadius !== wroteRef.current.r) {
        wroteRef.current.r = nextRadius
        surface.style.borderRadius = nextRadius
      }

      /* And the same rendered radius on the placeholder, corrected against ITS
         own unprojected box rather than the surface's. During the close the two
         occupy the same rendered box and crossfade into each other; a round
         trigger whose placeholder keeps a static radius is a stadium at 400px
         wide, fading in over a 26px-cornered dialog. Different raw numbers,
         identical corners on screen. */
      const ph = closingRef.current ? originRef.current : null
      if (ph && ph.offsetWidth && ph.offsetHeight) {
        const phx = s.width / ph.offsetWidth
        const phy = s.height / ph.offsetHeight
        ph.style.borderRadius = `${(want / phx).toFixed(2)}px / ${(want / phy).toFixed(2)}px`
      }
    }

    /* SETTLED — decided by the box, not by Motion's onLayoutAnimationComplete.
       That callback fires once on mount, before the projection transform has
       been applied and therefore before anything has moved, and acting on it
       paints one frame of a full-size, fully opaque dialog inside a 48px button
       before the morph starts. Asking the box whether it has arrived cannot be
       fooled that way, and it is how every other value here is already
       decided. */
    /* ARRIVED — when Motion takes the transform off, not when the box first
       reaches its resting size. Those are the same moment only for a spring
       that does not overshoot. Give `bounce` any value at all and the box sails
       PAST its resting size on the way in, so a `px > 0.999` test fires at the
       top of the overshoot: the loop stops halfway through the animation, the
       layer hint is dropped while the box is still moving, and the radius is
       handed back to CSS a few frames early. The tolerance is a backstop in case
       Motion ever leaves an identity transform in place rather than clearing
       it. */
    const arrived =
      !live || (Math.abs(px - 1) < 5e-4 && Math.abs(py - 1) < 5e-4)
    if (sawTransformRef.current && !closingRef.current && arrived) {
      morphingRef.current = false
      contentTransform.set("scale(1,1)")
      contentOpacity.set(1)
      /* The layer hints go away with the animation that needed them. */
      surface.style.willChange = ""

      /* Handed back to CSS, so a resting dialog re-reads its variables if the
         theme or the viewport changes under it. */
      surface.style.borderRadius = ""
      /* Emptied, not set: Motion writes "" straight through, the inline
         declaration goes away, and the class — a live var() — is back in charge,
         so a resting dialog still follows a theme change. */
      surfaceBackground.set("")
      log("settled")
    }

    log(
      "fit",
      () => ({
        surface: `${Math.round(s.width)}×${Math.round(s.height)}`,
        resting: `${Math.round(resting.w)}×${Math.round(resting.h)}`,
        projection: `${Math.round(px * 1000) / 1000} × ${Math.round(py * 1000) / 1000}`,
        scale: Math.round(k * 1000) / 1000,
        coverage: Math.round(coverage * 1000) / 1000,
        room: Math.round(room * 100) / 100,
        opacity: Math.round(fit * room * 100) / 100,
        radius: surface.style.borderRadius,
      }),
      120
    )
  }, [contentTransform, contentOpacity, surfaceBackground, log])

  /* The measurement has to happen in postRender, and this is not a detail.
     Motion's loop is setup → read → update → render → postRender, and the
     projection transform is written in `render`. useAnimationFrame runs on
     `update`, one step EARLIER — so a getBoundingClientRect there reads the box
     as it was before this frame's transform, and on the very first frame after
     the surface mounts it reads a box that has never been transformed at all:
     full size, apparently already arrived. Everything downstream then agrees
     that the morph is over before it has begun.

     So the cadence comes from useAnimationFrame and the read is deferred one
     step, to after Motion has written. One-shot rather than keepAlive because
     `cancelFrame` is not re-exported from `motion/react`, and a process that
     re-queues itself only while a morph is in flight needs no cancelling. */
  const measure = React.useCallback(() => fitFrame(), [fitFrame])
  useAnimationFrame(() => {
    if (!morphingRef.current) return
    frame.postRender(measure)
  })

  /* ------------------------------------------------------------- trigger -- */

  const getTrigger = React.useCallback(
    (): HTMLElement | null =>
      triggerRef.current ??
      (triggerHostRef.current?.firstElementChild as HTMLElement | null) ??
      null,
    []
  )

  /* The placeholder is a plain box stretched over the trigger, and for the whole
     of the close it is the only thing on screen — so it has to be the trigger's
     SHAPE too, not just its size. Copied from the computed style rather than
     declared as a prop, because a `calc(infinity * 1px)`, a percentage or four
     different corners all have to survive, and because the value must be there
     at rest as well: with `debug` on, this outline is what tells you what the
     morph is paired against, and a square drawn around a circular button is a
     lie about the origin.

     An effect on every render rather than a dependency list: it is two reads,
     the trigger's radius is a prop of whatever the call site rendered, and the
     one moment it MUST be re-applied is the render that ends the close — which
     is exactly when the per-frame writes below have stopped. */
  React.useEffect(() => {
    const el = getTrigger()
    const ph = originRef.current
    if (el && ph) ph.style.borderRadius = getComputedStyle(el).borderRadius
  })

  const hiddenTriggerRef = React.useRef<{
    el: HTMLElement
    visibility: string
    transitionProperty: string
  } | null>(null)

  const concealTrigger = React.useCallback((el: HTMLElement | null) => {
    if (!el || hiddenTriggerRef.current) return
    hiddenTriggerRef.current = {
      el,
      visibility: el.style.visibility,
      transitionProperty: el.style.transitionProperty,
    }
    /* Same trap as under GSAP, and it has nothing to do with the engine:
       `visibility` is transitionable and holds "visible" for the whole of any
       transition it is caught by, so a trigger with `transition-all` sits there
       uncovered through the first fifth of the morph unless the transition is
       taken away first. */
    el.style.transitionProperty = "none"
    el.style.visibility = "hidden"
  }, [])

  const revealTrigger = React.useCallback(() => {
    const hidden = hiddenTriggerRef.current
    if (!hidden) return
    hiddenTriggerRef.current = null
    hidden.el.style.visibility = hidden.visibility
    hidden.el.getBoundingClientRect() // flush the style change on its own
    hidden.el.style.transitionProperty = hidden.transitionProperty
  }, [])

  /* ---------------------------------------------------------- scroll lock -- */

  const scrollLockRef = React.useRef<{
    overflow: string
    paddingRight: string
  } | null>(null)

  const lockScroll = React.useCallback(() => {
    if (scrollLockRef.current) return
    const body = document.body
    scrollLockRef.current = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    }
    const gutter = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (gutter > 0) {
      const existing = parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${existing + gutter}px`
    }
  }, [])

  const unlockScroll = React.useCallback(() => {
    const saved = scrollLockRef.current
    if (!saved) return
    scrollLockRef.current = null
    document.body.style.overflow = saved.overflow
    document.body.style.paddingRight = saved.paddingRight
  }, [])

  /* ---------------------------------------------------------------- open -- */

  const open = React.useCallback(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    const trigger = getTrigger()

    /* Read the trigger BEFORE anything hides it, and before the dialog opens —
       these are the values the surface's first frame is built from. */
    /* The <dialog> carries the same rounded-(--essential-dialog-radius) class
       purely as an oracle: it is transparent and borderless so a radius on it
       paints nothing, nothing in the component writes to it, and it resolves
       whatever CSS length the consumer put in the variable. */
    const restingRadius = fullscreen
      ? 0 // edge to edge: there is no corner to arrive at
      : radiusOf(
          getComputedStyle(dialog),
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        ).px

    let next: Origin | null = null
    if (trigger) {
      const cs = getComputedStyle(trigger)
      const box = trigger.getBoundingClientRect()
      originBoxRef.current = { w: box.width, h: box.height }
      const r = radiusOf(cs, box.width, box.height)
      const restingBackground =
        getComputedStyle(dialog)
          .getPropertyValue("--essential-dialog-surface")
          .trim() || cs.backgroundColor
      next = { background: cs.backgroundColor, restingBackground, round: r.round, restingRadius }

      /* Set BEFORE the surface mounts — a motion value outlives the element, so
         the box is the trigger's colour on its very first painted frame — then
         handed over in ~130ms, as in the GSAP build. */
      surfaceBackground.set(cs.backgroundColor)
      animate(surfaceBackground, restingBackground, {
        duration: reduced ? 0 : DURATION.colorHandover,
        delay: reduced ? 0 : 0.02,
        ease: EASE_OUT,
      })
      shapeRef.current = { round: r.round, origin: r.px, target: restingRadius }
    } else {
      shapeRef.current = null
      originBoxRef.current = null
    }

    kRefRef.current = 1
    morphingRef.current = true
    closingRef.current = false
    sawTransformRef.current = false
    /* A layer, for the length of the morph only. The surface animates a
       borderRadius and carries a boxShadow — the two paint-heavy properties
       Motion's guidance names as the case for a `will-change` hint. Permanent
       promotion is the anti-pattern: every layer costs GPU memory whether it is
       moving or not, so this is set on open and cleared the moment the box
       arrives or leaves. */
    if (surfaceRef.current) surfaceRef.current.style.willChange = "transform"
    contentOpacity.set(0)
    contentTransform.set("scale(0.2,0.2)")
    wroteRef.current = { t: "", o: -1, r: "" }

    /* showModal first, synchronously: a closed <dialog> is display:none, so the
       surface would mount into a zero-sized box and Motion would measure a
       resting size of nothing. */
    lockScroll()
    dialog.showModal()
    if (optsRef.current.hideTrigger) concealTrigger(trigger)

    setOrigin(next)
    setIsOpen(true)
    optsRef.current.onOpenChange?.(true)
    log("open", {
      trigger: trigger ? `${Math.round(trigger.getBoundingClientRect().width)}×${Math.round(trigger.getBoundingClientRect().height)}` : null,
      origin: next,
      reducedMotion: reduced,
      fullscreen,
      layoutId,
    })
  }, [
    concealTrigger,
    contentOpacity,
    contentTransform,
    surfaceBackground,
    fullscreen,
    getTrigger,
    layoutId,
    lockScroll,
    log,
    reduced,
  ])

  /* --------------------------------------------------------------- close -- */

  const close = React.useCallback(() => {
    const dialog = dialogRef.current
    if (!dialog || !dialog.open) return

    /* Where the drag left it, as a fraction of the resting box, so the content's
       opacity and radius carry on from exactly where the eye last saw them
       instead of stepping when the close takes over. Under GSAP this needed
       bakeDrag() to fold the wrapper's transform into the surface's own box
       first; here the drag is already on the surface and already in projection's
       canonical form (see onDrag), so the rendered rect is simply read. */
    const surface = surfaceRef.current
    const resting = restingRef.current
    if (surface && resting?.w && resting.h) {
      const s = surface.getBoundingClientRect()
      kRefRef.current = Math.min(s.width / resting.w, s.height / resting.h)
    }

    /* THE COLOUR HANDOVER, and it is not where you would expect it.
       `layoutCrossfade={false}` on the surface keeps it opaque while it GROWS,
       which is what the open needs — but on the way out Motion only projects the
       exiting element onto the lead's box if it is crossfading, so the close
       necessarily ends with the surface fading. Painting the placeholder the
       trigger's colour turns that unavoidable crossfade into the handover the
       GSAP build spends a tween on: over the last third of the close the dialog
       surface dissolves into a box the colour of the button, at the button's
       radius, in the button's place. Cleared again on arrival, or it would sit
       on top of the trigger for good. */
    /* THE COLOUR HANDOVER. The placeholder is what you actually see through the
       back half of the close — Motion crossfades it in as the surface fades out,
       and it front-loads that fade, so by a third of the way through the flat
       placeholder IS the dialog. Starting it at the surface's own colour makes
       that swap invisible; animating it to the trigger's over the last 42% is
       then the same handover the GSAP build tweens on the surface itself, on the
       same schedule. Cleared again on arrival, or a trigger-coloured box sits on
       top of the trigger for good. */
    const trigger = getTrigger()
    const surfaceForColour = surfaceRef.current
    if (trigger && surfaceForColour) {
      const o2 = optsRef.current
      const from = getComputedStyle(surfaceForColour).backgroundColor
      const to = getComputedStyle(trigger).backgroundColor
      const handover = {
        duration: reduced ? 0 : o2.closeDuration * 0.42,
        delay: reduced ? 0 : o2.closeDuration * 0.58,
        ease: EASE_OUT,
      }
      /* Both ends of the crossfade run the same handover: the surface fading
         out, and the placeholder fading in underneath it. */
      surfaceBackground.set(from)
      animate(surfaceBackground, to, handover)
      originBackground.set(from)
      animate(originBackground, to, handover)
    }

    morphingRef.current = true
    closingRef.current = true
    if (surfaceRef.current) surfaceRef.current.style.willChange = "transform"
    setIsOpen(false)
    optsRef.current.onOpenChange?.(false)
    log("close", { from: kRefRef.current })
  }, [getTrigger, log, originBackground, surfaceBackground, reduced])

  /* Runs when the surface has finished animating out — AnimatePresence holds it
     until then. Everything the dialog touched on the page goes back. */
  const onExitComplete = React.useCallback(() => {
    morphingRef.current = false
    closingRef.current = false
    originBackground.set("rgba(0,0,0,0)")

    dragX.set(0)
    dragY.set(0)
    dragScale.set(1)
    grabRef.current = { x: 0, y: 0, halfW: 0, halfH: 0 }

    kRefRef.current = 1
    dialogRef.current?.close()
    revealTrigger() // before the focus call: a hidden button cannot take focus
    unlockScroll()
    document.body.style.userSelect = ""
    document.body.style.webkitUserSelect = ""
    getTrigger()?.focus({ preventScroll: true })
    setOrigin(null)
    log("closed")
  }, [
    dragScale,
    dragX,
    dragY,
    getTrigger,
    log,
    originBackground,
    revealTrigger,
    unlockScroll,
  ])

  /* Nothing left running, and nothing left hidden, if this unmounts mid-morph. */
  React.useEffect(
    () => () => {
      revealTrigger()
      const saved = scrollLockRef.current
      if (saved) {
        document.body.style.overflow = saved.overflow
        document.body.style.paddingRight = saved.paddingRight
      }
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
    },
    [revealTrigger]
  )

  /* ---------------------------------------------------------------- drag -- */

  /* ------------------------------------------------------- outside click -- */

  /* Anything that is not inside the surface. Asked of the SURFACE rather than
     matched against a list of known layers: the centring div is `absolute
     inset-0`, so it covers the whole viewport and is what a click outside the
     dialog actually lands on — which is why comparing the event target with the
     <dialog> alone never fires. Containment is also the answer that stays right
     when the layer stack changes. */
  const isOutside = React.useCallback((target: EventTarget | null) => {
    const surface = surfaceRef.current
    return !!surface && target instanceof Node && !surface.contains(target)
  }, [])

  /* BOTH ends of the gesture, taken from the pointer events rather than from
     the click. A `click` fires on the nearest common ancestor of where the
     pointer went down and came up, so a press inside the dialog released over
     the backdrop — and a press on the backdrop released over the dialog — both
     report a target that is "outside". Judged on the click alone, selecting a
     line of text and overshooting the edge dismisses the dialog, which is the
     one thing an outside-click dismissal must never do. The pointer targets are
     unambiguous: dismiss only when the gesture started outside AND ended
     outside. */
  const outsideDownRef = React.useRef(false)
  const outsideUpRef = React.useRef(false)

  const dismissHandlers = React.useMemo(
    () => ({
      onPointerDownCapture: (e: React.PointerEvent) => {
        outsideDownRef.current = isOutside(e.target)
        outsideUpRef.current = false
      },
      onPointerUpCapture: (e: React.PointerEvent) => {
        outsideUpRef.current = isOutside(e.target)
      },
      onClick: () => {
        const both = outsideDownRef.current && outsideUpRef.current
        outsideDownRef.current = false
        outsideUpRef.current = false
        if (!both || !optsRef.current.dismissOnOutsideClick) return
        log("dismissed by outside click")
        close()
      },
    }),
    [close, isOutside, log]
  )

  /* ---------------------------------------------------------------- drag -- */

  const dragControls = useDragControls()

  /* `dragListener={false}` and a manual start, rather than letting Motion listen
     on the element: the gesture has to be refused when it begins on something a
     person can type in or press, and Motion has no selector-level opt-out. */
  const startDrag = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const o = optsRef.current
      /* The surface, not a wrapper above it: `drag` and `layoutId` on the same
         element is the combination Motion is built for, and it is the only
         arrangement in which the close after a drag lands on the trigger. A
         transformed ANCESTOR is a coordinate space projection has to unwind,
         and it unwinds the scale but not an off-centre origin. */
      const dragEl = surfaceRef.current
      if (!o.draggable || reduced || !dragEl) return
      if (morphingRef.current) return
      if ((e.target as HTMLElement).closest?.(INTERACTIVE)) return

      const r = dragEl.getBoundingClientRect()
      grabRef.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        halfW: dragEl.offsetWidth / 2,
        halfH: dragEl.offsetHeight / 2,
      }

      /* The gesture almost always starts on text, and a pointerdown that is not
         defaulted away begins a selection — or, on an image or a video, a native
         HTML drag with its own ghost image. Both then run underneath the dialog
         drag for as long as the gesture lasts. preventDefault is what stops them
         being started at all; user-select is the belt for anything already in
         flight and for selection that begins outside and is dragged in. Safe
         here because anything a person can legitimately press or type in has
         already returned above — this only ever fires on inert content. */
      e.preventDefault()
      document.body.style.userSelect = "none"
      document.body.style.webkitUserSelect = "none"
      document.getSelection()?.removeAllRanges()

      dragControls.start(e)
      log("drag start")
    },
    [dragControls, log, reduced]
  )

  const onDrag = React.useCallback(
    (_: unknown, info: PanInfo) => {
      // free in every direction; scale falls off with radial distance
      const s = Math.max(
        1 - Math.hypot(info.offset.x, info.offset.y) / optsRef.current.dragFalloff,
        0.3
      )
      dragScale.set(s)

      /* KEEPING THE GRABBED POINT UNDER THE CURSOR, WITHOUT transform-origin.
         The obvious way to do this is `transform-origin: <grab point>`, and it
         works right up until the dialog is dismissed mid-drag: projection
         resolves an element against a transform it assumes is applied about the
         centre, so an off-centre origin lands the close tens of pixels away.

         Re-basing it at close time does not work either — once the exiting
         element becomes a projection node Motion stops writing the plain
         transform altogether, so a late x/y change is simply never rendered and
         all you see is the origin snapping back: the dialog leaps across the
         screen and only then plays the close.

         So the transform is kept in the form projection expects from the start.
         A scale s about o is identical to a scale about the centre plus a
         translation of (o − c)(1 − s) — same pixels, canonical form, and by the
         time the close begins there is nothing left to normalise. Written after
         Motion's own x/y update for this frame, which is what `onDrag` is. */
      const { x: ox, y: oy, halfW, halfH } = grabRef.current
      dragX.set(info.offset.x + (ox - halfW) * (1 - s))
      dragY.set(info.offset.y + (oy - halfH) * (1 - s))
    },
    [dragScale, dragX, dragY]
  )

  const onDragEnd = React.useCallback(
    (_: unknown, info: PanInfo) => {
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""

      const dist = Math.hypot(info.offset.x, info.offset.y)
      /* Motion reports velocity in px per SECOND; the option is px per ms, kept
         that way so the two implementations can be tuned against each other. */
      const speed = Math.hypot(info.velocity.x, info.velocity.y) / 1000
      const o = optsRef.current
      const dismissed =
        dist > o.dismissDistance || (speed > o.dismissSpeed && dist > 20)

      log("drag end", {
        distance: Math.round(dist),
        speed: Math.round(speed * 100) / 100,
        thresholds: { distance: o.dismissDistance, speed: o.dismissSpeed },
        dismissed,
      })

      if (dismissed) {
        close()
        return
      }
      /* Settling back from a drag that was not carried through — pressable
         feedback, not spatial movement. */
      const spring = SPRING_PRESS
      animate(dragX, 0, spring)
      animate(dragScale, 1, spring)
      animate(dragY, 0, spring)
    },
    [close, dragScale, dragX, dragY, log]
  )

  /* --------------------------------------------------------------- mount -- */

  /* Called by the surface once it is in the DOM at its resting size. This is the
     moment the GSAP hook called freezeChild() — and here it only has to record
     the box, because the box never changes: Motion animates a transform, so the
     content is laid out at its resting size for the whole morph and can never
     reflow. */
  const measureSurface = React.useCallback(
    (el: HTMLDivElement | null) => {
      surfaceRef.current = el
      if (!el) return
      const r = el.getBoundingClientRect()
      restingRef.current = { w: r.width, h: r.height }

      /* A layer, for the length of the morph only. The surface animates a
         borderRadius and carries a boxShadow — the two paint-heavy properties
         Motion's guidance names as the case for a `will-change` hint. Permanent
         promotion is the anti-pattern: a layer costs GPU memory whether it is
         moving or not, so it is set as the surface mounts and cleared the moment
         the box arrives or leaves. */
      el.style.willChange = "transform"
      /* See originBoxRef: this one frame is derived, not measured. */
      fitFrame(originBoxRef.current ?? undefined)
    },
    [fitFrame]
  )

  /* The resting box can change under the dialog — a font loads, data arrives,
     the viewport turns. The morph reads it every frame, so it only has to stay
     current. */
  React.useEffect(() => {
    const el = surfaceRef.current
    if (!isOpen || !el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0]
      restingRef.current = box
        ? { w: box.inlineSize, h: box.blockSize }
        : { w: el.offsetWidth, h: el.offsetHeight }
      markScrollable()
    })
    ro.observe(el)
    const win = windowRef.current
    if (win) {
      ro.observe(win)
      for (const child of Array.from(win.children)) ro.observe(child)
    }
    markScrollable()
    return () => ro.disconnect()
  }, [isOpen, markScrollable])

  const setDialog = React.useCallback((el: HTMLDialogElement | null) => {
    dialogRef.current = el
  }, [])
  const setWindow = React.useCallback((el: HTMLDivElement | null) => {
    windowRef.current = el
  }, [])
  const setOriginEl = React.useCallback((el: HTMLDivElement | null) => {
    originRef.current = el
  }, [])

  const setTrigger = React.useCallback((el: HTMLElement | null) => {
    triggerRef.current = el
  }, [])
  const setTriggerHost = React.useCallback((el: HTMLElement | null) => {
    triggerHostRef.current = el
  }, [])

  const refs = React.useMemo(
    () => ({
      dialog: setDialog,
      surface: measureSurface,
      window: setWindow,
      origin: setOriginEl,
      trigger: setTrigger,
      triggerHost: setTriggerHost,
    }),
    [
      setDialog,
      measureSurface,
      setWindow,
      setOriginEl,
      setTrigger,
      setTriggerHost,
    ]
  )

  /* Resolved fresh for the render rather than read off the ref: the ref is one
     effect behind, and the transitions below are props, not callbacks. */
  const o = resolveOptions(options)

  return {
    isOpen,
    open,
    close,
    origin,
    layoutId,
    fullscreen,
    reduced,
    draggable: o.draggable && !reduced,
    debug: options.debug ?? false,
    onExitComplete,
    /* Springs are the idiomatic Motion control for anything that follows a
       gesture, and `visualDuration` is what makes one tunable in the same units
       a tween uses: the time the box APPEARS to arrive, with the settle after.
       The close stays a tween, and evenly eased — a decelerating close idles at
       full size and then collapses, which a spring cannot express. */
    openTransition: reduced
      ? { duration: 0 }
      : { ...SPRING_LAYOUT, visualDuration: o.openDuration, bounce: o.bounce },
    closeTransition: reduced
      ? { duration: 0 }
      : { duration: o.closeDuration, ease: EASE_IN_OUT },
    /* How long AnimatePresence has to keep the exiting surface mounted. Not a
       transition — a duration handed to usePresence; see HoldPresence. */
    /* Long enough for whatever is still fading. Under reduced motion the morph
       is instant but the opacity is not, so presence still has to be held. */
    holdMs: reduced ? DURATION.reducedOut : o.closeDuration,
    /* Reduced motion keeps useful opacity feedback and removes travel, scale
       and parallax — so the surface still fades, it just does not fly. */
    reducedFade: reduced
      ? {
          initial: { opacity: 0 },
          animate: {
            opacity: 1,
            transition: { duration: DURATION.reducedIn, ease: EASE_OUT },
          },
          exit: {
            opacity: 0,
            transition: { duration: DURATION.reducedOut, ease: EASE_OUT },
          },
        }
      : undefined,
    refs,
    values: {
      contentTransform,
      contentOpacity,
      originBackground,
      surfaceBackground,
      dragX,
      dragY,
      dragScale,
    },
    dismissHandlers,
    dragControls,
    startDrag,
    onDrag,
    onDragEnd,
    /* Motion's own layout-animation callback, used only to re-arm the
       measurement loop — never to decide that the morph is over. See fitFrame. */
    onMorphStart: () => {
      morphingRef.current = true
    },
  }
}
