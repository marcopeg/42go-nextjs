"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Lock, ShieldBan, SearchX } from "lucide-react";
import type { PolicyErrorCode } from "@/42go/policy/types";

export interface PolicyErrorProps {
  code: PolicyErrorCode;
  detail?: string;
  className?: string;
  heading?: ReactNode; // optional override heading
  description?: ReactNode; // optional override description
}

// Map policy code to UI metadata
const META: Record<
  PolicyErrorCode,
  { title: string; message: string; icon: ReactNode; tone: string }
> = {
  feature: {
    title: "Not Found",
    message: "This feature isn't enabled for this app.",
    icon: <SearchX className="h-10 w-10" />,
    tone: "border-amber-400/50 bg-amber-50/5 text-amber-400",
  },
  session: {
    title: "Sign In Required",
    message: "You need to sign in to access this content.",
    icon: <Lock className="h-10 w-10" />,
    tone: "border-blue-400/50 bg-blue-50/5 text-blue-400",
  },
  role: {
    title: "Forbidden",
    message: "Your role does not permit access.",
    icon: <ShieldBan className="h-10 w-10" />,
    tone: "border-red-400/50 bg-red-50/5 text-red-400",
  },
  grant: {
    title: "Insufficient Grants",
    message: "Missing one or more required grants.",
    icon: <AlertTriangle className="h-10 w-10" />,
    tone: "border-red-400/50 bg-red-50/5 text-red-400",
  },
};

export const PolicyError = ({
  code,
  detail,
  className = "",
  heading,
  description,
}: PolicyErrorProps) => {
  const meta = META[code];
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 py-20 px-6 text-center animate-in fade-in ${meta.tone} ${className}`}
    >
      <div className="flex items-center justify-center rounded-full border p-6 shadow-inner">
        {meta.icon}
      </div>
      <div className="space-y-2 max-w-xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          {heading ?? meta.title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description ?? meta.message}
        </p>
        {detail && (
          <p className="text-xs font-mono mt-4 opacity-70 break-all">
            detail: {detail}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground/80">
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 bg-background/40 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            code: {code}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 bg-background/40 backdrop-blur-md">
            App security policy
          </span>
        </div>
      </div>
    </div>
  );
};

export default PolicyError;
