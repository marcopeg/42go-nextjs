const PLAYED_SENTENCE_OPACITY = "0.58";
const TRANSLATION_POPOVER_SELECTOR = "[data-reader-translation-popover]";
const ACTIVE_TRANSLATION_SELECTOR =
  '[data-reader-translation-id][aria-pressed="true"]';

type ElementAttributeSnapshot = {
  element: HTMLElement;
  value: string | null;
};

type ElementStyleSnapshot = {
  element: HTMLElement;
  opacity: string;
};

type ElementVisibilitySnapshot = {
  element: HTMLElement;
  visibility: string;
};

type ApplyReaderPlaybackFocusInput = {
  article: HTMLElement;
  activeSentenceId: string;
  progressiveReveal: boolean;
  dimPreviousSentences: boolean;
};

const hasActiveTranslation = (sentence: HTMLElement) =>
  Boolean(
    sentence.closest(ACTIVE_TRANSLATION_SELECTOR) ||
      sentence.querySelector(ACTIVE_TRANSLATION_SELECTOR)
  );

const isPersistentReaderOverlay = (element: HTMLElement) =>
  element.matches(TRANSLATION_POPOVER_SELECTOR) ||
  Boolean(element.querySelector(TRANSLATION_POPOVER_SELECTOR));

export const applyReaderPlaybackFocus = ({
  article,
  activeSentenceId,
  progressiveReveal,
  dimPreviousSentences,
}: ApplyReaderPlaybackFocusInput) => {
  const sentenceElements = Array.from(
    article.querySelectorAll<HTMLElement>("[data-reader-sentence-id]")
  );
  const activeSentence = sentenceElements.find(
    (sentence) => sentence.dataset.readerSentenceId === activeSentenceId
  );
  const activeIndex = activeSentence
    ? sentenceElements.indexOf(activeSentence)
    : -1;

  if (!activeSentence || activeIndex < 0) return () => undefined;

  const attributeSnapshots: ElementAttributeSnapshot[] = [];
  const styleSnapshots: ElementStyleSnapshot[] = [];
  const visibilitySnapshots: ElementVisibilitySnapshot[] = [];

  sentenceElements.forEach((sentence, index) => {
    attributeSnapshots.push({
      element: sentence,
      value: sentence.getAttribute("data-reader-playback-state"),
    });
    sentence.setAttribute(
      "data-reader-playback-state",
      index < activeIndex ? "played" : index === activeIndex ? "current" : "future"
    );

    if (
      dimPreviousSentences &&
      index < activeIndex &&
      !hasActiveTranslation(sentence)
    ) {
      styleSnapshots.push({
        element: sentence,
        opacity: sentence.style.opacity,
      });
      sentence.style.opacity = PLAYED_SENTENCE_OPACITY;
    }
  });

  if (progressiveReveal) {
    let branch: HTMLElement | null = activeSentence;

    while (branch && branch !== article) {
      let sibling = branch.nextElementSibling;
      while (sibling) {
        const nextSibling = sibling.nextElementSibling;
        if (
          sibling instanceof HTMLElement &&
          !isPersistentReaderOverlay(sibling)
        ) {
          visibilitySnapshots.push({
            element: sibling,
            visibility: sibling.style.visibility,
          });
          sibling.style.visibility = "hidden";
        }
        sibling = nextSibling;
      }
      branch = branch.parentElement;
    }
  }

  return () => {
    visibilitySnapshots.forEach(({ element, visibility }) => {
      element.style.visibility = visibility;
    });
    styleSnapshots.forEach(({ element, opacity }) => {
      element.style.opacity = opacity;
    });
    attributeSnapshots.forEach(({ element, value }) => {
      if (value === null) {
        element.removeAttribute("data-reader-playback-state");
      } else {
        element.setAttribute("data-reader-playback-state", value);
      }
    });
  };
};
