"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogDescription,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
} from "@/registry/essential-dialog/components/essential-dialog"

const LAYERS = [
  { label: "backdrop", swatch: "bg-sky-400/70" },
  { label: "drag wrapper", swatch: "bg-amber-400/70" },
  { label: "surface", swatch: "bg-fuchsia-500/80" },
  { label: "window", swatch: "bg-emerald-400/80" },
]

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between font-mono text-xs text-muted-foreground">
        {label}
        <span className="text-foreground">{value.toFixed(2)}s</span>
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

export function DebugDemo() {
  const [openDuration, setOpenDuration] = React.useState(0.7)
  const [closeDuration, setCloseDuration] = React.useState(0.45)
  const [draggable, setDraggable] = React.useState(true)

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
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
        <button
          type="button"
          onClick={() => setDraggable((value) => !value)}
          className="rounded-lg border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          draggable: {String(draggable)}
        </button>
      </div>

      <EssentialDialog
        debug
        draggable={draggable}
        openDuration={openDuration}
        closeDuration={closeDuration}
      >
        <EssentialDialogTrigger
          render={
            <Button variant="outline" className="w-full">
              Open with debug
            </Button>
          }
        />
        <EssentialDialogContent>
          <EssentialDialogHeader>
            <EssentialDialogTitle>Layers</EssentialDialogTitle>
            <EssentialDialogDescription>
              Open the console: the origin and target boxes, live coverage and the
              distance and speed each drag release was judged on are all logged as
              they happen.
            </EssentialDialogDescription>
          </EssentialDialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
            <dt>openDuration</dt>
            <dd className="text-foreground">{openDuration.toFixed(2)}s</dd>
            <dt>closeDuration</dt>
            <dd className="text-foreground">{closeDuration.toFixed(2)}s</dd>
            <dt>draggable</dt>
            <dd className="text-foreground">{String(draggable)}</dd>
          </dl>
          <EssentialDialogFooter>
            <EssentialDialogClose
              render={<Button variant="outline">Close</Button>}
            />
          </EssentialDialogFooter>
        </EssentialDialogContent>
      </EssentialDialog>
    </div>
  )
}
