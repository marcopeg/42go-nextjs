import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type PageProps = ComponentPropsWithoutRef<"div">;

/**
 * Centers low-density app views at a comfortable desktop reading width while
 * keeping them full width inside the mobile app shell.
 *
 * Dense data surfaces such as backoffice tables should use AppLayout directly.
 */
export const Page = ({ className, ...props }: PageProps) => (
  <div className={cn("mx-auto w-full max-w-5xl", className)} {...props} />
);
