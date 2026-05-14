const LINGOCAFE_PROFILE_COMPLETE_KEY_PREFIX = "lingocafe.profile.complete.v2";

export type TProfileCompletionState = {
  appId: string | null;
  userId: string | null;
  isComplete: boolean | null;
};

let currentProfileCompletionState: TProfileCompletionState | null = null;
let currentSessionUserId: string | null = null;

declare global {
  interface Window {
    __APP_SESSION_USER_ID__?: string | null;
    __APP_PROFILE_COMPLETION__?: TProfileCompletionState;
    __APP_PROFILE_COMPLETE__?: boolean;
  }
}

const getStorageKey = (userId: string) =>
  `${LINGOCAFE_PROFILE_COMPLETE_KEY_PREFIX}:${userId}`;

const syncWindowState = () => {
  if (typeof window === "undefined") return;

  window.__APP_SESSION_USER_ID__ = currentSessionUserId;
  window.__APP_PROFILE_COMPLETION__ =
    currentProfileCompletionState || undefined;
  delete window.__APP_PROFILE_COMPLETE__;
};

const getCurrentUserId = () => {
  if (typeof window === "undefined") return null;
  return currentSessionUserId || window.__APP_SESSION_USER_ID__ || null;
};

export const hydrateLingoCafeProfileCompletion = (
  state: TProfileCompletionState | null
) => {
  currentProfileCompletionState = state;
  currentSessionUserId = state?.userId || null;
  syncWindowState();
};

export const setCurrentLingoCafeProfileUser = (userId: string | null) => {
  currentSessionUserId = userId;

  if (!userId && currentProfileCompletionState) {
    currentProfileCompletionState = {
      ...currentProfileCompletionState,
      userId: null,
      isComplete: null,
    };
  }

  syncWindowState();
};

export const hasCachedLingoCafeProfileCompletion = () => {
  if (typeof window === "undefined") return false;

  const currentUserId = getCurrentUserId();
  if (!currentUserId) return false;

  const state = currentProfileCompletionState || window.__APP_PROFILE_COMPLETION__;
  if (
    state?.appId === "lingocafe" &&
    state.userId === currentUserId &&
    typeof state.isComplete === "boolean"
  ) {
    return state.isComplete;
  }

  try {
    return window.sessionStorage.getItem(getStorageKey(currentUserId)) === "1";
  } catch {
    return false;
  }
};

export const setCachedLingoCafeProfileCompletion = (
  isComplete: boolean,
  userId?: string | null
) => {
  if (typeof window === "undefined") return;

  const currentUserId =
    userId ||
    window.__APP_SESSION_USER_ID__ ||
    window.__APP_PROFILE_COMPLETION__?.userId ||
    null;

  currentProfileCompletionState = {
    appId: "lingocafe",
    userId: currentUserId,
    isComplete,
  };
  syncWindowState();

  if (!currentUserId) return;

  currentSessionUserId = currentUserId;
  syncWindowState();

  try {
    if (isComplete) {
      window.sessionStorage.setItem(getStorageKey(currentUserId), "1");
      return;
    }

    window.sessionStorage.removeItem(getStorageKey(currentUserId));
  } catch {
    // Storage may be unavailable in strict browser modes. The guard still works
    // without the cache; it just cannot skip the first async profile check.
  }
};

export const clearCachedLingoCafeProfileCompletion = () => {
  if (typeof window === "undefined") return;

  currentSessionUserId = null;
  currentProfileCompletionState = {
    appId: "lingocafe",
    userId: null,
    isComplete: null,
  };
  syncWindowState();

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(LINGOCAFE_PROFILE_COMPLETE_KEY_PREFIX)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Storage may be unavailable in strict browser modes.
  }
};
