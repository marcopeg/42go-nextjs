import type { Knex } from "knex";

import { getDB } from "@/42go/db";
import {
  getReaderProfileStringValue,
  json,
  loadReaderProfile,
} from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import { isTranslationEnabled } from "@/app/api/(lingocafe)/lingocafe/_lib/translation";
import { resolveLingoCafeAssetUrl } from "@/lib/lingocafe/assets";

export type ConversationCefrLevel = "a1" | "a2" | "b1" | "b2";

const conversationCefrLevels: ConversationCefrLevel[] = ["a1", "a2", "b1", "b2"];

const idPattern = /^[a-z0-9][a-z0-9._-]{0,255}$/;
export const CONVERSATION_READ_PROGRESS_THRESHOLD_BPS = 9500;

const clampProgressBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

export class ConversationApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string
  ) {
    super(message);
    this.name = "ConversationApiError";
    this.status = status;
    this.code = code;
  }
}

export const conversationJson = json;

export const conversationErrorResponse = (error: unknown) => {
  if (error instanceof ConversationApiError) {
    return json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error("LingoCafe conversation API failed:", error);
  return json(
    { error: "conversation", message: "Could not load conversations." },
    { status: 500 }
  );
};

export const validateConversationId = (value: string, label: string) => {
  if (!idPattern.test(value)) {
    throw new ConversationApiError(400, "validation", `Invalid ${label}.`);
  }
  return value;
};

export const validateConversationCategoryPath = (path: string[]) => {
  if (path.length === 0 || path.length > 32) {
    throw new ConversationApiError(
      400,
      "validation",
      "Invalid category path."
    );
  }

  const normalized = path.map((part) =>
    validateConversationId(part, "category path")
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ConversationApiError(
      400,
      "validation",
      "Category paths cannot repeat a category."
    );
  }
  return normalized;
};

type ProfileContext = {
  userId: string;
  ownLanguage: string;
  targetLanguage: string;
  targetLevel: string | null;
};

const loadConversationProfile = async (
  userId: string
): Promise<ProfileContext> => {
  const profile = await loadReaderProfile(userId);
  const ownLanguage = getReaderProfileStringValue(profile, "ownLang");
  const targetLanguage = getReaderProfileStringValue(profile, "targetLang");
  const targetLevel = getReaderProfileStringValue(profile, "targetLevel");

  if (!profile.isComplete || !ownLanguage || !targetLanguage) {
    throw new ConversationApiError(
      422,
      "profile_incomplete",
      "Complete your language profile to browse conversations."
    );
  }

  return {
    userId,
    ownLanguage,
    targetLanguage,
    targetLevel,
  };
};

export const loadConversationBrowseValidator = async ({
  userId,
  categoryPath = [],
}: {
  userId: string;
  categoryPath?: string[];
}) => {
  const normalizedPath = categoryPath.length > 0
    ? validateConversationCategoryPath(categoryPath)
    : [];
  const profile = await loadConversationProfile(userId);
  const db = getDB();
  const [publication, learnerState] = await Promise.all([
    db("lingocafe.conversation_publication_state")
      .select("source_digest")
      .where({ id: "current" })
      .first() as Promise<{ source_digest: string } | undefined>,
    db("lingocafe.conversation_user_state_versions")
      .select("version")
      .where({ user_id: userId })
      .first() as Promise<{ version: number | string } | undefined>,
  ]);

  if (!publication) {
    throw new ConversationApiError(
      503,
      "publication_state",
      "Conversation publication state is unavailable."
    );
  }

  return {
    schema: "conversation-browse-v5",
    sourceDigest: publication.source_digest,
    learnerStateVersion: String(learnerState?.version ?? 0),
    userId,
    targetLanguage: profile.targetLanguage,
    ownLanguage: profile.ownLanguage,
    categoryPath: normalizedPath,
  };
};

const toISO = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
};

const applyLanguageScope = (
  query: Knex.QueryBuilder,
  alias: string,
  language: string
) =>
  query.andWhere(function languageScope() {
    this.where(`${alias}.language_scope`, "all").orWhereRaw(
      "? = ANY(??.??)",
      [language, alias, "languages"]
    );
  });

type CategoryRow = {
  id: string;
  title: string;
  description: string;
  goal: string;
  conversation_count: number | string;
};

const mapCategory = (row: CategoryRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  goal: row.goal,
  availableCount: Number(row.conversation_count),
});

const joinCategoryAvailability = (
  query: Knex.QueryBuilder,
  language: string
) =>
  query.joinRaw(
    `JOIN (
      SELECT category_id, SUM(conversation_count)::integer AS conversation_count
      FROM lingocafe.conversation_category_availability
      WHERE language = ? AND level_key IN (?, ?, ?, ?)
      GROUP BY category_id
    ) AS availability ON availability.category_id = category.id`,
    [language, ...conversationCefrLevels]
  );

type ConversationSummaryRow = {
  id: string;
  title: string;
  description: string;
  language: string;
  cefr_level: ConversationCefrLevel;
  read_at?: Date | string | null;
  starred_at?: Date | string | null;
};

const mapConversationSummary = (row: ConversationSummaryRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  language: row.language,
  cefrLevel: row.cefr_level,
  isRead: !!row.read_at,
  readAt: toISO(row.read_at),
  isStarred: !!row.starred_at,
  starredAt: toISO(row.starred_at),
});

