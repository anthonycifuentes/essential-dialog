"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  useMorphDialog,
  type MorphDialogOptions,
  type MorphDialogRefs,
} from "@/registry/essential-dialog/hooks/use-morph-dialog"

/* ---------------------------------------------------------------------------
 * essential-dialog — a native <dialog> that morphs out of its own trigger.
 *
 * The API mirrors shadcn/ui's Dialog (Trigger / Content / Header / Title /
 * Description / Footer / Close, `render` for composition) so it drops into an
 * existing Dialog call site. Nothing inside imports from components/ui: the
 * children you pass are the only opinion about how it looks.
 *
 * Everything visual is a CSS variable — see the `cssVars` in registry.json.
 * ------------------------------------------------------------------------- */

type EssentialDialogContextValue = {
  open: boolean
  debug: boolean
  fullscreen: boolean
  openDialog: () => void
  closeDialog: () => void
  refs: MorphDialogRefs
  isDismissTarget: (target: EventTarget | null) => boolean
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void
  }
  titleId: string
  descriptionId: string
  hasTitle: boolean
  hasDescription: boolean
  setHasTitle: React.Dispatch<React.SetStateAction<boolean>>
  setHasDescription: React.Dispatch<React.SetStateAction<boolean>>
}

const EssentialDialogContext =
  React.createContext<EssentialDialogContextValue | null>(null)

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
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean
  /** Open on mount. Uncontrolled only. */
  defaultOpen?: boolean
}

