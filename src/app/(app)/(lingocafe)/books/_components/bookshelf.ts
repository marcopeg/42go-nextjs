import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

export const VOLUME_KEYWORD_PATTERN =
  "(?:Volume|Vol\\.|Vol|Volym|Del|Band|Teil|Bd\\.|Parte|Part|Pt\\.|Volumen|Tomo)";

export type CollectionInfo = {
  isCollection: boolean;
  collectionKey: string | null;
  volumeNumber: number | null;
  volumeLabel: string | null;
};

export const formatVolumeLabel = (
  vol: number,
  lang?: string | null
): string => {
  const normalized = (lang ?? "").trim().toLowerCase();
  switch (normalized) {
    case "de":
      return `Bd. ${vol}`;
    case "sv":
    case "es":
    case "it":
    case "fr":
    default:
      return `Vol. ${vol}`;
  }
};

export const extractCollectionInfo = (
  project?: string | null,
  id?: string | null,
  rawTitle?: string | null,
  lang?: string | null
): CollectionInfo => {
  const projTrimmed = (project ?? "").trim().toLowerCase();
  const idTrimmed = (id ?? "").trim().toLowerCase();

  // 1. Read explicit numbering, then use the catalog's short localized badge.
  if (rawTitle) {
    const volRegex = new RegExp(
      `\\b(${VOLUME_KEYWORD_PATTERN}\\s*(\\d+))\\b`,
      "i"
    );
    const titleMatch = rawTitle.match(volRegex);
    if (titleMatch) {
      const volumeNumber = parseInt(titleMatch[2], 10);
      const collectionKey =
        projTrimmed.replace(/[-_]\d+$/, "") ||
        idTrimmed.replace(/[-_]\d+.*$/, "") ||
        null;
      return {
        isCollection: true,
        collectionKey,
        volumeNumber,
        volumeLabel: formatVolumeLabel(volumeNumber, lang),
      };
    }
  }

  // 2. Try project matching <name>-<vol> (e.g. "vehicles-01", "cities-03", "sports-02")
  const projMatch = projTrimmed.match(/^([a-z0-9_-]+?)[-_](\d+)$/i);
  if (projMatch) {
    const collectionKey = projMatch[1];
    const volumeNumber = parseInt(projMatch[2], 10);
    return {
      isCollection: true,
      collectionKey,
      volumeNumber,
      volumeLabel: formatVolumeLabel(volumeNumber, lang),
    };
  }

  // 3. Try id matching <name>-<vol>-<lang>-<level>
  const idMatch = idTrimmed.match(
    /^([a-z0-9_-]+?)[-_](\d+)[-_](?:[a-z]{2})[-_](?:[a-z0-9]+)$/i
  );
  if (idMatch) {
    const collectionKey = idMatch[1];
    const volumeNumber = parseInt(idMatch[2], 10);
    return {
      isCollection: true,
      collectionKey,
      volumeNumber,
      volumeLabel: formatVolumeLabel(volumeNumber, lang),
    };
  }

  return {
    isCollection: false,
    collectionKey: null,
    volumeNumber: null,
    volumeLabel: null,
  };
};

export const compareBooksForCatalog = (left: ReaderBook, right: ReaderBook) => {
  const leftParsed = parseBookTitle(
    left.title,
    left.project,
    left.lang,
    left.id
  );
  const rightParsed = parseBookTitle(
    right.title,
    right.project,
    right.lang,
    right.id
  );

  // 1. Sort primarily by the main displayed title in alphabetical order
  const titleDiff = collator.compare(leftParsed.mainTitle, rightParsed.mainTitle);
  if (titleDiff !== 0) {
    return titleDiff;
  }

  // 2. If main titles are identical (e.g. multi-volume series), sort by volume number ascending
  const leftCol = extractCollectionInfo(
    left.project,
    left.id,
    left.title,
    left.lang
  );
  const rightCol = extractCollectionInfo(
    right.project,
    right.id,
    right.title,
    right.lang
  );

  if (leftCol.volumeNumber != null && rightCol.volumeNumber != null) {
    const volDiff = leftCol.volumeNumber - rightCol.volumeNumber;
    if (volDiff !== 0) return volDiff;
  }

  // 3. Tie-breaker by full raw title
  return collator.compare(left.title, right.title);
};

const getReadingActionTime = (book: ReaderBook) => {
  const updatedAt = book.readingAction.updatedAt;
  if (!updatedAt) return 0;

  const time = new Date(updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const compareBooksByRecentReading = (left: ReaderBook, right: ReaderBook) => {
  const timeDelta = getReadingActionTime(right) - getReadingActionTime(left);
  return timeDelta || compareBooksForCatalog(left, right);
};

const compareBooksByRecentCompletion = (
  left: ReaderBook,
  right: ReaderBook
) => {
  const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
  const rightTime = right.completedAt
    ? new Date(right.completedAt).getTime()
    : 0;
  return rightTime - leftTime || compareBooksForCatalog(left, right);
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
    .sort(compareBooksForCatalog);
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

export type ParsedBookTitle = {
  mainTitle: string;
  volumeLabel: string | null;
  subtitle: string | null;
};

const cleanVolumeSuffix = (str: string) => {
  return str
    .replace(
      new RegExp(`\\s*\\(${VOLUME_KEYWORD_PATTERN}\\s*\\d+\\)\\s*$`, "i"),
      ""
    )
    .replace(
      new RegExp(`[,\\s:–—-]+${VOLUME_KEYWORD_PATTERN}\\s*\\d+\\s*$`, "i"),
      ""
    )
    .trim();
};

export const parseBookTitle = (
  rawTitle: string,
  project?: string | null,
  lang?: string | null,
  id?: string | null
): ParsedBookTitle => {
  const colInfo = extractCollectionInfo(project, id, rawTitle, lang);
  const volumeLabel = colInfo.volumeLabel;

  const colonIdx = rawTitle.indexOf(":");
  if (colonIdx !== -1) {
    let mainTitle = cleanVolumeSuffix(rawTitle.slice(0, colonIdx));
    const rest = cleanVolumeSuffix(rawTitle.slice(colonIdx + 1));

    // Normalize Swedish series titles if divergent:
    if (
      colInfo.collectionKey === "vehicles" &&
      (lang ?? "").toLowerCase() === "sv"
    ) {
      mainTitle = "Maskiner i rörelse";
    }

    return { mainTitle, volumeLabel, subtitle: rest };
  }

  let cleaned = cleanVolumeSuffix(rawTitle);
  if (
    colInfo.collectionKey === "vehicles" &&
    (lang ?? "").toLowerCase() === "sv"
  ) {
    cleaned = "Maskiner i rörelse";
  }

  return { mainTitle: cleaned, volumeLabel, subtitle: null };
};

export const getTitleTypography = (title: string) => {
  const len = title.length;
  const words = title.split(/\s+/);
  const maxWordLen = words.reduce((max, w) => Math.max(max, w.length), 0);

  if (len > 32 || maxWordLen >= 14) {
    return {
      sizeClass: "text-[0.74rem] sm:text-[0.92rem] md:text-base leading-tight",
      clampClass: "line-clamp-4",
    };
  }
  if (len > 20 || maxWordLen >= 9) {
    return {
      sizeClass: "text-[0.82rem] sm:text-base md:text-lg leading-snug",
      clampClass: "line-clamp-3 sm:line-clamp-4",
    };
  }
  return {
    sizeClass: "text-[0.94rem] sm:text-lg md:text-xl leading-snug",
    clampClass: "line-clamp-3",
  };
};