const applyEligibleConversation = (
  query: Knex.QueryBuilder,
  language: string
) => {
  query
    .where("c.is_visible", true)
    .andWhere("v.is_visible", true)
    .andWhere("s.is_visible", true)
    .andWhere("c.language", language)
    .whereExists(function hasDialogueRounds() {
      this.select(1)
        .from("lingocafe.conversation_rounds as eligible_round")
        .whereRaw("eligible_round.conversation_id = c.id");
    });
  applyLanguageScope(query, "s", language);
  applyLanguageScope(query, "v", language);
  return query;
};

const conversationChain = (db: Knex | Knex.Transaction) =>
  db("lingocafe.conversations as c")
    .join("lingocafe.conversation_variants as v", function joinVariant() {
      this.on("v.scenario_id", "=", "c.scenario_id").andOn(
        "v.id",
        "=",
        "c.variant_id"
      );
    })
    .join(
      "lingocafe.conversation_scenarios as s",
      "s.id",
      "c.scenario_id"
    );

const joinConversationStar = (
  query: Knex.QueryBuilder,
  userId: string,
  joinType: "leftJoin" | "join" = "leftJoin"
) =>
  query[joinType]("lingocafe.conversation_stars as star", function joinStar() {
    this.on("star.scenario_id", "=", "c.scenario_id")
      .andOn("star.variant_id", "=", "c.variant_id")
      .andOn("star.language", "=", "c.language")
      .andOnVal("star.user_id", "=", userId);
  });

export const loadConversationDiscovery = async ({
  userId,
}: {
  userId: string;
}) => {
  const profile = await loadConversationProfile(userId);
  const db = getDB();

  const rootsQuery = db("lingocafe.conversation_categories as category")
    .select(
      "category.id",
      "category.title",
      "category.description",
      "category.goal",
      "availability.conversation_count"
    )
    .where("category.is_visible", true)
    .andWhere("availability.conversation_count", ">", 0)
    .whereNotExists(function rootHasNoParent() {
      this.select(db.raw("1"))
        .from("lingocafe.conversation_category_parents as parent_edge")
        .whereRaw("parent_edge.category_id = category.id");
    })
    .orderBy([{ column: "category.title", order: "asc" }, { column: "category.id", order: "asc" }]);
  joinCategoryAvailability(rootsQuery, profile.targetLanguage);
  applyLanguageScope(rootsQuery, "category", profile.targetLanguage);

  const starsQuery = conversationChain(db)
    .leftJoin("lingocafe.conversations as base", function joinEnglishConversation() {
      this.on("base.scenario_id", "=", "c.scenario_id")
        .andOn("base.variant_id", "=", "c.variant_id")
        .andOn("base.cefr_level", "=", "c.cefr_level")
        .andOnVal("base.language", "=", "en");
    })
    .leftJoin("lingocafe.conversation_reads as reader_state", function joinRead() {
      this.on("reader_state.conversation_id", "=", "c.id").andOnVal(
        "reader_state.user_id",
        "=",
        userId
      );
    })
    .leftJoin("lingocafe.conversation_scenario_localizations as sl", function joinScenarioLocalization() {
      this.on("sl.scenario_id", "=", "s.id")
        .andOn("sl.language", "=", "c.language")
        .andOn("sl.cefr_level", "=", "c.cefr_level");
    })
    .leftJoin("lingocafe.conversation_variant_localizations as vl", function joinVariantLocalization() {
      this.on("vl.scenario_id", "=", "v.scenario_id")
        .andOn("vl.variant_id", "=", "v.id")
        .andOn("vl.language", "=", "c.language")
        .andOn("vl.cefr_level", "=", "c.cefr_level");
    })
    .select(
      "c.id",
      db.raw("COALESCE(base.title, v.title) as list_title"),
      db.raw("COALESCE(base.description, v.description) as list_description"),
      "c.title",
      "c.description",
      "c.language",
      "c.cefr_level",
      "reader_state.read_at",
      "star.starred_at",
      "s.id as scenario_id",
      "s.title as scenario_title",
      "s.description as scenario_description",
      "s.learner_promise",
      "s.canonical_language as scenario_canonical_language",
      "sl.title as scenario_localized_title",
      "sl.description as scenario_localized_description",
      "v.id as variant_id",
      "v.title as variant_title",
      "v.description as variant_description",
      "v.canonical_language as variant_canonical_language",
      "vl.title as variant_localized_title",
      "vl.description as variant_localized_description"
    )
    .orderBy("star.starred_at", "desc")
    .orderBy("c.id", "asc");
  joinConversationStar(starsQuery, userId, "join");
  applyEligibleConversation(starsQuery, profile.targetLanguage);

  const [roots, starred] = await Promise.all([
    rootsQuery as Promise<CategoryRow[]>,
    starsQuery as Promise<CategoryConversationRow[]>,
  ]);
  const participantPreviews = await loadConversationParticipantPreviews(
    starred,
    profile.ownLanguage
  );

  return {
    profile: {
      targetLanguage: profile.targetLanguage,
      ownLanguage: profile.ownLanguage,
      targetLevel: profile.targetLevel,
    },
    starred: groupConversationVariants(starred, participantPreviews),
    roots: roots.map(mapCategory),
  };
};

