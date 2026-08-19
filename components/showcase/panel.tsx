import { cn } from "@/lib/utils"

/** The tall neutral stage every demo is shown on. */
export function Panel({
  children,
  hint,
  className,
}: {
  children: React.ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-xl border bg-muted/20 p-8",
        className
      )}
    >
      {children}
      {hint && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-t pt-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}
