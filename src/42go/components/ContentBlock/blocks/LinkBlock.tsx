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

type LinkBlockProps = {
  data: Omit<LinkBlock, "type">;
};

export interface LinkBlock extends BlockButtonProps {
  type: "link";
  label: string;
  href: string;
}

export default function LinkBlock({
  data: { label, href, ...buttonProps },
}: LinkBlockProps) {
  return (
    <Button asChild {...buttonProps}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}
