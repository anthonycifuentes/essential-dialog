import { readFileSync } from "node:fs"
import path from "node:path"

import { ApiReference } from "@/components/showcase/api-reference"
import { DebugDemo } from "@/components/showcase/demos/debug-demo"
import { FullscreenDemo } from "@/components/showcase/demos/fullscreen-demo"
import { NewTransactionDialog } from "@/components/showcase/demos/new-transaction-dialog"
import { Install } from "@/components/showcase/install"
import { Panel, Section } from "@/components/showcase/panel"
import { PreviewTabs } from "@/components/showcase/preview-tabs"
import { ThemeToggle } from "@/components/showcase/theme-toggle"
import { EssentialDialogDemo } from "@/registry/essential-dialog-demo/components/essential-dialog-demo"

const USAGE = `import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  EssentialDialog,
  EssentialDialogClose,
  EssentialDialogContent,
  EssentialDialogDescription,
  EssentialDialogFooter,
  EssentialDialogHeader,
  EssentialDialogTitle,
  EssentialDialogTrigger,
} from "@/components/ui/essential-dialog"

export function Demo() {
  return (
    <EssentialDialog>
      <EssentialDialogTrigger render={<Button variant="outline">Open Dialog</Button>} />
      <EssentialDialogContent>
        <EssentialDialogHeader>
          <EssentialDialogTitle>Edit profile</EssentialDialogTitle>
          <EssentialDialogDescription>
            Make changes to your profile here. Click save when you're done.
          </EssentialDialogDescription>
        </EssentialDialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="Pedro Duarte" />
          </Field>
        </FieldGroup>
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

export default function Home() {
  const component = source(
    "registry/essential-dialog/components/essential-dialog.tsx"
  )
  const hook = source("registry/essential-dialog/hooks/use-morph-dialog.ts")

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-14">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Essential Dialog
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            A native <code className="font-mono">&lt;dialog&gt;</code> that grows
            out of its own trigger and shrinks back into it, driven by GSAP Flip.
            Drag it anywhere to dismiss — the close morph starts from wherever you
            let go.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <PreviewTabs
        usage={USAGE}
        source={`// components/ui/essential-dialog.tsx\n\n${component}\n\n// ─────────────────────────────────────────────────────────────\n// hooks/use-morph-dialog.ts\n\n${hook}`}
        preview={
          <Panel hint="The trigger is the origin: its geometry, colour and radius are what the surface grows out of.">
            <EssentialDialogDemo />
          </Panel>
        }
      />

      <Section
        title="Install"
        description="One command against the item URL — nothing to register, and it works in a project that has never heard of this registry. GSAP is the only runtime dependency; Flip and CustomEase have been free since 3.13."
      >
        <Install />
      </Section>

      <Section
        title="Themed with CSS variables"
        description="Same component, different knobs: --essential-dialog-radius, --essential-dialog-width, --essential-dialog-padding, --essential-dialog-backdrop. Round triggers are first class: a pill or a circle keeps its roundness while it grows and only relaxes into the dialog's radius once there is enough box for a corner, because the radius is derived from the box each frame rather than tweened between two numbers."
      >
        <Panel hint="Both buttons open the same dialog — each morph grows out of the shape you pressed, pill or circle. Drag the panel anywhere and release past 100px, or flick it, to dismiss.">
          <NewTransactionDialog />
        </Panel>
      </Section>

      <Section
        title="Fullscreen"
        description="Opt into an edge-to-edge dialog: fullscreen for always, a number for a breakpoint — fullscreen while the viewport is narrower than that many px — or any media query string. Off by default. It only changes the box the morph lands in: the surface fills the viewport, drops its radius, adds the safe-area insets, and the content scrolls inside it. Because the resting dialog is laid out by CSS, crossing the breakpoint while it is open just re-lays it out."
      >
        <Panel className="min-h-[420px]">
          <FullscreenDemo />
        </Panel>
      </Section>

      <Section
        title="Debug"
        description="The same dialog as above, with debug on: every layer outlined and every measurement logged. Move the sliders to feel why closing is shorter than opening — at equal durations there is a long middle where the box is neither the dialog nor the button."
      >
        <Panel className="min-h-[420px]">
          <DebugDemo />
        </Panel>
      </Section>

      <Section
        title="API Reference"
        description="Everything is optional. The parts mirror shadcn/ui's Dialog, so an existing call site ports over by renaming the imports."
      >
        <ApiReference />
      </Section>
    </main>
  )
}
