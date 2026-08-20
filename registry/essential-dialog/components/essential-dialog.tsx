"use client"

import * as React from "react"
import { AnimatePresence, motion, usePresence } from "motion/react"

import { cn } from "@/lib/utils"
import {
  useMorphDialog,
  type MorphDialogOptions,
} from "@/registry/essential-dialog/hooks/use-morph-dialog"

/* ---------------------------------------------------------------------------
 * SPIKE — essential-dialog, driven by Motion's projection engine.
 *
 * Same parts, same props, same CSS variables as the GSAP build, so the two can
 * be dropped into the same call site and compared side by side.
 *
 * The layer stack is where the two implementations actually differ:
 *
 *   GSAP                              Motion
 *   ───────────────────────────────   ────────────────────────────────────────
 *   GSAP                              Motion
 *   ───────────────────────────────   ────────────────────────────────────────
 *   dialog                            dialog
 *   └ backdrop                        └ backdrop
 *   └ drag       (transform)          └ centring div  (no transform)
 *     └ surface  (w/h/left/top)         └ surface     (layoutId + drag)
 *       └ window (scale + opacity)        └ tint      (the trigger's colour)
 *                                         └ window    (scaleX/scaleY, opacity)
 *   (+ an invisible placeholder over the trigger, paired by layoutId)
 *
 * The GSAP build separates the drag from the morph so the gesture and Flip
 * never write to the same element. Motion wants the opposite: `drag` and
 * `layoutId` belong on the SAME element, because a transformed ancestor is a
 * coordinate space projection has to unwind, and it unwinds the scale but not
 * an off-centre transform-origin — which is exactly what a grab-point origin
 * is. Put the drag one layer up and the close after a drag lands tens of pixels
 * away from the trigger, silently.
 *
 * The layer counts now match. `window` still carries two scale axes rather than
 * one, because it has to undo the projection's non-uniform scale on the way to
 * being a miniature — but it writes them as a single composed `transform`
 * string, because Motion applies individual transforms through CSS variables
 * and this value is rewritten on every frame.
 * ------------------------------------------------------------------------- */

type Ctx = ReturnType<typeof useMorphDialog> & {
  titleId: string
  descriptionId: string
  hasTitle: boolean
  hasDescription: boolean
  setHasTitle: React.Dispatch<React.SetStateAction<boolean>>
  setHasDescription: React.Dispatch<React.SetStateAction<boolean>>
}

const EssentialDialogContext = React.createContext<Ctx | null>(null)

/* Exported under the same name as the GSAP build's, so a call site that reaches
   into the context does not care which engine is underneath it. */
function useEssentialDialog() {
  const ctx = React.useContext(EssentialDialogContext)
  if (!ctx) {
    throw new Error(
      "EssentialDialog components must be used inside <EssentialDialog>."
    )
  }
  return ctx
}

/* -------------------------------------------------------------------- root -- */

export type EssentialDialogProps = MorphDialogOptions & {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
}

function EssentialDialog({
  children,
  open: openProp,
  defaultOpen,
  ...options
}: EssentialDialogProps) {
  const morph = useMorphDialog(options)
  const [hasTitle, setHasTitle] = React.useState(false)
  const [hasDescription, setHasDescription] = React.useState(false)
  const id = React.useId()

  /* The morph still owns the <dialog>'s showModal/close and still measures live
     geometry, so a controlled `open` drives those calls rather than rendering a
     different tree — unchanged from the GSAP build. */
  React.useEffect(() => {
    if (openProp === undefined) return
    if (openProp) morph.open()
    else morph.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProp])

  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    if (defaultOpen && openProp === undefined) morph.open()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = React.useMemo<Ctx>(
    () => ({
      ...morph,
      titleId: `essential-dialog-title-${id}`,
      descriptionId: `essential-dialog-description-${id}`,
      hasTitle,
      hasDescription,
      setHasTitle,
      setHasDescription,
    }),
    [morph, id, hasTitle, hasDescription]
  )

  return (
    <EssentialDialogContext.Provider value={value}>
      {children}
    </EssentialDialogContext.Provider>
  )
}

/* ----------------------------------------------------------------- compose -- */

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") ref(node)
      else (ref as React.RefObject<T | null>).current = node
    }
  }
}

function withRender(
  render: React.ReactElement,
  ours: Record<string, unknown>,
  className?: string,
  attach?: React.Ref<never>,
  children?: React.ReactNode
) {
  const theirs = render.props as Record<string, unknown> & {
    ref?: React.Ref<never>
    className?: string
  }
  const merged: Record<string, unknown> = { ...ours }

  if (attach) merged.ref = mergeRefs(theirs.ref, attach)
  if (children !== undefined) merged.children = children

  for (const key of Object.keys(ours)) {
    const mine = ours[key]
    const yours = theirs[key]
    if (
      key.startsWith("on") &&
      typeof mine === "function" &&
      typeof yours === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        ;(yours as (...a: unknown[]) => void)(...args)
        ;(mine as (...a: unknown[]) => void)(...args)
      }
    }
  }
  merged.className = cn(theirs.className, className)

  return React.cloneElement(render, merged)
}

