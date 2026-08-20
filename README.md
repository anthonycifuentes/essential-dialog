# essential-dialog

A native `<dialog>` that grows out of its own trigger and shrinks back into it.
Built on [Motion](https://motion.dev)'s projection engine, distributed as a
[shadcn registry](https://ui.shadcn.com/docs/registry) item. A GSAP Flip build
is available too — same parts, same props, same export names, one import apart.

The API mirrors shadcn/ui's `Dialog` — `Trigger`, `Content`, `Header`, `Title`,
`Description`, `Footer`, `Close`, and `render` for composition — so it drops into
an existing call site. Nothing inside the component imports from
`components/ui`: your children are the only opinion about how it looks.

```bash
pnpm dlx shadcn@latest add https://essential-dialog.vercel.app/r/essential-dialog.json
```

One command against the item URL: nothing to register, and it works in a project
that has never heard of this registry. Swap `pnpm dlx` for `npx`, `bunx --bun` or
`yarn dlx` to taste.

If you expect to pull several items from here, registering the namespace once is
worth it — after that they resolve by name:

```bash
pnpm dlx shadcn@latest registry add @essential=https://essential-dialog.vercel.app/r/{name}.json
pnpm dlx shadcn@latest add @essential/essential-dialog
```

Two files land in your project — `components/ui/essential-dialog.tsx` and
`hooks/use-morph-dialog.ts` — plus the CSS variables in your stylesheet and
`motion` in your dependencies. Motion is the only runtime dependency, and if
your app already ships it the component adds nothing to the bundle.

### Or on GSAP

The same component, driven by GSAP Flip instead — it animates a real width and
height rather than projecting a transform:

```bash
pnpm dlx shadcn@latest add https://essential-dialog.vercel.app/r/essential-dialog-gsap.json
```

It exports exactly the same names, so the two are interchangeable by import
path alone:

```diff
-import { EssentialDialog } from "@/components/ui/essential-dialog"
+import { EssentialDialog } from "@/components/ui/essential-dialog-gsap"
```

Everything below applies to both, with two exceptions. `bounce` tunes the
opening spring's overshoot and only exists on the Motion build, where the open
is a spring rather than a tween. And the two ship different `openDuration`
defaults — `0.35` on Motion against `0.7` on GSAP — because Motion's is a
spring's *visual* duration, the point the box appears to have arrived, with the
settle happening after it. Pick GSAP if you would rather not add Motion; pick
Motion if you already have it, or want a morph that never triggers layout.

## Usage

The shadcn `Dialog` demo, with `Dialog` swapped for `EssentialDialog` and
nothing else changed:

```tsx
import { Button } from "@/components/ui/button"
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
      <EssentialDialogTrigger render={<Button variant="outline">Open</Button>} />
      <EssentialDialogContent>
        <EssentialDialogHeader>
          <EssentialDialogTitle>Edit profile</EssentialDialogTitle>
          <EssentialDialogDescription>
            Make changes to your profile here.
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
}
```

### Props

On `<EssentialDialog>`:

| Prop              | Default | Notes                                                                       |
| ----------------- | ------- | --------------------------------------------------------------------------- |
| `openDuration`    | `0.35` / `0.7` | Seconds. Motion / GSAP. On Motion it is a spring's `visualDuration` — the time the box *appears* to arrive in — so half the number is not half the animation. |
| `closeDuration`   | `0.45`  | A tween on both, evenly eased. See below.                                   |
| `bounce`          | `0.3`   | Motion only. 0–1 overshoot on the opening spring; `0` matches the GSAP curve. |
| `draggable`       | `true`  | Drag-to-dismiss. Always off under `prefers-reduced-motion`.                 |
| `dismissOnOutsideClick` | `true` | Click outside the surface to close. Judged on where the pointer went down **and** came up, so overshooting a text selection does not dismiss. |
| `hideTrigger`     | `true`  | Hide the trigger while the dialog is open. See below.                        |
| `dismissDistance` | `100`   | Radial px before release dismisses.                                         |
| `dismissSpeed`    | `0.5`   | px/ms, so a flick counts even when it barely moves.                         |
| `dragFalloff`     | `415`   | `scale = 1 - distance / dragFalloff`, floored at `.3`.                       |
| `open`            | —       | Controlled. Drives `showModal()`/`close()` rather than rendering two trees. |
| `defaultOpen`     | `false` | Open on mount.                                                              |
| `onOpenChange`    | —       | Fires when the morph has fully finished in either direction.                 |
| `fullscreen`      | `false` | Edge to edge instead of centred. See below.                                  |
| `debug`           | `false` | Outlines every layer and logs what the morph measured. See below.            |

On `<EssentialDialogContent>`: `className` styles the morphing surface,
`windowClassName` the scrolling box inside it, `backdropClassName` the backdrop,
and `showCloseButton` (default `true`) toggles the corner ✕.

### Hiding the trigger

The point of the morph is that the button *becomes* the dialog — so by default the
trigger goes away for as long as the dialog is up. It is hidden on the first frame,
where the surface is still sitting exactly on top of it, and comes back on the last
one; leave it visible and it reappears from behind the surface the instant the box
starts to grow, which reads as two objects rather than one.

```tsx
<EssentialDialog hideTrigger={false}>
```

It is hidden with `visibility`, not `display`, so the trigger keeps its layout box:
the page never reflows around the gap, and the close can still read the geometry,
colour and radius it has to land back in.

### Fullscreen

Off by default — the dialog is centred at `--essential-dialog-width`. Opt in per
instance, either always or by viewport:

```tsx
<EssentialDialog fullscreen>                          {/* always */}
<EssentialDialog fullscreen={768}>                     {/* narrower than 768px */}
<EssentialDialog fullscreen="(orientation: portrait)"> {/* any media query */}
```

A number is a breakpoint — fullscreen while the viewport is narrower than that
many px, lining up with where Tailwind's `sm:`/`md:` split the same edge. The
surface then fills the viewport, drops its radius, and adds the safe-area insets
so a notch or a home indicator does not sit on top of your content; the content
scrolls inside it.

It only changes the box the morph lands in. The morph itself, the drag, the
gesture thresholds and every CSS variable behave exactly the same — and because
the resting dialog is laid out by CSS, crossing the breakpoint while the dialog
is open simply re-lays it out.

### Forms on mobile

iOS Safari zooms the page whenever a focused field computes below 16px, and
Tailwind's preflight gives form controls `font: inherit` — so the window's `text-sm`
would otherwise hand every bare `<input>` you put in here a 14px size and a zoom
with it. The window floors fields at 16px where a zoom can actually happen:

```css
@media (pointer: coarse) {
  input, textarea, select { font-size: max(16px, 1rem) }
}
```

Floored rather than set, so a larger root font-size or a field you deliberately
made bigger survives; scoped to coarse pointers, so nothing about the desktop
dialog changes; and the dialog's own 14px type is untouched. The alternative —
`maximum-scale=1` on the viewport — is a [WCAG 1.4.4][wcag] failure, since it
takes pinch-zoom away from everyone to fix a font size.

Note that the on-screen keyboard does **not** shrink `dvh` by default: the keyboard
resizes the visual viewport, not the layout one. It only matters in `fullscreen`,
where the surface is `h-dvh` and a footer can end up behind the keyboard. Chromium
and Firefox can be told otherwise with `interactive-widget=resizes-content`
(`export const viewport = { interactiveWidget: "resizes-content" }` in Next); Safari
ignores it, and wants the `visualViewport` resize event instead.

[wcag]: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html

### Debugging

`<EssentialDialog debug>` — the counterpart to `<morph-dialog debug>` — outlines
each layer and logs, to the console, every number the morph is built from:

```
[essential-dialog] open      { from: {w,h,x,y,radius,background}, to: {…}, frozenContent, duration }
[essential-dialog] fit       { surface: 222×69, frozen: 400×144, scale: 0.48, coverage: 0.866, opacity: 0.33 }
[essential-dialog] drag end  { distance: 172, speed: 0.87, thresholds: {…}, dismissed: true }
[essential-dialog] close     { from: {…}, to: {…}, duration }
```

The outlines say which box is which: blue is the backdrop, amber the drag
wrapper, **magenta the surface** (the box the engine animates), green the window (what
gets scaled and faded inside it). If the content ever looks squashed or arrives
late, the `fit` line is where to look — `coverage` should reach 1 exactly when
the surface and the frozen content box coincide.

### Theming

Every visual value is a CSS variable, installed into your stylesheet by the CLI:

| Variable                                | Default                             |
| --------------------------------------- | ----------------------------------- |
| `--essential-dialog-width`              | `min(400px, calc(100vw - 48px))`    |
| `--essential-dialog-max-height`         | `calc(100dvh - 48px)`               |
| `--essential-dialog-radius`             | `26px`                              |
| `--essential-dialog-gap`                | `16px`                              |
| `--essential-dialog-padding`            | `16px`                              |
| `--essential-dialog-surface`            | `var(--popover, Canvas)`            |
| `--essential-dialog-foreground`         | `var(--popover-foreground, ...)`    |
| `--essential-dialog-muted-foreground`   | `var(--muted-foreground, GrayText)` |
| `--essential-dialog-backdrop`           | `rgb(0 0 0 / 0.12)`                 |
| `--essential-dialog-shadow`             | `0 0 16px rgb(0 0 0 / 0.16)`        |

The radius default is not arbitrary: `26px` is a 10px control radius plus 16px of
padding, so shadcn's own inputs and buttons sit concentrically inside it — nested
radii that disagree are the most common reason a dialog feels slightly off. If you
re-theme `--radius` or change the padding, this one-liner keeps that relationship
true instead of pinning a number:

```css
--essential-dialog-radius: calc(var(--radius) + var(--essential-dialog-padding));
```

Set them on any ancestor to theme one dialog instead of all of them. Size the
dialog through `--essential-dialog-width` rather than a `max-w-*` class: the
surface's width is animated inline, and a max-width would clamp the morph.

### Composition and `render`

Children passed to the part win over the render element's own, so both
`render={<Button>Open</Button>}` and `render={<Button />}>Open</…>` work.

A `render` element is wrapped in a `display: contents` span, which has no box of
its own and so changes nothing about layout. That is what makes `render` work
from a Server Component: elements created on the server cross the RSC boundary as
lazy references whose props cannot be read, so they cannot be cloned. When the
element *is* clonable it still gets cloned — the slot attributes and the trigger
ref land on your real button — but the DOM structure is the same either way, so
server and client never disagree during hydration.

## How the animation works

The trigger is the origin, so it has to be a real DOM node — that is what
`render={<Button />}` is for. A few decisions are load-bearing:

- **The surface animates real `width`/`height`, not `scale`** (`scale: false` in
  both morph directions), so its radius stays a radius and its border stays crisp.
- **A round trigger keeps its roundness while it grows.** Tweening two absolute
  radii is what makes a circle look wrong: `23.5px` is half of a 47px circle but a
  rounding error on a 440px dialog, so the box squares off within a few frames of
  leaving the trigger. When the trigger's radius is at or past half its shorter
  side — a circle, a pill, `50%`, `rounded-full` — the radius is instead derived
  from the box on every frame: exactly as round as its own shorter side allows
  while it is small, relaxing into the dialog's radius once there is enough box
  for a corner to read as a corner. Any other trigger tweens between the two
  radii, which is right for them.
- **Colour and radius hand over in ~18% of the duration**, not across all of it.
  Spread over the full morph, the box reads as a growing button rather than an
  arriving dialog.
- **The content's opacity comes from measurement, not the clock.** Two questions,
  both about the box. *Fit* is how much of the surface the miniature fills, which
  reaches 1 only when the two boxes coincide. *Room* is how much of its final size
  the box has actually reached — needed because a circular or square trigger
  already matches the dialog's aspect ratio on frame one, and fit alone would hand
  you a legible-but-tiny copy of the whole dialog inside a 47px dot. Neither has
  any timing to tune, and both play in reverse for free.
- **Closing is not the mirror of opening.** A mirrored ease idles at full size
  then collapses; even motion (`power2.inOut`, and a shorter duration) is what
  lets you watch the dialog become a button again.
- **On GSAP the drag lives on its own wrapper**, so the gesture and Flip never write to
  the same properties on the same element. On release the wrapper's transform is
  baked into the surface's own box, so the close morph starts from where you let
  go instead of unwinding to centre first. The miniature stays frozen at the size
  the content was laid out at, not at the shrunken box on screen — freezing to
  what is on screen re-flows the content into it, which shows full-size text and
  its own scrollbar for the first frames of the close.
- **Radius and opacity are read against the largest the box gets in this morph**,
  which is its resting size when opening but only the drag's scale when closing
  from a dragged-down dialog. Without that, releasing a half-size dialog would pop
  its corners and its content before the close had moved a pixel.
- **The backdrop is an element, not `::backdrop`**, which JS cannot reach and
  whose opacity has to track the drag frame by frame.
- **The resting dialog is laid out by CSS, not by the animation.** The morph needs
  the surface pinned at absolute coordinates and the content frozen at a fixed
  size; both are a liability once it has arrived, because pinned coordinates do not
  re-centre and a frozen box does not reflow. They are cleared the moment the
  timeline completes — every value equals what CSS would compute, so nothing moves
  — and the open dialog resizes, rotates and reflows like ordinary markup.
- **Locking the page scroll reserves the scrollbar's gutter.** Hiding the body's
  overflow takes the scrollbar with it and the page slides sideways into the freed
  space at the exact moment the dialog opens; the gutter is re-added as padding so
  the layout stays still.
- **Touch has to be told who owns the gesture.** `touch-action` has to sit on the
  element under the finger, not just on the surface: Chrome cancels the pointer the
  moment it decides the gesture belongs to a scroller, which killed drag-to-dismiss
  on mobile. The content box is `touch-action: none` while it fits, and `pan-y`
  once it overflows — scrolling gets the vertical axis back, and a sideways flick
  still dismisses.

Under `prefers-reduced-motion: reduce` the whole timeline collapses to 1ms and
the gesture is disabled.

## Registry development

```bash
pnpm install
pnpm dev              # demo at http://localhost:3000
pnpm registry:build   # regenerate public/r/*.json from registry.json
pnpm typecheck && pnpm lint
```

The package manager is pinned with `packageManager` in `package.json`, so
corepack and the Vercel build both use the same pnpm.

Source of truth is `registry.json`; items live in `registry/`. The built JSON in
`public/r/` is what consumers install, so rebuild it before committing changes to
a component.

## Provenance

`reference/morph-dialog.reference.html` is the original single-file vanilla web
component this was ported from — kept for provenance, not shipped. The timeline
is a faithful port: same eases (`morphIn` CustomEase in, `power2.inOut` out), same
`scale: false` Flip pairing on that build, same colour/radius hand-over at 18% and 42% of the
respective durations, same coverage-driven opacity, same drag thresholds and
`expo.out` snap-back.

It differs from the original in five places, all deliberate:

- `onOpenChange` replaces the `morph-open` / `morph-close` DOM events.
- The morph id is per instance, not a constant, so two dialogs on
  one page can never claim each other's origin.
- The blur-in is clamped to `openDuration` instead of a fixed `0.5s`, so a short
  `openDuration` does not finish with the content still blurred.
- `aria-describedby` is wired from `EssentialDialogDescription`; the original only
  wired the title.
- Opening without a trigger in the tree (`defaultOpen`, or a controlled `open`
  with no `EssentialDialogTrigger`) falls back to a scale-and-fade, since there is
  no origin geometry to morph from.
