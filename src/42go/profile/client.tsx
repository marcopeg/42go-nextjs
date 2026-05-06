"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  JsonValue,
  TConsentConfig,
  TConsentData,
  TProfileData,
  TProfileLoadResult,
  TProfileValidationError,
} from "@/42go/profile";
import { getConsentCurrentValues } from "@/42go/profile/consent";
import type { TProfileConfig } from "@/42go/components/ProfileBlock";

type ProfileAccountState = NonNullable<TProfileLoadResult["account"]>;

type ProfileSaveInput = {
  source?: string;
  method?: string;
};

export type TProfileClientController = {
  loading: boolean;
  saving: boolean;
  profile: TProfileData;
  consent: Record<string, boolean>;
  rawConsent: TConsentData | null;
  account: ProfileAccountState | null;
  errors: TProfileValidationError[];
  isComplete: boolean;
  isDirty: boolean;
  setProfileValue: (key: string, value: JsonValue) => void;
  setProfileValues: (values: Record<string, JsonValue>) => void;
  setConsentValue: (name: string, value: boolean) => void;
  setAccountValue: (key: "name" | "image", value: string | null) => void;
  validate: () => boolean;
  save: (input?: ProfileSaveInput) => Promise<TProfileLoadResult>;
  reload: () => Promise<void>;
};

type ProfileClientConfig = {
  profile?: TProfileConfig | null;
  consent?: TConsentConfig | null;
  onSavingChange?: (saving: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  externalDirty?: boolean;
};

const emptyAccount: ProfileAccountState = {
  name: null,
  email: null,
  image: null,
  createdAt: null,
};

const isPlainJsonObject = (
  value: unknown
): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);

  const source = value as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(source[key])}`)
    .join(",")}}`;
};

const normalizeLoadedProfile = (
  payload: TProfileLoadResult,
  consentConfig?: TConsentConfig | null
) => ({
  profile: payload.profile || {},
  consent: getConsentCurrentValues(payload.consent, consentConfig),
  rawConsent: payload.consent,
  account: payload.account || emptyAccount,
  isComplete: payload.isComplete,
});

export const useProfileController = ({
  consent: consentConfig,
  onSavingChange,
  onDirtyChange,
  externalDirty = false,
}: ProfileClientConfig): TProfileClientController => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TProfileData>({});
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [rawConsent, setRawConsent] = useState<TConsentData | null>(null);
  const [account, setAccount] = useState<ProfileAccountState | null>(null);
  const [errors, setErrors] = useState<TProfileValidationError[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [snapshot, setSnapshot] = useState({
    profile: stableStringify({}),
    consent: stableStringify({}),
    account: stableStringify(emptyAccount),
  });

  const persistedDirty = useMemo(
    () =>
      snapshot.profile !== stableStringify(profile) ||
      snapshot.consent !== stableStringify(consent) ||
      snapshot.account !== stableStringify(account || emptyAccount),
    [account, consent, profile, snapshot]
  );

  const isDirty = persistedDirty || externalDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const applyLoaded = useCallback(
    (payload: TProfileLoadResult) => {
      const normalized = normalizeLoadedProfile(payload, consentConfig);

      setProfile(normalized.profile);
      setConsent(normalized.consent);
      setRawConsent(normalized.rawConsent);
      setAccount(normalized.account);
      setIsComplete(normalized.isComplete);
      setErrors([]);
      setSnapshot({
        profile: stableStringify(normalized.profile),
        consent: stableStringify(normalized.consent),
        account: stableStringify(normalized.account),
      });
    },
    [consentConfig]
  );

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Could not load profile.");
      }

      applyLoaded((await res.json()) as TProfileLoadResult);
    } finally {
      setLoading(false);
    }
  }, [applyLoaded]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/profile", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Could not load profile.");
        }

        return res.json() as Promise<TProfileLoadResult>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) applyLoaded(payload);
      })
      .catch(() => {
        // The profile page renders the protected API error through save/reload flows.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [applyLoaded]);

  useEffect(() => {
    if (!isDirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.download) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.href === window.location.href) return;

      if (!window.confirm("You have unsaved profile changes. Leave anyway?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", clickHandler, true);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", clickHandler, true);
    };
  }, [isDirty]);

  const validate = useCallback(() => {
    if (!isPlainJsonObject(profile)) {
      setErrors([{ path: "/", message: "Profile must be a JSON object." }]);
      return false;
    }

    // Schema validation stays server-side so production CSP can forbid eval.
    setErrors([]);
    return true;
  }, [profile]);

  const save = useCallback(
    async ({ source = "profile", method = "profile-save" }: ProfileSaveInput = {}) => {
      if (!validate()) {
        throw new Error("Fix the highlighted profile errors before saving.");
      }

      setSaving(true);
      onSavingChange?.(true);

      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            consent,
            account: account
              ? {
                  name: account.name,
                  image: account.image,
                }
              : undefined,
            source,
            method,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const nextErrors = Array.isArray(payload?.errors)
            ? payload.errors
            : [];
          setErrors(nextErrors);
          throw new Error(payload?.message || "Could not save profile.");
        }

        const payload = (await res.json()) as TProfileLoadResult;
        applyLoaded(payload);

        return payload;
      } finally {
        setSaving(false);
        onSavingChange?.(false);
      }
    },
    [account, applyLoaded, consent, onSavingChange, profile, validate]
  );

  const setProfileValue = useCallback((key: string, value: JsonValue) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const setProfileValues = useCallback((values: Record<string, JsonValue>) => {
    setProfile((current) => ({
      ...current,
      ...values,
    }));
  }, []);

  const setConsentValue = useCallback((name: string, value: boolean) => {
    setConsent((current) => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const setAccountValue = useCallback(
    (key: "name" | "image", value: string | null) => {
      setAccount((current) => ({
        ...(current || emptyAccount),
        [key]: value,
      }));
    },
    []
  );

  return {
    loading,
    saving,
    profile,
    consent,
    rawConsent,
    account,
    errors,
    isComplete,
    isDirty,
    setProfileValue,
    setProfileValues,
    setConsentValue,
    setAccountValue,
    validate,
    save,
    reload,
  };
};

const ProfileContext = createContext<TProfileClientController | null>(null);

export const ProfileProvider = ({
  controller,
  children,
}: {
  controller: TProfileClientController;
  children: ReactNode;
}) => (
  <ProfileContext.Provider value={controller}>{children}</ProfileContext.Provider>
);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider.");
  }

  return context;
};
