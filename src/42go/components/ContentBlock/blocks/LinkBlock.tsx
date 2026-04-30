"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type BlockButtonProps = Omit<
  ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean },
  "children" | "type"
>;

export interface TLinkBlock extends BlockButtonProps {
  type: "link";
  label: string;
  href: string;
}

export function LinkBlock({
  data: { label, href, ...buttonProps },
}: {
  data: Omit<TLinkBlock, "type">;
}) {
  return (
    <Button asChild {...buttonProps}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}
