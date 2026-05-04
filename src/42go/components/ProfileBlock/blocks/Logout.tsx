"use client";

import { LogoutAction } from "@/42go/auth/components/LogoutAction";
import { SimplePanel } from "@/42go/components/panel";

type LogoutProps = {
  title?: string;
};

export const Logout = ({ title = "Logout" }: LogoutProps) => (
  <SimplePanel title={title}>
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        End the current session for this app.
      </p>
      <LogoutAction />
    </div>
  </SimplePanel>
);
