# LingoCafe Questionnaires Data Model

This document is the standalone database and publication contract for book
questionnaires in the LingoCafe reader. A publisher can implement a safe import
from this document without access to application code or another repository.

The live schema is created by
`knex/migrations/20260922120000_lingocafe_questionnaires.js`. PostgreSQL and the
accumulated Knex migrations remain authoritative if this document and the
database ever disagree.

## Scope

The model supports:

- one optional questionnaire per reader book;
- a variable pool of learning items and questions;
- exact links from learning items to one or more pages of the same book;
- stable question identities with immutable content revisions;
- ordered answer sets and options, initially using `single-select`;
- rounds with any positive requested size, defaulting to 10;
- exact answer and selected-option history;
- concept-level FSRS-6 review logs and current memory state;
- future questionnaire modes and selection policies without a schema rewrite.

This contract does not define the round-selection API, FSRS implementation, or
learner interface. Those consume this model in later tasks.

## Ownership Boundaries

| Owner | Tables | Rule |
| --- | --- | --- |
| Questionnaire publisher | `questionnaires`, `questionnaire_learning_items`, `questionnaire_learning_item_pages`, `questionnaire_questions`, `questionnaire_question_revisions`, `questionnaire_question_revision_learning_items`, `questionnaire_answer_sets`, `questionnaire_answer_options`, `questionnaire_publication_state` | May publish only questionnaires for books in its explicit payload. Never writes learner state. |
| Reader runtime | `questionnaire_rounds`, `questionnaire_round_items`, `questionnaire_answers`, `questionnaire_answer_selections`, `questionnaire_learning_item_reviews`, `questionnaire_learning_item_memory` | May create and erase learner state. Never rewrites published revision content. |
| Existing book publisher | `books`, `books_pages` | Owns books and their current page set under the books contract. |

An omitted book or questionnaire is not a deletion instruction. Publication is
surgical by explicit book scope. The publisher must not truncate questionnaire
tables and must never delete or update learner-owned rows.

## Identity Model

There are two kinds of identity:

1. Stable source identity: questionnaire, learning-item, question, answer-set,
   and option IDs from the published package.
2. Immutable rendering identity: the SHA-256 revision digest of the complete
   learner-visible question record, including its prompt, response mode,
   rationale, learning-item relations, answer sets, ordered options, and correct
   answers.

Changing any revision-owned value produces a new revision digest and new child
rows. Existing revision rows are never updated in place. The stable question's
`current_revision_digest` then moves to the new revision. Old revisions remain
available when referenced by round history.

The database rejects updates to revision, revision-learning-item, answer-set,
and answer-option rows. Historical answers, selections, and learning-item review
logs are also append-only. Runtime account erasure may delete user history.

## Publisher-Owned Tables

### `lingocafe.questionnaires`

One row is the current questionnaire root for one book.

- Primary key: `id`.
- `book_id` is unique and references `books(id)`.
- `status` is `active` or `withdrawn`.
- `language` and `title` are current display metadata.
- `source_schema_version`, `source_path`, and 64-character `source_hash` provide
  import evidence.
- `review`, `provenance`, and `metadata` retain structured source data.
- Unique `(id, book_id)` supports composite book-scope enforcement.

Only an active questionnaire may start a new round. Withdrawing it does not
delete content or history.

### `lingocafe.questionnaire_learning_items`

A learning item is the memory concept being reinforced.

- Primary key: `(questionnaire_id, id)`.
- `(questionnaire_id, book_id)` must resolve to the parent questionnaire.
- `statement` is the learner-facing explanation or learning claim.
- `status` is `active` or `withdrawn`.
- `review`, `provenance`, and `source_hash` preserve source evidence.

The repeated `book_id` is deliberate. It makes cross-book page links impossible
to insert using database constraints alone.

### `lingocafe.questionnaire_learning_item_pages`

This table links a learning item to the pages that explain it.

- Primary key:
  `(questionnaire_id, learning_item_id, book_id, page_id)`.
- `(questionnaire_id, book_id, learning_item_id)` references the exact parent
  learning item.
- `(book_id, page_id)` references the composite `books_pages` identity.

Deleting a current book page cascades only its page link. Learning items,
question revisions, and learner history survive. A publisher must reject an
enabled questionnaire with no valid page link for an active learning item.

### `lingocafe.questionnaire_questions`

This is the stable identity and current publication pointer.

- Primary key: `(questionnaire_id, id)`.
- `status` is `active` or `withdrawn`.
- `current_revision_digest` is null only while an identity is being staged or
  after explicit withdrawal. An active published question must have a current
  revision.