function EssentialDialog({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  openDuration,
  closeDuration,
  dismissDistance,
  dismissSpeed,
  dragFalloff,
  draggable,
  hideTrigger,
  fullscreen,
  debug,
}: EssentialDialogProps) {
  const morph = useMorphDialog({
    openDuration,
    closeDuration,
    dismissDistance,
    dismissSpeed,
    dragFalloff,
    draggable,
    hideTrigger,
    fullscreen,
    debug,
    onOpenChange,
  })

  const [hasTitle, setHasTitle] = React.useState(false)
  const [hasDescription, setHasDescription] = React.useState(false)
  const id = React.useId()

  /* The morph is imperative — it measures live geometry and owns the <dialog>'s
     showModal/close. So a controlled `open` drives those calls rather than
     rendering a different tree. */
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

  const value = React.useMemo<EssentialDialogContextValue>(
    () => ({
      open: morph.isOpen,
      debug: morph.debug,
      fullscreen: morph.fullscreen,
      openDialog: morph.open,
      closeDialog: morph.close,
      refs: morph.refs,
      isDismissTarget: morph.isDismissTarget,
      dragHandlers: morph.dragHandlers,
      titleId: `essential-dialog-title-${id}`,
      descriptionId: `essential-dialog-description-${id}`,
      hasTitle,
      hasDescription,
      setHasTitle,
      setHasDescription,
    }),
    [
      morph.isOpen,
      morph.debug,
      morph.fullscreen,
      morph.open,
      morph.close,
      morph.refs,
      morph.isDismissTarget,
      morph.dragHandlers,
      id,
      hasTitle,
      hasDescription,
    ]
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

/**
 * Clone `render` with our props, keeping whatever it already declared. The ref is
 * a separate argument rather than a key in `ours`: react-hooks/refs objects to a
 * ref travelling inside a plain object into a function call.
 */
function withRender(
  render: React.ReactElement,
  ours: Record<string, unknown>,
  className?: string,
  attach?: (el: never | null) => void,
  children?: React.ReactNode
) {
  const theirs = render.props as Record<string, unknown> & {
    ref?: React.Ref<never>
    className?: string
  }
  const merged: Record<string, unknown> = { ...ours }

  if (attach) merged.ref = mergeRefs(theirs.ref, attach)
  /* Children passed to the part rather than to the render element win, so both
     `render={<Button>Open</Button>}` and `render={<Button />}>Open<` work. */
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
  /** Render as your own element, e.g. `render={<Button variant="outline" />}`. */
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
  const { openDialog, open } = ctx
  /* Destructured, not read inline: react-hooks/refs follows ref-ness through a
     member expression but not through destructuring. */
  const { trigger: triggerRef, triggerHost: triggerHostRef } = ctx.refs

  /* The trigger is the origin of the morph: Flip records this element's live
     geometry, colour and radius, so it has to be the real DOM node. */
  const shared = {
    "data-slot": "essential-dialog-trigger",
    "aria-haspopup": "dialog" as const,
    /* deliberately no aria-expanded: it is not the right state for a modal, and
       shadcn's Button styles aria-expanded triggers with a different background
       — which Flip would then read as the origin colour on the way out. */
    "data-state": open ? "open" : "closed",
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) openDialog()
    },
  }

  if (render) {
    /* A `render` element is always wrapped in a display:contents span — no box of
       its own, so it changes nothing about layout, and the click bubbles up to
       it. The wrapper is what makes this work with elements created in a Server
       Component: those cross the RSC boundary as lazy references whose props
       cannot be read, so they cannot be cloned. When the element IS clonable we
       still clone it, to put the slot attributes and the ref on the real button
       — but the structure stays the same either way, so server and client never
       disagree during hydration. */
    const { onClick: openOnClick, ...attrs } = shared
    return (
      <span
        ref={triggerHostRef}
        className="contents"
        data-slot="essential-dialog-trigger-host"
        onClick={openOnClick}
      >
        {React.isValidElement(render)
          ? /* eslint-disable-next-line react-hooks/refs -- triggerRef is a
               callback ref, forwarded straight into cloneElement. No ref value
               is read here. */
            withRender(render, attrs, className, triggerRef as never, children)
          : render}
      </span>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className={className}
      {...shared}
      {...props}
    >
      {children}
    </button>
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
  const { closeDialog } = useEssentialDialog()

  const shared = {
    "data-slot": "essential-dialog-close",
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) closeDialog()
    },
  }

  if (render) {
    // Same wrapper, same reason — see EssentialDialogTrigger.
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

/* ----------------------------------------------------------------- content -- */

export type EssentialDialogContentProps = React.ComponentProps<"div"> & {
  /** Classes for the scrolling content box inside the morphing surface. */
  windowClassName?: string
  /** Classes for the backdrop element. */
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
  const { closeDialog, dragHandlers, isDismissTarget } = ctx
  /* Destructured, not read inline: react-hooks/refs rejects a member expression
     in a ref attribute. */
  const {
    dialog: dialogRef,
    backdrop: backdropRef,
    drag: dragElRef,
    surface: surfaceRef,
    window: windowRef,
  } = ctx.refs

  return (
    <dialog
      ref={dialogRef}
      data-slot="essential-dialog"
      data-state={ctx.open ? "open" : "closed"}
      data-debug={ctx.debug ? "true" : undefined}
      data-fullscreen={ctx.fullscreen ? "true" : undefined}
      aria-labelledby={ctx.hasTitle ? ctx.titleId : undefined}
      aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
      onCancel={(event) => {
        // Escape: cancel the browser's instant close and morph home instead.
        event.preventDefault()
        closeDialog()
      }}
      onClick={(event) => {
        if (isDismissTarget(event.target)) closeDialog()
      }}
      className={cn(
        "fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-[100vw] overflow-visible border-0 bg-transparent p-0 text-inherit",
        // the real backdrop is the element below: ::backdrop cannot be reached
        // from JS, and its opacity has to track the drag frame by frame
        "backdrop:bg-transparent"
      )}
    >
      <div
        ref={backdropRef}
        data-slot="essential-dialog-backdrop"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 bg-(--essential-dialog-backdrop) opacity-0",
          ctx.debug && "outline-1 outline-dashed outline-sky-400/60",
          backdropClassName
        )}
      />

      {/* carries the drag transform, so the gesture and Flip never write to the
          same properties on the same element */}
      <div
        ref={dragElRef}
        data-slot="essential-dialog-drag"
        className={cn(
          "absolute inset-0 grid place-items-center",
          ctx.debug && "outline-1 outline-dashed outline-amber-400/60"
        )}
      >
        {/* the growing box — real width/height, so its radius stays a radius */}
        <div
          ref={surfaceRef}
          data-slot="essential-dialog-content"
          data-fullscreen={ctx.fullscreen ? "true" : undefined}
          {...dragHandlers}
          className={cn(
            /* A flex column so the window below can shrink: capped by max-height,
               the surface's auto height still measures the content exactly, and
               anything taller than the cap scrolls inside instead of being
               clipped out of reach. */
            "relative z-[1] box-border flex flex-col w-(--essential-dialog-width) max-h-(--essential-dialog-max-height)",
            /* No will-change here: this box animates width, height, left and top,
               none of which a compositor hint helps. The drag wrapper is what
               transforms, and it advertises that for the length of the gesture. */
            "cursor-grab touch-none overflow-hidden active:cursor-grabbing motion-reduce:cursor-default",
            "rounded-(--essential-dialog-radius) bg-(--essential-dialog-surface) text-(color:--essential-dialog-foreground) shadow-(--essential-dialog-shadow)",
            /* Fullscreen only changes the box the morph lands in — the CSS
               variables still theme it, and every gesture behaves the same. */
            ctx.fullscreen &&
              "h-dvh max-h-none w-screen max-w-none rounded-none",
            // debug: the surface is the box Flip animates; the window is what
            // gets scaled and faded inside it
            ctx.debug && "outline-2 outline-fuchsia-500/80",
            className
          )}
          {...props}
        >
          {/* Stays in normal flow — declaring position:absolute here would
              collapse the surface's auto height before it can be measured and
              the dialog would never grow. The controller positions it
              absolutely only for the duration of the morph. */}
          <div
            ref={windowRef}
            data-slot="essential-dialog-window"
            data-fullscreen={ctx.fullscreen ? "true" : undefined}
            className={cn(
              "flex min-h-0 flex-1 origin-center flex-col gap-(--essential-dialog-gap) overflow-auto overscroll-contain p-(--essential-dialog-padding) text-sm",
              "rounded-(--essential-dialog-radius) bg-(--essential-dialog-surface)",
              /* Edge to edge means the notch and the home indicator are now
                 the component's problem. */
              ctx.fullscreen &&
                "pt-[calc(var(--essential-dialog-padding)+env(safe-area-inset-top))] pr-[calc(var(--essential-dialog-padding)+env(safe-area-inset-right))] pb-[calc(var(--essential-dialog-padding)+env(safe-area-inset-bottom))] pl-[calc(var(--essential-dialog-padding)+env(safe-area-inset-left))]",
              ctx.debug && "outline-1 outline-emerald-400/80",
              /* The gesture is claimed here, not on the surface: a touch lands
                 on the content, and Chrome cancels the pointer if the element
                 under the finger allows panning. Once the content overflows,
                 scrolling wins the vertical axis back. */
              "touch-none data-[scrollable=true]:touch-pan-y",
              // interactive children own their own gestures
              "[&_input]:touch-auto [&_textarea]:touch-auto [&_select]:touch-auto [&_button]:touch-auto [&_a]:touch-auto [&_label]:touch-auto",
              windowClassName
            )}
          >
            {children}
            {showCloseButton && (
              <EssentialDialogClose
                aria-label="Close"
                className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 after:absolute after:-inset-1.5 after:content-['']"
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
          </div>
        </div>
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
