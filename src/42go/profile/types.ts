import type { ComponentType } from "react";

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
  persist?: () =>
    | TProfileSavePersistenceResult
    | Promise<TProfileSavePersistenceResult>;
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

export type TProfileComponentBlock<TProps = Record<string, never>> = {
  type: "component";
  component: ComponentType<TProps>;
  props?: TProps;
};

export type TProfilePlatformBlock =
  | TAccountInfoProfileBlock
  | TTestRBACProfileBlock
  | TLogoutProfileBlock;

export type TProfileBlockItem =
  | TProfilePlatformBlock
  | TProfileComponentBlock;

export type TProfileConfig = {
  items?: readonly TProfileBlockItem[];
};

export type TProfilePageRendererHandle = {
  save: () => Promise<TProfileSaveSummary>;
};
