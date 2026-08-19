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

type MorphProps = {
  debug?: boolean
  openDuration?: number
  closeDuration?: number
  draggable?: boolean
}

function ThemedInput(props: React.ComponentProps<"input">) {
  return (
    <input
      className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      {...props}
    />
  )
}

/**
 * One dialog, two origins. The pill and the circle are separate instances of the
 * same content, so each morph grows out of the shape you actually pressed —
 * which is also why the Flip id is scoped per instance.
 */
function TransactionDialog({
  variant,
  ...morph
}: MorphProps & { variant: "pill" | "icon" }) {
  return (
    <EssentialDialog {...morph}>
      {variant === "pill" ? (
        /* Half the height, never 999px: a radius clamps to half the shorter
           side, so a pill radius renders as a circle at every intermediate size
           on the way up to the dialog. */
        <EssentialDialogTrigger className="inline-flex h-[47px] items-center rounded-[23.5px] bg-foreground px-6 text-sm font-medium text-background">
          New transaction
        </EssentialDialogTrigger>
      ) : (
        <EssentialDialogTrigger
          aria-label="New transaction"
          className="inline-flex size-[47px] items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlusIcon className="size-5" strokeWidth={1.75} />
        </EssentialDialogTrigger>
      )}

      <EssentialDialogContent showCloseButton={false}>
        <EssentialDialogHeader className="rounded-2xl bg-muted/50 p-2">
          <EssentialDialogClose
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center self-start rounded-full bg-muted text-xs text-muted-foreground transition-colors hover:text-foreground"
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
        <EssentialDialogFooter className="flex-row gap-2 *:h-[47px] *:flex-1 *:rounded-full *:text-sm *:font-medium">
          <EssentialDialogClose className="bg-muted text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </EssentialDialogClose>
          <button type="button" className="bg-foreground text-background">
            Create
          </button>
        </EssentialDialogFooter>
      </EssentialDialogContent>
    </EssentialDialog>
  )
}

/**
 * Used twice on the page: plain in the theming section, and with `debug` plus
 * the duration sliders in the debug section. Same component, only props differ.
 */
export function NewTransactionDialog(morph: MorphProps) {
  return (
    <div
      data-showcase="transaction-group"
      className="flex items-center gap-2 rounded-full border bg-muted/40 p-2"
      style={
        {
          "--essential-dialog-radius": "28px",
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
