import type { Knex } from "knex";

import { getDB } from "@/42go/db";
import {
  getReaderProfileStringValue,
  json,
  loadReaderProfile,
} from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import { isTranslationEnabled } from "@/app/api/(lingocafe)/lingocafe/_lib/translation";

export type ConversationBand = "beginner" | "intermediate" | "advanced";
export type ConversationCefrLevel = "a1" | "a2" | "b1" | "b2";

const bandLevels: Record<ConversationBand, ConversationCefrLevel[]> = {
  beginner: ["a1"],
  intermediate: ["a2", "b1"],
  advanced: ["b2"],
};

const profileBand: Record<string, ConversationBand> = {
  a1: "beginner",
  a2: "intermediate",
  b2: "advanced",
};

const idPattern = /^[a-z0-9][a-z0-9._-]{0,255}$/;

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

export const resolveConversationBand = (
  requestedBand: string | null | undefined,
  targetLevel: string | null | undefined
): ConversationBand => {
  if (requestedBand !== null && requestedBand !== undefined) {
    if (
      requestedBand === "beginner" ||
      requestedBand === "intermediate" ||
      requestedBand === "advanced"
    ) {
      return requestedBand;
    }

    throw new ConversationApiError(
      400,
      "validation",
      "Invalid conversation band."
    );
  }

  return profileBand[targetLevel || ""] || "intermediate";
};

export const getConversationBandLevels = (band: ConversationBand) => [
  ...bandLevels[band],
];

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
  defaultBand: ConversationBand;
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
    defaultBand: resolveConversationBand(null, targetLevel),
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
};

const mapCategory = (row: CategoryRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  goal: row.goal,
});

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
  language: string,
  levels?: readonly ConversationCefrLevel[]
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
  if (levels) query.whereIn("c.cefr_level", levels);
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

export const loadConversationDiscovery = async ({
  userId,
  requestedBand,
}: {
  userId: string;
  requestedBand?: string | null;
}) => {
  const explicitBand =
    requestedBand === null || requestedBand === undefined
      ? null
      : resolveConversationBand(requestedBand, null);
  const profile = await loadConversationProfile(userId);
  const band =
    explicitBand ?? resolveConversationBand(null, profile.targetLevel);
  const levels = getConversationBandLevels(band);
  const db = getDB();

  const rootsQuery = db("lingocafe.conversation_categories as category")
    .select("category.id", "category.title", "category.description", "category.goal")
    .where("category.is_visible", true)
    .whereNotExists(function rootHasNoParent() {
      this.select(db.raw("1"))
        .from("lingocafe.conversation_category_parents as parent_edge")
        .whereRaw("parent_edge.category_id = category.id");
    })
    .orderBy([{ column: "category.title", order: "asc" }, { column: "category.id", order: "asc" }]);
  applyLanguageScope(rootsQuery, "category", profile.targetLanguage);

  const eligibleRootQuery = conversationChain(db)
    .join(
      "lingocafe.conversation_category_scenarios as membership",
      "membership.scenario_id",
      "s.id"
    )
    .select(db.raw("1"))
    .whereIn("membership.category_id", function descendantCategoryIds() {
      this.withRecursive(
        "descendant_categories",
        ["id"],
        (descendants) => {
          descendants.union([
            db.select(db.raw("category.id")),
            db("lingocafe.conversation_category_parents as descendant_edge")
              .select("descendant_edge.category_id")
              .join(
                "descendant_categories as descendant",
                "descendant.id",
                "descendant_edge.parent_category_id"
              ),
          ]);
        }
      )
        .select("id")
        .from("descendant_categories");
    });
  applyEligibleConversation(
    eligibleRootQuery,
    profile.targetLanguage,
    levels
  );
  rootsQuery.whereExists(eligibleRootQuery);

  const starsQuery = conversationChain(db)
    .join("lingocafe.conversation_stars as star", function joinStar() {
      this.on("star.conversation_id", "=", "c.id").andOnVal(
        "star.user_id",
        "=",
        userId
      );
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
  applyEligibleConversation(starsQuery, profile.targetLanguage);

  const [roots, starred] = await Promise.all([
    rootsQuery as Promise<CategoryRow[]>,
    starsQuery as Promise<CategoryConversationRow[]>,
  ]);

  return {
    profile: {
      targetLanguage: profile.targetLanguage,
      ownLanguage: profile.ownLanguage,
      targetLevel: profile.targetLevel,
      defaultBand: profile.defaultBand,
    },
    selection: { band, levels },
    starred: starred.map(mapConversationChoice),
    roots: roots.map(mapCategory),
  };
};

type CategoryConversationRow = ConversationSummaryRow & {
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

const mapConversationChoice = (row: CategoryConversationRow) => ({
  ...mapConversationSummary(row),
  scenarioId: row.scenario_id,
  scenarioTitle: row.scenario_localized_title ?? row.scenario_title,
  scenarioDescription:
    row.scenario_localized_description ?? row.scenario_description,
  scenarioCanonicalLanguage: row.scenario_canonical_language,
  scenarioLocalization: mapLocalization(
    row.scenario_localized_title,
    row.scenario_localized_description,
    row.language,
    row.cefr_level
  ),
  variantId: row.variant_id,
  variantTitle: row.variant_localized_title ?? row.variant_title,
  variantDescription:
    row.variant_localized_description ?? row.variant_description,
  variantCanonicalLanguage: row.variant_canonical_language,
  variantLocalization: mapLocalization(
    row.variant_localized_title,
    row.variant_localized_description,
    row.language,
    row.cefr_level
  ),
});

const groupCategoryScenarios = (rows: CategoryConversationRow[]) => {
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
        canonicalLanguage: string;
        canonicalTitle: string;
        canonicalDescription: string;
        title: string;
        description: string;
        choices: Array<ReturnType<typeof mapConversationSummary> & {
          scenarioId: string;
          scenarioTitle: string;
          scenarioDescription: string;
          scenarioCanonicalLanguage: string;
          variantId: string;
          variantTitle: string;
          variantDescription: string;
          variantCanonicalLanguage: string;
          scenarioLocalization: ReturnType<typeof mapLocalization>;
          variantLocalization: ReturnType<typeof mapLocalization>;
        }>;
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
        canonicalLanguage: row.variant_canonical_language,
        canonicalTitle: row.variant_title,
        canonicalDescription: row.variant_description,
        title: row.variant_title,
        description: row.variant_description,
        choices: [],
      };
      scenario.variants.push(variant);
    }

    variant.choices.push(mapConversationChoice(row));
  }

  return [...scenarios.values()];
};

