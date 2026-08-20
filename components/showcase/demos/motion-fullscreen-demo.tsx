"use client"

import * as React from "react"

import { MotionTransactionDialog } from "@/components/showcase/demos/motion-transaction-dialog"

const MODES = [
  {
    id: "off",
    label: "off",
    value: false as const,
    code: "<EssentialDialogMotion>",
  },
  {
    id: "always",
    label: "always",
    value: true as const,
    code: "<EssentialDialogMotion fullscreen>",
  },
  {
    id: "breakpoint",
    label: "below 768px",
    value: 768,
    code: "<EssentialDialogMotion fullscreen={768}>",
  },
  {
    id: "query",
    label: "portrait",
    value: "(orientation: portrait)",
    code: '<EssentialDialogMotion fullscreen="(orientation: portrait)">',
  },
]

export function MotionFullscreenDemo() {
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
        <div className="flex flex-wrap gap-2">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option)}
              data-active={option.id === mode.id ? "true" : undefined}
              className="inline-flex min-h-10 items-center rounded-lg border px-3 font-mono text-[11px] text-muted-foreground transition-[transform,background-color,color,border-color] hover:bg-muted hover:text-foreground active:scale-[0.96] data-active:border-foreground/40 data-active:bg-muted data-active:text-foreground"
            >
              {option.label}
            </button>
          ))}
        </div>
        <code className="overflow-x-auto rounded-lg bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {mode.code}
        </code>
        <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
          viewport: {width ?? "—"}px — resize the window to cross the breakpoint
          while the dialog is open.
        </p>
      </div>

      <MotionTransactionDialog fullscreen={mode.value} />
    </div>
  )
}
