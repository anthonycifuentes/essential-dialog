"use client"

/* The same demo on both engines, for the side-by-side. Both builds export the
   identical `EssentialDialog*` names — that is the whole point of the split —
   so the only thing that differs here is the import path, and the aliases exist
   purely so the two can be rendered on one page. */

import { EssentialDialogDemo } from "@/registry/essential-dialog-demo/components/essential-dialog-demo"
import { EssentialDialogGsapDemo } from "@/registry/essential-dialog-gsap-demo/components/essential-dialog-gsap-demo"

export { EssentialDialogDemo as MotionDemo, EssentialDialogGsapDemo as GsapDemo }
