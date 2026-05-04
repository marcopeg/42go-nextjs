"use client";

import { createElement, type ComponentType } from "react";

import { AccountInfo } from "@/42go/profile/blocks/AccountInfo";
import { Logout } from "@/42go/profile/blocks/Logout";
import { TestRBAC } from "@/42go/profile/blocks/TestRBAC";
import { ProfileBlockRuntimeProvider } from "@/42go/profile/ProfileBlockRuntime";
import type {
  TProfileBlockHandle,
  TProfileBlockItem,
} from "@/42go/profile/types";

type ProfileBlockProps = {
  blockId: string;
  item: TProfileBlockItem;
  registerBlock: (blockId: string, handle: TProfileBlockHandle) => () => void;
};

export const ProfileBlock = ({
  blockId,
  item,
  registerBlock,
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
      return <Logout title={item.title} />;
    }

    return null;
  };

  return (
    <ProfileBlockRuntimeProvider
      blockId={blockId}
      registerBlock={registerBlock}
    >
      {renderBlock()}
    </ProfileBlockRuntimeProvider>
  );
};
