import { Button } from "@/components/ui/button"
import { EssentialDialogDemo } from "@/registry/essential-dialog-demo/components/essential-dialog-demo"
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

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          essential-dialog
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          A native <code className="font-mono">&lt;dialog&gt;</code> that grows
          out of its own trigger and shrinks back into it. Drag it anywhere to
          dismiss — release past 100px or flick it and the close morph starts
          from wherever you let go.
        </p>
        <pre className="bg-muted text-muted-foreground w-fit overflow-x-auto rounded-lg px-3 py-2 font-mono text-xs">
          npx shadcn@latest add @essential/essential-dialog
        </pre>
      </header>

      <Section
        title="shadcn parity"
        note="The shadcn/ui Dialog demo with Dialog swapped for EssentialDialog. Same Button, Field, Input and Label children — nothing else changed."
      >
        <EssentialDialogDemo />
      </Section>

      <Section
        title="Themed with CSS variables"
        note="Same component, different knobs: --essential-dialog-radius, --essential-dialog-surface, --essential-dialog-width. The trigger's radius is half its height, never 999px — a pill radius clamps to a circle at every intermediate size on the way up."
      >
        <div
          className="flex items-center gap-2 rounded-[40px] bg-[#121913] p-3"
          style={
            {
              "--essential-dialog-surface": "#141313",
              "--essential-dialog-foreground": "#e7ece6",
              "--essential-dialog-radius": "40px",
              "--essential-dialog-padding": "16px",
              "--essential-dialog-shadow": "0 0 16px rgb(0 0 0 / 0.16)",
            } as React.CSSProperties
          }
        >
          <EssentialDialog>
            <EssentialDialogTrigger className="inline-flex h-[47px] items-center rounded-[23.5px] bg-[#09ee61] px-6 text-sm font-medium text-[#04240f]">
              Crear movimiento
            </EssentialDialogTrigger>
            <EssentialDialogContent showCloseButton={false}>
              <EssentialDialogHeader className="rounded-3xl bg-[#0f0e0e] p-2">
                <EssentialDialogClose
                  aria-label="Cerrar"
                  className="size-9 self-start rounded-full bg-[#1b231c] text-xs text-[#9aa89b]"
                >
                  ✕
                </EssentialDialogClose>
                <EssentialDialogTitle className="p-4 text-3xl leading-none font-semibold">
                  Crear movimiento
                </EssentialDialogTitle>
              </EssentialDialogHeader>
              <ThemedInput placeholder="Descripción" />
              <div className="flex gap-2 *:flex-1">
                <ThemedInput placeholder="Monto" inputMode="decimal" />
                <ThemedInput placeholder="Divisa" />
              </div>
              <ThemedInput placeholder="Sin categoría" />
              <ThemedInput placeholder="Sin cuenta" />
              <EssentialDialogFooter className="flex-row gap-2 *:h-[47px] *:flex-1 *:rounded-full *:text-sm *:font-medium">
                <EssentialDialogClose className="bg-[#1b231c] text-[#9aa89b]">
                  ✕
                </EssentialDialogClose>
                <button type="button" className="bg-[#09ee61] text-[#04240f]">
                  Crear
                </button>
              </EssentialDialogFooter>
            </EssentialDialogContent>
          </EssentialDialog>

          <button
            type="button"
            className="inline-flex h-[47px] items-center rounded-[23.5px] bg-[#1b231c] px-6 text-sm font-medium text-[#9aa89b]"
          >
            Filtros
          </button>
        </div>
      </Section>

      <Section
        title="debug"
        note="<EssentialDialog debug> outlines every layer — backdrop (blue), drag wrapper (amber), surface (magenta, the box Flip animates), window (green, what gets scaled and faded inside it) — and logs the origin and target boxes, live coverage, and the distance and speed each drag release was judged on."
      >
        <EssentialDialog debug>
          <EssentialDialogTrigger render={<Button variant="secondary">Open with debug</Button>} />
          <EssentialDialogContent>
            <EssentialDialogHeader>
              <EssentialDialogTitle>Layers</EssentialDialogTitle>
              <EssentialDialogDescription>
                Open the console: every measurement the morph is built from is
                logged as it happens.
              </EssentialDialogDescription>
            </EssentialDialogHeader>
            <EssentialDialogFooter>
              <EssentialDialogClose render={<Button variant="outline">Close</Button>} />
            </EssentialDialogFooter>
          </EssentialDialogContent>
        </EssentialDialog>
      </Section>

      <Section
        title="Motion off"
        note="draggable={false} keeps the morph but hands scrolling and text selection back to the content. Under prefers-reduced-motion the whole animation collapses to 1ms and the gesture is disabled regardless."
      >
        <EssentialDialog draggable={false} openDuration={0.55}>
          <EssentialDialogTrigger render={<Button>Long content</Button>} />
          <EssentialDialogContent>
            <EssentialDialogHeader>
              <EssentialDialogTitle>Terms</EssentialDialogTitle>
            </EssentialDialogHeader>
            <div className="text-muted-foreground flex flex-col gap-3 text-sm">
              {Array.from({ length: 12 }).map((_, i) => (
                <p key={i}>
                  Paragraph {i + 1}. The window scrolls inside the surface, which
                  is capped by --essential-dialog-max-height.
                </p>
              ))}
            </div>
            <EssentialDialogFooter>
              <EssentialDialogClose render={<Button variant="outline">Close</Button>} />
            </EssentialDialogFooter>
          </EssentialDialogContent>
        </EssentialDialog>
      </Section>
    </main>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col items-start gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-muted-foreground max-w-xl text-xs">{note}</p>
      </div>
      {children}
    </section>
  )
}

function ThemedInput(props: React.ComponentProps<"input">) {
  return (
    <input
      className="w-full rounded-xl border border-[#1e2820] bg-[#141c15] px-4 py-3 text-xs text-[#e7ece6] placeholder:text-[#5f6b60]"
      {...props}
    />
  )
}
