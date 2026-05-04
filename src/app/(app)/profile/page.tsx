"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppLayout } from "@/42go/layouts/app";
import { useAppConfig } from "@/42go/config/use-app-config";
import {
  ProfilePageRenderer,
  type TProfilePageRendererHandle,
} from "@/42go/profile";

type SavePreferencesActionProps = {
  saving: boolean;
  onSave: () => void;
};

const SavePreferencesAction = ({
  saving,
  onSave,
}: SavePreferencesActionProps) => (
  <Button onClick={onSave} disabled={saving}>
    {saving ? "Saving..." : "Save preferences"}
  </Button>
);

export default function ProfilePage() {
  const config = useAppConfig();
  const rendererRef = useRef<TProfilePageRendererHandle>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    void rendererRef.current?.save();
  };

  return (
    <AppLayout
      title="Profile"
      stickyHeader={true}
      actions={[
        {
          type: "component",
          component: SavePreferencesAction,
          props: {
            saving,
            onSave: handleSave,
          },
        },
      ]}
    >
      <ProfilePageRenderer
        ref={rendererRef}
        items={config?.app?.profile?.items}
        onSavingChange={setSaving}
      />
    </AppLayout>
  );
}
