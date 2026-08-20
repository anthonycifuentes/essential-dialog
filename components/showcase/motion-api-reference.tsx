import {
  CONTENT,
  DIALOG,
  PARTS,
  Table,
  type Row,
} from "@/components/showcase/api-reference"

/* Same API, so the same rows — patched where the engine changes what a prop
   actually means, rather than restated. Anything not listed below behaves
   identically to the GSAP build, which is the point of the spike. */

const PATCH: Record<string, Partial<Row>> = {
  "openDuration?": {
    default: "0.35",
    description:
      "Seconds the trigger → dialog morph takes — a spring's visualDuration here, not a tween's duration: the time the box APPEARS to arrive, with the settle after it. Half the GSAP build's default, and it does not read as twice as fast, because most of what you see is over by then.",
  },
  "closeDuration?": {
    description:
      "Seconds the dialog → trigger morph takes. Still a tween, and evenly eased — a spring cannot be, and a decelerating close idles at full size and then collapses. Larger than openDuration here only because that one is a visual duration and this is the whole animation.",
  },
  "className?": {
    description:
      "Styles the morphing surface — the box projection transforms, and the element `drag` lives on.",
  },
  EssentialDialogTrigger: {
    name: "EssentialDialogMotionTrigger",
    description:
      "The origin of the morph. A shared layout transition needs a real node on both sides, so an invisible placeholder is stretched over this element and paired with the surface by layoutId — which is why the wrapper is inline-grid here rather than display:contents.",
  },
}

const BOUNCE: Row = {
  name: "bounce?",
  type: "number",
  description:
    "Motion only. 0–1 overshoot on the opening spring — the thing a tween needs a whole new easing curve to express. 0 is the closest match to the GSAP build's curve.",
  default: "0.3",
}

const patch = (rows: Row[]) =>
  rows.map((row) => ({ ...row, ...(PATCH[row.name] ?? {}) }))

const withBounce = (rows: Row[]) => {
  const next = patch(rows)
  next.splice(next.findIndex((row) => row.name === "closeDuration?") + 1, 0, BOUNCE)
  return next
}

const motionParts = patch(PARTS).map((row) =>
  row.name.startsWith("EssentialDialogMotion")
    ? row
    : { ...row, name: row.name.replace("EssentialDialog", "EssentialDialogMotion") }
)

export function MotionApiReference() {
  return (
    <div className="flex flex-col gap-8">
      <Table title="EssentialDialogMotion" rows={withBounce(DIALOG)} />
      <Table title="EssentialDialogMotionContent" rows={patch(CONTENT)} />
      <Table title="Parts" rows={motionParts} />
    </div>
  )
}
