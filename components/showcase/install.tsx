"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock } from "@/components/showcase/code-block"

const ITEM_URL = "https://essential-dialog.vercel.app/r/essential-dialog.json"
const TEMPLATE = "https://essential-dialog.vercel.app/r/{name}.json"

/* pnpm first, and the plain URL rather than a namespace: one command, nothing to
   register, and it works in a project that has never heard of this registry. */
const MANAGERS = [
  { id: "pnpm", run: "pnpm dlx" },
  { id: "npm", run: "npx" },
  { id: "bun", run: "bunx --bun" },
  { id: "yarn", run: "yarn dlx" },
]

export function Install() {
  return (
    <Tabs defaultValue="cli" className="gap-4">
      <TabsList>
        <TabsTrigger value="cli">CLI</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>

      <TabsContent value="cli" className="flex flex-col gap-4">
        <Tabs defaultValue="pnpm" className="gap-3">
          <TabsList variant="line">
            {MANAGERS.map((m) => (
              <TabsTrigger key={m.id} value={m.id}>
                {m.id}
              </TabsTrigger>
            ))}
          </TabsList>
          {MANAGERS.map((m) => (
            <TabsContent key={m.id} value={m.id} className="flex flex-col gap-3">
              <CodeBlock
                code={`$ ${m.run} shadcn@latest add ${ITEM_URL}`}
                language="bash"
              />
              <details className="group">
                <summary className="w-fit cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Or install it by namespace
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Worth registering once if you plan to pull several items —
                    after that they resolve by name.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`$ ${m.run} shadcn@latest registry add @essential=${TEMPLATE}\n$ ${m.run} shadcn@latest add @essential/essential-dialog`}
                  />
                </div>
              </details>
            </TabsContent>
          ))}
        </Tabs>
      </TabsContent>

      <TabsContent value="manual" className="flex flex-col gap-4">
        <ol className="flex list-inside list-decimal flex-col gap-2 text-sm text-muted-foreground">
          <li>
            Install the only dependency:{" "}
            <code className="font-mono text-foreground">pnpm add gsap</code>
          </li>
          <li>
            Copy <code className="font-mono text-foreground">use-morph-dialog.ts</code>{" "}
            into <code className="font-mono text-foreground">hooks/</code> and{" "}
            <code className="font-mono text-foreground">essential-dialog.tsx</code>{" "}
            into <code className="font-mono text-foreground">components/ui/</code>{" "}
            (both are in the Code tab above).
          </li>
          <li>Add the CSS variables to your stylesheet:</li>
        </ol>
        <CodeBlock
          language="css"
          code={`:root {
  --essential-dialog-width: min(400px, calc(100vw - 48px));
  --essential-dialog-max-height: calc(100dvh - 48px);
  --essential-dialog-radius: 32px;
  --essential-dialog-gap: 16px;
  --essential-dialog-padding: 16px;
  --essential-dialog-surface: var(--popover, Canvas);
  --essential-dialog-foreground: var(--popover-foreground, CanvasText);
  --essential-dialog-muted-foreground: var(--muted-foreground, GrayText);
  --essential-dialog-backdrop: rgb(0 0 0 / 0.12);
  --essential-dialog-shadow: 0 0 16px rgb(0 0 0 / 0.16);
}

.dark {
  --essential-dialog-backdrop: rgb(0 0 0 / 0.4);
  --essential-dialog-shadow: 0 0 24px rgb(0 0 0 / 0.45);
}`}
        />
      </TabsContent>
    </Tabs>
  )
}
