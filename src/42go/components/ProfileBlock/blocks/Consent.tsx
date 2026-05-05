"use client";

import { useCallback, useMemo, useState } from "react";

import { SimplePanel } from "@/42go/components/panel";
import { useAppConfig } from "@/42go/config/use-app-config";
import { useProfile } from "@/42go/profile/client";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import { ProfileConsent } from "@/42go/profile/ProfileConsent";

type ConsentProps = {
  title?: string;
  description?: string;
};

export const Consent = ({
  title = "Consent",
  description = "Review and save your consent choices.",
}: ConsentProps) => {
  const appConfig = useAppConfig();
  const { consent, setConsentValue, loading, saving } = useProfile();
  const [submitted, setSubmitted] = useState(false);
  const configuredItems = appConfig?.app?.consent?.items;
  const items = useMemo(() => configuredItems || [], [configuredItems]);

  const missingRequired = useMemo(
    () => items.filter((item) => item.required && consent[item.name] !== true),
    [consent, items]
  );

  const validate = useCallback(() => {
    setSubmitted(true);

    if (missingRequired.length > 0) {
      return {
        ok: false as const,
        message: "Accept the required consent items before saving.",
      };
    }

    return { ok: true as const };
  }, [missingRequired.length]);

  useProfileBlockHandle(useMemo(() => ({ validate }), [validate]));

  if (items.length === 0) {
    return (
      <SimplePanel title={title} description={description}>
        <p className="text-sm text-muted-foreground">
          No consent items are configured.
        </p>
      </SimplePanel>
    );
  }

  return (
    <SimplePanel title={title} description={description}>
      <ProfileConsent
        items={items}
        values={consent}
        onChange={setConsentValue}
        disabled={loading || saving}
        submitted={submitted}
      />
    </SimplePanel>
  );
};
