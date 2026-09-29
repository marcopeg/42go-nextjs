"use client";

import { createContext, useContext } from "react";

export type ReaderTrainingScope = {
  kind: "chapter" | "part";
  pageId: string;
};

export const ReaderTrainingContext = createContext<((scope: ReaderTrainingScope) => void) | null>(null);

export const useReaderTraining = () => useContext(ReaderTrainingContext);
