"use client";

import { useSession } from "next-auth/react";

import { SimplePanel } from "@/42go/components/panel";

type AccountInfoProps = {
  title?: string;
};

export const AccountInfo = ({ title = "Account Information" }: AccountInfoProps) => {
  const { data: session } = useSession();
  const user = session?.user as
    | {
        name?: string | null;
        email?: string | null;
        createdAt?: string | null;
        created_at?: string | null;
      }
    | undefined;
  const signupDate = user?.createdAt ?? user?.created_at ?? null;

  return (
    <SimplePanel title={title}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name || "Not provided"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.email || "Not provided"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Signup date</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {signupDate || "Not available"}
          </p>
        </div>
      </div>
    </SimplePanel>
  );
};
