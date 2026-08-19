"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock } from "@/components/showcase/code-block"

export function PreviewTabs({
  preview,
  usage,
  source,
}: {
  preview: React.ReactNode
  usage: string
  source: string
}) {
  return (
    <Tabs defaultValue="preview" className="gap-4">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
      <TabsContent value="preview">{preview}</TabsContent>
      <TabsContent value="usage">
        <CodeBlock code={usage} />
      </TabsContent>
      <TabsContent value="code">
        <CodeBlock code={source} maxHeight="max-h-[560px]" />
      </TabsContent>
    </Tabs>
  )
}