export const loadConversationCategory = async ({
  userId,
  categoryPath,
  requestedBand,
}: {
  userId: string;
  categoryPath: string[];
  requestedBand?: string | null;
}) => {
  const pathIds = validateConversationCategoryPath(categoryPath);
  const explicitBand =
    requestedBand === null || requestedBand === undefined
      ? null
      : resolveConversationBand(requestedBand, null);
  const profile = await loadConversationProfile(userId);
  const band =
    explicitBand ?? resolveConversationBand(null, profile.targetLevel);
  const levels = getConversationBandLevels(band);
  const db = getDB();

  const pathQuery = db("lingocafe.conversation_categories as category")
    .select("category.id", "category.title", "category.description", "category.goal")
    .whereIn("category.id", pathIds)
    .andWhere("category.is_visible", true);
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
    .select("category.id", "category.title", "category.description", "category.goal")
    .where("edge.parent_category_id", categoryId)
    .andWhere("category.is_visible", true)
    .orderBy([{ column: "category.title", order: "asc" }, { column: "category.id", order: "asc" }]);
  applyLanguageScope(childrenQuery, "category", profile.targetLanguage);

  const choicesQuery = conversationChain(db)
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
    .leftJoin("lingocafe.conversation_stars as star", function joinStar() {
      this.on("star.conversation_id", "=", "c.id").andOnVal("star.user_id", "=", userId);
    })
    .select(
      "c.id", "c.title", "c.description", "c.language", "c.cefr_level",
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
  applyEligibleConversation(choicesQuery, profile.targetLanguage, levels);

  const [children, choices] = await Promise.all([
    childrenQuery as Promise<CategoryRow[]>,
    choicesQuery as Promise<CategoryConversationRow[]>,
  ]);

  return {
    profile: {
      targetLanguage: profile.targetLanguage,
      ownLanguage: profile.ownLanguage,
      targetLevel: profile.targetLevel,
      defaultBand: profile.defaultBand,
    },
    selection: { band, levels },
    path: pathIds.map((id) => mapCategory(byId.get(id)!)),
    category: mapCategory(byId.get(categoryId)!),
    children: children.map(mapCategory),
    scenarios: groupCategoryScenarios(choices),
  };
};

type ConversationDetailRow = ConversationSummaryRow & {
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
    .leftJoin("lingocafe.conversation_stars as star", function joinStar() {
      this.on("star.conversation_id", "=", "c.id").andOnVal("star.user_id", "=", userId);
    })
    .select(
      "c.id", "c.title", "c.description", "c.language", "c.cefr_level",
      "reader_state.read_at", "star.starred_at",
      "s.id as scenario_id", "s.title as scenario_title", "s.description as scenario_description",
      "s.learner_promise", "s.canonical_language as scenario_canonical_language",
      "sl.title as scenario_localized_title", "sl.description as scenario_localized_description",
      "v.id as variant_id", "v.title as variant_title", "v.description as variant_description",
      "v.canonical_language as variant_canonical_language",
      "vl.title as variant_localized_title", "vl.description as variant_localized_description"
    )
    .where("c.id", conversationId)
    .first();
  applyEligibleConversation(detailQuery, profile.targetLanguage);
  const detail = (await detailQuery) as ConversationDetailRow | undefined;
  if (!detail) {
    throw new ConversationApiError(404, "not_found", "Conversation not found.");
  }

  const [actors, rounds] = await Promise.all([
    db("lingocafe.conversation_scenario_actors")
      .select("id", "position", "name", "role", "description")
      .where({ scenario_id: detail.scenario_id })
      .orderBy("position", "asc"),
    db("lingocafe.conversation_rounds")
      .select("position", "actor_id", "text")
      .where({ conversation_id: detail.id, scenario_id: detail.scenario_id })
      .orderBy("position", "asc"),
  ]);
  const actorIds = new Set(actors.map((actor) => String(actor.id)));
  const dialogueIsMalformed = rounds.some(
    (round, index) =>
      Number(round.position) !== index + 1 ||
      !actorIds.has(String(round.actor_id)) ||
      !String(round.text).trim()
  );
  if (rounds.length === 0 || dialogueIsMalformed) {
    throw new ConversationApiError(404, "not_found", "Conversation not found.");
  }

  return {
    conversation: {
      ...mapConversationSummary(detail),
      scenarioId: detail.scenario_id,
      variantId: detail.variant_id,
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
    actors: actors.map((actor) => ({
      id: String(actor.id),
      position: Number(actor.position),
      name: String(actor.name),
      role: String(actor.role),
      description: String(actor.description),
    })),
    rounds: rounds.map((round) => ({
      position: Number(round.position),
      actorId: String(round.actor_id),
      text: String(round.text),
    })),
    state: {
      isRead: !!detail.read_at,
      isStarred: !!detail.starred_at,
    },
    translation: {
      enabled: isTranslationEnabled(),
      from: detail.language,
      to: profile.ownLanguage,
    },
    speech: { language: detail.language },
  };
};

type StateKind = "read" | "star";

const stateConfig = {
  read: {
    table: "lingocafe.conversation_reads",
    timestamp: "read_at",
    responseFlag: "isRead",
    responseTime: "readAt",
  },
  star: {
    table: "lingocafe.conversation_stars",
    timestamp: "starred_at",
    responseFlag: "isStarred",
    responseTime: "starredAt",
  },
} as const;

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
  const db = getDB();
  const config = stateConfig[kind];
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
      const inserted = (await trx(config.table)
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          [config.timestamp]: trx.fn.now(),
        })
        .onConflict(["user_id", "conversation_id"])
        .ignore()
        .returning(config.timestamp)) as Array<Record<string, Date | string>>;
      changed = inserted.length > 0;
      const value = changed
        ? inserted[0][config.timestamp]
        : (
            await trx(config.table)
              .select(config.timestamp)
              .where({ user_id: userId, conversation_id: conversationId })
              .first()
          )?.[config.timestamp];
      timestamp = toISO(value);
    } else {
      changed =
        (await trx(config.table)
          .where({ user_id: userId, conversation_id: conversationId })
          .del()) > 0;
    }

    return {
      [config.responseFlag]: active,
      [config.responseTime]: active ? timestamp : null,
      changed,
    };
  });
};
