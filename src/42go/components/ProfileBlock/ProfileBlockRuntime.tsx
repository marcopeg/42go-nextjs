"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import type { TProfileBlockHandle } from "@/42go/components/ProfileBlock/types";

type ProfileBlockRuntimeValue = {
  blockId: string;
  registerBlock: (blockId: string, handle: TProfileBlockHandle) => () => void;
};

const ProfileBlockRuntimeContext =
  createContext<ProfileBlockRuntimeValue | null>(null);

type ProfileBlockRuntimeProviderProps = {
  blockId: string;
  registerBlock: (blockId: string, handle: TProfileBlockHandle) => () => void;
  children: ReactNode;
};

export const ProfileBlockRuntimeProvider = ({
  blockId,
  registerBlock,
  children,
}: ProfileBlockRuntimeProviderProps) => {
  const value = useMemo(
    () => ({
      blockId,
      registerBlock,
    }),
    [blockId, registerBlock]
  );

  return (
    <ProfileBlockRuntimeContext.Provider value={value}>
      {children}
    </ProfileBlockRuntimeContext.Provider>
  );
};

export const useProfileBlockHandle = (handle: TProfileBlockHandle) => {
  const runtime = useContext(ProfileBlockRuntimeContext);
  const handleRef = useRef(handle);

  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useEffect(() => {
    if (!runtime) return;

    return runtime.registerBlock(runtime.blockId, {
      validate: () =>
        handleRef.current.validate?.() ?? {
          ok: true,
        },
      onSaveSuccess: () => handleRef.current.onSaveSuccess?.(),
      onSaveError: (summary) => handleRef.current.onSaveError?.(summary),
    });
  }, [runtime]);
};