- The current pointer uses a deferred composite foreign key to the same
  questionnaire and question.

Withdrawing a question excludes it from future selection. It does not alter an
old round.

### `lingocafe.questionnaire_question_revisions`

This table stores immutable learner-visible prompt revisions.

- Primary key: `(questionnaire_id, question_id, revision_digest)`.
- `revision_digest` is a lowercase SHA-256 digest.
- `prompt`, open-string `response_mode`, and optional `rationale` are rendered
  content.
- `review`, `provenance`, `source_path`, `source_hash`, and `published_at`
  preserve publication evidence.

Version one accepts only `single-select` at the package/import boundary. The
database keeps `response_mode` open so later reviewed modes do not require a
column or enum migration.

### `lingocafe.questionnaire_question_revision_learning_items`

This ordered join records which concepts a revision tests.

- Primary key:
  `(questionnaire_id, question_id, revision_digest, learning_item_id)`.
- `position` is positive and unique inside the revision.
- The learning item must belong to the same questionnaire.

Version one normally has one learning item per revision. Multiple relations are
supported for future modes; each relation receives an independent FSRS review
event when the answer is graded.

### `lingocafe.questionnaire_answer_sets`

- Primary key:
  `(questionnaire_id, question_id, revision_digest, id)`.
- `position` is positive and unique inside the revision.
- The row belongs to one immutable question revision.

Version-one single-select revisions contain exactly one answer set. The
publisher validates that cardinality before writing.

### `lingocafe.questionnaire_answer_options`

- Primary key:
  `(questionnaire_id, question_id, revision_digest, answer_set_id, id)`.
- `position` is positive and unique inside the answer set.
- `text` is the rendered choice and `is_correct` stores correctness.

The publisher must validate that option IDs are unique, there are at least two
options, and a single-select answer set has exactly one correct option.

### `lingocafe.questionnaire_publication_state`

One row per questionnaire stores the normalized package `source_digest` and
`published_at`. It is publisher-owned reconciliation evidence, not learner
state.

## Learner-Owned Tables

### `lingocafe.questionnaire_rounds`

A partial unique index permits only one `in_progress` round for a learner,
questionnaire, and mode. Starting a round resumes that row. Future modes may
maintain their own active rounds.

A round is one user attempt against one questionnaire.

- UUID primary key `id`.
- `user_id` references `auth.users` with delete cascade.
- `questionnaire_id` uses delete restriction so content cannot erase history.
- `mode`, `selection_policy`, and `selection_policy_version` are nonempty open
  identifiers.
- `requested_question_count` is positive and defaults to 10.
- `actual_question_count`, `correct_count`, and `score_total` are nonnegative.
- `status` is `in_progress`, `completed`, or `abandoned`.
- Completed rounds require `score_total = actual_question_count` and a
  `completed_at` value.

The initial service requests ten questions. The database does not hard-code ten
as a maximum and can represent a smaller actual round when the eligible pool is
temporarily exhausted.

### `lingocafe.questionnaire_round_items`

Round items freeze the ordered content rendered to the learner.

- Primary key: `(round_id, position)` with positive positions.
- A stable question can occur only once in a round.
- The row references the exact questionnaire, question revision, and answer set.
- Content deletion is restricted while a round item references it.

Selection, shuffling, and option presentation must never change these identity
columns after the round starts.

### `lingocafe.questionnaire_answers`

One row records the submitted result for one round item.

- Primary key: `(round_id, round_item_position)`.
- `answered_at`, `is_correct`, optional nonnegative `duration_ms`, and
  `applied_rating` are immutable history.
- `applied_rating` is constrained to the FSRS scale 1–4.

For version one, the service maps a wrong answer to `Again` (1) and a correct
answer to `Good` (3). `Hard` (2) and `Easy` (4) remain available to later modes
without changing stored history.

### `lingocafe.questionnaire_answer_selections`

This table stores every chosen option. Composite foreign keys prove that a
selection belongs to both the rendered round item and its exact answer set.
It supports single-select now and multi-option answers later.

### `lingocafe.questionnaire_learning_item_reviews`

This append-only log is the scheduler input and audit trail for each concept
affected by an answer.

- UUID primary key `id`.
- User identity must match the parent round.
- The question revision must be linked to the learning item.
- `(round_id, round_item_position, learning_item_id)` is unique.
- `rating`, `elapsed_days`, `scheduled_days`, and `reviewed_at` record the
  observed review.
