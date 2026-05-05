"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppLayout } from "@/42go/layouts/app";
import { useAppConfig } from "@/42go/config/use-app-config";
import {
  ProfilePageRenderer,
  type TProfilePageRendererHandle,
} from "@/42go/components/ProfileBlock";

type SavePreferencesActionProps = {
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
};

const SavePreferencesAction = ({
  saving,
  dirty,
  onSave,
}: SavePreferencesActionProps) => (
  <Button onClick={onSave} disabled={saving}>
    {saving ? "Saving..." : dirty ? "Save changes" : "Save preferences"}
  </Button>
);

export default function ProfilePage() {
  const config = useAppConfig();
  const rendererRef = useRef<TProfilePageRendererHandle>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    void rendererRef.current?.save();
  };

  return (
    <AppLayout
      title="Profile"
      stickyHeader={true}
      policy={{ require: { session: true } }}
      actions={[
        {
          type: "component",
          component: SavePreferencesAction,
          props: {
            saving,
            dirty,
            onSave: handleSave,
          },
        },
      ]}
    >
      <ProfilePageRenderer
        ref={rendererRef}
        profile={config?.app?.profile}
        consent={config?.app?.consent}
        onSavingChange={setSaving}
        onDirtyChange={setDirty}
      />
    </AppLayout>
  );
}
