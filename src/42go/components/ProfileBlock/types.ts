import type { ComponentType } from "react";
import type {
  TProfileCoreConfig,
  TProfileData,
  TConsentData,
  TProfileValidationError,
} from "@/42go/profile";

export type TProfileSaveValidationResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type TProfileSavePersistenceResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type TProfileSaveSummary =
  | {
      ok: true;
      phase: "complete";
      message: string;
    }
  | {
      ok: false;
      phase: "validation" | "persistence";
      message: string;
      errors: string[];
    };

export type TProfileBlockHandle = {
  validate?: () =>
    | TProfileSaveValidationResult
    | Promise<TProfileSaveValidationResult>;
  onSaveSuccess?: () => void | Promise<void>;
  onSaveError?: (summary: TProfileSaveSummary) => void | Promise<void>;
};

export type TAccountInfoProfileBlock = {
  type: "AccountInfo";
  title?: string;
};

export type TTestRBACProfileBlock = {
  type: "TestRBAC";
  title?: string;
};

export type TLogoutProfileBlock = {
  type: "Logout";
  title?: string;
};

export type TConsentProfileBlock = {
  type: "Consent";
  title?: string;
  description?: string;
  source?: string;
  method?: string;
};

export type TProfileComponentBlock<TProps = Record<string, never>> = {
  type: "component";
  component: ComponentType<TProps>;
  props?: TProps;
  profileKeys?: readonly string[];
  consentKeys?: readonly string[];
};

export type TProfilePlatformBlock =
  | TAccountInfoProfileBlock
  | TTestRBACProfileBlock
  | TLogoutProfileBlock
  | TConsentProfileBlock;

export type TProfileBlockItem =
  | TProfilePlatformBlock
  | TProfileComponentBlock;

export type TProfileStoreSnapshot = {
  profile: TProfileData;
  consent: Record<string, boolean>;
  rawConsent: TConsentData | null;
  errors: TProfileValidationError[];
};

export type TProfileConfig = TProfileCoreConfig & {
  items?: readonly TProfileBlockItem[];
};

export type TProfilePageRendererHandle = {
  save: () => Promise<TProfileSaveSummary>;
};
