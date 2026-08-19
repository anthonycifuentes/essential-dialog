"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function CodeBlock({
  code,
  language = "tsx",
  className,
  maxHeight = "max-h-[420px]",
}: {
  code: string
  language?: string
  className?: string
  maxHeight?: string
}) {
  const [copied, setCopied] = React.useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-muted/30",
        className
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="relative rounded-md px-2 py-1 font-mono text-[11px] text-muted-foreground transition-[transform,background-color,color] hover:bg-muted hover:text-foreground active:scale-[0.96] after:absolute after:-inset-y-2.5 after:-inset-x-1 after:content-['']"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre
        className={cn(
          "overflow-auto p-4 font-mono text-xs leading-relaxed",
          maxHeight
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
