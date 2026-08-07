const FIXTURE_TIMESTAMP = "2026-08-06T20:30:00.000Z";

const sourceFields = (sourcePath, sourceHash) => ({
  source_schema_version: "poc-v0",
  source_path: sourcePath,
  source_hash: sourceHash,
  metadata: { fixture: true },
  created_at: FIXTURE_TIMESTAMP,
  updated_at: FIXTURE_TIMESTAMP,
});

const upsert = async (trx, table, rows, conflictTarget) => {
  const conflictColumns = new Set(
    Array.isArray(conflictTarget) ? conflictTarget : [conflictTarget]
  );
  const updateColumns = Object.keys(rows[0]).filter(
    (column) => column !== "created_at" && !conflictColumns.has(column)
  );

  const conflict = trx(`lingocafe.${table}`)
    .insert(rows)
    .onConflict(conflictTarget);

  if (updateColumns.length === 0) {
    await conflict.ignore();
    return;
  }

  await conflict.merge(updateColumns);
};

/**
 * Seed a small, fixed-ID conversation graph for local API and UI development.
 * The full corpus remains owned and published by the books repository.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    await upsert(
      trx,
      "conversation_categories",
      [
        {
          id: "fixture-everyday-life",
          status: "accepted",
          title: "Everyday life",
          description: "Fixture conversations for ordinary daily situations.",
          goal: "Practise useful language for everyday interactions.",
          language_scope: "all",
          languages: [],
          tags: ["lang:all", "topic:everyday-life"],
          is_visible: true,
          ...sourceFields(
            "fixture://categories/fixture-everyday-life.yaml",
            "5cb0dc52787347fca7dfaa961595213c9f2219f17d06be9e3f272f64465e6ac2"
          ),
        },
        {
          id: "fixture-social-life",
          status: "accepted",
          title: "Social life",
          description: "Fixture conversations for recurring social situations.",
          goal: "Practise entering and closing friendly interactions.",
          language_scope: "all",
          languages: [],
          tags: ["lang:all", "topic:social-life"],
          is_visible: true,
          ...sourceFields(
            "fixture://categories/fixture-social-life.yaml",
            "84ae07dd1ec52df03a131c31ca1c2bfb7130160141d910fc6d20f3b70f4527bc"
          ),
        },
        {
          id: "fixture-cafe-visits",
          status: "accepted",
          title: "Café visits",
          description: "Fixture conversations set in a café.",
          goal: "Practise ordering and confirming a simple purchase.",
          language_scope: "specific",
          languages: ["sv"],
          tags: ["lang:sv", "topic:cafe-visits"],
          is_visible: true,
          ...sourceFields(
            "fixture://categories/fixture-cafe-visits.yaml",
            "c589bf965f5025dac5d8b6a10ef677e910488a89d7eb763a02f803ae06c2a49e"
          ),
        },
      ],
      "id"
    );

    await upsert(
      trx,
      "conversation_category_parents",
      [
        {
          category_id: "fixture-cafe-visits",
          parent_category_id: "fixture-everyday-life",
        },
        {
          category_id: "fixture-cafe-visits",
          parent_category_id: "fixture-social-life",
        },
      ],
      ["category_id", "parent_category_id"]
    );

    await upsert(
      trx,
      "conversation_scenarios",
      [
        {
          id: "fixture-ordering-coffee",
          status: "accepted",
          canonical_language: "en",
          title: "Ordering coffee",
          description: "A customer orders a coffee and confirms the price.",
          learner_promise: "Order one drink and confirm the total.",
          language_scope: "specific",
          languages: ["sv"],
          tags: ["lang:sv", "topic:cafe-visits", "intent:order-a-drink"],
          is_visible: true,
          ...sourceFields(
            "fixture://scenarios/fixture-ordering-coffee/scenario.yaml",
            "b8842ca6ae589d2d78d0a7eb15b0beb908b6bccb17509f7a6d32b3ea8874e8f7"
          ),
        },
      ],
      "id"
    );

    await upsert(
      trx,
      "conversation_scenario_localizations",
      [
        {
          scenario_id: "fixture-ordering-coffee",
          language: "sv",
          cefr_level: "a1",
          title: "Beställa kaffe",
          description: "En kund beställer kaffe och bekräftar priset.",
        },
      ],
      ["scenario_id", "language", "cefr_level"]
    );

    await upsert(
      trx,
      "conversation_category_scenarios",
      [
        {
          category_id: "fixture-cafe-visits",
          scenario_id: "fixture-ordering-coffee",
          match_provenance: {
            fixture: true,
            kind: "explicit",
            tags: ["topic:cafe-visits"],
          },
        },
      ],
      ["category_id", "scenario_id"]
    );

    await upsert(
      trx,
      "conversation_scenario_actors",
      [
        {
          scenario_id: "fixture-ordering-coffee",
          id: "customer",
          position: 1,
          name: "Sam",
          role: "customer",
          description: "A learner ordering one drink.",
          metadata: { fixture: true },
        },
        {
          scenario_id: "fixture-ordering-coffee",
          id: "barista",
          position: 2,
          name: "Kim",
          role: "barista",
          description: "A café worker taking the order.",
          metadata: { fixture: true },
        },
      ],
      ["scenario_id", "id"]
    );

    await upsert(
      trx,
      "conversation_variants",
      [
        {
          scenario_id: "fixture-ordering-coffee",
          id: "fixture-ordering-filter-coffee",
          status: "accepted",
          canonical_language: "en",
          title: "Ordering a filter coffee",
          description: "The customer orders one filter coffee without additions.",
          language_scope: "specific",
          languages: ["sv"],
          tags: ["lang:sv", "topic:cafe-visits"],
          is_visible: true,
          ...sourceFields(
            "fixture://scenarios/fixture-ordering-coffee/variants/fixture-ordering-filter-coffee/variant.yaml",
            "57d02877c9adee03bd620086f2d14d96fd2bac59968817350d47ed8c3f470bda"
          ),
        },
      ],
      ["scenario_id", "id"]
    );

    await upsert(
      trx,
      "conversation_variant_localizations",
      [
        {
          scenario_id: "fixture-ordering-coffee",
          variant_id: "fixture-ordering-filter-coffee",
          language: "sv",
          cefr_level: "a1",
          title: "Beställa bryggkaffe",
          description: "Kunden beställer en kopp bryggkaffe utan tillbehör.",
        },
      ],
      ["scenario_id", "variant_id", "language", "cefr_level"]
    );

    await upsert(
      trx,
      "conversations",
      [
        {
          id: "fixture-ordering-coffee--fixture-ordering-filter-coffee--sv-a1",
          scenario_id: "fixture-ordering-coffee",
          variant_id: "fixture-ordering-filter-coffee",
          status: "accepted",
          language: "sv",
          cefr_level: "a1",
          title: "En kopp kaffe",
          description: "Sam beställer en kopp bryggkaffe och bekräftar priset.",
          tags: ["lang:sv", "cefr:a1", "topic:cafe-visits"],
          is_visible: true,
          ...sourceFields(
            "fixture://scenarios/fixture-ordering-coffee/variants/fixture-ordering-filter-coffee/sv-a1.yaml",
            "5665567763cbce2a6db21cc4f01ab979f696313662217ac6665be1b709846fe3"
          ),
        },
      ],
      "id"
    );

    await upsert(
      trx,
      "conversation_rounds",
      [
        {
          conversation_id:
            "fixture-ordering-coffee--fixture-ordering-filter-coffee--sv-a1",
          scenario_id: "fixture-ordering-coffee",
          position: 1,
          actor_id: "customer",
          text: "Hej! Jag vill ha en kopp bryggkaffe, tack.",
        },
        {
          conversation_id:
            "fixture-ordering-coffee--fixture-ordering-filter-coffee--sv-a1",
          scenario_id: "fixture-ordering-coffee",
          position: 2,
          actor_id: "barista",
          text: "Absolut. Vill du ha mjölk?",
        },
        {
          conversation_id:
            "fixture-ordering-coffee--fixture-ordering-filter-coffee--sv-a1",
          scenario_id: "fixture-ordering-coffee",
          position: 3,
          actor_id: "customer",
          text: "Nej tack. Vad kostar det?",
        },
        {
          conversation_id:
            "fixture-ordering-coffee--fixture-ordering-filter-coffee--sv-a1",
          scenario_id: "fixture-ordering-coffee",
          position: 4,
          actor_id: "barista",
          text: "Det kostar trettio kronor. Varsågod!",
        },
      ],
      ["conversation_id", "position"]
    );

    const fixtureLanguages = ["en", "es", "it", "de", "sv"];
    const availabilityLevelKeys = [
      "a1",
      "a2",
      "b1",
      "b2",
      "beginner",
      "intermediate",
      "advanced",
    ];
    await upsert(
      trx,
      "conversation_category_availability",
      ["fixture-everyday-life", "fixture-social-life", "fixture-cafe-visits"].flatMap(
        (categoryId) =>
          fixtureLanguages.flatMap((language) =>
            availabilityLevelKeys.map((levelKey) => ({
              category_id: categoryId,
              language,
              level_key: levelKey,
              conversation_count:
                language === "sv" &&
                (levelKey === "a1" || levelKey === "beginner")
                  ? 1
                  : 0,
              updated_at: FIXTURE_TIMESTAMP,
            }))
          )
      ),
      ["category_id", "language", "level_key"]
    );
  });
};
