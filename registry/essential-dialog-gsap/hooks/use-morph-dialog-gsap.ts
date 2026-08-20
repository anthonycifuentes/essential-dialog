"use client"

import * as React from "react"
import { gsap } from "gsap"
import { CustomEase } from "gsap/CustomEase"
import { Flip } from "gsap/Flip"

/* Only dependency: GSAP. Flip and CustomEase are free as of 3.13. */

/* Registered lazily, not at import time. Flip's core init needs document.body
   to exist — registering during module evaluation (or during SSR) leaves it
   half-built and every getState throws. */
let registered = false
function ensurePlugins() {
  if (registered) return
  gsap.registerPlugin(Flip, CustomEase)
  registered = true
}

/* Built on first use, for the same reason. EASE_IN is a quick lunge then a long
   decelerating settle. EASE_OUT is deliberately NOT its mirror: a mirrored curve
   idles at full size and then collapses, as unreadable as the front-loaded
   version is leaving. Even motion is what lets you watch the dialog become a
   button. */
type Ease = (progress: number) => number
let EASE_IN: Ease | undefined
let EASE_BLUR: Ease | undefined
const EASE_OUT = "power2.inOut"
function ensureEases() {
  EASE_IN ||= CustomEase.create(
    "essentialMorphIn",
    "M0,0 C0.305,0.206 0.116,0.567 0.3,0.8 0.394,0.921 0.491,1 1,1"
  )
  EASE_BLUR ||= CustomEase.create("essentialMorphBlur", "M0,0 C0.56,0.27 0,1 1,1")
}

/* anything a person can type in, press or select owns the gesture */
const INTERACTIVE =
  "input, textarea, select, button, a, label, summary, video, audio, [contenteditable], [role='button'], [role='slider'], [role='textbox'], [data-no-drag]"

export type MorphDialogOptions = {
  /** Seconds. The trigger → dialog morph. */
  openDuration?: number
  /**
   * Seconds. Shorter than `openDuration` on purpose: at equal durations there is
   * a long middle where the box is neither the dialog nor the button. Arriving
   * can take its time; leaving cannot.
   */
  closeDuration?: number
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
  /**
   * Take the trigger away for as long as the dialog is up, so the morph reads as
   * the button BECOMING the dialog rather than spawning one beside it. Without
   * it the trigger sits there uncovered the moment the growing surface leaves
   * its box, and you are watching two things instead of one.
   *
   * `visibility`, not `display`: the trigger keeps its layout box, so the page
   * does not reflow around the gap and the close can still read the geometry,
   * colour and radius it has to land back in.
   */
  hideTrigger?: boolean
  /**
   * Open edge to edge instead of centred. `true` is always; a number is a
   * breakpoint — fullscreen while the viewport is narrower than that many px —
   * and a string is any media query, e.g. `"(max-width: 640px)"` or
   * `"(orientation: portrait)"`. Omit for a centred dialog, which is the default.
   *
   * It only changes the box the morph lands in: the surface fills the viewport,
   * loses its radius, and the content scrolls inside it. Everything else — the
   * morph, the drag, the gesture thresholds — is unchanged.
   */
  fullscreen?: boolean | number | string
  /**
   * Outline every layer and log the measurements the morph is built from:
   * origin and target boxes, the frozen content box, live coverage, and the
   * distance/speed the drag was judged on.
   */
  debug?: boolean
  onOpenChange?: (open: boolean) => void
}

const DEFAULTS = {
  openDuration: 0.7,
  closeDuration: 0.45,
  dismissDistance: 100,
  dismissSpeed: 0.5,
  dragFalloff: 415,
  draggable: true,
  dismissOnOutsideClick: true,
  hideTrigger: true,
  fullscreen: false as boolean | number | string,
  debug: false,
} satisfies Required<Omit<MorphDialogOptions, "onOpenChange">>

function resolveOptions(o: MorphDialogOptions) {
  return {
    openDuration: o.openDuration ?? DEFAULTS.openDuration,
    closeDuration: o.closeDuration ?? DEFAULTS.closeDuration,
    dismissDistance: o.dismissDistance ?? DEFAULTS.dismissDistance,
    dismissSpeed: o.dismissSpeed ?? DEFAULTS.dismissSpeed,
    dragFalloff: o.dragFalloff ?? DEFAULTS.dragFalloff,
    draggable: o.draggable ?? DEFAULTS.draggable,
    dismissOnOutsideClick:
      o.dismissOnOutsideClick ?? DEFAULTS.dismissOnOutsideClick,
    hideTrigger: o.hideTrigger ?? DEFAULTS.hideTrigger,
    fullscreen: o.fullscreen ?? DEFAULTS.fullscreen,
    debug: o.debug ?? false,
    onOpenChange: o.onOpenChange,
  }
}

