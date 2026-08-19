"use client"

import * as React from "react"

import { NewTransactionDialog } from "@/components/showcase/demos/new-transaction-dialog"

const MODES = [
  { id: "off", label: "off", value: false as const, code: "<EssentialDialog>" },
  {
    id: "always",
    label: "always",
    value: true as const,
    code: "<EssentialDialog fullscreen>",
  },
  {
    id: "breakpoint",
    label: "below 768px",
    value: 768,
    code: "<EssentialDialog fullscreen={768}>",
  },
  {
    id: "query",
    label: "portrait",
    value: "(orientation: portrait)",
    code: '<EssentialDialog fullscreen="(orientation: portrait)">',
  },
]

export function FullscreenDemo() {
  const [mode, setMode] = React.useState(MODES[2])
  const [width, setWidth] = React.useState<number | null>(null)

  /* Only so the caption can say what the window is doing right now. */
  React.useEffect(() => {
    const read = () => setWidth(window.innerWidth)
    read()
    window.addEventListener("resize", read)
    return () => window.removeEventListener("resize", read)
  }, [])

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option)}
              data-active={option.id === mode.id ? "true" : undefined}
              className="rounded-lg border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-active:border-foreground/40 data-active:bg-muted data-active:text-foreground"
            >
              {option.label}
            </button>
          ))}
        </div>
        <code className="overflow-x-auto rounded-lg bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {mode.code}
        </code>
        <p className="font-mono text-[11px] text-muted-foreground">
          viewport: {width ?? "—"}px — resize the window to cross the breakpoint
          while the dialog is open.
        </p>
      </div>

      <NewTransactionDialog fullscreen={mode.value} />
    </div>
  )
}