type CategoryConversationRow = ConversationSummaryRow & {
  list_title: string;
  list_description: string;
  scenario_id: string;
  scenario_title: string;
  scenario_description: string;
  learner_promise: string;
  scenario_canonical_language: string;
  scenario_localized_title: string | null;
  scenario_localized_description: string | null;
  variant_id: string;
  variant_title: string;
  variant_description: string;
  variant_canonical_language: string;
  variant_localized_title: string | null;
  variant_localized_description: string | null;
};

const mapLocalization = (
  title: string | null,
  description: string | null,
  language: string,
  cefrLevel: ConversationCefrLevel
) =>
  title !== null && description !== null
    ? { title, description, language, cefrLevel }
    : null;

const getConversationVariantKey = ({
  scenario_id,
  variant_id,
}: Pick<CategoryConversationRow, "scenario_id" | "variant_id">) =>
  `${scenario_id}\u0000${variant_id}`;

const mapConversationChoice = (
  row: CategoryConversationRow,
  participants: ConversationParticipantPreview[] = []
) => ({
  ...mapConversationSummary(row),
  title: row.list_title,
  description: row.list_description,
  scenarioId: row.scenario_id,
  scenarioTitle: row.scenario_title,
  scenarioDescription: row.scenario_description,
  scenarioCanonicalLanguage: row.scenario_canonical_language,
  scenarioLocalization: mapLocalization(
    row.scenario_localized_title,
    row.scenario_localized_description,
    row.language,
    row.cefr_level
  ),
  variantId: row.variant_id,
  variantTitle: row.variant_title,
  variantDescription: row.variant_description,
  variantCanonicalLanguage: row.variant_canonical_language,
  variantLocalization: mapLocalization(
    row.variant_localized_title,
    row.variant_localized_description,
    row.language,
    row.cefr_level
  ),
  participants,
});

const groupCategoryScenarios = (
  rows: CategoryConversationRow[],
  participantPreviews: Map<string, ConversationParticipantPreview[]>
) => {
  const scenarios = new Map<
    string,
    {
      id: string;
      canonicalLanguage: string;
      canonicalTitle: string;
      canonicalDescription: string;
      title: string;
      description: string;
      learnerPromise: string;
      variants: Array<{
        id: string;
        scenarioId: string;
        canonicalLanguage: string;
        canonicalTitle: string;
        canonicalDescription: string;
        title: string;
        description: string;
        choices: Array<ReturnType<typeof mapConversationChoice>>;
      }>;
    }
  >();

  for (const row of rows) {
    let scenario = scenarios.get(row.scenario_id);
    if (!scenario) {
      scenario = {
        id: row.scenario_id,
        canonicalLanguage: row.scenario_canonical_language,
        canonicalTitle: row.scenario_title,
        canonicalDescription: row.scenario_description,
        title: row.scenario_title,
        description: row.scenario_description,
        learnerPromise: row.learner_promise,
        variants: [],
      };
      scenarios.set(row.scenario_id, scenario);
    }

    let variant = scenario.variants.find((item) => item.id === row.variant_id);
    if (!variant) {
      variant = {
        id: row.variant_id,
        scenarioId: row.scenario_id,
        canonicalLanguage: row.variant_canonical_language,
        canonicalTitle: row.variant_title,
        canonicalDescription: row.variant_description,
        title: row.variant_title,
        description: row.variant_description,
        choices: [],
      };
      scenario.variants.push(variant);
    }

    variant.choices.push(
      mapConversationChoice(
        row,
        participantPreviews.get(getConversationVariantKey(row))
      )
    );
  }

  return [...scenarios.values()];
};

const groupConversationVariants = (
  rows: CategoryConversationRow[],
  participantPreviews: Map<string, ConversationParticipantPreview[]>
) => {
  const variants = new Map<
    string,
    {
      id: string;
      canonicalLanguage: string;
      canonicalTitle: string;
      canonicalDescription: string;
      title: string;
      description: string;
      choices: Array<ReturnType<typeof mapConversationChoice>>;
    }
  >();

  for (const row of rows) {
    const key = `${getConversationVariantKey(row)}\u0000${row.language}`;
    let variant = variants.get(key);
    if (!variant) {
      variant = {
        id: row.variant_id,
        canonicalLanguage: row.variant_canonical_language,
        canonicalTitle: row.variant_title,
        canonicalDescription: row.variant_description,
        title: row.variant_title,
        description: row.variant_description,
        choices: [],
      };
      variants.set(key, variant);
    }
    variant.choices.push(
      mapConversationChoice(
        row,
        participantPreviews.get(getConversationVariantKey(row))
      )
    );
  }

  return [...variants.values()];
};