const rect = (el: Element | null) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return {
    w: Math.round(r.width * 10) / 10,
    h: Math.round(r.height * 10) / 10,
    x: Math.round(r.left),
    y: Math.round(r.top),
    radius: cs.borderRadius,
    background: cs.backgroundColor,
  }
}

/**
 * Computed border-radius in px, plus whether it is "fully round" — at or past
 * half the shorter side. A circle, a pill, a percentage radius and Tailwind's
 * `rounded-full` (`calc(infinity * 1px)`) all land here as round.
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

/**
 * `fullscreen` as a media query. `true` becomes the sentinel ALWAYS, since there
 * is no query that is unconditionally true across engines; a number becomes a
 * max-width just under the breakpoint, so `640` means "narrower than 640px" and
 * lines up with how Tailwind's `sm:` splits the same edge.
 */
const ALWAYS = "always"
function fullscreenQuery(value: boolean | number | string) {
  if (value === false || value === "") return null
  if (value === true) return ALWAYS
  if (typeof value === "number") return `(max-width: ${value - 0.02}px)`
  return value
}

type DragState = {
  on: boolean
  sx: number
  sy: number
  lx: number
  ly: number
  lt: number
  dx: number
  dy: number
  vx: number
  vy: number
}

type MorphDialogNodes = {
  trigger: HTMLElement | null
  triggerHost: HTMLElement | null
  dialog: HTMLDialogElement | null
  backdrop: HTMLDivElement | null
  drag: HTMLDivElement | null
  surface: HTMLDivElement | null
  window: HTMLDivElement | null
}

/**
 * Callback refs, not ref objects: handing ref objects down through context would
 * mean reading refs during render. These keep every write inside commit.
 */
export type MorphDialogRefs = {
  trigger: (el: HTMLElement | null) => void
  /** Wrapper around a trigger this component could not clone — see getTrigger. */
  triggerHost: (el: HTMLElement | null) => void
  dialog: (el: HTMLDialogElement | null) => void
  backdrop: (el: HTMLDivElement | null) => void
  drag: (el: HTMLDivElement | null) => void
  surface: (el: HTMLDivElement | null) => void
  window: (el: HTMLDivElement | null) => void
}

