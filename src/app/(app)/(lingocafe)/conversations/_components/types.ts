export type ConversationProfile = {
  targetLanguage: string;
  ownLanguage: string;
  targetLevel: string | null;
};

export type ConversationParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avatarFallbackUrl: string | null;
};

export type ConversationChoice = {
  id: string;
  title: string;
  description: string;
  language: string;
  cefrLevel: string;
  scenarioId?: string;
  scenarioTitle?: string;
  scenarioDescription?: string;
  scenarioCanonicalLanguage?: string;
  scenarioLocalization?: ConversationLocalization | null;
  variantId?: string;
  variantTitle?: string;
  variantDescription?: string;
  variantCanonicalLanguage?: string;
  variantLocalization?: ConversationLocalization | null;
  isRead: boolean;
  isStarred: boolean;
  readAt?: string | null;
  starredAt?: string | null;
  participants: ConversationParticipant[];
};

export type ConversationLocalization = {
  title: string;
  description: string;
  language: string;
  cefrLevel: string;
};

export type ConversationCategory = {
  id: string;
  title: string;
  description: string;
  goal: string;
  availableCount: number;
};

export type ConversationPathItem = ConversationCategory;

export type ConversationVariant = {
  id: string;
  canonicalLanguage?: string;
  canonicalTitle?: string;
  canonicalDescription?: string;
  title: string;
  description: string;
  localization?: ConversationLocalization | null;
  choices: ConversationChoice[];
};

export type ConversationScenario = {
  id: string;
  canonicalLanguage?: string;
  canonicalTitle?: string;
  canonicalDescription?: string;
  title: string;
  description: string;
  learnerPromise?: string;
  localization?: ConversationLocalization | null;
  variants: ConversationVariant[];
};

export type ConversationDiscoveryResponse = {
  profile: ConversationProfile;
  starred: ConversationChoice[];
  roots: ConversationCategory[];
};

export type ConversationCategoryResponse = {
  profile: ConversationProfile;
  path: ConversationPathItem[];
  category: ConversationCategory;
  children: ConversationCategory[];
  scenarios: ConversationScenario[];
};

export type ConversationActor = {
  id: string;
  position: number;
  name: string;
  role?: string;
  description?: string;
  identity:
    | {
        source: "scenario";
        displayName: string;
        persona: null;
      }
    | {
        source: "persona";
        displayName: string;
        persona: {
          id: string;
          type: "archetype" | "role";
          presentationId: string;
          languageContext: string;
          oneLine: string;
          avatarUrl: string;
          avatarContentHash: string;
          avatarFallbackUrl: string | null;
        };
      };
};

export type ConversationRound = {
  position: number;
  actorId: string;
  text: string;
};

export type ConversationLevelLink = {
  id: string;
  cefrLevel: string;
};

export type ConversationDetailResponse = {
  conversation: ConversationChoice;
  scenario: {
    id: string;
    canonicalLanguage: string;
    canonicalTitle: string;
    canonicalDescription: string;
    title: string;
    description: string;
    learnerPromise?: string;
    localization: ConversationLocalization | null;
  };
  variant: {
    id: string;
    canonicalLanguage: string;
    canonicalTitle: string;
    canonicalDescription: string;
    title: string;
    description: string;
    localization: ConversationLocalization | null;
  };
  actors: ConversationActor[];
  rounds: ConversationRound[];
  availableLevels: ConversationLevelLink[];
  state: { isRead: boolean; isStarred: boolean; progressBps: number };
  translation: { enabled: boolean; from: string; to: string | null };
  speech?: { language?: string };
};

export const CONVERSATIONS_POLICY = {
  require: { feature: "page:conversations", session: true },
} as const;

export const getVisibleConversationLibraryPathname = (
  pathname: string,
  returnTo: string | null
) => {
  if (
    !pathname.startsWith("/conversations/view/") ||
    !returnTo?.startsWith("/conversations") ||
    returnTo.startsWith("//")
  ) {
    return pathname;
  }

  return returnTo.split(/[?#]/)[0] || pathname;
};

export const buildConversationHref = ({
  id,
  returnTo,
}: {
  id: string;
  returnTo: string;
}) => {
  const query = new URLSearchParams({ returnTo });
  return `/conversations/view/${encodeURIComponent(id)}?${query.toString()}`;
};

export const getResponseMessage = async (
  response: Response,
  fallback: string
) => {
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof payload?.message === "string" ? payload.message : fallback;
};
