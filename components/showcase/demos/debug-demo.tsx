"use client"

import * as React from "react"

import { Slider } from "@/components/ui/slider"
import { NewTransactionDialog } from "@/components/showcase/demos/new-transaction-dialog"

const LAYERS = [
  { label: "backdrop", swatch: "bg-sky-400/70" },
  { label: "drag wrapper", swatch: "bg-amber-400/70" },
  { label: "surface", swatch: "bg-fuchsia-500/80" },
  { label: "window", swatch: "bg-emerald-400/80" },
]

export function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
  /** Seconds for a duration; pass "" for a unitless knob like a spring's bounce. */
  unit = "s",
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-4 font-mono text-xs text-muted-foreground">
        {label}
        <span className="text-foreground tabular-nums">
          {value.toFixed(2)}
          {unit}
        </span>
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? next[0] : (next as number))
        }
      />
    </label>
  )
}

/* Both booleans read the same way, so they get the same control: the label names
   the prop and the value is the value, rather than a switch you have to map back
   to an API. */
export function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={value}
      className="inline-flex min-h-10 items-center rounded-lg border px-3 font-mono text-[11px] text-muted-foreground transition-[transform,background-color,color] hover:bg-muted hover:text-foreground active:scale-[0.96]"
    >
      {label}: <span className="ml-1 text-foreground">{String(value)}</span>
    </button>
  )
}

export function DebugDemo() {
  const [openDuration, setOpenDuration] = React.useState(0.7)
  const [closeDuration, setCloseDuration] = React.useState(0.45)
  const [draggable, setDraggable] = React.useState(true)
  const [hideTrigger, setHideTrigger] = React.useState(true)

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Control
            label="openDuration"
            value={openDuration}
            min={0.1}
            max={2}
            step={0.05}
            onChange={setOpenDuration}
          />
          <Control
            label="closeDuration"
            value={closeDuration}
            min={0.1}
            max={2}
            step={0.05}
            onChange={setCloseDuration}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {LAYERS.map((layer) => (
              <span
                key={layer.label}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
              >
                <span className={`size-2 rounded-full ${layer.swatch}`} />
                {layer.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              label="draggable"
              value={draggable}
              onToggle={() => setDraggable((value) => !value)}
            />
            <Toggle
              label="hideTrigger"
              value={hideTrigger}
              onToggle={() => setHideTrigger((value) => !value)}
            />
          </div>
        </div>
      </div>

      <NewTransactionDialog
        debug
        draggable={draggable}
        hideTrigger={hideTrigger}
        openDuration={openDuration}
        closeDuration={closeDuration}
      />
    </div>
  )
}