export const loadConversationCategory = async ({
  userId,
  categoryPath,
}: {
  userId: string;
  categoryPath: string[];
}) => {
  const pathIds = validateConversationCategoryPath(categoryPath);
  const profile = await loadConversationProfile(userId);
  const db = getDB();

  const pathQuery = db("lingocafe.conversation_categories as category")
    .select(
      "category.id",
      "category.title",
      "category.description",
      "category.goal",
      "availability.conversation_count"
    )
    .whereIn("category.id", pathIds)
    .andWhere("category.is_visible", true);
  joinCategoryAvailability(pathQuery, profile.targetLanguage);
  applyLanguageScope(pathQuery, "category", profile.targetLanguage);
  const pathRows = (await pathQuery) as CategoryRow[];
  const byId = new Map(pathRows.map((row) => [row.id, row]));
  if (pathIds.some((id) => !byId.has(id))) {
    throw new ConversationApiError(404, "not_found", "Category not found.");
  }

  const firstHasParent = await db("lingocafe.conversation_category_parents")
    .where({ category_id: pathIds[0] })
    .first();
  if (firstHasParent) {
    throw new ConversationApiError(404, "not_found", "Category path not found.");
  }

  if (pathIds.length > 1) {
    const edges = (await db("lingocafe.conversation_category_parents")
      .select("category_id", "parent_category_id")
      .whereIn("category_id", pathIds.slice(1))
      .whereIn("parent_category_id", pathIds.slice(0, -1))) as Array<{
      category_id: string;
      parent_category_id: string;
    }>;
    const edgeSet = new Set(
      edges.map((edge) => `${edge.parent_category_id}\u0000${edge.category_id}`)
    );
    for (let index = 1; index < pathIds.length; index += 1) {
      if (!edgeSet.has(`${pathIds[index - 1]}\u0000${pathIds[index]}`)) {
        throw new ConversationApiError(
          404,
          "not_found",
          "Category path not found."
        );
      }
    }
  }

  const categoryId = pathIds[pathIds.length - 1];
  const childrenQuery = db("lingocafe.conversation_category_parents as edge")
    .join(
      "lingocafe.conversation_categories as category",
      "category.id",
      "edge.category_id"
    )
    .select(
      "category.id",
      "category.title",
      "category.description",
      "category.goal",
      "availability.conversation_count"
    )
    .where("edge.parent_category_id", categoryId)
    .andWhere("category.is_visible", true)
    .andWhere("availability.conversation_count", ">", 0)
    .orderBy([{ column: "category.title", order: "asc" }, { column: "category.id", order: "asc" }]);
  joinCategoryAvailability(childrenQuery, profile.targetLanguage);
  applyLanguageScope(childrenQuery, "category", profile.targetLanguage);

  const choicesQuery = conversationChain(db)
    .leftJoin("lingocafe.conversations as base", function joinEnglishConversation() {
      this.on("base.scenario_id", "=", "c.scenario_id")
        .andOn("base.variant_id", "=", "c.variant_id")
        .andOn("base.cefr_level", "=", "c.cefr_level")
        .andOnVal("base.language", "=", "en");
    })
    .join(
      "lingocafe.conversation_category_scenarios as membership",
      "membership.scenario_id",
      "s.id"
    )
    .leftJoin("lingocafe.conversation_scenario_localizations as sl", function joinScenarioLocalization() {
      this.on("sl.scenario_id", "=", "s.id")
        .andOn("sl.language", "=", "c.language")
        .andOn("sl.cefr_level", "=", "c.cefr_level");
    })
    .leftJoin("lingocafe.conversation_variant_localizations as vl", function joinVariantLocalization() {
      this.on("vl.scenario_id", "=", "v.scenario_id")
        .andOn("vl.variant_id", "=", "v.id")
        .andOn("vl.language", "=", "c.language")
        .andOn("vl.cefr_level", "=", "c.cefr_level");
    })
    .leftJoin("lingocafe.conversation_reads as reader_state", function joinRead() {
      this.on("reader_state.conversation_id", "=", "c.id").andOnVal("reader_state.user_id", "=", userId);
    })
    .select(
      "c.id", "c.title", "c.description", "c.language", "c.cefr_level",
      db.raw("COALESCE(base.title, v.title) as list_title"),
      db.raw("COALESCE(base.description, v.description) as list_description"),
      "reader_state.read_at", "star.starred_at",
      "s.id as scenario_id", "s.title as scenario_title",
      "s.description as scenario_description", "s.learner_promise",
      "s.canonical_language as scenario_canonical_language",
      "sl.title as scenario_localized_title", "sl.description as scenario_localized_description",
      "v.id as variant_id", "v.title as variant_title",
      "v.description as variant_description", "v.canonical_language as variant_canonical_language",
      "vl.title as variant_localized_title", "vl.description as variant_localized_description"
    )
    .where("membership.category_id", categoryId)
    .orderBy("s.title", "asc")
    .orderBy("s.id", "asc")
    .orderBy("v.title", "asc")
    .orderBy("v.id", "asc")
    .orderByRaw("CASE c.cefr_level WHEN 'a1' THEN 1 WHEN 'a2' THEN 2 WHEN 'b1' THEN 3 WHEN 'b2' THEN 4 ELSE 5 END")
    .orderBy("c.title", "asc")
    .orderBy("c.id", "asc");
  joinConversationStar(choicesQuery, userId);
  applyEligibleConversation(choicesQuery, profile.targetLanguage);

  const [children, choices] = await Promise.all([
    childrenQuery as Promise<CategoryRow[]>,
    choicesQuery as Promise<CategoryConversationRow[]>,
  ]);
  const participantPreviews = await loadConversationParticipantPreviews(
    choices,
    profile.ownLanguage
  );

  return {
    profile: {
      targetLanguage: profile.targetLanguage,
      ownLanguage: profile.ownLanguage,
      targetLevel: profile.targetLevel,
    },
    path: pathIds.map((id) => mapCategory(byId.get(id)!)),
    category: mapCategory(byId.get(categoryId)!),
    children: children.map(mapCategory),
    scenarios: groupCategoryScenarios(choices, participantPreviews),
  };
};

