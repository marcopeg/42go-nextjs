"use client";

import type { ReactNode } from "react";
import { PolicyError } from "@/42go/components/PolicyError";
import { PolicyScaffold } from "@/42go/components/PolicyScaffold";
import { useEvaluatePolicy } from "./useEvaluatePolicy";
import type { Policy } from "./types";

type ErrorRenderer = (args: {
  code: NonNullable<ReturnType<typeof useEvaluatePolicy>["error"]>["code"];
  detail?: string;
}) => ReactNode;

type LoadingRenderer = () => ReactNode;

export function ProtectComponent({
  policy,
  children,
  renderOnLoading,
  renderOnError,
}: {
  policy: Policy | Policy[];
  children: ReactNode;
  renderOnLoading?: LoadingRenderer;
  renderOnError?: ErrorRenderer;
}) {
  const res = useEvaluatePolicy(policy);

  if (res.loading) {
    if (renderOnLoading) return <>{renderOnLoading()}</>;
    return <PolicyScaffold />;
  }

  if (!res.pass) {
    const code = res.error?.code ?? "feature";
    const detail = res.error?.detail;
    if (renderOnError) return <>{renderOnError({ code, detail })}</>;
    return <PolicyError code={code} detail={detail} />;
  }

  return <>{children}</>;
}
