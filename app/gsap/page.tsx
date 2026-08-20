import { readFileSync } from "node:fs"
import path from "node:path"
import Link from "next/link"

import { ApiReference } from "@/components/showcase/api-reference"
import { DebugDemo } from "@/components/showcase/demos/debug-demo"
import { FullscreenDemo } from "@/components/showcase/demos/fullscreen-demo"
import { NewTransactionDialog } from "@/components/showcase/demos/new-transaction-dialog"
import { GsapDemo, MotionDemo } from "@/components/showcase/demos/compare-demos"
import { Install } from "@/components/showcase/install"
import { Panel, Section } from "@/components/showcase/panel"
import { PreviewTabs } from "@/components/showcase/preview-tabs"
import { ThemeToggle } from "@/components/showcase/theme-toggle"

export const metadata = {
  title: "essential-dialog — GSAP",
  description:
    "The same morph, driven by GSAP Flip instead of Motion's projection engine.",
}

const USAGE = `import { Button } from "@/components/ui/button"
import {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogDescription,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
} from "@/components/ui/essential-dialog-gsap"

// Identical to the Motion build from here down — same parts, same props, same
// CSS variables. The import path is the only thing that changes.
export function Demo() {
  return (
    <EssentialDialog>
      <EssentialDialogTrigger render={<Button variant="outline">Open Dialog</Button>} />
      <EssentialDialogContent>
        <EssentialDialogHeader>
          <EssentialDialogTitle>Edit profile</EssentialDialogTitle>
        </EssentialDialogHeader>
        <EssentialDialogFooter>
          <EssentialDialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button type="submit">Save changes</Button>
        </EssentialDialogFooter>
      </EssentialDialogContent>
    </EssentialDialog>
  )
}`

function source(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), "utf8")
}

export default function GsapPage() {
  const component = source(
    "registry/essential-dialog-gsap/components/essential-dialog-gsap.tsx"
  )
  const hook = source(
    "registry/essential-dialog-gsap/hooks/use-morph-dialog-gsap.ts"
  )

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-14">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Alternate engine
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Essential Dialog, on GSAP
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            The same component driven by GSAP Flip, which animates a real width
            and height rather than projecting a transform. It exports exactly the
            same names as{" "}
            <Link href="/" className="underline underline-offset-4">
              the default build
            </Link>
            , so switching engines is one import line. Reach for it if you would
            rather not add Motion, or if you want the surface relaid out every
            frame instead of scaled.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <PreviewTabs
        usage={USAGE}
        source={`// components/ui/essential-dialog-gsap.tsx\n\n${component}\n\n// ─────────────────────────────────────────────────────────────\n// hooks/use-morph-dialog-gsap.ts\n\n${hook}`}
        preview={
          <Panel hint="GSAP Flip — the surface's width and height are real at every frame.">
            <GsapDemo />
          </Panel>
        }
      />

      <Section
        title="Install"
        description="Same registry, different item. GSAP is the only runtime dependency; Flip and CustomEase have been free since 3.13."
      >
        <Install
          item="essential-dialog-gsap"
          pkg="gsap"
          hook="use-morph-dialog-gsap.ts"
          component="essential-dialog-gsap.tsx"
        />
      </Section>

      <Section
        title="Side by side"
        description="The same demo on both engines. Open each and watch the first 200ms — then the last 200ms of the close, which is where they differ most."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel hint="Motion — layoutId projection (default)">
            <MotionDemo />
          </Panel>
          <Panel hint="GSAP Flip — width/height">
            <GsapDemo />
          </Panel>
        </div>
      </Section>

      <Section
        title="Themed with CSS variables"
        description="Identical knobs to the Motion build, because nothing about the theming is engine-specific."
      >
        <Panel hint="Both buttons open the same dialog — each morph grows out of the shape you pressed.">
          <NewTransactionDialog />
        </Panel>
      </Section>

      <Section
        title="Fullscreen"
        description="Same opt-in, same three forms: true for always, a number for a breakpoint, or any media query string."
      >
        <Panel className="min-h-[420px]">
          <FullscreenDemo />
        </Panel>
      </Section>

      <Section
        title="Debug"
        description="Every layer outlined and every measurement logged. Move the sliders to feel why closing is shorter than opening — at equal durations there is a long middle where the box is neither the dialog nor the button."
      >
        <Panel className="min-h-[420px]">
          <DebugDemo />
        </Panel>
      </Section>

      <Section
        title="What the engine costs"
        description="Measured, not estimated. Bundles are esbuild builds of exactly the imports each hook uses (minified, gzipped, React external). The rest is Chrome renderer tracing over six open-and-close cycles of the same dialog — not frame deltas, which in a headless browser are synthetic and will happily report a steady 8.3ms while nothing is rendered at all."
      >
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b bg-muted/40 text-left font-mono text-[11px] text-muted-foreground">
              <tr>
                <th className="p-3 font-normal">per 6 open + close cycles</th>
                <th className="p-3 font-normal">Motion (default)</th>
                <th className="p-3 font-normal">GSAP</th>
              </tr>
            </thead>
            <tbody className="divide-y [&_td]:p-3 [&_td:not(:first-child)]:font-mono [&_td:not(:first-child)]:tabular-nums">
              <tr>
                <td className="text-muted-foreground">bundle, gzipped</td>
                <td>45.4 kB, or nothing if the app already ships Motion</td>
                <td>39.5 kB</td>
              </tr>
              <tr>
                <td className="text-muted-foreground">layout</td>
                <td>45 events · 5 ms</td>
                <td>1,024 events · 54 ms</td>
              </tr>
              <tr>
                <td className="text-muted-foreground">style recalculation</td>
                <td>1,855 · 190 ms</td>
                <td>2,197 · 137 ms</td>
              </tr>
              <tr>
                <td className="text-muted-foreground">paint</td>
                <td>2,865 · 180 ms</td>
                <td>1,931 · 157 ms</td>
              </tr>
              <tr>
                <td className="text-muted-foreground">renderer total</td>
                <td>~375 ms</td>
                <td>~348 ms</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Motion never touches width or height, so it does{" "}
          <strong className="font-medium text-foreground">
            twenty times less layout
          </strong>{" "}
          — 5 ms against 54 ms. It pays that back in paint, because more elements
          animate at once: the surface, the miniature inside it, the backdrop and
          the placeholder crossfading underneath. Net renderer time lands within
          about 8% either way, which is why the choice is really about the
          dependency you already have rather than the frame budget.
        </p>
      </Section>

      <Section
        title="Where they differ"
        description="Both morphs are measured rather than timed, so both survive being interrupted. GSAP Flip hands you the box and gets out of the way — `scale: false` gives real width and height, so the distortion class of bug does not exist and the trigger wrapper can be display:contents, costing the page nothing. Motion's projection wants to own the box, so the build around it takes the radius, both content scale axes and the settle detection back by hand, and needs an invisible placeholder in the page for the shared transition to pair against — which forces the trigger wrapper to inline-grid. What Motion gives back is a transform-based morph that never relayouts, springs as the authoring model, and no second animation library if you already have it."
      >
        <div />
      </Section>

      <Section
        title="API Reference"
        description="The same surface as the default build, minus `bounce` — the opening spring's overshoot, which only exists where the open is a spring. Everything else, dismissOnOutsideClick included, behaves identically."
      >
        <ApiReference />
      </Section>
    </main>
  )
}
