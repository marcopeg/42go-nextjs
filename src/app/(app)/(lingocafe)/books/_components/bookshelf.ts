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
    case "sv":
      return `Del ${vol}`;
    case "de":
      return `Band ${vol}`;
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
  // 1. Try project matching <name>-<vol> (e.g. "vehicles-01", "cities-03", "sports-02")
  const projTrimmed = (project ?? "").trim().toLowerCase();
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

  // 2. Try id matching <name>-<vol>-<lang>-<level>
  const idTrimmed = (id ?? "").trim().toLowerCase();
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

  // 3. Try title matching volume pattern e.g. "(Del 2)", "Volym 2", "Vol. 3", "Del 1"
  if (rawTitle) {
    const volRegex = new RegExp(
      `\\b${VOLUME_KEYWORD_PATTERN}\\s*(\\d+)\\b`,
      "i"
    );
    const titleMatch = rawTitle.match(volRegex);
    if (titleMatch) {
      const volumeNumber = parseInt(titleMatch[1], 10);
      return {
        isCollection: true,
        collectionKey: projTrimmed || null,
        volumeNumber,
        volumeLabel: formatVolumeLabel(volumeNumber, lang),
      };
    }
  }

  return {
    isCollection: false,
    collectionKey: null,
    volumeNumber: null,
    volumeLabel: null,
  };
};

const SERIES_SORT_NAMES: Record<string, Record<string, string>> = {
  sv: {
    cities: "Världens vackraste städer",
    discoveries: "Stora upptäckter som förändrade världen",
    figures: "Bakom myten",
    professions: "Yrken som bygger världen",
    sports: "Sportens värld",
    startups: "Startups som förändrade världen",
    vehicles: "Maskiner i rörelse",
  },
  en: {
    cities: "Most Beautiful Cities",
    discoveries: "Great Discoveries",
    figures: "Behind the Myth",
    professions: "Professions That Build the World",
    sports: "World of Sports",
    startups: "Startups That Changed the World",
    vehicles: "Machines of Motion",
  },
  de: {
    cities: "Die schönsten Städte der Welt",
    discoveries: "Große Entdeckungen",
    figures: "Hinter dem Mythos",
    professions: "Berufe, die die Welt bewegen",
    sports: "Die Welt des Sports",
    startups: "Startups, die die Welt veränderten",
    vehicles: "Maschinen in Bewegung",
  },
  it: {
    cities: "Le città più belle del mondo",
    discoveries: "Grandi scoperte",
    figures: "Dietro il mito",
    professions: "Professioni che muovono il mondo",
    sports: "Il mondo dello sport",
    startups: "Startup che hanno cambiato il mondo",
    vehicles: "Macchine in movimento",
  },
  es: {
    cities: "Las ciudades más bellas del mundo",
    discoveries: "Grandes descubrimientos",
    figures: "Detrás del mito",
    professions: "Profesiones que mueven el mundo",
    sports: "El mundo del deporte",
    startups: "Startups que cambiaron el mundo",
    vehicles: "Máquinas en movimiento",
  },
};

export const compareBooksForCatalog = (left: ReaderBook, right: ReaderBook) => {
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

  // If both books belong to the SAME collection, sort strictly by volumeNumber ascending:
  if (
    leftCol.collectionKey &&
    rightCol.collectionKey &&
    leftCol.collectionKey === rightCol.collectionKey
  ) {
    const volDiff = (leftCol.volumeNumber ?? 0) - (rightCol.volumeNumber ?? 0);
    if (volDiff !== 0) return volDiff;
  }

  // To group collections together contiguously, determine a collection sort key:
  const getSortKey = (book: ReaderBook, col: CollectionInfo) => {
    const lang = (book.lang ?? "en").trim().toLowerCase();
    if (col.collectionKey) {
      const canonicalName =
        SERIES_SORT_NAMES[lang]?.[col.collectionKey] ||
        SERIES_SORT_NAMES.en?.[col.collectionKey];
      if (canonicalName) {
        return canonicalName;
      }
      return col.collectionKey;
    }
    return book.title;
  };

  const leftKey = getSortKey(left, leftCol);
  const rightKey = getSortKey(right, rightCol);

  const keyDiff = collator.compare(leftKey, rightKey);
  if (keyDiff !== 0) {
    return keyDiff;
  }

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
      new RegExp(`[,\\s]+${VOLUME_KEYWORD_PATTERN}\\s*\\d+\\s*$`, "i"),
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
