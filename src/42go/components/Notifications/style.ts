import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";

import type { CommunicationStyle } from "@/42go/communications";

export const communicationStyleMap: Record<
  CommunicationStyle,
  {
    Icon: typeof Info;
    className: string;
  }
> = {
  info: {
    Icon: Info,
    className: "border-primary/40 bg-primary/5 text-foreground",
  },
  warning: {
    Icon: AlertTriangle,
    className:
      "border-amber-400/60 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/35 dark:text-amber-100",
  },
  danger: {
    Icon: CircleAlert,
    className:
      "border-destructive/40 bg-destructive/10 text-foreground",
  },
  success: {
    Icon: CheckCircle2,
    className: "border-primary/40 bg-accent text-accent-foreground",
  },
};
