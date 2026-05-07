"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/42go/utils/utils";

const Dialog = ({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) => (
  <DialogPrimitive.Root data-slot="dialog" {...props} />
);

const DialogTrigger = ({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) => (
  <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
);

const DialogPortal = ({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) => (
  <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
);

const DialogClose = ({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) => (
  <DialogPrimitive.Close data-slot="dialog-close" {...props} />
);

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-[700] bg-black/45 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
);

const DialogContent = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      data-slot="dialog-content"
      className={cn(
        "fixed z-[710] bg-background text-foreground shadow-xl outline-none",
        className
      )}
      {...props}
    />
  </DialogPortal>
);

const DialogTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    data-slot="dialog-title"
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