/* ----------------------------------------------------------------- trigger -- */

export type EssentialDialogTriggerProps = React.ComponentProps<"button"> & {
  render?: React.ReactElement
}

function EssentialDialogTrigger({
  render,
  className,
  onClick,
  children,
  ...props
}: EssentialDialogTriggerProps) {
  const ctx = useEssentialDialog()
  const { open, isOpen, layoutId, closeTransition, debug, values } = ctx
  const {
    trigger: triggerRef,
    triggerHost: triggerHostRef,
    origin: originRef,
  } = ctx.refs

  const shared = {
    "data-slot": "essential-dialog-trigger",
    "aria-haspopup": "dialog" as const,
    "data-state": isOpen ? "open" : "closed",
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) open()
    },
  }

  /* THE ONE STRUCTURAL COMPROMISE OF THE MOTION ROUTE.
   *
   * A shared layout transition needs a real, measurable node on BOTH sides of
   * the morph, paired by layoutId — Motion has no way to be handed a bare
   * DOMRect the way Flip.getState can. The GSAP build could put the origin
   * straight on the trigger and wrap it in `display: contents`, which occupies
   * no box and changes nothing about the page. Here the trigger needs a
   * positioned parent so an invisible placeholder can be stretched over it, so
   * the wrapper becomes a real box: `inline-grid`, which sizes to the button and
   * makes it the only grid item, but is not free — it is an inline-level box of
   * its own, so baseline alignment and any `:has`/sibling selector aimed at the
   * button from outside will see the wrapper first.
   *
   * ALWAYS MOUNTED, and that is not cosmetic. Unmount it while the dialog is up
   * and the close silently stops animating: when the surface is removed, Motion
   * looks for a previous lead in the layoutId stack to hand the box back to, and
   * a placeholder that is being created in the same commit has never been lead,
   * so there is nothing to hand it to. The surface then sits at full size for
   * the length of the exit and vanishes. Kept mounted, it is the previous lead,
   * `relegate()` succeeds, and the surface shrinks home.
   */
  const placeholder = (
    <motion.div
      ref={originRef}
      layoutId={layoutId}
      /* Governs the CLOSE: in a shared transition the transition of the element
         being animated TO is the one that runs, and on the way out that element
         is this placeholder. */
      transition={closeTransition}
      /* The colour is a motion value because it has to TRAVEL: a shared layout
         transition carries the outgoing element's motion values across and
         nothing else, and this is how the trigger's colour reaches the morph.

         The radius is deliberately NOT here. Hand Motion an animatable radius on
         this element and it tweens the surface's corner from it — two numbers,
         linearly — which is exactly the squaring-off the per-frame derivation in
         fitFrame exists to prevent. It is written straight to the DOM instead;
         see the effect in the hook. */
      style={{ backgroundColor: values.originBackground }}
      aria-hidden
      data-slot="essential-dialog-origin"
      className={cn(
        "pointer-events-none absolute inset-0 opacity-0",
        debug && "opacity-100 outline-2 outline-dashed outline-rose-500/70"
      )}
    />
  )

  if (render) {
    const { onClick: openOnClick, ...attrs } = shared
    return (
      <span
        ref={triggerHostRef}
        className="relative inline-grid"
        data-slot="essential-dialog-trigger-host"
        onClick={openOnClick}
      >
        {React.isValidElement(render)
          ? withRender(
              render,
              attrs,
              className,
              /* eslint-disable-next-line react-hooks/refs -- a callback ref,
                 forwarded straight into cloneElement; no ref value is read. */
              triggerRef as unknown as React.Ref<never>,
              children
            )
          : render}
        {placeholder}
      </span>
    )
  }

  return (
    <span className="relative inline-grid">
      <button
        ref={triggerRef}
        type="button"
        className={className}
        {...shared}
        {...props}
      >
        {children}
      </button>
      {placeholder}
    </span>
  )
}

/* ------------------------------------------------------------------- close -- */

export type EssentialDialogCloseProps = React.ComponentProps<"button"> & {
  render?: React.ReactElement
}

function EssentialDialogClose({
  render,
  className,
  onClick,
  children,
  ...props
}: EssentialDialogCloseProps) {
  const { close } = useEssentialDialog()

  const shared = {
    "data-slot": "essential-dialog-close",
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) close()
    },
  }

  if (render) {
    const { onClick: closeOnClick, ...attrs } = shared
    return (
      <span className="contents" onClick={closeOnClick}>
        {React.isValidElement(render)
          ? withRender(render, attrs, className, undefined, children)
          : render}
      </span>
    )
  }

  return (
    <button type="button" className={className} {...shared} {...props}>
      {children}
    </button>
  )
}

