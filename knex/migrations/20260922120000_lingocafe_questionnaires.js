/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaires", (table) => {
      table.text("id").primary().notNullable();
      table
        .text("book_id")
        .notNullable()
        .unique()
        .references("id")
        .inTable("lingocafe.books")
        .onDelete("CASCADE");
      table.text("status").notNullable();
      table.text("language").notNullable();
      table.text("title").notNullable();
      table.text("source_schema_version").notNullable();
      table.text("source_path").notNullable();
      table.specificType("source_hash", "char(64)").notNullable();
      table.jsonb("review").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table
        .jsonb("provenance")
        .notNullable()
        .defaultTo(knex.raw(`'[]'::jsonb`));
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["id", "book_id"], {
        indexName: "uq_lc_questionnaires_id_book",
      });
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_learning_items", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("book_id").notNullable();
      table.text("id").notNullable();
      table.text("statement").notNullable();
      table.text("status").notNullable();
      table.jsonb("review").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table
        .jsonb("provenance")
        .notNullable()
        .defaultTo(knex.raw(`'[]'::jsonb`));
      table.specificType("source_hash", "char(64)").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.primary(["questionnaire_id", "id"]);
      table.unique(["questionnaire_id", "book_id", "id"], {
        indexName: "uq_lc_questionnaire_learning_items_book",
      });
      table
        .foreign(
          ["questionnaire_id", "book_id"],
          "fk_lc_q_learning_items_questionnaire"
        )
        .references(["id", "book_id"])
        .inTable("lingocafe.questionnaires")
        .onDelete("CASCADE");
      table.index(
        ["questionnaire_id", "status", "id"],
        "idx_lc_questionnaire_learning_items_status"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_learning_item_pages", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("book_id").notNullable();
      table.text("learning_item_id").notNullable();
      table.text("page_id").notNullable();

      table.primary([
        "questionnaire_id",
        "learning_item_id",
        "book_id",
        "page_id",
      ]);
      table
        .foreign(
          ["questionnaire_id", "book_id", "learning_item_id"],
          "fk_lc_q_learning_item_pages_item"
        )
        .references(["questionnaire_id", "book_id", "id"])
        .inTable("lingocafe.questionnaire_learning_items")
        .onDelete("CASCADE");
      table
        .foreign(["book_id", "page_id"], "fk_lc_q_learning_item_pages_page")
        .references(["book_id", "id"])
        .inTable("lingocafe.books_pages")
        .onDelete("CASCADE");
      table.index(
        ["book_id", "page_id", "learning_item_id"],
        "idx_lc_questionnaire_learning_item_pages_page"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_questions", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("id").notNullable();
      table.text("status").notNullable();
      table.specificType("current_revision_digest", "char(64)").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.primary(["questionnaire_id", "id"]);
      table
        .foreign("questionnaire_id")
        .references("id")
        .inTable("lingocafe.questionnaires")
        .onDelete("CASCADE");
      table.index(
        ["questionnaire_id", "status", "id"],
        "idx_lc_questionnaire_questions_status"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_question_revisions", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("prompt").notNullable();
      table.text("response_mode").notNullable();
      table.text("rationale").nullable();
      table.jsonb("review").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table
        .jsonb("provenance")
        .notNullable()
        .defaultTo(knex.raw(`'[]'::jsonb`));
      table.text("source_path").notNullable();
      table.specificType("source_hash", "char(64)").notNullable();
      table.timestamp("published_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.primary(["questionnaire_id", "question_id", "revision_digest"]);
      table
        .foreign(
          ["questionnaire_id", "question_id"],
          "fk_lc_q_question_revisions_question"
        )
        .references(["questionnaire_id", "id"])
        .inTable("lingocafe.questionnaire_questions")
        .onDelete("CASCADE");
    });

  await knex.raw(`
    ALTER TABLE lingocafe.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_current_revision_fk
    FOREIGN KEY (questionnaire_id, id, current_revision_digest)
    REFERENCES lingocafe.questionnaire_question_revisions
      (questionnaire_id, question_id, revision_digest)
    DEFERRABLE INITIALLY DEFERRED
  `);

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_question_revision_learning_items", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("learning_item_id").notNullable();
      table.integer("position").notNullable();

      table.primary([
        "questionnaire_id",
        "question_id",
        "revision_digest",
        "learning_item_id",
      ]);
      table.unique(
        ["questionnaire_id", "question_id", "revision_digest", "position"],
        { indexName: "uq_lc_question_revision_learning_items_position" }
      );
      table
        .foreign(
          ["questionnaire_id", "question_id", "revision_digest"],
          "fk_lc_q_revision_items_revision"
        )
        .references(["questionnaire_id", "question_id", "revision_digest"])
        .inTable("lingocafe.questionnaire_question_revisions")
        .onDelete("CASCADE");
      table
        .foreign(
          ["questionnaire_id", "learning_item_id"],
          "fk_lc_q_revision_items_learning_item"
        )
        .references(["questionnaire_id", "id"])
        .inTable("lingocafe.questionnaire_learning_items")
        .onDelete("RESTRICT");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_answer_sets", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("id").notNullable();
      table.integer("position").notNullable();

      table.primary([
        "questionnaire_id",
        "question_id",
        "revision_digest",
        "id",
      ]);
      table.unique(
        ["questionnaire_id", "question_id", "revision_digest", "position"],
        { indexName: "uq_lc_questionnaire_answer_sets_position" }
      );
      table
        .foreign(
          ["questionnaire_id", "question_id", "revision_digest"],
          "fk_lc_q_answer_sets_revision"
        )
        .references(["questionnaire_id", "question_id", "revision_digest"])
        .inTable("lingocafe.questionnaire_question_revisions")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_answer_options", (table) => {
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("answer_set_id").notNullable();
      table.text("id").notNullable();
      table.integer("position").notNullable();
      table.text("text").notNullable();
      table.boolean("is_correct").notNullable().defaultTo(false);

      table.primary([
        "questionnaire_id",
        "question_id",
        "revision_digest",
        "answer_set_id",
        "id",
      ]);
      table.unique(
        [
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "answer_set_id",
          "position",
        ],
        { indexName: "uq_lc_questionnaire_answer_options_position" }
      );
      table
        .foreign(
          [
            "questionnaire_id",
            "question_id",
            "revision_digest",
            "answer_set_id",
          ],
          "fk_lc_q_answer_options_set"
        )
        .references([
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "id",
        ])
        .inTable("lingocafe.questionnaire_answer_sets")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_publication_state", (table) => {
      table
        .text("questionnaire_id")
        .primary()
        .notNullable()
        .references("id")
        .inTable("lingocafe.questionnaires")
        .onDelete("CASCADE");
      table.specificType("source_digest", "char(64)").notNullable();
      table.timestamp("published_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_rounds", (table) => {
      table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("questionnaire_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.questionnaires")
        .onDelete("RESTRICT");
      table.text("mode").notNullable().defaultTo("standard");
      table.text("selection_policy").notNullable();
      table.text("selection_policy_version").notNullable();
      table.integer("requested_question_count").notNullable().defaultTo(10);
      table.integer("actual_question_count").notNullable().defaultTo(0);
      table.text("status").notNullable().defaultTo("in_progress");
      table.integer("correct_count").notNullable().defaultTo(0);
      table.integer("score_total").notNullable().defaultTo(0);
      table.timestamp("started_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("completed_at", { useTz: true }).nullable();

      table.unique(["id", "questionnaire_id"], {
        indexName: "uq_lc_questionnaire_rounds_id_questionnaire",
      });
      table.unique(["id", "user_id"], {
        indexName: "uq_lc_questionnaire_rounds_id_user",
      });
      table.index(
        ["user_id", "questionnaire_id", "started_at"],
        "idx_lc_questionnaire_rounds_user_book_time"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_round_items", (table) => {
      table.uuid("round_id").notNullable();
      table.integer("position").notNullable();
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("answer_set_id").notNullable();

      table.primary(["round_id", "position"]);
      table.unique(["round_id", "question_id"], {
        indexName: "uq_lc_questionnaire_round_items_question",
      });
      table.unique(
        [
          "round_id",
          "position",
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "answer_set_id",
        ],
        { indexName: "uq_lc_questionnaire_round_items_rendered" }
      );
      table
        .foreign(
          ["round_id", "questionnaire_id"],
          "fk_lc_q_round_items_round"
        )
        .references(["id", "questionnaire_id"])
        .inTable("lingocafe.questionnaire_rounds")
        .onDelete("CASCADE");
      table
        .foreign(
          [
            "questionnaire_id",
            "question_id",
            "revision_digest",
            "answer_set_id",
          ],
          "fk_lc_q_round_items_answer_set"
        )
        .references([
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "id",
        ])
        .inTable("lingocafe.questionnaire_answer_sets")
        .onDelete("RESTRICT");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_answers", (table) => {
      table.uuid("round_id").notNullable();
      table.integer("round_item_position").notNullable();
      table.timestamp("answered_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.boolean("is_correct").notNullable();
      table.integer("duration_ms").nullable();
      table.smallint("applied_rating").notNullable();

      table.primary(["round_id", "round_item_position"]);
      table
        .foreign(
          ["round_id", "round_item_position"],
          "fk_lc_q_answers_round_item"
        )
        .references(["round_id", "position"])
        .inTable("lingocafe.questionnaire_round_items")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_answer_selections", (table) => {
      table.uuid("round_id").notNullable();
      table.integer("round_item_position").notNullable();
      table.text("questionnaire_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.text("answer_set_id").notNullable();
      table.text("option_id").notNullable();

      table.primary(["round_id", "round_item_position", "option_id"]);
      table
        .foreign(
          ["round_id", "round_item_position"],
          "fk_lc_q_answer_selections_answer"
        )
        .references(["round_id", "round_item_position"])
        .inTable("lingocafe.questionnaire_answers")
        .onDelete("CASCADE");
      table
        .foreign(
          [
            "round_id",
            "round_item_position",
            "questionnaire_id",
            "question_id",
            "revision_digest",
            "answer_set_id",
          ],
          "fk_lc_q_answer_selections_round_item"
        )
        .references([
          "round_id",
          "position",
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "answer_set_id",
        ])
        .inTable("lingocafe.questionnaire_round_items")
        .onDelete("CASCADE");
      table
        .foreign(
          [
            "questionnaire_id",
            "question_id",
            "revision_digest",
            "answer_set_id",
            "option_id",
          ],
          "fk_lc_q_answer_selections_option"
        )
        .references([
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "answer_set_id",
          "id",
        ])
        .inTable("lingocafe.questionnaire_answer_options")
        .onDelete("RESTRICT");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_learning_item_reviews", (table) => {
      table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table.text("questionnaire_id").notNullable();
      table.text("learning_item_id").notNullable();
      table.text("question_id").notNullable();
      table.specificType("revision_digest", "char(64)").notNullable();
      table.uuid("round_id").notNullable();
      table.integer("round_item_position").notNullable();
      table.smallint("rating").notNullable();
      table.text("scheduler_name").notNullable();
      table.text("scheduler_version").notNullable();
      table.text("parameter_set_id").notNullable();
      table.jsonb("parameters").notNullable();
      table.specificType("parameters_digest", "char(64)").notNullable();
      table.decimal("desired_retention", 4, 3).notNullable();
      table.integer("elapsed_days").notNullable();
      table.integer("scheduled_days").notNullable();
      table.jsonb("state_before").notNullable();
      table.jsonb("state_after").notNullable();
      table.timestamp("reviewed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["round_id", "round_item_position", "learning_item_id"], {
        indexName: "uq_lc_questionnaire_learning_item_review",
      });
      table.unique(
        ["id", "user_id", "questionnaire_id", "learning_item_id"],
        { indexName: "uq_lc_questionnaire_learning_item_reviews_memory" }
      );
      table
        .foreign(
          ["round_id", "user_id"],
          "fk_lc_q_learning_item_reviews_round_user"
        )
        .references(["id", "user_id"])
        .inTable("lingocafe.questionnaire_rounds")
        .onDelete("CASCADE");
      table
        .foreign(
          ["round_id", "round_item_position"],
          "fk_lc_q_learning_item_reviews_answer"
        )
        .references(["round_id", "round_item_position"])
        .inTable("lingocafe.questionnaire_answers")
        .onDelete("CASCADE");
      table
        .foreign(
          [
            "questionnaire_id",
            "question_id",
            "revision_digest",
            "learning_item_id",
          ],
          "fk_lc_q_learning_item_reviews_revision_item"
        )
        .references([
          "questionnaire_id",
          "question_id",
          "revision_digest",
          "learning_item_id",
        ])
        .inTable("lingocafe.questionnaire_question_revision_learning_items")
        .onDelete("RESTRICT");
      table.index(
        ["user_id", "questionnaire_id", "reviewed_at"],
        "idx_lc_questionnaire_learning_item_reviews_user_time"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("questionnaire_learning_item_memory", (table) => {
      table.text("user_id").notNullable();
      table.text("questionnaire_id").notNullable();
      table.text("learning_item_id").notNullable();
      table.text("scheduler_name").notNullable().defaultTo("fsrs");
      table.text("scheduler_version").notNullable().defaultTo("6");
      table.text("parameter_set_id").notNullable();
      table.jsonb("parameters").notNullable();
      table.specificType("parameters_digest", "char(64)").notNullable();
      table.decimal("desired_retention", 4, 3).notNullable().defaultTo(0.9);
      table.text("card_state").notNullable().defaultTo("new");
      table.specificType("difficulty", "double precision").nullable();
      table.specificType("stability", "double precision").nullable();
      table.timestamp("due_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("last_review_at", { useTz: true }).nullable();
      table.integer("scheduled_days").notNullable().defaultTo(0);
      table.integer("elapsed_days").notNullable().defaultTo(0);
      table.integer("repetitions").notNullable().defaultTo(0);
      table.integer("lapses").notNullable().defaultTo(0);
      table.uuid("last_review_id").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "questionnaire_id", "learning_item_id"]);
      table
        .foreign("user_id")
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .foreign(
          ["questionnaire_id", "learning_item_id"],
          "fk_lc_q_learning_item_memory_item"
        )
        .references(["questionnaire_id", "id"])
        .inTable("lingocafe.questionnaire_learning_items")
        .onDelete("RESTRICT");
      table.index(
        ["user_id", "questionnaire_id", "due_at"],
        "idx_lc_questionnaire_memory_due"
      );
      table.index(
        ["questionnaire_id", "learning_item_id", "due_at"],
        "idx_lc_questionnaire_memory_item_due"
      );
    });

  await knex.raw(`
    ALTER TABLE lingocafe.questionnaire_learning_item_memory
    ADD CONSTRAINT fk_lc_q_learning_item_memory_last_review
    FOREIGN KEY (
      last_review_id, user_id, questionnaire_id, learning_item_id
    )
    REFERENCES lingocafe.questionnaire_learning_item_reviews (
      id, user_id, questionnaire_id, learning_item_id
    )
    DEFERRABLE INITIALLY DEFERRED
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.questionnaires
    ADD CONSTRAINT questionnaires_status_check
      CHECK (status IN ('active', 'withdrawn')),
    ADD CONSTRAINT questionnaires_text_check
      CHECK (
        btrim(id) <> '' AND btrim(book_id) <> '' AND btrim(language) <> ''
        AND btrim(title) <> '' AND btrim(source_schema_version) <> ''
        AND btrim(source_path) <> ''
      ),
    ADD CONSTRAINT questionnaires_source_hash_check
      CHECK (source_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT questionnaires_json_check
      CHECK (
        jsonb_typeof(review) = 'object'
        AND jsonb_typeof(provenance) = 'array'
        AND jsonb_typeof(metadata) = 'object'
      );

    ALTER TABLE lingocafe.questionnaire_learning_items
    ADD CONSTRAINT questionnaire_learning_items_status_check
      CHECK (status IN ('active', 'withdrawn')),
    ADD CONSTRAINT questionnaire_learning_items_text_check
      CHECK (btrim(id) <> '' AND btrim(statement) <> ''),
    ADD CONSTRAINT questionnaire_learning_items_source_hash_check
      CHECK (source_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT questionnaire_learning_items_json_check
      CHECK (jsonb_typeof(review) = 'object' AND jsonb_typeof(provenance) = 'array');

    ALTER TABLE lingocafe.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_status_check
      CHECK (status IN ('active', 'withdrawn')),
    ADD CONSTRAINT questionnaire_questions_id_check
      CHECK (btrim(id) <> ''),
    ADD CONSTRAINT questionnaire_questions_current_digest_check
      CHECK (
        current_revision_digest IS NULL
        OR current_revision_digest ~ '^[0-9a-f]{64}$'
      );

    ALTER TABLE lingocafe.questionnaire_question_revisions
    ADD CONSTRAINT questionnaire_question_revisions_digest_check
      CHECK (
        revision_digest ~ '^[0-9a-f]{64}$'
        AND source_hash ~ '^[0-9a-f]{64}$'
      ),
    ADD CONSTRAINT questionnaire_question_revisions_text_check
      CHECK (
        btrim(prompt) <> '' AND btrim(response_mode) <> ''
        AND btrim(source_path) <> ''
      ),
    ADD CONSTRAINT questionnaire_question_revisions_json_check
      CHECK (jsonb_typeof(review) = 'object' AND jsonb_typeof(provenance) = 'array');

    ALTER TABLE lingocafe.questionnaire_question_revision_learning_items
    ADD CONSTRAINT questionnaire_question_revision_learning_items_position_check
      CHECK (position >= 1);

    ALTER TABLE lingocafe.questionnaire_answer_sets
    ADD CONSTRAINT questionnaire_answer_sets_check
      CHECK (btrim(id) <> '' AND position >= 1);

    ALTER TABLE lingocafe.questionnaire_answer_options
    ADD CONSTRAINT questionnaire_answer_options_check
      CHECK (btrim(id) <> '' AND btrim(text) <> '' AND position >= 1);

    ALTER TABLE lingocafe.questionnaire_publication_state
    ADD CONSTRAINT questionnaire_publication_state_digest_check
      CHECK (source_digest ~ '^[0-9a-f]{64}$');

    ALTER TABLE lingocafe.questionnaire_rounds
    ADD CONSTRAINT questionnaire_rounds_text_check
      CHECK (
        btrim(mode) <> '' AND btrim(selection_policy) <> ''
        AND btrim(selection_policy_version) <> ''
      ),
    ADD CONSTRAINT questionnaire_rounds_count_check
      CHECK (
        requested_question_count > 0
        AND actual_question_count >= 0
        AND correct_count >= 0
        AND score_total >= 0
        AND correct_count <= score_total
        AND score_total <= actual_question_count
      ),
    ADD CONSTRAINT questionnaire_rounds_status_check
      CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    ADD CONSTRAINT questionnaire_rounds_lifecycle_check
      CHECK (
        (status = 'in_progress' AND completed_at IS NULL)
        OR
        (status IN ('completed', 'abandoned') AND completed_at IS NOT NULL)
      ),
    ADD CONSTRAINT questionnaire_rounds_completed_score_check
      CHECK (status <> 'completed' OR score_total = actual_question_count);

    ALTER TABLE lingocafe.questionnaire_round_items
    ADD CONSTRAINT questionnaire_round_items_position_check
      CHECK (position >= 1);

    ALTER TABLE lingocafe.questionnaire_answers
    ADD CONSTRAINT questionnaire_answers_rating_check
      CHECK (applied_rating BETWEEN 1 AND 4),
    ADD CONSTRAINT questionnaire_answers_duration_check
      CHECK (duration_ms IS NULL OR duration_ms >= 0);

    ALTER TABLE lingocafe.questionnaire_learning_item_reviews
    ADD CONSTRAINT questionnaire_learning_item_reviews_rating_check
      CHECK (rating BETWEEN 1 AND 4),
    ADD CONSTRAINT questionnaire_learning_item_reviews_scheduler_check
      CHECK (
        btrim(scheduler_name) <> '' AND btrim(scheduler_version) <> ''
        AND btrim(parameter_set_id) <> ''
        AND parameters_digest ~ '^[0-9a-f]{64}$'
        AND jsonb_typeof(parameters) = 'object'
      ),
    ADD CONSTRAINT questionnaire_learning_item_reviews_retention_check
      CHECK (desired_retention > 0 AND desired_retention <= 1),
    ADD CONSTRAINT questionnaire_learning_item_reviews_days_check
      CHECK (elapsed_days >= 0 AND scheduled_days >= 0),
    ADD CONSTRAINT questionnaire_learning_item_reviews_state_check
      CHECK (jsonb_typeof(state_before) = 'object' AND jsonb_typeof(state_after) = 'object');

    ALTER TABLE lingocafe.questionnaire_learning_item_memory
    ADD CONSTRAINT questionnaire_learning_item_memory_scheduler_check
      CHECK (
        btrim(scheduler_name) <> '' AND btrim(scheduler_version) <> ''
        AND btrim(parameter_set_id) <> ''
        AND parameters_digest ~ '^[0-9a-f]{64}$'
        AND jsonb_typeof(parameters) = 'object'
      ),
    ADD CONSTRAINT questionnaire_learning_item_memory_retention_check
      CHECK (desired_retention > 0 AND desired_retention <= 1),
    ADD CONSTRAINT questionnaire_learning_item_memory_card_state_check
      CHECK (card_state IN ('new', 'learning', 'review', 'relearning')),
    ADD CONSTRAINT questionnaire_learning_item_memory_values_check
      CHECK (
        (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 10))
        AND (stability IS NULL OR stability > 0)
        AND scheduled_days >= 0 AND elapsed_days >= 0
        AND repetitions >= 0 AND lapses >= 0
      ),
    ADD CONSTRAINT questionnaire_learning_item_memory_new_state_check
      CHECK (
        card_state <> 'new'
        OR (difficulty IS NULL AND stability IS NULL AND last_review_at IS NULL)
      );
  `);

  await knex.raw(`
    CREATE FUNCTION lingocafe.prevent_questionnaire_content_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'questionnaire revision content is immutable; publish a new revision';
    END;
    $$;

    CREATE TRIGGER questionnaire_question_revisions_immutable
    BEFORE UPDATE ON lingocafe.questionnaire_question_revisions
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_content_update();

    CREATE TRIGGER questionnaire_question_revision_learning_items_immutable
    BEFORE UPDATE ON lingocafe.questionnaire_question_revision_learning_items
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_content_update();

    CREATE TRIGGER questionnaire_answer_sets_immutable
    BEFORE UPDATE ON lingocafe.questionnaire_answer_sets
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_content_update();

    CREATE TRIGGER questionnaire_answer_options_immutable
    BEFORE UPDATE ON lingocafe.questionnaire_answer_options
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_content_update();

    CREATE FUNCTION lingocafe.protect_rendered_questionnaire_revision()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM lingocafe.questionnaire_round_items AS item
        WHERE item.questionnaire_id = OLD.questionnaire_id
          AND item.question_id = OLD.question_id
          AND item.revision_digest = OLD.revision_digest
      ) THEN
        RAISE EXCEPTION 'questionnaire revision is retained by round history';
      END IF;
      RETURN OLD;
    END;
    $$;

    CREATE TRIGGER questionnaire_question_revisions_history_guard
    BEFORE DELETE ON lingocafe.questionnaire_question_revisions
    FOR EACH ROW EXECUTE FUNCTION lingocafe.protect_rendered_questionnaire_revision();

    CREATE TRIGGER questionnaire_question_revision_learning_items_history_guard
    BEFORE DELETE ON lingocafe.questionnaire_question_revision_learning_items
    FOR EACH ROW EXECUTE FUNCTION lingocafe.protect_rendered_questionnaire_revision();

    CREATE FUNCTION lingocafe.protect_rendered_questionnaire_answer_set()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM lingocafe.questionnaire_round_items AS item
        WHERE item.questionnaire_id = OLD.questionnaire_id
          AND item.question_id = OLD.question_id
          AND item.revision_digest = OLD.revision_digest
          AND item.answer_set_id = OLD.id
      ) THEN
        RAISE EXCEPTION 'questionnaire answer content is retained by round history';
      END IF;
      RETURN OLD;
    END;
    $$;

    CREATE TRIGGER questionnaire_answer_sets_history_guard
    BEFORE DELETE ON lingocafe.questionnaire_answer_sets
    FOR EACH ROW EXECUTE FUNCTION lingocafe.protect_rendered_questionnaire_answer_set();

    CREATE FUNCTION lingocafe.protect_rendered_questionnaire_answer_option()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM lingocafe.questionnaire_round_items AS item
        WHERE item.questionnaire_id = OLD.questionnaire_id
          AND item.question_id = OLD.question_id
          AND item.revision_digest = OLD.revision_digest
          AND item.answer_set_id = OLD.answer_set_id
      ) THEN
        RAISE EXCEPTION 'questionnaire answer content is retained by round history';
      END IF;
      RETURN OLD;
    END;
    $$;

    CREATE TRIGGER questionnaire_answer_options_history_guard
    BEFORE DELETE ON lingocafe.questionnaire_answer_options
    FOR EACH ROW EXECUTE FUNCTION lingocafe.protect_rendered_questionnaire_answer_option();

    CREATE FUNCTION lingocafe.prevent_questionnaire_history_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'questionnaire answer and review history is append-only';
    END;
    $$;

    CREATE TRIGGER questionnaire_answers_append_only
    BEFORE UPDATE ON lingocafe.questionnaire_answers
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_history_update();

    CREATE TRIGGER questionnaire_answer_selections_append_only
    BEFORE UPDATE ON lingocafe.questionnaire_answer_selections
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_history_update();

    CREATE TRIGGER questionnaire_learning_item_reviews_append_only
    BEFORE UPDATE ON lingocafe.questionnaire_learning_item_reviews
    FOR EACH ROW EXECUTE FUNCTION lingocafe.prevent_questionnaire_history_update();
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_learning_item_memory");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_learning_item_reviews");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_answer_selections");
  await knex.schema.withSchema("lingocafe").dropTable("questionnaire_answers");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_round_items");
  await knex.schema.withSchema("lingocafe").dropTable("questionnaire_rounds");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_publication_state");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_answer_options");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_answer_sets");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_question_revision_learning_items");
  await knex.raw(`
    ALTER TABLE lingocafe.questionnaire_questions
    DROP CONSTRAINT questionnaire_questions_current_revision_fk
  `);
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_question_revisions");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_questions");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_learning_item_pages");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("questionnaire_learning_items");
  await knex.schema.withSchema("lingocafe").dropTable("questionnaires");
  await knex.raw(`
    DROP FUNCTION IF EXISTS lingocafe.prevent_questionnaire_history_update();
    DROP FUNCTION IF EXISTS lingocafe.protect_rendered_questionnaire_answer_option();
    DROP FUNCTION IF EXISTS lingocafe.protect_rendered_questionnaire_answer_set();
    DROP FUNCTION IF EXISTS lingocafe.protect_rendered_questionnaire_revision();
    DROP FUNCTION IF EXISTS lingocafe.prevent_questionnaire_content_update();
  `);
};
