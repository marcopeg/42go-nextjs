"use client";

import { SimplePanel } from "@/42go/components/panel";
import { useProfile } from "@/42go/profile/client";
import { Input } from "@/components/ui/input";

type AccountInfoProps = {
  title?: string;
};

export const AccountInfo = ({ title = "Account Information" }: AccountInfoProps) => {
  const { account, loading, saving, setAccountValue } = useProfile();
  const disabled = loading || saving;

  return (
    <SimplePanel title={title}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input
            value={account?.name || ""}
            onChange={(event) => setAccountValue("name", event.target.value)}
            disabled={disabled}
            placeholder="Not provided"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {account?.email || "Not provided"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Image URL</label>
          <Input
            value={account?.image || ""}
            onChange={(event) => setAccountValue("image", event.target.value)}
            disabled={disabled}
            placeholder="Not provided"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Signup date</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {account?.createdAt || "Not available"}
          </p>
        </div>
      </div>
    </SimplePanel>
  );
};
