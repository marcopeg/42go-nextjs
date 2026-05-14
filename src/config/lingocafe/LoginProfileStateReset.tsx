"use client";

import { useEffect } from "react";

import { clearCachedLingoCafeProfileCompletion } from "@/config/lingocafe/profile-completion-cache";

export const LoginProfileStateReset = () => {
  useEffect(() => {
    clearCachedLingoCafeProfileCompletion();
  }, []);

  return null;
};
