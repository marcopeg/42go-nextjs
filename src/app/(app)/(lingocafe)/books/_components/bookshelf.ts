import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

const compareBooksByTitle = (left: ReaderBook, right: ReaderBook) =>
  collator.compare(left.title, right.title);

const getReadingActionTime = (book: ReaderBook) => {
  const updatedAt = book.readingAction.updatedAt;
  if (!updatedAt) return 0;

  const time = new Date(updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const compareBooksByRecentReading = (left: ReaderBook, right: ReaderBook) => {
  const timeDelta = getReadingActionTime(right) - getReadingActionTime(left);
  return timeDelta || compareBooksByTitle(left, right);
};

const compareBooksByRecentCompletion = (left: ReaderBook, right: ReaderBook) => {
  const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
  const rightTime = right.completedAt
    ? new Date(right.completedAt).getTime()
    : 0;
  return rightTime - leftTime || compareBooksByTitle(left, right);
};

const isCurrentlyReadingBook = (book: ReaderBook) =>
  !book.completedAt &&
  book.readingAction.kind === "resume" &&
  typeof book.readingAction.href === "string";

export const getTargetLevelsForPreference = (
  targetLevel: string | null | undefined
): string[] => {
  const normalized = (targetLevel ?? "").trim().toLowerCase();
  if (normalized === "a1") return ["a1"];
  if (normalized === "b2") return ["b2", "c1", "c2"];
  // Default to intermediate: a2, b1
  return ["a2", "b1"];
};

export const filterBooksByLevel = (
  books: ReaderBook[],
  targetLevel: string | null | undefined
): ReaderBook[] => {
  if (books.length === 0 || !targetLevel) return books;

  const desiredLevels = getTargetLevelsForPreference(targetLevel);

  // 1. Filter by desired level band
  const matched = books.filter((book) => {
    const bookLevel = (book.level ?? "").trim().toLowerCase();
    return desiredLevels.includes(bookLevel);
  });

  if (matched.length > 0) {
    return matched;
  }

  // 2. If no results (e.g. A1 has no books), automatically fallback to A2
  const a2Fallback = books.filter((book) => {
    const bookLevel = (book.level ?? "").trim().toLowerCase();
    return bookLevel === "a2" || bookLevel === "b1";
  });

  if (a2Fallback.length > 0) {
    return a2Fallback;
  }

  // 3. Fallback to all books if neither desired nor A2 exist
  return books;
};

export const buildBookshelfSections = (
  books: ReaderBook[],
  targetLevel?: string | null
) => {
  const filtered = targetLevel ? filterBooksByLevel(books, targetLevel) : books;

  const currentlyReading = filtered
    .filter(isCurrentlyReadingBook)
    .sort(compareBooksByRecentReading);
  const catalog = filtered
    .filter((book) => !book.completedAt && !isCurrentlyReadingBook(book))
    .sort(compareBooksByTitle);
  const completed = filtered
    .filter((book) => book.completedAt)
    .sort(compareBooksByRecentCompletion);

  return {
    currentlyReading,
    catalog,
    completed,
    hasCurrentlyReading: currentlyReading.length > 0,
    hasCompleted: completed.length > 0,
  };
};

export const VOLUME_KEYWORD_PATTERN =
  "(?:Volume|Vol\\.|Vol|Volym|Del|Band|Teil|Bd\\.|Parte|Part|Pt\\.|Volumen|Tomo)";

export const isVolume1Candidate = (
  project?: string | null,
  id?: string | null
): boolean => {
  if (project && /(?:^|[-_])0?1$/i.test(project.trim())) {
    return true;
  }
  if (id && /(?:^|[-_])0?1(?:$|[-_])/i.test(id.trim())) {
    return true;
  }
  return false;
};

export const getDefaultVolume1Label = (lang?: string | null): string => {
  const normalized = (lang ?? "").trim().toLowerCase();
  switch (normalized) {
    case "sv":
      return "Del 1";
    case "de":
      return "Band 1";
    case "es":
    case "it":
    case "fr":
    default:
      return "Vol. 1";
  }
};

export type ParsedBookTitle = {
  mainTitle: string;
  volumeLabel: string | null;
  subtitle: string | null;
};

export const parseBookTitle = (
  rawTitle: string,
  project?: string | null,
  lang?: string | null,
  id?: string | null
): ParsedBookTitle => {
  // 1. Check parenthesized volume: e.g. "Stora upptäckter som förändrade världen (Del 2)"
  const parenRegex = new RegExp(
    `\\s*\\((${VOLUME_KEYWORD_PATTERN}\\s*\\d+)\\)\\s*$`,
    "i"
  );
  const parenMatch = rawTitle.match(parenRegex);
  if (parenMatch) {
    const mainTitle = rawTitle.replace(parenMatch[0], "").trim();
    return { mainTitle, volumeLabel: parenMatch[1], subtitle: null };
  }

  // 2. Check colon with volume: e.g. "Världens vackraste städer: 40 fantastiska platser, Del 5"
  const colonIdx = rawTitle.indexOf(":");
  if (colonIdx !== -1) {
    const mainTitle = rawTitle.slice(0, colonIdx).trim();
    const rest = rawTitle.slice(colonIdx + 1).trim();
    const volRegex = new RegExp(`\\b(${VOLUME_KEYWORD_PATTERN}\\s*\\d+)\\b`, "i");
    const volMatch = rest.match(volRegex);
    const volumeLabel = volMatch
      ? volMatch[1]
      : isVolume1Candidate(project, id)
        ? getDefaultVolume1Label(lang)
        : null;
    return { mainTitle, volumeLabel, subtitle: rest };
  }

  // 3. Check trailing volume without paren or colon: e.g. "... Del 1" or "... Vol. 2"
  const trailRegex = new RegExp(
    `\\s+(${VOLUME_KEYWORD_PATTERN}\\s*\\d+)\\s*$`,
    "i"
  );
  const trailMatch = rawTitle.match(trailRegex);
  if (trailMatch) {
    const mainTitle = rawTitle.slice(0, trailMatch.index).trim();
    return { mainTitle, volumeLabel: trailMatch[1], subtitle: null };
  }

  // 4. Default: check if candidate for Volume 1
  const volumeLabel = isVolume1Candidate(project, id)
    ? getDefaultVolume1Label(lang)
    : null;
  return { mainTitle: rawTitle, volumeLabel, subtitle: null };
};

export const getTitleTypography = (title: string) => {
  const len = title.length;
  const words = title.split(/\s+/);
  const maxWordLen = words.reduce((max, w) => Math.max(max, w.length), 0);

  if (len > 32 || maxWordLen >= 14) {
    // Very long title or long compound word (e.g. "världsomsegling")
    return {
      sizeClass: "text-[0.74rem] sm:text-[0.92rem] md:text-base leading-tight",
      clampClass: "line-clamp-4",
    };
  }
  if (len > 20 || maxWordLen >= 9) {
    // Medium title (e.g. "Världens vackraste städer", "Baskervilles hund")
    return {
      sizeClass: "text-[0.82rem] sm:text-base md:text-lg leading-snug",
      clampClass: "line-clamp-3 sm:line-clamp-4",
    };
  }
  // Short title (e.g. "En studie i rött", "Från idé till succé")
  return {
    sizeClass: "text-[0.94rem] sm:text-lg md:text-xl leading-snug",
    clampClass: "line-clamp-3",
  };
};

