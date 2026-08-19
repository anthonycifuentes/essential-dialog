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
  "input, textarea, select, button, a, label, [contenteditable], [data-no-drag]"

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

  /* `debug`: one channel for everything the morph measures, so a mismatch between
     what it read and what you see is visible without a debugger. */
  const lastLogRef = React.useRef(0)
  const log = React.useCallback(
    (label: string, data?: unknown, throttleMs = 0) => {
      if (!optsRef.current.debug) return
      if (throttleMs) {
        const now = performance.now()
        if (now - lastLogRef.current < throttleMs) return
        lastLogRef.current = now
      }
      console.log(
        `%c[essential-dialog]%c ${label}`,
        "color:#09ee61;font-weight:600",
        "color:inherit",
        data ?? ""
      )
    },
    []
  )

  const tlRef = React.useRef<gsap.core.Timeline | null>(null)
  const closingRef = React.useRef(false)
  const frozenRef = React.useRef<{ w: number; h: number } | null>(null)
  const dragRef = React.useRef<DragState | null>(null)

  React.useEffect(() => {
    return () => {
      tlRef.current?.kill()
      document.body.style.overflow = ""
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
    }
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

  const freezeChild = React.useCallback(() => {
    /* Measure the SURFACE, not the content's natural size. On a short screen
       max-height caps the surface below the content's natural height, and a
       miniature keeping the content's aspect can then never fill that box:
       coverage tops out below the threshold and the content stays invisible.
       Freezing to the box it has to end up in makes coverage reach 1 at rest by
       definition, at any viewport. */
    const surface = nodes.current.surface
    const win = nodes.current.window
    if (!surface || !win) return
    const r = surface.getBoundingClientRect()
    frozenRef.current = { w: r.width, h: r.height }
    gsap.set(win, {
      width: r.width,
      height: r.height,
      minWidth: r.width,
      minHeight: r.height,
      maxHeight: r.height,
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

  /* Scale the miniature to CONTAIN it in the surface, uniformly. One factor keeps
     the dialog's proportions at any size; Flip's own scale:true derives scaleX
     and scaleY separately, stretching the content to fill whatever shape the box
     currently is — that is the squashing.

     Opacity comes from the same measurement rather than from the clock. COVERAGE
     is how much of the surface the miniature fills: 1 only when the two boxes
     coincide, dropping as the surface's aspect diverges from the dialog's. So the
     content is present exactly while it fits its container, in both directions,
     with no timing to tune. */
  const fitChild = React.useCallback(() => {
    const surface = nodes.current.surface
    const win = nodes.current.window
    const f = frozenRef.current
    if (!surface || !win || !f) return
    const s = surface.getBoundingClientRect()
    if (!s.width || !s.height) return
    const k = Math.min(s.width / f.w, s.height / f.h)
    const coverage = Math.min((f.w * k) / s.width, (f.h * k) / s.height)
    const opacity = gsap.utils.clamp(0, 1, (coverage - 0.8) / 0.2)
    gsap.set(win, { scale: k, opacity })
    log(
      "fit",
      {
        surface: `${Math.round(s.width)}×${Math.round(s.height)}`,
        frozen: `${Math.round(f.w)}×${Math.round(f.h)}`,
        scale: Math.round(k * 1000) / 1000,
        coverage: Math.round(coverage * 1000) / 1000,
        opacity: Math.round(opacity * 100) / 100,
      },
      120
    )
  }, [log])

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

    const tl = gsap.timeline({ paused: true })

    /* No trigger to morph from (a programmatically opened dialog): fall back to
       a scale-and-fade so the component still works headless. */
    if (!trigger) {
      log("open (no trigger — scale/fade fallback)")
      pin()
      freezeChild()
      tl.fromTo(
        surface,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: OPEN * 0.5, ease: "power2.out" },
        0
      )
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0)
      tl.eventCallback("onUpdate", () => fitChild())
      tlRef.current = tl.progress(1).progress(0)
      return tlRef.current
    }

    trigger.dataset.flipId = flipId
    surface.dataset.flipId = flipId

    const tCS = getComputedStyle(trigger)
    const originState = Flip.getState(trigger) // geometry only

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

    /* Colour and radius are NOT Flip props. Spread across the full duration the
       box stays visibly the trigger's colour past halfway and reads as a growing
       button rather than an arriving dialog. They hand over in ~125ms; only the
       geometry takes the full duration. */
    gsap.set(surface, {
      backgroundColor: tCS.backgroundColor,
      borderRadius: tCS.borderRadius,
    })
    tl.to(
      surface,
      {
        backgroundColor: surfaceBg,
        borderRadius: surfaceRadius,
        duration: OPEN * 0.18,
        ease: "power2.out",
      },
      OPEN * 0.02
    )

    tl.eventCallback("onUpdate", () => fitChild())
    tl.fromTo(
      win,
      { filter: "blur(8px)" },
      {
        filter: "blur(0px)",
        duration: reducedRef.current ? 0.001 : Math.min(0.5, OPEN),
        ease: EASE_BLUR,
      },
      0
    )
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0)

    tlRef.current = tl.progress(1).progress(0) // lock in both ends
    log("open", {
      from: rect(trigger),
      to: rect(surface),
      frozenContent: frozenRef.current,
      duration: OPEN,
      reducedMotion: reducedRef.current,
      flipId,
    })
    return tlRef.current
  }, [flipId, freezeChild, fitChild, getTrigger, log])

  const open = React.useCallback(() => {
    const dialog = nodes.current.dialog
    if (!dialog || dialog.open || closingRef.current) return
    document.body.style.overflow = "hidden" // showModal does not lock scroll
    dialog.showModal()
    build()?.play()
    setIsOpen(true)
    optsRef.current.onOpenChange?.(true)
  }, [build])

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
    const d = dragEl.getBoundingClientRect()
    gsap.set(surface, {
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
    bakeDrag()

    const o = optsRef.current
    const D = reducedRef.current ? 0.001 : o.closeDuration

    const home = () => {
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
      thawChild()
      gsap.set([surface, win, backdrop, dragEl], { clearProps: "all" })
      dialog.close()
      document.body.style.overflow = ""
      trigger?.focus({ preventScroll: true })
      closingRef.current = false
      setIsOpen(false)
      log("closed — all inline styles cleared")
      o.onOpenChange?.(false)
    }

    log("close", {
      from: rect(surface),
      to: rect(trigger),
      duration: D,
    })

    const tl = gsap.timeline({ onComplete: home })

    if (!trigger) {
      tl.to(surface, { scale: 0.9, opacity: 0, duration: D, ease: "power2.in" }, 0)
      tl.to(backdrop, { opacity: 0, duration: D, ease: "power1.in" }, 0)
      return
    }

    const tCS = getComputedStyle(trigger)

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
        borderRadius: tCS.borderRadius,
        duration: D * 0.42,
        ease: "power1.in",
      },
      D * 0.58
    )
    tl.eventCallback("onUpdate", () => fitChild())
    tl.to(backdrop, { opacity: 0, duration: 0.25, ease: "power1.in" }, D * 0.6)
  }, [bakeDrag, thawChild, fitChild, getTrigger, log])

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
        onComplete: () => gsap.set(dragEl, { transformOrigin: "50% 50%" }),
      })
    },
    [close, log]
  )

  /* Backdrop click: the dialog element itself, the drag wrapper and the backdrop
     are all "outside" the surface. Compared here so the component never has to
     hold the nodes. */
  const isDismissTarget = React.useCallback((target: EventTarget | null) => {
    const { dialog, drag, backdrop } = nodes.current
    return target === dialog || target === drag || target === backdrop
  }, [])

  return {
    isOpen,
    open,
    close,
    debug: options.debug ?? false,
    refs,
    isDismissTarget,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