type ConversationDetailRow = ConversationSummaryRow & {
  progress_bps: number | string | null;
  scenario_id: string;
  scenario_title: string;
  scenario_description: string;
  learner_promise: string;
  scenario_canonical_language: string;
  scenario_localized_title: string | null;
  scenario_localized_description: string | null;
  variant_id: string;
  variant_title: string;
  variant_description: string;
  variant_canonical_language: string;
  variant_localized_title: string | null;
  variant_localized_description: string | null;
};

type PersonaPresentation = {
  id: string;
  languageContext: string;
  displayName: string;
  avatarAssetKey: string;
  avatarContentHash: string;
};

type ConversationActorRow = {
  id: string;
  position: number | string;
  name: string;
  role: string;
  description: string;
  cast_actor_id: string | null;
  persona_id: string | null;
  persona_type: string | null;
  persona_status: string | null;
  persona_is_visible: boolean | null;
  persona_one_line: string | null;
  persona_presentations: unknown;
};

type ConversationParticipantPreview = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avatarFallbackUrl: string | null;
};

type ConversationParticipantRow = ConversationActorRow & {
  scenario_id: string;
  variant_id: string;
};

const parseRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "string") {
    try {
      return parseRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const parsePersonaPresentation = (
  value: unknown
): PersonaPresentation | null => {
  const record = parseRecord(value);
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const languageContext =
    typeof record.language_context === "string"
      ? record.language_context.trim().toLowerCase()
      : "";
  const displayName =
    typeof record.display_name === "string" ? record.display_name.trim() : "";
  const avatarAssetKey =
    typeof record.avatar_asset_key === "string"
      ? record.avatar_asset_key.trim()
      : "";
  const avatarContentHash =
    typeof record.avatar_content_hash === "string"
      ? record.avatar_content_hash.trim()
      : "";
  if (
    !id ||
    !languageContext ||
    !displayName ||
    !avatarAssetKey ||
    !/^[a-f0-9]{64}$/.test(avatarContentHash)
  ) {
    return null;
  }
  return {
    id,
    languageContext,
    displayName,
    avatarAssetKey,
    avatarContentHash,
  };
};

const resolvePersonaPresentation = (
  value: unknown,
  requestedContext: string
) => {
  const presentations = parseRecord(value);
  const normalizedContext = requestedContext.trim().toLowerCase().replaceAll("_", "-");
  const primaryContext = normalizedContext.split("-")[0] || normalizedContext;
  const keys = [...new Set([normalizedContext, primaryContext, "default"])];
  const selectedKey = keys.find((key) => parsePersonaPresentation(presentations[key]));
  const selected = selectedKey
    ? parsePersonaPresentation(presentations[selectedKey])
    : null;
  const fallback = parsePersonaPresentation(presentations.default);
  return { selected, fallback };
};

const loadConversationParticipantPreviews = async (
  conversations: CategoryConversationRow[],
  requestedContext: string
) => {
  const pairs = [
    ...new Map<string, [string, string]>(
      conversations.map((conversation) => [
        getConversationVariantKey(conversation),
        [conversation.scenario_id, conversation.variant_id],
      ])
    ).values(),
  ];
  const previews = new Map<string, ConversationParticipantPreview[]>();
  if (pairs.length === 0) return previews;

  const db = getDB();
  const rows = (await db("lingocafe.conversation_scenario_actors as actor")
    .join("lingocafe.conversation_variant_cast as cast", function joinCast() {
      this.on("cast.scenario_id", "=", "actor.scenario_id").andOn(
        "cast.actor_id",
        "=",
        "actor.id"
      );
    })
    .leftJoin("lingocafe.personas as persona", "persona.id", "cast.persona_id")
    .select(
      "actor.scenario_id",
      "cast.variant_id",
      "actor.id",
      "actor.position",
      "actor.name",
      "actor.role",
      "actor.description",
      "cast.actor_id as cast_actor_id",
      "cast.persona_id",
      "persona.persona_type",
      "persona.status as persona_status",
      "persona.is_visible as persona_is_visible",
      "persona.one_line as persona_one_line",
      "persona.presentations as persona_presentations"
    )
    .whereIn(["actor.scenario_id", "cast.variant_id"], pairs)
    .orderBy("actor.scenario_id", "asc")
    .orderBy("cast.variant_id", "asc")
    .orderBy("actor.position", "asc")) as ConversationParticipantRow[];

  for (const row of rows) {
    const key = getConversationVariantKey(row);
    const current = previews.get(key) ?? [];
    if (current.length >= 2) continue;

    const sourceName = String(row.name);
    const personaIsUsable =
      row.persona_id !== null &&
      row.persona_status === "accepted" &&
      row.persona_is_visible &&
      ["archetype", "role"].includes(String(row.persona_type));
    const { selected, fallback } = personaIsUsable
      ? resolvePersonaPresentation(row.persona_presentations, requestedContext)
      : { selected: null, fallback: null };
    const avatarUrl = resolveLingoCafeAssetUrl(selected?.avatarAssetKey) || null;
    const fallbackUrl =
      fallback && fallback.avatarAssetKey !== selected?.avatarAssetKey
        ? resolveLingoCafeAssetUrl(fallback.avatarAssetKey)
        : null;
    current.push({
      id: String(row.id),
      displayName:
        row.persona_type === "archetype" && selected
          ? selected.displayName
          : sourceName,
      avatarUrl,
      avatarFallbackUrl: fallbackUrl,
    });
    previews.set(key, current);
  }

  return previews;
};

export const loadConversationDetail = async ({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId: string;
}) => {
  validateConversationId(conversationId, "conversation ID");
  const profile = await loadConversationProfile(userId);
  const db = getDB();
  const detailQuery = conversationChain(db)
    .leftJoin("lingocafe.conversation_scenario_localizations as sl", function joinScenarioLocalization() {
      this.on("sl.scenario_id", "=", "s.id")
        .andOn("sl.language", "=", "c.language")
        .andOn("sl.cefr_level", "=", "c.cefr_level");
    })
    .leftJoin("lingocafe.conversation_variant_localizations as vl", function joinVariantLocalization() {
      this.on("vl.scenario_id", "=", "v.scenario_id")
        .andOn("vl.variant_id", "=", "v.id")
        .andOn("vl.language", "=", "c.language")
        .andOn("vl.cefr_level", "=", "c.cefr_level");
    })
    .leftJoin("lingocafe.conversation_reads as reader_state", function joinRead() {
      this.on("reader_state.conversation_id", "=", "c.id").andOnVal("reader_state.user_id", "=", userId);
    })
    .leftJoin("lingocafe.conversation_progress as progress_state", function joinProgress() {
      this.on("progress_state.conversation_id", "=", "c.id").andOnVal("progress_state.user_id", "=", userId);
    })
    .select(
      "c.id", "c.title", "c.description", "c.language", "c.cefr_level",
      "reader_state.read_at", "star.starred_at", "progress_state.progress_bps",
      "s.id as scenario_id", "s.title as scenario_title", "s.description as scenario_description",
      "s.learner_promise", "s.canonical_language as scenario_canonical_language",
      "sl.title as scenario_localized_title", "sl.description as scenario_localized_description",
      "v.id as variant_id", "v.title as variant_title", "v.description as variant_description",
      "v.canonical_language as variant_canonical_language",
      "vl.title as variant_localized_title", "vl.description as variant_localized_description"
    )
    .where("c.id", conversationId)
    .first();
  joinConversationStar(detailQuery, userId);
  applyEligibleConversation(detailQuery, profile.targetLanguage);
  const detail = (await detailQuery) as ConversationDetailRow | undefined;
  if (!detail) {
    throw new ConversationApiError(404, "not_found", "Conversation not found.");
  }

  const [actors, rounds, availableLevels] = await Promise.all([
    db("lingocafe.conversation_scenario_actors as actor")
      .leftJoin("lingocafe.conversation_variant_cast as cast", function joinCast() {
        this.on("cast.scenario_id", "=", "actor.scenario_id")
          .andOnVal("cast.variant_id", "=", detail.variant_id)
          .andOn("cast.actor_id", "=", "actor.id");
      })
      .leftJoin("lingocafe.personas as persona", "persona.id", "cast.persona_id")
      .select(
        "actor.id",
        "actor.position",
        "actor.name",
        "actor.role",
        "actor.description",
        "cast.actor_id as cast_actor_id",
        "cast.persona_id",
        "persona.persona_type",
        "persona.status as persona_status",
        "persona.is_visible as persona_is_visible",
        "persona.one_line as persona_one_line",
        "persona.presentations as persona_presentations"
      )
      .where({ "actor.scenario_id": detail.scenario_id })
      .orderBy("actor.position", "asc") as Promise<ConversationActorRow[]>,
    db("lingocafe.conversation_rounds")
      .select("position", "actor_id", "text")
      .where({ conversation_id: detail.id, scenario_id: detail.scenario_id })
      .orderBy("position", "asc"),
    (() => {
      const levelsQuery = conversationChain(db)
        .select("c.id", "c.cefr_level")
        .where({
          "c.scenario_id": detail.scenario_id,
          "c.variant_id": detail.variant_id,
        })
        .orderByRaw(
          "CASE c.cefr_level WHEN 'a1' THEN 1 WHEN 'a2' THEN 2 WHEN 'b1' THEN 3 WHEN 'b2' THEN 4 ELSE 5 END"
        );
      applyEligibleConversation(levelsQuery, profile.targetLanguage);
      return levelsQuery as Promise<Array<{ id: string; cefr_level: ConversationCefrLevel }>>;
    })(),
  ]);
  const castIsMalformed = actors.some(
    (actor) =>
      actor.cast_actor_id === null ||
      (actor.persona_id !== null &&
        (actor.persona_status !== "accepted" ||
          !actor.persona_is_visible ||
          !["archetype", "role"].includes(String(actor.persona_type))))
  );
  const actorIds = new Set(actors.map((actor) => String(actor.id)));
  const dialogueIsMalformed = rounds.some(
    (round, index) =>
      Number(round.position) !== index + 1 ||
      !actorIds.has(String(round.actor_id)) ||
      !String(round.text).trim()
  );
  if (rounds.length === 0 || castIsMalformed || dialogueIsMalformed) {
    throw new ConversationApiError(404, "not_found", "Conversation not found.");
  }

  const resolvedActors = actors.map((actor) => {
    const sourceName = String(actor.name);
    const base = {
      id: String(actor.id),
      position: Number(actor.position),
      name: sourceName,
      role: String(actor.role),
      description: String(actor.description),
    };
    if (actor.persona_id === null) {
      return {
        ...base,
        identity: {
          source: "scenario" as const,
          displayName: sourceName,
          persona: null,
        },
      };
    }

    const { selected, fallback } = resolvePersonaPresentation(
      actor.persona_presentations,
      profile.ownLanguage
    );
    const avatarUrl = resolveLingoCafeAssetUrl(selected?.avatarAssetKey);
    if (!selected || !avatarUrl) {
      throw new ConversationApiError(404, "not_found", "Conversation not found.");
    }
    const fallbackUrl =
      fallback && fallback.avatarAssetKey !== selected.avatarAssetKey
        ? resolveLingoCafeAssetUrl(fallback.avatarAssetKey)
        : null;
    return {
      ...base,
      identity: {
        source: "persona" as const,
        displayName:
          actor.persona_type === "role" ? sourceName : selected.displayName,
        persona: {
          id: actor.persona_id,
          type: actor.persona_type as "archetype" | "role",
          presentationId: selected.id,
          languageContext: selected.languageContext,
          oneLine: String(actor.persona_one_line || ""),
          avatarUrl,
          avatarContentHash: selected.avatarContentHash,
          avatarFallbackUrl: fallbackUrl,
        },
      },
    };
  });

  return {
    conversation: {
      ...mapConversationSummary(detail),
      scenarioId: detail.scenario_id,
      variantId: detail.variant_id,
      participants: resolvedActors.slice(0, 2).map((actor) => ({
        id: actor.id,
        displayName: actor.identity.displayName,
        avatarUrl: actor.identity.persona?.avatarUrl ?? null,
        avatarFallbackUrl:
          actor.identity.persona?.avatarFallbackUrl ?? null,
      })),
    },
    scenario: {
      id: detail.scenario_id,
      canonicalLanguage: detail.scenario_canonical_language,
      canonicalTitle: detail.scenario_title,
      canonicalDescription: detail.scenario_description,
      title: detail.scenario_localized_title ?? detail.scenario_title,
      description:
        detail.scenario_localized_description ?? detail.scenario_description,
      learnerPromise: detail.learner_promise,
      localization: mapLocalization(
        detail.scenario_localized_title,
        detail.scenario_localized_description,
        detail.language,
        detail.cefr_level
      ),
    },
    variant: {
      id: detail.variant_id,
      canonicalLanguage: detail.variant_canonical_language,
      canonicalTitle: detail.variant_title,
      canonicalDescription: detail.variant_description,
      title: detail.variant_localized_title ?? detail.variant_title,
      description:
        detail.variant_localized_description ?? detail.variant_description,
      localization: mapLocalization(
        detail.variant_localized_title,
        detail.variant_localized_description,
        detail.language,
        detail.cefr_level
      ),
    },
    actors: resolvedActors,
    rounds: rounds.map((round) => ({
      position: Number(round.position),
      actorId: String(round.actor_id),
      text: String(round.text),
    })),
    availableLevels: availableLevels.map((level) => ({
      id: level.id,
      cefrLevel: level.cefr_level,
    })),
    state: {
      isRead: !!detail.read_at,
      isStarred: !!detail.starred_at,
      progressBps: clampProgressBps(Number(detail.progress_bps ?? 0)),
    },
    translation: {
      enabled: isTranslationEnabled(),
      from: detail.language,
      to: profile.ownLanguage,
    },
    speech: { language: detail.language },
  };
};

export const saveConversationProgress = async ({
  userId,
  conversationId,
  progressBps,
}: {
  userId: string;
  conversationId: string;
  progressBps: number;
}) => {
  validateConversationId(conversationId, "conversation ID");
  const normalizedProgressBps = clampProgressBps(progressBps);
  const profile = await loadConversationProfile(userId);
  const db = getDB();

  return db.transaction(async (trx) => {
    const eligibleQuery = conversationChain(trx)
      .select("c.id")
      .where("c.id", conversationId)
      .first();
    applyEligibleConversation(eligibleQuery, profile.targetLanguage);
    if (!(await eligibleQuery)) {
      throw new ConversationApiError(404, "not_found", "Conversation not found.");
    }

    await trx("lingocafe.conversation_progress")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        progress_bps: normalizedProgressBps,
        updated_at: trx.fn.now(),
      })
      .onConflict(["user_id", "conversation_id"])
      .merge({
        progress_bps: normalizedProgressBps,
        updated_at: trx.fn.now(),
      });

    let readChanged = false;
    let readAt: string | null = null;
    if (normalizedProgressBps >= CONVERSATION_READ_PROGRESS_THRESHOLD_BPS) {
      const inserted = (await trx("lingocafe.conversation_reads")
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          read_at: trx.fn.now(),
        })
        .onConflict(["user_id", "conversation_id"])
        .ignore()
        .returning("read_at")) as Array<{ read_at: Date | string }>;
      readChanged = inserted.length > 0;
      const value = readChanged
        ? inserted[0].read_at
        : (
            await trx("lingocafe.conversation_reads")
              .select("read_at")
              .where({ user_id: userId, conversation_id: conversationId })
              .first()
          )?.read_at;
      readAt = toISO(value);
    } else {
      const existing = await trx("lingocafe.conversation_reads")
        .select("read_at")
        .where({ user_id: userId, conversation_id: conversationId })
        .first();
      readAt = toISO(existing?.read_at);
    }

    if (readChanged) {
      await trx.raw(
        `
          INSERT INTO lingocafe.conversation_user_state_versions
            (user_id, version, updated_at)
          VALUES (?, 1, NOW())
          ON CONFLICT (user_id) DO UPDATE
          SET version = lingocafe.conversation_user_state_versions.version + 1,
              updated_at = NOW()
        `,
        [userId]
      );
    }

    return {
      progressBps: normalizedProgressBps,
      isRead: readAt !== null,
      readAt,
      readChanged,
    };
  });
};

