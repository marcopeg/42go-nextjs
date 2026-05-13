"use client";

import { useState, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";

import { Modal } from "@/42go/components/modal";
import type { TProfileLayoutGuardProps } from "@/42go/components/ProfileBlock";
import { useAppConfig } from "@/42go/config/use-app-config";
import { ProfileConsent } from "@/42go/profile/ProfileConsent";
import { useProfileController } from "@/42go/profile/client";
import { Button } from "@/components/ui/button";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";

const languages = getLingoCafeReaderLanguages();

const getStringValue = (value: unknown) =>
  typeof value === "string" ? value : "";

export const LingocafeOnboardingGuard = ({
  refreshKey: _refreshKey,
}: TProfileLayoutGuardProps) => {
  void _refreshKey;

  const config = useAppConfig();
  const { status } = useSession();
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useProfileController({
    profile: config?.app?.profile,
    consent: config?.app?.consent,
  });

  if (status !== "authenticated") return null;
  if (!controller.loading && controller.isComplete) return null;

  const profile = controller.profile;
  const ownLang = getStringValue(profile.ownLang);
  const targetLang = getStringValue(profile.targetLang);
  const targetLevel = getStringValue(profile.targetLevel);
  const consentItems = config?.app?.consent?.items || [];
  const missingRequiredConsent = consentItems.some(
    (item) => item.required && controller.consent[item.name] !== true
  );
  const canSubmit =
    !controller.loading &&
    !controller.saving &&
    !!ownLang &&
    !!targetLang &&
    !!targetLevel &&
    !missingRequiredConsent;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);

    if (!canSubmit) {
      setMessage("Complete the required profile fields before continuing.");
      return;
    }

    try {
      const payload = await controller.save();

      if (payload.isComplete) {
        window.dispatchEvent(new Event("profile:complete"));
        return;
      }

      setMessage("Profile is still incomplete. Check the required fields.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not save your profile."
      );
    }
  };

  return (
    <Modal
      open={true}
      onOpenChange={() => {}}
      presentation="panel"
      anchor="top"
      size="full"
      showClose={false}
      closeOnOverlayClick={false}
      skipOpenAnimation={true}
      className="md:!h-screen md:!max-h-none md:!border-b-0"
      bodyClassName="flex min-h-0 justify-center p-6 pt-12 md:items-start"
      ariaLabel="Complete your LingoCafe profile"
    >
      <form
        onSubmit={saveProfile}
        className="flex w-full max-w-2xl flex-col gap-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-normal">
            Complete your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Set your learning preferences before entering LingoCafe.
          </p>
        </div>

        {controller.loading ? (
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            Checking your profile...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2 text-sm font-medium">
                <span>Your language</span>
                <select
                  value={ownLang}
                  onChange={(event) =>
                    controller.setProfileValue("ownLang", event.target.value)
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  required
                >
                  <option value="">Choose</option>
                  {languages.own.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium">
                <span>Reading language</span>
                <select
                  value={targetLang}
                  onChange={(event) =>
                    controller.setProfileValue(
                      "targetLang",
                      event.target.value
                    )
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  required
                >
                  <option value="">Choose</option>
                  {languages.target.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium">
                <span>Reading level</span>
                <select
                  value={targetLevel}
                  onChange={(event) =>
                    controller.setProfileValue(
                      "targetLevel",
                      event.target.value
                    )
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  required
                >
                  <option value="">Choose</option>
                  {languages.levels.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="border-t pt-5">
              <ProfileConsent
                items={consentItems}
                values={controller.consent}
                onChange={controller.setConsentValue}
                disabled={controller.saving}
                submitted={submitted}
              />
            </div>

            {message ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message}
              </div>
            ) : null}

            {controller.errors.length > 0 ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {controller.errors.map((error) => error.message).join(" ")}
              </div>
            ) : null}
          </>
        )}

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="justify-start px-0 text-muted-foreground hover:px-3"
            onClick={() =>
              signOut({ callbackUrl: config?.auth?.logout?.url || "/" })
            }
          >
            Log out
          </Button>

          <Button type="submit" disabled={!canSubmit}>
            {controller.saving ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LingocafeOnboardingGuard;
