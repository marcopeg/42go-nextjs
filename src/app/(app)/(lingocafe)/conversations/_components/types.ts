export type ConversationBand = "beginner" | "intermediate" | "advanced";

export type ConversationProfile = {
  targetLanguage: string;
  ownLanguage: string;
  targetLevel: string | null;
  defaultBand: ConversationBand;
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
  selection: { band: ConversationBand; levels: string[] };
  starred: ConversationChoice[];
  roots: ConversationCategory[];
};

export type ConversationCategoryResponse = {
  profile: ConversationProfile;
  selection: { band: ConversationBand; levels: string[] };
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
  state: { isRead: boolean; isStarred: boolean; progressBps: number };
  translation: { enabled: boolean; from: string; to: string | null };
  speech?: { language?: string };
};

export const CONVERSATIONS_POLICY = {
  require: { feature: "page:conversations", session: true },
} as const;

export const BAND_LEVELS: Record<ConversationBand, string[]> = {
  beginner: ["a1"],
  intermediate: ["a2", "b1"],
  advanced: ["b2"],
};

export const isConversationBand = (
  value: string | null | undefined
): value is ConversationBand =>
  value === "beginner" || value === "intermediate" || value === "advanced";

export const bandFromProfileLevel = (
  value: string | null | undefined
): ConversationBand => {
  if (value === "a1") return "beginner";
  if (value === "b2") return "advanced";
  return "intermediate";
};

export const buildBandHref = (pathname: string, band: ConversationBand) =>
  `${pathname}?${new URLSearchParams({ band }).toString()}`;

export const buildConversationHref = ({
  id,
  band,
  returnTo,
}: {
  id: string;
  band: ConversationBand;
  returnTo: string;
}) => {
  const query = new URLSearchParams({ band, returnTo });
  return `/conversations/${encodeURIComponent(id)}?${query.toString()}`;
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
