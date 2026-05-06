"use client";

import { createElement, type ComponentType } from "react";

import { AccountInfo } from "@/42go/components/ProfileBlock/blocks/AccountInfo";
import { Consent } from "@/42go/components/ProfileBlock/blocks/Consent";
import { Logout } from "@/42go/components/ProfileBlock/blocks/Logout";
import { TestRBAC } from "@/42go/components/ProfileBlock/blocks/TestRBAC";
import { ThemePreference } from "@/42go/components/ProfileBlock/blocks/ThemePreference";
import { ProfileBlockRuntimeProvider } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import type {
  TProfileBlockHandle,
  TProfileBlockItem,
} from "@/42go/components/ProfileBlock/types";

type ProfileBlockProps = {
  blockId: string;
  item: TProfileBlockItem;
  registerBlock: (blockId: string, handle: TProfileBlockHandle) => () => void;
  setBlockDirty: (blockId: string, dirty: boolean) => void;
};

export const ProfileBlock = ({
  blockId,
  item,
  registerBlock,
  setBlockDirty,
}: ProfileBlockProps) => {
  const renderBlock = () => {
    if (item.type === "component") {
      return createElement(
        item.component as ComponentType<Record<string, unknown>>,
        (item.props ?? {}) as Record<string, unknown>
      );
    }

    if (item.type === "AccountInfo") {
      return <AccountInfo title={item.title} />;
    }

    if (item.type === "TestRBAC") {
      return <TestRBAC title={item.title} />;
    }

    if (item.type === "Logout") {
      return <Logout />;
    }

    if (item.type === "Consent") {
      return (
        <Consent title={item.title} description={item.description} />
      );
    }

    if (item.type === "ThemePreference") {
      return (
        <ThemePreference
          title={item.title}
          description={item.description}
        />
      );
    }

    return null;
  };

  return (
    <ProfileBlockRuntimeProvider
      blockId={blockId}
      registerBlock={registerBlock}
      setBlockDirty={setBlockDirty}
    >
      {renderBlock()}
    </ProfileBlockRuntimeProvider>
  );
};
