"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BackBtnConfig } from "./types";

interface BackBtnProps {
  backBtn: BackBtnConfig;
}

export const BackBtn = ({ backBtn }: BackBtnProps) => {
  const { to, label = "", icon: Icon, hideDesktop } = backBtn;

  return (
    <Button
      variant="ghost"
      size="default"
      asChild
      className={hideDesktop ? "md:hidden" : undefined}
    >
      <Link href={to} aria-label={label || "back"}>
        {Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        {label && <span className="hidden md:inline text-sm">{label}</span>}
      </Link>
    </Button>
  );
};

export default BackBtn;
