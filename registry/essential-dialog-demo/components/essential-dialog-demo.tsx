"use client"

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
} from "@/registry/essential-dialog/components/essential-dialog"

export function EssentialDialogDemo() {
  return (
    <EssentialDialog>
      <form>
        <EssentialDialogTrigger
          render={<Button variant="outline">Open Dialog</Button>}
        />
        <EssentialDialogContent>
          <EssentialDialogHeader>
            <EssentialDialogTitle>Edit profile</EssentialDialogTitle>
            <EssentialDialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </EssentialDialogDescription>
          </EssentialDialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Name</Label>
              <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
            </Field>
            <Field>
              <Label htmlFor="username-1">Username</Label>
              <Input id="username-1" name="username" defaultValue="@peduarte" />
            </Field>
          </FieldGroup>
          <EssentialDialogFooter>
            <EssentialDialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button type="submit">Save changes</Button>
          </EssentialDialogFooter>
        </EssentialDialogContent>
      </form>
    </EssentialDialog>
  )
}