/**
 * Renders nothing, and exists only to keep AnimatePresence from removing the
 * surface too early.
 *
 * AnimatePresence lets a child go as soon as it has nothing left to animate, and
 * a shared layout animation on its own does not reliably hold it — the surface
 * gets pulled out of the DOM partway through the close and the last of the morph
 * is simply missing. The usual workaround is to give the element an `exit` that
 * animates something for the right length of time, which means keeping a
 * decorative layer alive purely to burn a duration. `usePresence` says the same
 * thing directly: not yet, ask me again in closeDuration.
 */
function HoldPresence({ ms }: { ms: number }) {
  const [isPresent, safeToRemove] = usePresence()
  React.useEffect(() => {
    if (isPresent) return
    const id = setTimeout(() => safeToRemove?.(), ms * 1000)
    return () => clearTimeout(id)
  }, [isPresent, safeToRemove, ms])
  return null
}

/* ----------------------------------------------------------------- content -- */

/* The surface IS a motion.div, so the handful of DOM props whose names Motion
   has claimed for its own gesture and animation callbacks are off the table. */
export type EssentialDialogContentProps = Omit<
  React.ComponentProps<"div">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "style"
> & {
  windowClassName?: string
  backdropClassName?: string
  showCloseButton?: boolean
}

function EssentialDialogContent({
  className,
  windowClassName,
  backdropClassName,
  children,
  showCloseButton = true,
  ...props
}: EssentialDialogContentProps) {
  const ctx = useEssentialDialog()
  const {
    isOpen,
    close,
    layoutId,
    fullscreen,
    debug,
    openTransition,
    holdMs,
    onExitComplete,
    dismissHandlers,
    values,
    dragControls,
    startDrag,
    onDrag,
    onDragEnd,
    onMorphStart,
    draggable,
  } = ctx
  const {
    dialog: dialogRef,
    surface: surfaceRef,
    window: windowRef,
  } = ctx.refs

  return (
    <dialog
      ref={dialogRef}
      data-slot="essential-dialog"
      data-state={isOpen ? "open" : "closed"}
      data-debug={debug ? "true" : undefined}
      data-fullscreen={fullscreen ? "true" : undefined}
      aria-labelledby={ctx.hasTitle ? ctx.titleId : undefined}
      aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      /* Both halves of the outside click live on the <dialog>, because every
         layer that counts as "outside" — the backdrop, the centring div — is a
         descendant of it and the events bubble here. */
      {...dismissHandlers}
      className={cn(
        "fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-[100vw] overflow-visible border-0 bg-transparent p-0 text-inherit",
        "backdrop:bg-transparent",
        /* Not decorative — the hook reads the resting radius off this element,
           because the surface's own is an inline motion value by then. It is
           transparent and borderless, so a radius on it paints nothing. */
        "rounded-(--essential-dialog-radius)"
      )}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            data-slot="essential-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.12, ease: "linear" } }}
            exit={{
              opacity: 0,
              transition: { duration: 0.25, ease: "easeIn", delay: 0.1 },
            }}
            className={cn(
              "absolute inset-0 z-0 bg-(--essential-dialog-backdrop)",
              debug && "outline-1 outline-dashed outline-sky-400/60",
              backdropClassName
            )}
          />
        )}
      </AnimatePresence>

      {/* Nothing but centring. The GSAP build's equivalent layer carries the
          drag transform; here the drag lives on the surface itself and this is
          deliberately left untransformed — see the note at the top of the
          file. */}
      <div
        data-slot="essential-dialog-centre"
        className={cn(
          "absolute inset-0 grid place-items-center",
          debug && "outline-1 outline-dashed outline-amber-400/60"
        )}
      >
        <AnimatePresence onExitComplete={onExitComplete}>
          {isOpen && (
            <motion.div
              key="surface"
              ref={surfaceRef}
              layoutId={layoutId}
              layoutCrossfade={false}
              /* Off, or the dialog fades in as it grows and fades out as it
                 shrinks — the crossfade is Motion's default because it is
                 hiding a mismatch between two different elements, and here the
                 two elements are the same box. */
              /* Governs the OPEN: the element being animated TO is this one. */
              transition={openTransition}
              onLayoutAnimationStart={onMorphStart}
              data-slot="essential-dialog-content"
              data-fullscreen={fullscreen ? "true" : undefined}
              onPointerDown={startDrag}
              drag={draggable}
              dragListener={false}
              dragControls={dragControls}
              dragMomentum={false}
              onDrag={onDrag}
              onDragEnd={onDragEnd}
              /* backgroundColor is a motion value this component does not own —
                 see the note on surfaceBackground in the hook — so that the
                 surface can be handed back to CSS once it has arrived. */
              style={{
                x: values.dragX,
                y: values.dragY,
                scale: values.dragScale,
                backgroundColor: values.surfaceBackground,
              }}
              className={cn(
                "relative z-[1] box-border flex w-(--essential-dialog-width) max-h-(--essential-dialog-max-height) flex-col",
                "cursor-grab touch-none overflow-hidden active:cursor-grabbing motion-reduce:cursor-default",
                /* The radius CSS rests at. The hook overwrites it inline for the
                   length of the morph and clears it again on arrival. */
                "rounded-(--essential-dialog-radius)",
                fullscreen && "rounded-none",
                "bg-(--essential-dialog-surface) text-(color:--essential-dialog-foreground) shadow-(--essential-dialog-shadow)",
                fullscreen && "h-dvh max-h-none w-screen max-w-none",
                debug && "outline-2 outline-fuchsia-500/80",
                className
              )}
              {...props}
            >
              <HoldPresence ms={holdMs} />

              {/* The miniature. Scale and opacity are derived from the live
                  box every frame, exactly as in the GSAP build — this is the
                  part Motion has no primitive for, and the reason the hook
                  still runs a measurement loop.

                  The two scale axes differ because this one layer is doing two
                  jobs at once: undoing the projection's non-uniform scale, and
                  shrinking the result to a uniform miniature. Motion's own child
                  counter-scale (`layout` on this element) does the first job but
                  anchors the result to the box's corner rather than its centre,
                  which is wrong for a dialog shrinking into a button. */}
              <motion.div
                ref={windowRef}
                layoutScroll
                data-slot="essential-dialog-window"
                data-fullscreen={fullscreen ? "true" : undefined}
                /* A composed string rather than `scaleX`/`scaleY`: Motion
                   applies individual transforms through CSS variables so they
                   can be set independently, and on a value written every frame
                   that indirection is pure cost. `transform` and `opacity` are
                   also the two properties every engine accelerates. */
                style={{
                  transform: values.contentTransform,
                  opacity: values.contentOpacity,
                }}
                className={cn(
                  "relative flex min-h-0 flex-1 origin-center flex-col gap-(--essential-dialog-gap) overflow-auto overscroll-contain p-(--essential-dialog-padding) text-sm",
                  fullscreen &&
                    "pt-[calc(var(--essential-dialog-padding)+env(safe-area-inset-top))] pr-[calc(var(--essential-dialog-padding)+env(safe-area-inset-right))] pb-[calc(var(--essential-dialog-padding)+env(safe-area-inset-bottom))] pl-[calc(var(--essential-dialog-padding)+env(safe-area-inset-left))]",
                  debug && "outline-1 outline-emerald-400/80",
                  /* The gesture is claimed here, not on the surface: a touch
                     lands on the content, and Chrome cancels the pointer if the
                     element under the finger allows panning. Once the content
                     overflows, scrolling wins the vertical axis back. */
                  "touch-none data-[scrollable=true]:touch-pan-y",
                  /* Media never answers a drag with a drag of its own. The
                     pointerdown is already defaulted away, but a selection that
                     started outside the dialog and was dragged in still lands
                     here, and WebKit treats an image as draggable independently
                     of the selection. */
                  "[&_img]:[-webkit-user-drag:none] [&_video]:[-webkit-user-drag:none] [&_img]:select-none [&_video]:select-none",
                  "pointer-coarse:[&_input]:text-[max(16px,1rem)] pointer-coarse:[&_textarea]:text-[max(16px,1rem)] pointer-coarse:[&_select]:text-[max(16px,1rem)]",
                  "[&_input]:touch-auto [&_textarea]:touch-auto [&_select]:touch-auto [&_button]:touch-auto [&_a]:touch-auto [&_label]:touch-auto",
                  windowClassName
                )}
              >
                  {children}
                  {showCloseButton && (
                    <EssentialDialogClose
                      aria-label="Close"
                      className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full opacity-60 transition-opacity after:absolute after:-inset-1.5 after:content-[''] hover:opacity-100"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="size-4"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </EssentialDialogClose>
                  )}
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </dialog>
  )
}

/* -------------------------------------------------------------- structure -- */

function EssentialDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="essential-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function EssentialDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="essential-dialog-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function EssentialDialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  const { titleId, setHasTitle } = useEssentialDialog()
  React.useEffect(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [setHasTitle])

  return (
    <h2
      id={titleId}
      data-slot="essential-dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function EssentialDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { descriptionId, setHasDescription } = useEssentialDialog()
  React.useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])

  return (
    <p
      id={descriptionId}
      data-slot="essential-dialog-description"
      className={cn(
        "text-sm text-(color:--essential-dialog-muted-foreground)",
        className
      )}
      {...props}
    />
  )
}

export {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogDescription,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
  useEssentialDialog,
}
