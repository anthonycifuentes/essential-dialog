"use client"

import { PlusIcon, XIcon } from "lucide-react"

import {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
} from "@/registry/essential-dialog/components/essential-dialog"

/* The GSAP build's NewTransactionDialog, part for part, on the Motion build —
   same markup, same CSS variables, same two origins. Anything that looks
   different on the page is the engine, not the demo. */

export type MotionMorphProps = {
  debug?: boolean
  openDuration?: number
  closeDuration?: number
  /** Motion only: the open is a spring, so overshoot is a number not a curve. */
  bounce?: number
  draggable?: boolean
  hideTrigger?: boolean
  dismissOnOutsideClick?: boolean
  fullscreen?: boolean | number | string
}

function ThemedInput(props: React.ComponentProps<"input">) {
  return (
    <input
      className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 md:text-sm"
      {...props}
    />
  )
}

/**
 * One dialog, two origins. The pill and the circle are separate instances of the
 * same content, so each morph grows out of the shape you actually pressed —
 * which is also why the layoutId is scoped per instance.
 *
 * Both are fully round on purpose. A round origin is the case that separates a
 * radius DERIVED from the box from one tweened between two numbers: 23.5px is a
 * circle on a 47px button and a rounding error on a 440px dialog, so anything
 * that interpolates the two squares the box off within a few frames of leaving
 * the trigger. Motion will happily do exactly that if you let it own the
 * property, so this build takes borderRadius back and writes it per frame.
 */
function TransactionDialog({
  variant,
  ...morph
}: MotionMorphProps & { variant: "pill" | "icon" }) {
  return (
    <EssentialDialog {...morph}>
      {variant === "pill" ? (
        <EssentialDialogTrigger className="inline-flex h-[47px] items-center rounded-[23.5px] bg-foreground px-6 text-sm font-medium text-background transition-transform active:scale-[0.96]">
          New transaction
        </EssentialDialogTrigger>
      ) : (
        <EssentialDialogTrigger
          aria-label="New transaction"
          className="inline-flex size-[47px] items-center justify-center rounded-full bg-muted text-muted-foreground transition-[transform,color] hover:text-foreground active:scale-[0.96]"
        >
          <PlusIcon className="size-5" strokeWidth={2} />
        </EssentialDialogTrigger>
      )}

      <EssentialDialogContent showCloseButton={false}>
        <EssentialDialogHeader className="rounded-2xl bg-muted/50 p-2">
          <EssentialDialogClose
            aria-label="Close"
            className="relative inline-flex size-9 items-center justify-center self-start rounded-full bg-muted text-muted-foreground transition-[transform,color] after:absolute after:-inset-1 after:content-[''] hover:text-foreground active:scale-[0.96]"
          >
            <XIcon className="size-4" strokeWidth={2} />
          </EssentialDialogClose>
          <EssentialDialogTitle className="p-3 text-3xl leading-none font-semibold">
            New transaction
          </EssentialDialogTitle>
        </EssentialDialogHeader>
        <ThemedInput placeholder="Description" />
        <div className="flex gap-2 *:flex-1">
          <ThemedInput placeholder="Amount" inputMode="decimal" />
          <ThemedInput placeholder="Currency" />
        </div>
        <ThemedInput placeholder="No category" />
        <ThemedInput placeholder="No account" />
        <div className="flex gap-2 *:flex-1">
          <ThemedInput placeholder="Aug 19, 2026" />
          <ThemedInput placeholder="11:52 PM" />
        </div>
        <EssentialDialogFooter className="flex-row gap-2 *:h-[47px] *:flex-1 *:rounded-full *:text-sm *:font-medium">
          <EssentialDialogClose className="bg-muted text-muted-foreground transition-[transform,color] hover:text-foreground active:scale-[0.96]">
            Cancel
          </EssentialDialogClose>
          <button
            type="button"
            className="bg-foreground text-background transition-transform active:scale-[0.96]"
          >
            Create
          </button>
        </EssentialDialogFooter>
      </EssentialDialogContent>
    </EssentialDialog>
  )
}

/** Used three times: themed, fullscreen and debug. Same component, props differ. */
export function MotionTransactionDialog(morph: MotionMorphProps) {
  return (
    <div
      data-showcase="motion-transaction-group"
      className="flex items-center gap-2 rounded-full border bg-muted/40 p-2"
      style={
        {
          /* Concentric with the 18px header card inside it: 18 + 20 padding. */
          "--essential-dialog-radius": "38px",
          "--essential-dialog-width": "min(440px, calc(100vw - 48px))",
          "--essential-dialog-padding": "20px",
          "--essential-dialog-gap": "12px",
          "--essential-dialog-backdrop": "rgb(0 0 0 / 0.35)",
        } as React.CSSProperties
      }
    >
      <TransactionDialog variant="pill" {...morph} />
      <TransactionDialog variant="icon" {...morph} />
    </div>
  )
}
