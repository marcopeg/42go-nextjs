export const triggerInteractionHaptic = () => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return false;
  }

  try {
    return navigator.vibrate(10);
  } catch {
    return false;
  }
};
