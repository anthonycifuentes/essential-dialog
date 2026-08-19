import { readFileSync } from "node:fs"
import path from "node:path"

import { ApiReference } from "@/components/showcase/api-reference"
import { DebugDemo } from "@/components/showcase/demos/debug-demo"
import { NewTransactionDialog } from "@/components/showcase/demos/new-transaction-dialog"
import { Install } from "@/components/showcase/install"
import { Panel, Section } from "@/components/showcase/panel"
import { PreviewTabs } from "@/components/showcase/preview-tabs"
import { ThemeToggle } from "@/components/showcase/theme-toggle"
import { EssentialDialogDemo } from "@/registry/essential-dialog-demo/components/essential-dialog-demo"

const REGISTRY_URL = "https://essential-dialog.vercel.app/r/{name}.json"

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
        description="Add it with the shadcn CLI, or copy the source manually. GSAP is the only runtime dependency — Flip and CustomEase have been free since 3.13."
      >
        <Install registryUrl={REGISTRY_URL} />
      </Section>

      <Section
        title="Themed with CSS variables"
        description="Same component, different knobs: --essential-dialog-radius, --essential-dialog-width, --essential-dialog-padding, --essential-dialog-backdrop. The trigger's radius is half its height, never 999px — a radius clamps to half the shorter side, so a pill radius renders as a circle at every intermediate size on the way up."
      >
        <Panel hint="Both buttons open the same dialog — each morph grows out of the shape you pressed. Drag the panel anywhere and release past 100px, or flick it, to dismiss.">
          <NewTransactionDialog />
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