- `scheduler_name`, `scheduler_version`, `parameter_set_id`, exact `parameters`,
  `parameters_digest`, and `desired_retention` identify the calculation.
- `state_before` and `state_after` retain replay/debug evidence.

### `lingocafe.questionnaire_learning_item_memory`

This table stores the latest scheduler state for one user and concept.

- Primary key: `(user_id, questionnaire_id, learning_item_id)`.
- The default scheduler identity is FSRS version 6.
- `parameter_set_id`, exact JSON `parameters`, and `parameters_digest` bind the
  calculation inputs.
- `desired_retention` is in `(0, 1]` and defaults to `0.900`.
- `card_state` is `new`, `learning`, `review`, or `relearning`.
- `difficulty` is null for new cards or in `[1, 10]`.
- `stability` is null for new cards or positive.
- `due_at`, `last_review_at`, `scheduled_days`, `elapsed_days`, `repetitions`,
  `learning_steps`, and `lapses` support scheduling and due selection.
- `last_review_id` binds the state to its exact review event.

Retrievability is time-dependent and is therefore calculated from stability,
elapsed time, and the bound FSRS parameters. It is not persisted as current
truth. FSRS-6 models memory with difficulty and stability, uses four ratings,
and uses 21 parameters including a trainable forgetting-curve decay. See the
[FSRS algorithm specification](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)
and the [TypeScript FSRS algorithm API](https://open-spaced-repetition.github.io/ts-fsrs/classes/FSRSAlgorithm.html).

## Safe Publication Algorithm

For each explicitly included book, the publisher performs one transaction:

1. Lock or serialize publication for the questionnaire's book scope.
2. Verify the book exists and the package is enabled.
3. Validate the complete package before writing: manifest/shards, stable IDs,
   status/review gates, response modes, answer cardinality, correctness,
   learning-item relations, page existence, and source digest.
4. Upsert the current questionnaire and stable learning items.
5. Reconcile current learning-item/page links for that included questionnaire
   only.
6. Insert missing immutable question revisions and their children. On an
   existing digest, compare normalized content and fail on any mismatch; never
   update it.
7. Upsert stable question status and current revision pointers.
8. Mark omitted former stable questions or learning items `withdrawn`; do not
   delete revisions or learner state.
9. Update `questionnaire_publication_state` last.

Publication failure rolls back the entire included questionnaire scope. The
publisher never writes rounds, answers, review logs, or memory state.

## Withdrawal and Retention

- Missing books are ignored, not deleted.
- `questionnaire.enabled: false` or absent means the exporter does not publish
  a questionnaire. It is not automatically a withdrawal command.
- Explicit questionnaire withdrawal sets the root status to `withdrawn`.
- Explicit question or learning-item withdrawal changes its stable status.
- Existing revisions and historical relations remain intact.
- New rounds select only active roots, learning items, stable questions, and
  current revisions with valid page links.
- Deleting a current page removes the affected page relation. It must not erase
  attempts or scheduler history.
- Deleting a book is blocked while questionnaire round history references its
  content. Product-level book retirement should use catalog visibility rather
  than physical deletion.

## Transactional Runtime Write

Submitting an answer is one transaction:

1. Lock the in-progress round and memory rows for its linked learning items.
2. Verify the selected options belong to the answer set frozen in the round.
3. Calculate correctness from immutable option rows.
4. Insert the answer and selected-option rows.
5. Derive or accept the mode's 1–4 rating; version one uses wrong=1 and
   correct=3.
6. For every linked learning item, insert one review log with before/after state
   and upsert the current memory row.
7. Update round counters and complete the round when all actual items have an
   answer.

Retries use the answer primary key and review unique key as idempotency guards.
An existing answer is returned as the completed result; it is not rewritten.

## Account Erasure

LingoCafe account erasure explicitly deletes, in order:

1. `questionnaire_learning_item_memory`;
2. `questionnaire_learning_item_reviews`;
3. `questionnaire_rounds`, cascading their items, answers, and selections.

The handler reports each count before deleting the auth user. Publisher-owned
questionnaire content remains untouched. No anonymized questionnaire history is
retained in version one.

## Required Selection Indexes

The migration provides indexes for:

- active question and learning-item discovery by questionnaire;
- page-to-learning-item lookup;
- recent rounds by user and questionnaire;
- review history by user, questionnaire, and time;
- due memory items by user/questionnaire/due time;
- concept state lookup across users for maintenance.

Later services should inspect query plans before adding specialized partial
indexes. Schema openness is not an excuse for index confetti. Chuck Norris
roundhouse-kicks full table scans only after `EXPLAIN` identifies them.