type StateKind = "read" | "star";

const incrementConversationUserStateVersion = async (
  trx: Knex.Transaction,
  userId: string
) => {
  await trx.raw(
    `
      INSERT INTO lingocafe.conversation_user_state_versions
        (user_id, version, updated_at)
      VALUES (?, 1, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET version = lingocafe.conversation_user_state_versions.version + 1,
          updated_at = NOW()
    `,
    [userId]
  );
};

const mutateConversationStar = async ({
  userId,
  conversationId,
  active,
}: {
  userId: string;
  conversationId: string;
  active: boolean;
}) => {
  const db = getDB();
  const profile = active ? await loadConversationProfile(userId) : null;

  return db.transaction(async (trx) => {
    const identityQuery = conversationChain(trx)
      .select("c.scenario_id", "c.variant_id", "c.language")
      .where("c.id", conversationId)
      .first();
    if (active) applyEligibleConversation(identityQuery, profile!.targetLanguage);
    const identity = (await identityQuery) as
      | { scenario_id: string; variant_id: string; language: string }
      | undefined;
    if (!identity) {
      if (active) {
        throw new ConversationApiError(404, "not_found", "Conversation not found.");
      }
      return { isStarred: false, starredAt: null, changed: false };
    }

    let changed = false;
    let starredAt: string | null = null;
    const where = {
      user_id: userId,
      scenario_id: identity.scenario_id,
      variant_id: identity.variant_id,
      language: identity.language,
    };
    if (active) {
      const inserted = (await trx("lingocafe.conversation_stars")
        .insert({ ...where, starred_at: trx.fn.now() })
        .onConflict(["user_id", "scenario_id", "variant_id", "language"])
        .ignore()
        .returning("starred_at")) as Array<{ starred_at: Date | string }>;
      changed = inserted.length > 0;
      const value = changed
        ? inserted[0].starred_at
        : (
            await trx("lingocafe.conversation_stars")
              .select("starred_at")
              .where(where)
              .first()
          )?.starred_at;
      starredAt = toISO(value);
    } else {
      changed =
        (await trx("lingocafe.conversation_stars")
          .where(where)
          .del()) > 0;
    }

    if (changed) await incrementConversationUserStateVersion(trx, userId);

    return {
      isStarred: active,
      starredAt: active ? starredAt : null,
      changed,
    };
  });
};

