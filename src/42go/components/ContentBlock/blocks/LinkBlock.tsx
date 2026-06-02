"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import {
  resolveContentBlockPaddingProps,
  type TContentBlockPadding,
} from "@/42go/components/ContentBlock/render-component";

type BlockButtonProps = Omit<
  ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean },
  "children" | "type"
>;

export interface TLinkBlock extends BlockButtonProps {
  type: "link";
  label: string;
  href: string;
  padding?: TContentBlockPadding;
}

export function LinkBlock({
  data: { label, href, padding, margin, ...buttonProps },
}: {
  data: Omit<TLinkBlock, "type"> & { margin?: unknown };
}) {
  void margin;
  const paddingProps = resolveContentBlockPaddingProps(padding);
  const link = (
    <Button asChild {...buttonProps}>
      <Link href={href}>{label}</Link>
    </Button>
  );

  if (!paddingProps) return link;

  return (
    <div className={paddingProps.className} style={paddingProps.style}>
      {link}
    </div>
  );
}
