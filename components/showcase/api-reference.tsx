export type Row = {
  name: string
  type: string
  description: string
  default?: string
}

export const DIALOG: Row[] = [
  {
    name: "openDuration?",
    type: "number",
    description: "Seconds the trigger → dialog morph takes.",
    default: "0.7",
  },
  {
    name: "closeDuration?",
    type: "number",
    description:
      "Seconds the dialog → trigger morph takes. Shorter on purpose: at equal durations there is a long middle where the box is neither the dialog nor the button.",
    default: "0.45",
  },
  {
    name: "draggable?",
    type: "boolean",
    description:
      "Drag the surface anywhere to dismiss. Always off under prefers-reduced-motion.",
    default: "true",
  },
  {
    name: "hideTrigger?",
    type: "boolean",
    description:
      "Hide the trigger while the dialog is open, so the button becomes the dialog instead of sitting beside it. Hidden with visibility, so the page never reflows around the gap and the close can still measure the box it lands in.",
    default: "true",
  },
  {
    name: "dismissOnOutsideClick?",
    type: "boolean",
    description:
      "Click anywhere outside the surface to dismiss. Judged on where the pointer went down AND came up, so selecting a line of text and overshooting the edge does not close the dialog. Escape is unaffected either way.",
    default: "true",
  },
  {
    name: "dismissDistance?",
    type: "number",
    description: "Radial px the surface must travel before release dismisses it.",
    default: "100",
  },
  {
    name: "dismissSpeed?",
    type: "number",
    description: "px per ms, so a flick counts even when it barely moves.",
    default: "0.5",
  },
  {
    name: "dragFalloff?",
    type: "number",
    description: "scale = 1 - distance / dragFalloff, floored at 0.3.",
    default: "415",
  },
  {
    name: "fullscreen?",
    type: "boolean | number | string",
    description:
      "Open edge to edge instead of centred. true is always; a number is a breakpoint (fullscreen below that many px); a string is any media query. Crossing the breakpoint while open re-lays the dialog out.",
    default: "false",
  },
  {
    name: "debug?",
    type: "boolean",
    description:
      "Outline every layer and log the boxes, live coverage and drag thresholds the morph is measured from.",
    default: "false",
  },
  {
    name: "open?",
    type: "boolean",
    description:
      "Controlled state. Drives showModal()/close() rather than rendering a different tree.",
    default: "–",
  },
  {
    name: "defaultOpen?",
    type: "boolean",
    description: "Open on mount. Uncontrolled only.",
    default: "false",
  },
  {
    name: "onOpenChange?",
    type: "(open: boolean) => void",
    description: "Fires once the morph has fully finished, in either direction.",
    default: "–",
  },
]

export const CONTENT: Row[] = [
  {
    name: "className?",
    type: "string",
    description: "Styles the morphing surface — the box Flip animates.",
    default: "–",
  },
  {
    name: "windowClassName?",
    type: "string",
    description: "Styles the scrolling content box inside the surface.",
    default: "–",
  },
  {
    name: "backdropClassName?",
    type: "string",
    description: "Styles the backdrop element.",
    default: "–",
  },
  {
    name: "showCloseButton?",
    type: "boolean",
    description: "The unstyled ✕ in the corner.",
    default: "true",
  },
]

export const PARTS: Row[] = [
  {
    name: "EssentialDialogTrigger",
    type: "{ render?: ReactElement }",
    description:
      "The origin of the morph. Flip reads this element's live geometry, colour and radius, so pass your own button through render.",
  },
  {
    name: "EssentialDialogClose",
    type: "{ render?: ReactElement }",
    description: "Closes with the morph. Same render composition as the trigger.",
  },
  {
    name: "EssentialDialogHeader",
    type: "div props",
    description: "Layout only: flex column, gap 2.",
  },
  {
    name: "EssentialDialogFooter",
    type: "div props",
    description:
      "Layout only: reversed column that becomes a right-aligned row at sm.",
  },
  {
    name: "EssentialDialogTitle",
    type: "h2 props",
    description: "Wires aria-labelledby on the dialog.",
  },
  {
    name: "EssentialDialogDescription",
    type: "p props",
    description: "Wires aria-describedby on the dialog.",
  },
]

export function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-xs text-muted-foreground">{title}</h3>
      <div className="divide-y overflow-hidden rounded-xl border">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6"
          >
            <code className="w-fit shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs sm:w-48">
              {row.name}
            </code>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <code className="w-fit rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {row.type}
              </code>
              <p className="text-sm text-muted-foreground">{row.description}</p>
            </div>
            {row.default && (
              <code className="w-fit shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {row.default}
              </code>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ApiReference() {
  return (
    <div className="flex flex-col gap-8">
      <Table title="EssentialDialog" rows={DIALOG} />
      <Table title="EssentialDialogContent" rows={CONTENT} />
      <Table title="Parts" rows={PARTS} />
    </div>
  )
}