export function useMorphDialog(options: MorphDialogOptions = {}) {
  const nodes = React.useRef<MorphDialogNodes>({
    trigger: null,
    triggerHost: null,
    dialog: null,
    backdrop: null,
    drag: null,
    surface: null,
    window: null,
  })

  const setTrigger = React.useCallback((el: HTMLElement | null) => {
    nodes.current.trigger = el
  }, [])
  const setTriggerHost = React.useCallback((el: HTMLElement | null) => {
    nodes.current.triggerHost = el
  }, [])
  const setDialog = React.useCallback((el: HTMLDialogElement | null) => {
    nodes.current.dialog = el
  }, [])
  const setBackdrop = React.useCallback((el: HTMLDivElement | null) => {
    nodes.current.backdrop = el
  }, [])
  const setDrag = React.useCallback((el: HTMLDivElement | null) => {
    nodes.current.drag = el
  }, [])
  const setSurface = React.useCallback((el: HTMLDivElement | null) => {
    nodes.current.surface = el
  }, [])
  const setWindow = React.useCallback((el: HTMLDivElement | null) => {
    nodes.current.window = el
  }, [])

  const refs = React.useMemo<MorphDialogRefs>(
    () => ({
      trigger: setTrigger,
      triggerHost: setTriggerHost,
      dialog: setDialog,
      backdrop: setBackdrop,
      drag: setDrag,
      surface: setSurface,
      window: setWindow,
    }),
    [
      setTrigger,
      setTriggerHost,
      setDialog,
      setBackdrop,
      setDrag,
      setSurface,
      setWindow,
    ]
  )

  const [isOpen, setIsOpen] = React.useState(false)

  /* Resolved key by key, never by spread: an explicitly passed `undefined`
     (`openDuration={undefined}`) is still an own property and would overwrite
     the default with nothing. Read only on interaction, so an effect is late
     enough to stay current. */
  const optsRef = React.useRef(resolveOptions(options))
  React.useEffect(() => {
    optsRef.current = resolveOptions(options)
  })

  /* useSyncExternalStore rather than state-in-an-effect: matchMedia is exactly the
     external store it exists for, and the resting dialog is laid out by CSS, so a
     breakpoint crossing while the dialog is open re-lays it out for free. */
  const query = fullscreenQuery(options.fullscreen ?? DEFAULTS.fullscreen)
  const subscribeFullscreen = React.useCallback(
    (onChange: () => void) => {
      if (!query || query === ALWAYS) return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query]
  )
  const readFullscreen = React.useCallback(() => {
    if (!query) return false
    if (query === ALWAYS) return true
    return window.matchMedia(query).matches
  }, [query])
  const fullscreen = React.useSyncExternalStore(
    subscribeFullscreen,
    readFullscreen,
    () => query === ALWAYS
  )

  const reducedRef = React.useRef(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      reducedRef.current = mq.matches
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  /* Flip pairs a recorded element with a target by data-flip-id. Scoped per
     instance so two dialogs on one page can never claim each other's origin. */
  const flipId = "essential-dialog-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")

  /* Hiding the body's overflow takes the scrollbar away with it, and the page
     reflows into the freed gutter — every centred thing on it slides sideways at
     the exact moment the dialog opens. Reserving the gutter as padding keeps the
     layout still. The dialog itself is position:fixed, so it is measured against
     the viewport and does not care about body padding. */
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

  /* `debug`: one channel for everything the morph measures, so a mismatch between
     what it read and what you see is visible without a debugger. */
  const lastLogRef = React.useRef(0)
  const log = React.useCallback(
    (label: string, data?: unknown | (() => unknown), throttleMs = 0) => {
      if (!optsRef.current.debug) return
      if (throttleMs) {
        const now = performance.now()
        if (now - lastLogRef.current < throttleMs) return
        lastLogRef.current = now
      }
      /* Callers in the per-frame path pass a thunk, so with debug off nothing is
         measured, rounded or allocated sixty times a second. */
      const payload =
        typeof data === "function" ? (data as () => unknown)() : data
      console.log(
        `%c[essential-dialog]%c ${label}`,
        "color:#09ee61;font-weight:600",
        "color:inherit",
        payload ?? ""
      )
    },
    []
  )

  const tlRef = React.useRef<gsap.core.Timeline | null>(null)
  /* Kept so unmounting mid-close cannot leave a timeline animating detached nodes
     and then running its onComplete against them. */
  const closeTlRef = React.useRef<gsap.core.Timeline | null>(null)
  const closingRef = React.useRef(false)
  /* An open() that arrives while the close is still running is remembered rather
     than dropped, so a controlled `open` cannot desync from the dialog. */
  const pendingOpenRef = React.useRef(false)
  const frozenRef = React.useRef<{ w: number; h: number } | null>(null)
  /* Whether the origin is round, and the radius the dialog rests at. Set on
     build, reused by the close so a mid-morph dismiss still knows the target. */
  const shapeRef = React.useRef<{ round: boolean; target: number } | null>(null)
  /* The largest the box gets during THIS morph, as a fraction of the frozen
     content box: 1 when opening (it reaches its resting size), but only the drag
     scale when closing from a dragged-down dialog. Radius and opacity are read
     against it so both are already where the eye last saw them when the close
     takes over. */
  const kRefRef = React.useRef(1)
  const settledRef = React.useRef(false)
  const dragRef = React.useRef<DragState | null>(null)

  /* The trigger currently hidden behind the morph, with whatever inline
     visibility it had before — restored on the way out rather than hard-coded
     back to "visible", because the trigger belongs to the call site. Held as the
     element itself rather than re-resolved through getTrigger, so a trigger that
     was swapped or restyled while the dialog was open still gets its own value
     back. */
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
    /* The transition has to go first, and it is not optional. `visibility` IS a
       transitionable property, and it interpolates by a rule of its own: for the
       whole of the transition the value is whichever end is `visible`. So a
       trigger with `transition-all` — every shadcn Button has one — answers
       "visible" for another 150ms after being told to hide, and the button sits
       there uncovered through the first fifth of the morph. Both writes land in
       one style flush, so `none` is already in force when the visibility change
       is resolved. */
    el.style.transitionProperty = "none"
    el.style.visibility = "hidden"
  }, [])

  const revealTrigger = React.useCallback(() => {
    const hidden = hiddenTriggerRef.current
    if (!hidden) return
    hiddenTriggerRef.current = null
    /* Visible again before the transition is handed back, so the trigger cannot
       be caught mid-interpolation by the focus() that follows this. */
    hidden.el.style.visibility = hidden.visibility
    hidden.el.getBoundingClientRect() // flush the style change on its own
    hidden.el.style.transitionProperty = hidden.transitionProperty
  }, [])

  React.useEffect(() => {
    return () => {
      tlRef.current?.kill()
      closeTlRef.current?.kill()
      /* The trigger can outlive this hook — useMorphDialog is usable on its own,
         against an element the caller keeps — so unmounting mid-morph must not
         leave it invisible. */
      revealTrigger()
      const saved = scrollLockRef.current
      if (saved) {
        document.body.style.overflow = saved.overflow
        document.body.style.paddingRight = saved.paddingRight
      }
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
    }
  }, [revealTrigger])

  /* Touch has to choose between dragging the dialog and scrolling its content,
     and it chooses through touch-action — Chrome cancels our pointer the moment
     it decides the gesture belongs to a scroller. So the window is touch-action:
     none while its content fits (drag from anywhere), and pan-y once it
     overflows (scroll the content, flick sideways to dismiss). */
  const markScrollable = React.useCallback(() => {
    const win = nodes.current.window
    if (!win) return
    const scrollable = win.scrollHeight - win.clientHeight > 1
    win.dataset.scrollable = String(scrollable)
    return scrollable
  }, [])

  /* The trigger is either this component's own node, or — when the element it
     was handed could not be cloned — the first child of the display:contents
     wrapper standing in for it. Resolved at use time, never cached: the origin
     geometry has to be whatever is on screen at the moment of the click. */
  const getTrigger = React.useCallback((): HTMLElement | null => {
    const { trigger, triggerHost } = nodes.current
    return trigger ?? (triggerHost?.firstElementChild as HTMLElement | null) ?? null
  }, [])

  /* ------------------------------------------------------------------ child -- */

  const freezeChild = React.useCallback((size?: { w: number; h: number }) => {
    /* Measure the SURFACE, not the content's natural size. On a short screen
       max-height caps the surface below the content's natural height, and a
       miniature keeping the content's aspect can then never fill that box:
       coverage tops out below the threshold and the content stays invisible.
       Freezing to the box it has to end up in makes coverage reach 1 at rest by
       definition, at any viewport.

       `size` overrides that measurement for a close that follows a drag, where
       the surface on screen is a scaled-down version of the box the content was
       laid out in. Freezing to what is on screen would re-flow the content into
       the small box — full-size text, its own scrollbar — instead of keeping the
       miniature the drag was showing. */
    const surface = nodes.current.surface
    const win = nodes.current.window
    if (!surface || !win) return
    if (size) {
      frozenRef.current = size
    } else {
      const r = surface.getBoundingClientRect()
      frozenRef.current = { w: r.width, h: r.height }
    }
    const { w, h } = frozenRef.current
    gsap.set(win, {
      width: w,
      height: h,
      minWidth: w,
      minHeight: h,
      maxHeight: h,
      position: "absolute",
      left: "50%",
      top: "50%",
      xPercent: -50,
      yPercent: -50,
    })
  }, [])

  const thawChild = React.useCallback(() => {
    const win = nodes.current.window
    if (!win) return
    gsap.set(win, {
      clearProps:
        "minWidth,minHeight,maxHeight,width,height,position,left,top,xPercent,yPercent,scale,opacity,filter",
    })
  }, [])

  /* Everything that has to be re-derived from the box on every frame: the
     content's scale and opacity, and — for a round trigger — the radius.
     Measured, never timed, so it plays identically in reverse.

     SCALE contains the miniature in the surface, uniformly. One factor keeps the
     dialog's proportions at any size; Flip's own scale:true derives scaleX and
     scaleY separately, stretching the content to fill whatever shape the box
     currently is — that is the squashing.

     OPACITY is two questions, both about the box rather than the clock. FIT is
     how much of the surface the miniature fills: 1 only when the two boxes
     coincide, dropping as the surface's aspect diverges from the dialog's. ROOM
     is how much of its final size the box has actually reached. Fit alone is
     enough for a wide trigger, whose aspect is nowhere near the dialog's — but a
     circle or a square starts out already matching it, and fit would hand you a
     legible-but-tiny copy of the whole dialog inside a 47px dot. Room is what
     keeps the content out until there is a dialog to put it in.

     RADIUS, when the trigger is round, stays exactly as round as the box's own
     shorter side allows: a circle grows as a circle, a pill as a pill. The
     dialog's own radius only takes over once there is enough box for it to read
     as a corner. Tweening the two radii as plain numbers instead is what makes a
     circular origin look wrong — 23.5px is half of a 47px circle but a rounding
     error on a 440px dialog, so the box squares off within a few frames of
     leaving the trigger. */
  const fitFrame = React.useCallback(() => {
    const surface = nodes.current.surface
    const win = nodes.current.window
    const f = frozenRef.current
    if (!surface || !win || !f) return
    const s = surface.getBoundingClientRect()
    if (!s.width || !s.height) return

    const k = Math.min(s.width / f.w, s.height / f.h)
    const coverage = Math.min((f.w * k) / s.width, (f.h * k) / s.height)
    const fit = gsap.utils.clamp(0, 1, (coverage - 0.8) / 0.2)
    const kn = k / (kRefRef.current || 1)
    const room = gsap.utils.clamp(0, 1, (kn - 0.45) / 0.35)
    const opacity = fit * room
    gsap.set(win, { scale: k, opacity })

    const shape = shapeRef.current
    let radius: number | undefined
    if (shape?.round) {
      const half = Math.min(s.width, s.height) / 2
      const t = gsap.utils.clamp(0, 1, (kn - 0.25) / 0.45)
      const eased = t * t * (3 - 2 * t) // smoothstep, so both ends are calm
      radius = Math.min(half, half + (shape.target - half) * eased)
      gsap.set(surface, { borderRadius: radius })
    }

    log(
      "fit",
      () => ({
        surface: `${Math.round(s.width)}×${Math.round(s.height)}`,
        frozen: `${Math.round(f.w)}×${Math.round(f.h)}`,
        scale: Math.round(k * 1000) / 1000,
        coverage: Math.round(coverage * 1000) / 1000,
        kRef: Math.round(kRefRef.current * 1000) / 1000,
        room: Math.round(room * 100) / 100,
        opacity: Math.round(opacity * 100) / 100,
        ...(radius === undefined
          ? {}
          : { radius: Math.round(radius * 10) / 10 }),
      }),
      120
    )
  }, [log])

  /* Hand the resting dialog back to CSS. The morph needs the surface pinned at
     absolute coordinates and the content frozen at a fixed size — but once it has
     arrived, both are a liability: pinned coordinates do not re-centre when the
     viewport changes, and a frozen content box does not reflow. Clearing them the
     moment the timeline completes costs nothing visually (every value equals what
     CSS would compute) and makes the open dialog fully responsive. */
  const settle = React.useCallback(() => {
    const surface = nodes.current.surface
    if (!surface) return
    thawChild()
    gsap.set(surface, {
      clearProps:
        "position,margin,left,top,width,height,backgroundColor,borderRadius",
    })
    settledRef.current = true
    markScrollable()
    log("settled — layout handed back to CSS")
  }, [thawChild, markScrollable, log])

  /* ------------------------------------------------------------------- open -- */

  const build = React.useCallback(() => {
    const trigger = getTrigger()
    const dialog = nodes.current.dialog
    const backdrop = nodes.current.backdrop
    const dragEl = nodes.current.drag
    const surface = nodes.current.surface
    const win = nodes.current.window
    if (!dialog || !backdrop || !dragEl || !surface || !win) return null

    ensurePlugins()
    ensureEases()

    tlRef.current?.kill()
    gsap.set([surface, win, backdrop, dragEl], { clearProps: "all" })
    kRefRef.current = 1 // opening: the box grows all the way to its resting size
    settledRef.current = false

    const o = optsRef.current
    const OPEN = reducedRef.current ? 0.001 : o.openDuration
    const sCS = getComputedStyle(surface)
    const surfaceBg = sCS.backgroundColor
    const surfaceRadius = sCS.borderRadius

    /* Pin the surface at its centred position. As a centred grid item its layout
       left/top depend on its own width, so while the width animates the browser
       keeps re-centring it and Flip has to compensate for a moving base.
       Absolutely positioned at the same coordinates, it cannot move underneath
       the animation. */
    const pin = () => {
      const d = dragEl.getBoundingClientRect()
      const s = surface.getBoundingClientRect()
      gsap.set(surface, {
        position: "absolute",
        margin: 0,
        left: s.left - d.left,
        top: s.top - d.top,
        width: s.width,
        height: s.height,
      })
    }

    const tl = gsap.timeline({ paused: true, onComplete: settle })

    /* No trigger to morph from (a programmatically opened dialog): fall back to
       a scale-and-fade so the component still works headless. */
    if (!trigger) {
      log("open (no trigger — scale/fade fallback)")
      shapeRef.current = null // nothing to derive a radius from
      pin()
      freezeChild()
      tl.fromTo(
        surface,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: OPEN * 0.5, ease: "power2.out" },
        0
      )
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0)
      tl.eventCallback("onUpdate", () => fitFrame())
      tlRef.current = tl.progress(1, true).progress(0, true)
      fitFrame()
      return tlRef.current
    }

    trigger.dataset.flipId = flipId
    surface.dataset.flipId = flipId

    const tCS = getComputedStyle(trigger)
    const originState = Flip.getState(trigger) // geometry only

    /* Out it goes, on the first frame — where the surface is still sitting
       exactly on top of it, in its colour and at its radius, so there is nothing
       to see happen. Read after the origin state, though the order does not
       matter to Flip: isVisible is purely geometric, and a hidden trigger keeps
       its box. */
    if (o.hideTrigger) concealTrigger(trigger)

    pin()
    freezeChild() // only now — the surface has a box of its own

    /* PARENT — scale:false, so width and height are real and the radius and
       border stay crisp. No absolute:true: the surface is a centred item and
       absolute positioning stacks Flip's left/top on top of the centring offset,
       landing it at double the coordinates. */
    tl.add(
      Flip.from(originState, {
        targets: surface,
        duration: OPEN,
        ease: EASE_IN,
        scale: false,
      }),
      0
    )

    /* A round trigger hands its radius to fitFrame, which derives it from the
       box each frame; anything else tweens between the two absolute radii, where
       a straight number tween is exactly right. */
    const triggerBox = trigger.getBoundingClientRect()
    const origin = radiusOf(tCS, triggerBox.width, triggerBox.height)
    /* Measured against the box the surface RESTS at — frozen a moment ago — not
       against whatever it is mid-flight. */
    const resting = frozenRef.current ?? { w: 0, h: 0 }
    const target = radiusOf(sCS, resting.w, resting.h)
    shapeRef.current = { round: origin.round, target: target.px }

    /* Colour and radius are NOT Flip props. Spread across the full duration the
       box stays visibly the trigger's colour past halfway and reads as a growing
       button rather than an arriving dialog. They hand over in ~125ms; only the
       geometry takes the full duration. */
    gsap.set(surface, {
      backgroundColor: tCS.backgroundColor,
      ...(origin.round ? {} : { borderRadius: tCS.borderRadius }),
    })
    tl.to(
      surface,
      {
        backgroundColor: surfaceBg,
        ...(origin.round ? {} : { borderRadius: surfaceRadius }),
        duration: OPEN * 0.18,
        ease: "power2.out",
      },
      OPEN * 0.02
    )

    tl.eventCallback("onUpdate", () => fitFrame())
    tl.fromTo(
      win,
      { filter: "blur(8px)" },
      {
        filter: "blur(0px)",
        duration: reducedRef.current ? 0.001 : OPEN * 0.71,
        ease: EASE_BLUR,
      },
      0
    )
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0)

    /* Lock in both ends so Flip records start and end values — with events
       suppressed, or the jump to the end would fire onComplete and settle a
       dialog that has not opened yet. The first frame is then set by hand. */
    tlRef.current = tl.progress(1, true).progress(0, true)
    fitFrame()
    log("open", {
      from: rect(trigger),
      to: rect(surface),
      frozenContent: frozenRef.current,
      duration: OPEN,
      hideTrigger: o.hideTrigger,
      reducedMotion: reducedRef.current,
      fullscreen,
      flipId,
    })
    return tlRef.current
  }, [
    flipId,
    freezeChild,
    fitFrame,
    getTrigger,
    log,
    settle,
    fullscreen,
    concealTrigger,
  ])

  const open = React.useCallback(() => {
    const dialog = nodes.current.dialog
    if (!dialog || dialog.open) return
    if (closingRef.current) {
      /* Mid-close: a dialog still morphing home cannot be reopened, so remember
         the request and honour it once the close lands. */
      pendingOpenRef.current = true
      return
    }
    lockScroll() // showModal does not lock scroll
    dialog.showModal()
    build()?.play()
    setIsOpen(true)
    optsRef.current.onOpenChange?.(true)
  }, [build, lockScroll])

  /* The resting dialog is laid out by CSS, so a resize re-centres and reflows it
     on its own — all that is left to re-derive is whether the content still fits,
     which decides who owns a touch gesture. A ResizeObserver rather than a resize
     listener, so content that grows on its own (data arriving, a font loading, a
     details element opening) counts too, not just viewport changes. */
  React.useEffect(() => {
    if (!isOpen) return
    const win = nodes.current.window
    if (!win || typeof ResizeObserver === "undefined") {
      const onResize = () => markScrollable()
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }
    const observer = new ResizeObserver(() => markScrollable())
    observer.observe(win)
    for (const child of Array.from(win.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [isOpen, markScrollable])

  /* ------------------------------------------------------------------ close -- */

  /* Fold whatever the drag put on the wrapper into the surface's own box, then
     clear the wrapper. Nothing moves, but from here the dialog owns its position
     — so the close starts from where the person let go instead of unwinding to
     centre first. */
  const bakeDrag = React.useCallback(() => {
    const dragEl = nodes.current.drag
    const surface = nodes.current.surface
    if (!dragEl || !surface) return
    const s = surface.getBoundingClientRect()
    gsap.set(dragEl, { clearProps: "transform,transformOrigin" })
    dragEl.style.willChange = ""
    const d = dragEl.getBoundingClientRect()
    /* position/margin included because the surface may have been settled back to
       a centred grid item: left/top only mean these coordinates once it is out of
       flow again. */
    gsap.set(surface, {
      position: "absolute",
      margin: 0,
      left: s.left - d.left,
      top: s.top - d.top,
      width: s.width,
      height: s.height,
      x: 0,
      y: 0,
      scale: 1,
    })
  }, [])

  const close = React.useCallback(() => {
    const dialog = nodes.current.dialog
    const trigger = getTrigger()
    const backdrop = nodes.current.backdrop
    const dragEl = nodes.current.drag
    const surface = nodes.current.surface
    const win = nodes.current.window
    if (!dialog || !dialog.open || closingRef.current) return
    if (!backdrop || !dragEl || !surface || !win) return

    closingRef.current = true
    tlRef.current?.pause()

    /* The LAYOUT box, read before bakeDrag rewrites it and immune to the drag
       transform on the wrapper above — this is the size the content was laid out
       at, which is what the miniature has to keep. */
    const resting = settledRef.current
      ? { w: surface.offsetWidth, h: surface.offsetHeight }
      : null
    bakeDrag()
    if (resting) freezeChild(resting)

    /* Where the drag left it, as a fraction of that box: 1 when the dialog was
       untouched, the drag's own scale when it was dragged down. */
    const baked = surface.getBoundingClientRect()
    const frozen = frozenRef.current
    kRefRef.current = frozen
      ? Math.min(baked.width / frozen.w, baked.height / frozen.h)
      : 1
    fitFrame() // no visible step between the drag and the first frame of the close

    const o = optsRef.current
    const D = reducedRef.current ? 0.001 : o.closeDuration

    const home = () => {
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
      /* The trigger belongs to whoever passed it in: no fingerprints left on it
         between morphs. */
      if (trigger) delete trigger.dataset.flipId
      delete surface.dataset.flipId
      thawChild()
      gsap.set([surface, win, backdrop, dragEl], { clearProps: "all" })
      dialog.close()
      /* Back in the same frame the dialog leaves, and before the focus call
         below: a visibility:hidden button cannot take focus. */
      revealTrigger()
      unlockScroll()
      trigger?.focus({ preventScroll: true })
      closingRef.current = false
      settledRef.current = false
      closeTlRef.current = null
      kRefRef.current = 1
      setIsOpen(false)
      log("closed — all inline styles cleared")
      o.onOpenChange?.(false)
      if (pendingOpenRef.current) {
        pendingOpenRef.current = false
        open()
      }
    }

    log("close", {
      from: rect(surface),
      to: rect(trigger),
      duration: D,
    })

    const tl = gsap.timeline({ onComplete: home })
    closeTlRef.current = tl

    if (!trigger) {
      tl.to(surface, { scale: 0.9, opacity: 0, duration: D, ease: "power2.in" }, 0)
      tl.to(backdrop, { opacity: 0, duration: D, ease: "power1.in" }, 0)
      return
    }

    const tCS = getComputedStyle(trigger)
    const triggerBox = trigger.getBoundingClientRect()
    const origin = radiusOf(tCS, triggerBox.width, triggerBox.height)
    /* Re-read roundness — the trigger may have been restyled while the dialog was
       open — but keep the resting radius from the build: the surface's own is
       mid-morph if this close interrupted an open. */
    shapeRef.current = {
      round: origin.round,
      target:
        shapeRef.current?.target ??
        radiusOf(
          getComputedStyle(surface),
          frozenRef.current?.w ?? 0,
          frozenRef.current?.h ?? 0
        ).px,
    }

    /* Flip.to is the exact mirror of the Flip.from that opened it: same plugin,
       same pairing, same scale:false. Flip.fit solves the same problem a
       different way and lands the box at the right SIZE but the wrong POSITION. */
    tl.add(
      Flip.to(Flip.getState(trigger), {
        targets: surface,
        duration: D,
        ease: EASE_OUT,
        scale: false,
      }),
      0
    )
    tl.to(
      surface,
      {
        backgroundColor: tCS.backgroundColor,
        ...(origin.round ? {} : { borderRadius: tCS.borderRadius }),
        duration: D * 0.42,
        ease: "power1.in",
      },
      D * 0.58
    )
    tl.eventCallback("onUpdate", () => fitFrame())
    tl.to(backdrop, { opacity: 0, duration: 0.25, ease: "power1.in" }, D * 0.6)
  }, [
    bakeDrag,
    freezeChild,
    thawChild,
    fitFrame,
    getTrigger,
    log,
    open,
    revealTrigger,
    unlockScroll,
  ])

  /* ------------------------------------------------------------------- drag -- */

  const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    const dragEl = nodes.current.drag
    const surface = nodes.current.surface
    const o = optsRef.current
    if (!dragEl || !surface) return
    if (!o.draggable || reducedRef.current || closingRef.current) return
    if (tlRef.current && tlRef.current.progress() < 1) return
    if ((e.target as HTMLElement).closest?.(INTERACTIVE)) return

    const r = dragEl.getBoundingClientRect()
    // origin = the grab point, so it stays under the cursor while shrinking
    gsap.set(dragEl, {
      transformOrigin: `${e.clientX - r.left}px ${e.clientY - r.top}px`,
    })
    e.preventDefault() // stop a text selection starting
    /* nothing is selectable while a drag is in flight: the gesture starts on
       text, so without this the browser paints a highlight across the dialog */
    document.body.style.userSelect = "none"
    document.body.style.webkitUserSelect = "none"
    document.getSelection()?.removeAllRanges()

    dragRef.current = {
      on: true,
      sx: e.clientX,
      sy: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      lt: e.timeStamp,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
    }
    surface.setPointerCapture(e.pointerId)
    gsap.killTweensOf(dragEl)
    /* Advertised for the gesture only, and on the element that actually
       transforms. A permanent will-change asks the compositor to hold a layer for
       every dialog on the page, dragged or not. */
    dragEl.style.willChange = "transform"
    log("drag start", { origin: `${Math.round(e.clientX - r.left)}px ${Math.round(e.clientY - r.top)}px` })
  }, [log])

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current
    const dragEl = nodes.current.drag
    if (!d?.on || !dragEl) return
    d.dx = e.clientX - d.sx
    d.dy = e.clientY - d.sy
    const dt = e.timeStamp - d.lt
    if (dt > 0) {
      d.vx = (e.clientX - d.lx) / dt
      d.vy = (e.clientY - d.ly) / dt
    }
    d.lx = e.clientX
    d.ly = e.clientY
    d.lt = e.timeStamp
    // free in every direction; scale falls off with radial distance
    gsap.set(dragEl, {
      x: d.dx,
      y: d.dy,
      scale: Math.max(
        1 - Math.hypot(d.dx, d.dy) / optsRef.current.dragFalloff,
        0.3
      ),
    })
  }, [])

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current
      const dragEl = nodes.current.drag
      const surface = nodes.current.surface
      if (!d?.on || !dragEl) return
      d.on = false
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
      try {
        surface?.releasePointerCapture(e.pointerId)
      } catch {}
      const dist = Math.hypot(d.dx, d.dy)
      const speed = Math.hypot(d.vx, d.vy)
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
      gsap.to(dragEl, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: "expo.out",
        onComplete: () => {
          gsap.set(dragEl, { transformOrigin: "50% 50%" })
          dragEl.style.willChange = ""
        },
      })
    },
    [close, log]
  )

  /* Outside the surface: asked of the SURFACE by containment rather than
     matched against the dialog, the drag wrapper and the backdrop one by one.
     Containment is the answer that stays right when the layer stack changes. */
  const isOutside = React.useCallback((target: EventTarget | null) => {
    const surface = nodes.current.surface
    return !!surface && target instanceof Node && !surface.contains(target)
  }, [])

  /* BOTH ends of the gesture, taken from the pointer events rather than from the
     click. A `click` fires on the nearest common ancestor of where the pointer
     went down and came up, so a press inside the dialog released over the
     backdrop — and the reverse — both report a target that is "outside". Judged
     on the click alone, selecting a line of text and overshooting the edge
     dismisses the dialog, which is the one thing an outside-click dismissal must
     never do. */
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

  return {
    isOpen,
    open,
    close,
    debug: options.debug ?? false,
    fullscreen,
    refs,
    dismissHandlers,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
