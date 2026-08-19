"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock } from "@/components/showcase/code-block"

const ITEM = "@essential/essential-dialog"

const MANAGERS = [
  { id: "bun", command: `bunx --bun shadcn@latest add ${ITEM}` },
  { id: "npm", command: `npx shadcn@latest add ${ITEM}` },
  { id: "pnpm", command: `pnpm dlx shadcn@latest add ${ITEM}` },
  { id: "yarn", command: `yarn dlx shadcn@latest add ${ITEM}` },
]

export function Install({ registryUrl }: { registryUrl: string }) {
  return (
    <Tabs defaultValue="cli" className="gap-4">
      <TabsList>
        <TabsTrigger value="cli">CLI</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>

      <TabsContent value="cli" className="flex flex-col gap-4">
        <Tabs defaultValue="npm" className="gap-3">
          <TabsList variant="line">
            {MANAGERS.map((m) => (
              <TabsTrigger key={m.id} value={m.id}>
                {m.id}
              </TabsTrigger>
            ))}
          </TabsList>
          {MANAGERS.map((m) => (
            <TabsContent key={m.id} value={m.id}>
              <CodeBlock code={`$ ${m.command}`} language="bash" />
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-xs text-muted-foreground">
          The <code className="font-mono">@essential</code> namespace has to exist
          in the target project first:
        </p>
        <CodeBlock
          language="bash"
          code={`$ npx shadcn@latest registry add @essential=${registryUrl}`}
        />
      </TabsContent>

      <TabsContent value="manual" className="flex flex-col gap-4">
        <ol className="flex list-inside list-decimal flex-col gap-2 text-sm text-muted-foreground">
          <li>
            Install the only dependency:{" "}
            <code className="font-mono text-foreground">npm i gsap</code>
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
