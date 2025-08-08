import * as React from "react";
import { toast as sonnerToast } from "sonner";

export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
}

function toast(options: ToastOptions) {
  const { title, description, variant = "default" } = options;
  const message = title ?? "";

  if (variant === "destructive") {
    return sonnerToast.error(message as React.ReactNode, {
      description: description as React.ReactNode,
    });
  }

  return sonnerToast(message as React.ReactNode, {
    description: description as React.ReactNode,
  });
}

export function useToast() {
  return { toast };
}
