const sentenceTerminatorPattern = /[.!?。！？]/u;
const closingSentenceCharacters = /^[\s"'’”)\]}»]*$/u;
const trailingClosingCharacters = /[\s"'’”)\]}»]+$/u;
const standaloneAbbreviationPattern = /^\p{L}{1,4}\.$/u;
const dottedInitialPattern = /^(?:\p{L}\.){2,8}$/u;

const getFallbackSentenceSegments = (text: string) => {
  const segments: string[] = [];
  let start = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const character = text[cursor];
    if (!sentenceTerminatorPattern.test(character)) {
      cursor += 1;
      continue;
    }

    if (
      character === "." &&
      /\d/u.test(text[cursor - 1] ?? "") &&
      /\d/u.test(text[cursor + 1] ?? "")
    ) {
      cursor += 1;
      continue;
    }

    if (character === "." && text[cursor + 1] === ".") {
      cursor += 1;
      continue;
    }

    let end = cursor + 1;
    while (end < text.length && /["'’”\)\]\}»]/u.test(text[end])) end += 1;
    segments.push(text.slice(start, end));
    start = end;
    cursor = end;
  }

  if (start < text.length) {
    const trailingText = text.slice(start);
    if (/^\s+$/u.test(trailingText) && segments.length > 0) {
      segments[segments.length - 1] += trailingText;
    } else {
      segments.push(trailingText);
    }
  }
  return segments;
};

const getPlatformSentenceSegments = (text: string) => {
  if (typeof Intl.Segmenter !== "function") {
    return getFallbackSentenceSegments(text);
  }

  const platformSegments = Array.from(
    new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(text),
    ({ segment }) => segment
  );
  const segments: string[] = [];

  for (const segment of platformSegments) {
    segments.push(...getFallbackSentenceSegments(segment));
  }

  return segments;
};

const isStandaloneAbbreviation = (segment: string) => {
  const normalized = segment.trim().replace(trailingClosingCharacters, "");
  return (
    standaloneAbbreviationPattern.test(normalized) ||
    dottedInitialPattern.test(normalized)
  );
};

const reconcileAbbreviationFragments = (segments: string[]) => {
  const reconciled: string[] = [];

  for (const segment of segments) {
    if (!segment) continue;
    const previous = reconciled[reconciled.length - 1];
    if (previous && isStandaloneAbbreviation(previous)) {
      reconciled[reconciled.length - 1] = previous + segment;
      continue;
    }
    reconciled.push(segment);
  }

  return reconciled;
};

export const splitLingoCafeSentences = (text: string) => {
  if (!text.trim()) return [text];
  const segments = reconcileAbbreviationFragments(
    getPlatformSentenceSegments(text)
  );
  return segments.length > 0 ? segments : [text];
};

export type LingoCafeSentenceDisplaySegment = {
  text: string;
  separatorBefore: string;
};

export const splitLingoCafeSentenceDisplaySegments = (
  text: string
): LingoCafeSentenceDisplaySegment[] => {
  const rawSegments = splitLingoCafeSentences(text);
  const contentSegments = rawSegments
    .map((segment, rawIndex) => ({ segment, rawIndex }))
    .filter(({ segment }) => segment.trim());

  return contentSegments.map(({ segment, rawIndex }, index) => {
    const previous = contentSegments[index - 1];
    const hasSourceWhitespace = previous
      ? /\s$/u.test(previous.segment) ||
        /^\s/u.test(segment) ||
        rawSegments
          .slice(previous.rawIndex + 1, rawIndex)
          .some((between) => /\s/u.test(between))
      : false;

    return {
      text: segment.trim(),
      separatorBefore: hasSourceWhitespace ? " " : "",
    };
  });
};

export const hasExactlyOneLingoCafeSentence = (text: string) => {
  const sentences = splitLingoCafeSentences(text).filter((segment) =>
    segment.trim()
  );
  const lastTerminator = Math.max(
    text.lastIndexOf("."),
    text.lastIndexOf("!"),
    text.lastIndexOf("?"),
    text.lastIndexOf("。"),
    text.lastIndexOf("！"),
    text.lastIndexOf("？")
  );

  if (lastTerminator === -1) return sentences.length === 1;

  return (
    sentences.length === 1 &&
    closingSentenceCharacters.test(text.slice(lastTerminator + 1))
  );
};
