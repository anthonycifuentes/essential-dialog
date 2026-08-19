"use client"

import { PlusIcon } from "lucide-react"

import {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
} from "@/registry/essential-dialog/components/essential-dialog"

function ThemedInput(props: React.ComponentProps<"input">) {
  return (
    <input
      className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      {...props}
    />
  )
}

/**
 * Used twice on the page: plain in the theming section, and with `debug` plus the
 * duration sliders in the debug section. Same component, only props differ.
 *
 * Every radius here is a rounded rectangle, never a circle or a pill. A morph
 * looks best when the origin and the target speak the same shape language: from
 * a circle, the box has to un-round itself as well as grow, and the first third
 * of the animation reads as a blob rather than as a dialog arriving.
 */
export function NewTransactionDialog({
  debug,
  openDuration,
  closeDuration,
  draggable,
}: {
  debug?: boolean
  openDuration?: number
  closeDuration?: number
  draggable?: boolean
}) {
  return (
    <div
      data-showcase="transaction-group"
      style={
        {
          "--essential-dialog-radius": "24px",
          "--essential-dialog-width": "min(440px, calc(100vw - 48px))",
          "--essential-dialog-padding": "20px",
          "--essential-dialog-gap": "12px",
          "--essential-dialog-backdrop": "rgb(0 0 0 / 0.35)",
        } as React.CSSProperties
      }
    >
      <EssentialDialog
        debug={debug}
        openDuration={openDuration}
        closeDuration={closeDuration}
        draggable={draggable}
      >
        <EssentialDialogTrigger className="inline-flex h-12 items-center gap-2 rounded-2xl bg-foreground pr-6 pl-5 text-sm font-medium text-background">
          <PlusIcon className="size-4" strokeWidth={2} />
          New transaction
        </EssentialDialogTrigger>

        <EssentialDialogContent showCloseButton={false}>
          <EssentialDialogHeader className="rounded-2xl bg-muted/50 p-2">
            <EssentialDialogClose
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center self-start rounded-xl bg-muted text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              ✕
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
          <EssentialDialogFooter className="flex-row gap-2 *:h-12 *:flex-1 *:rounded-xl *:text-sm *:font-medium">
            <EssentialDialogClose className="bg-muted text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </EssentialDialogClose>
            <button type="button" className="bg-foreground text-background">
              Create
            </button>
          </EssentialDialogFooter>
        </EssentialDialogContent>
      </EssentialDialog>
    </div>
  )
}
