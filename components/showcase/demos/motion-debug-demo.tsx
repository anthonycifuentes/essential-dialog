"use client"

import * as React from "react"

import { Control, Toggle } from "@/components/showcase/demos/debug-demo"
import { MotionTransactionDialog } from "@/components/showcase/demos/motion-transaction-dialog"

/* The Motion build's layers, in the order they stack. One of them has no
   counterpart in the GSAP build, and one the GSAP build has is missing here:
   there is no drag wrapper, because `drag` and `layoutId` have to live on the
   same element for the close after a drag to land on the trigger. */
const LAYERS = [
  { label: "backdrop", swatch: "bg-sky-400/70" },
  { label: "placeholder", swatch: "bg-rose-500/70", motionOnly: true },
  { label: "centring", swatch: "bg-amber-400/70" },
  { label: "surface", swatch: "bg-fuchsia-500/80" },
  { label: "window", swatch: "bg-emerald-400/80" },
]

export function MotionDebugDemo() {
  const [openDuration, setOpenDuration] = React.useState(0.35)
  const [closeDuration, setCloseDuration] = React.useState(0.45)
  const [bounce, setBounce] = React.useState(0.3)
  const [draggable, setDraggable] = React.useState(true)
  const [hideTrigger, setHideTrigger] = React.useState(true)
  const [dismissOnOutsideClick, setDismissOnOutsideClick] = React.useState(true)

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

        {/* Motion only. openDuration is a spring's `visualDuration` here rather
            than a tween's duration, so overshoot is a second number instead of a
            different curve — and closeDuration stays a tween, because a spring
            cannot be evenly eased and an even close is the point. */}
        <Control
          label="bounce"
          value={bounce}
          min={0}
          max={0.6}
          step={0.02}
          onChange={setBounce}
          unit=""
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {LAYERS.map((layer) => (
              <span
                key={layer.label}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
              >
                <span className={`size-2 rounded-full ${layer.swatch}`} />
                {layer.label}
                {layer.motionOnly && (
                  <span className="text-[10px] text-muted-foreground/60">
                    (Motion only)
                  </span>
                )}
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
            <Toggle
              label="dismissOnOutsideClick"
              value={dismissOnOutsideClick}
              onToggle={() => setDismissOnOutsideClick((value) => !value)}
            />
          </div>
        </div>
      </div>

      {/* No `key`: the durations are read fresh on every render and the
          transitions are props, so the sliders retune the morph in place rather
          than remounting the dialog under the gesture. */}
      <MotionTransactionDialog
        debug
        openDuration={openDuration}
        closeDuration={closeDuration}
        bounce={bounce}
        draggable={draggable}
        hideTrigger={hideTrigger}
        dismissOnOutsideClick={dismissOnOutsideClick}
      />
    </div>
  )
}