export const mutateConversationState = async ({
  userId,
  conversationId,
  kind,
  active,
}: {
  userId: string;
  conversationId: string;
  kind: StateKind;
  active: boolean;
}) => {
  validateConversationId(conversationId, "conversation ID");
  if (kind === "star") {
    return mutateConversationStar({ userId, conversationId, active });
  }

  const db = getDB();
  const profile = active ? await loadConversationProfile(userId) : null;

  return db.transaction(async (trx) => {
    if (active) {
      const eligibleQuery = conversationChain(trx)
        .select("c.id")
        .where("c.id", conversationId)
        .first();
      applyEligibleConversation(eligibleQuery, profile!.targetLanguage);
      if (!(await eligibleQuery)) {
        throw new ConversationApiError(404, "not_found", "Conversation not found.");
      }
    }

    let changed = false;
    let timestamp: string | null = null;
    if (active) {
      const inserted = (await trx("lingocafe.conversation_reads")
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          read_at: trx.fn.now(),
        })
        .onConflict(["user_id", "conversation_id"])
        .ignore()
        .returning("read_at")) as Array<{ read_at: Date | string }>;
      changed = inserted.length > 0;
      const value = changed
        ? inserted[0].read_at
        : (
            await trx("lingocafe.conversation_reads")
              .select("read_at")
              .where({ user_id: userId, conversation_id: conversationId })
              .first()
          )?.read_at;
      timestamp = toISO(value);
    } else {
      changed =
        (await trx("lingocafe.conversation_reads")
          .where({ user_id: userId, conversation_id: conversationId })
          .del()) > 0;
    }

    if (changed) await incrementConversationUserStateVersion(trx, userId);

    return {
      isRead: active,
      readAt: active ? timestamp : null,
      changed,
    };
  });
};
