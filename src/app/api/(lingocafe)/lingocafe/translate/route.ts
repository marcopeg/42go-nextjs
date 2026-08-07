import { z } from 'zod';

import { getDB } from '@/42go/db';
import { recordEvent } from '@/42go/events/server';
import { protectRoute } from '@/42go/policy';

import {
  type BookPageDetail,
  getReaderProfileStringValue,
  getSessionUserId,
  json,
  loadBookPage,
  loadReaderProfile,
} from '@/app/api/(lingocafe)/lingocafe/_lib/reader';
import {
  TranslationProviderError,
  getCachedTranslation,
  isTranslationEnabled,
  normalizeTranslationLanguage,
  type TranslationResult,
  translateAndCacheText,
} from '@/app/api/(lingocafe)/lingocafe/_lib/translation';
import { hasExactlyOneLingoCafeSentence } from '@/lib/lingocafe/sentence-segmentation';
import { isSameLingoCafeTranslationLanguage } from '@/lib/lingocafe/translation-language';

const defaultMaxTranslateLength = 500;
const maxSafeTranslateLength = 5000;
const idSchema = z.string().trim().min(1).max(256);

const translationBaseSchema = z.object({
  text: z.string().trim().min(1),
  from: z.string().trim().min(2).max(16),
  to: z.string().trim().min(2).max(16),
});

const contextualTranslationPayloadSchema = translationBaseSchema.extend({
  context: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('book-page'),
      bookId: idSchema,
      pageId: idSchema,
      sentenceId: idSchema.optional(),
    }),
    z.object({
      kind: z.literal('category'),
      categoryId: idSchema,
    }),
    z.object({
      kind: z.literal('conversation'),
      conversationId: idSchema,
      sentenceId: idSchema.optional(),
    }),
  ]),
});

// Keep the original book-reader wire format working while new surfaces use
// the explicit discriminated context.
const legacyBookTranslationPayloadSchema = translationBaseSchema.extend({
  bookId: idSchema,
  pageId: idSchema,
  sentenceId: idSchema.optional(),
});

const translationPayloadSchema = z
  .union([contextualTranslationPayloadSchema, legacyBookTranslationPayloadSchema])
  .transform(payload =>
    'context' in payload
      ? payload
      : {
          text: payload.text,
          from: payload.from,
          to: payload.to,
          context: {
            kind: 'book-page' as const,
            bookId: payload.bookId,
            pageId: payload.pageId,
            sentenceId: payload.sentenceId,
          },
        }
  );

type TranslationPayload = z.infer<typeof translationPayloadSchema>;
type TranslationContext = TranslationPayload['context'];
type ValidationField = 'text' | 'from' | 'to' | 'context';

type AuthorizedTranslationContent = {
  sourceLanguage: string;
  sourceText: string;
};

type ConversationTranslationRow = {
  id: string;
  scenario_id: string;
  variant_id: string;
  language: string;
  cefr_level: string;
  title: string;
  description: string;
  scenario_canonical_language: string;
  scenario_title: string;
  scenario_description: string;
  variant_canonical_language: string;
  variant_title: string;
  variant_description: string;
};

const getMaxTranslateLength = () => {
  const parsed = Number(process.env.LC_MAX_TRANSLATE_LENGTH);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= maxSafeTranslateLength) {
    return parsed;
  }

  return defaultMaxTranslateLength;
};

const normalizeFormalText = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ');

const getFormalValidationIssue = (text: string) => {
  const normalized = normalizeFormalText(text);
  const maxLength = getMaxTranslateLength();

  if (normalized.length > maxLength) {
    return `Text must be ${maxLength} characters or less.`;
  }

  if (!hasExactlyOneLingoCafeSentence(normalized)) {
    return 'Text must be one sentence with no full stops in the middle.';
  }

  return null;
};

const normalizeMembershipText = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[`*_>#~\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();

const containsTranslationText = (text: string, sourceText: string) => {
  const requestedText = normalizeMembershipText(text);
  return Boolean(requestedText && normalizeMembershipText(sourceText).includes(requestedText));
};

const getBookPageSourceText = (bookPage: BookPageDetail) =>
  [bookPage.page.title, bookPage.page.summary ?? '', bookPage.page.content].join('\n\n');

const loadCategoryTranslationContent = async (
  categoryId: string,
  targetLanguage: string
): Promise<AuthorizedTranslationContent | null> => {
  const db = getDB();
  const category = await db('lingocafe.conversation_categories as category')
    .select('category.title', 'category.description', 'category.goal')
    .where('category.id', categoryId)
    .where('category.is_visible', true)
    .where(builder =>
      builder
        .where('category.language_scope', 'all')
        .orWhereRaw('? = ANY(category.languages)', [targetLanguage])
    )
    .first();

  if (!category) return null;
  return {
    sourceLanguage: 'en',
    sourceText: [category.title, category.description, category.goal].join('\n\n'),
  };
};

const loadConversationTranslationContent = async (
  conversationId: string,
  targetLanguage: string,
  requestedSourceLanguage: string
): Promise<AuthorizedTranslationContent | null> => {
  const db = getDB();
  const conversation = (await db('lingocafe.conversations as conversation')
    .join('lingocafe.conversation_scenarios as scenario', 'scenario.id', 'conversation.scenario_id')
    .join('lingocafe.conversation_variants as variant', function joinVariant() {
      this.on('variant.scenario_id', '=', 'conversation.scenario_id').andOn(
        'variant.id',
        '=',
        'conversation.variant_id'
      );
    })
    .select(
      'conversation.id',
      'conversation.scenario_id',
      'conversation.variant_id',
      'conversation.language',
      'conversation.cefr_level',
      'conversation.title',
      'conversation.description',
      'scenario.canonical_language as scenario_canonical_language',
      'scenario.title as scenario_title',
      'scenario.description as scenario_description',
      'variant.canonical_language as variant_canonical_language',
      'variant.title as variant_title',
      'variant.description as variant_description'
    )
    .where('conversation.id', conversationId)
    .where('conversation.language', targetLanguage)
    .where('conversation.is_visible', true)
    .where('scenario.is_visible', true)
    .where('variant.is_visible', true)
    .where(builder =>
      builder
        .where('scenario.language_scope', 'all')
        .orWhereRaw('conversation.language = ANY(scenario.languages)')
    )
    .where(builder =>
      builder
        .where('variant.language_scope', 'all')
        .orWhereRaw('conversation.language = ANY(variant.languages)')
    )
    .first()) as ConversationTranslationRow | undefined;

  if (!conversation) return null;

  const [rounds, scenarioLocalization, variantLocalization] = await Promise.all([
    db('lingocafe.conversation_rounds')
      .select('text')
      .where('conversation_id', conversation.id)
      .orderBy('position', 'asc'),
    db('lingocafe.conversation_scenario_localizations')
      .select('title', 'description')
      .where({
        scenario_id: conversation.scenario_id,
        language: conversation.language,
        cefr_level: conversation.cefr_level,
      })
      .first(),
    db('lingocafe.conversation_variant_localizations')
      .select('title', 'description')
      .where({
        scenario_id: conversation.scenario_id,
        variant_id: conversation.variant_id,
        language: conversation.language,
        cefr_level: conversation.cefr_level,
      })
      .first(),
  ]);

  const normalizedRequestedSource = normalizeTranslationLanguage(requestedSourceLanguage);
  if (
    normalizedRequestedSource === normalizeTranslationLanguage(conversation.language)
  ) {
    return {
      sourceLanguage: conversation.language,
      sourceText: [
        conversation.title,
        conversation.description,
        scenarioLocalization?.title,
        scenarioLocalization?.description,
        variantLocalization?.title,
        variantLocalization?.description,
        ...rounds.map(round => round.text),
      ]
        .filter((value): value is string => typeof value === 'string')
        .join('\n\n'),
    };
  }

  const scenarioCanonicalMatches =
    normalizedRequestedSource ===
    normalizeTranslationLanguage(conversation.scenario_canonical_language);
  const variantCanonicalMatches =
    normalizedRequestedSource ===
    normalizeTranslationLanguage(conversation.variant_canonical_language);
  const canonicalText = [
    ...(scenarioCanonicalMatches
      ? [conversation.scenario_title, conversation.scenario_description]
      : []),
    ...(variantCanonicalMatches
      ? [conversation.variant_title, conversation.variant_description]
      : []),
  ];
  return canonicalText.length > 0
    ? {
        sourceLanguage: scenarioCanonicalMatches
          ? conversation.scenario_canonical_language
          : conversation.variant_canonical_language,
        sourceText: canonicalText.join('\n\n'),
      }
    : null;
};

const authorizeTranslationContent = async ({
  context,
  targetLanguage,
  requestedSourceLanguage,
}: {
  context: TranslationContext;
  targetLanguage: string;
  requestedSourceLanguage: string;
}): Promise<AuthorizedTranslationContent | null> => {
  if (context.kind === 'book-page') {
    const bookPage = await loadBookPage(context.bookId, context.pageId);
    return bookPage
      ? {
          sourceLanguage: bookPage.book.lang,
          sourceText: getBookPageSourceText(bookPage),
        }
      : null;
  }
  if (context.kind === 'category') {
    return loadCategoryTranslationContent(context.categoryId, targetLanguage);
  }
  return loadConversationTranslationContent(
    context.conversationId,
    targetLanguage,
    requestedSourceLanguage
  );
};

const validationIssues = (message: string, issues: Partial<Record<ValidationField, string[]>>) =>
  json(
    {
      error: 'validation',
      message,
      issues,
    },
    { status: 400 }
  );

const validationError = (message: string, field: ValidationField) =>
  validationIssues(message, { [field]: [message] });

const recordTranslateEvent = async ({
  userId,
  translation,
  context,
}: {
  userId: string;
  translation: TranslationResult;
  context: TranslationContext;
}) => {
  try {
    await recordEvent({
      appId: 'lingocafe',
      userId,
      name: 'page.translate',
      data: {
        cache_type: translation.source,
        from: translation.from,
        to: translation.to,
        translation_hash: translation.hash,
        ...(context.kind === 'book-page'
          ? {
              book_id: context.bookId,
              page_id: context.pageId,
              ...(context.sentenceId ? { sentence_id: context.sentenceId } : {}),
            }
          : context.kind === 'category'
            ? { category_id: context.categoryId }
            : {
                conversation_id: context.conversationId,
                ...(context.sentenceId ? { sentence_id: context.sentenceId } : {}),
              }),
      },
    });
  } catch (error) {
    console.error('LingoCafe translate event logging failed:', error);
  }
};

const notFound = (context: TranslationContext) =>
  json(
    {
      error: 'not_found',
      message:
        context.kind === 'book-page'
          ? 'Book page not found.'
          : context.kind === 'category'
            ? 'Conversation category not found.'
            : 'Conversation not found.',
    },
    { status: 404 }
  );

const postTranslation = async (req: Request) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json({ error: 'session', message: 'login required' }, { status: 401 });
  }

  const parsed = translationPayloadSchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return json(
      {
        error: 'validation',
        message: 'Invalid translation payload.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const formalIssue = getFormalValidationIssue(payload.text);
  if (formalIssue) return validationError(formalIssue, 'text');

  if (!isTranslationEnabled()) {
    return json({ error: 'forbidden', message: 'Translation is not enabled.' }, { status: 403 });
  }

  if (isSameLingoCafeTranslationLanguage(payload.from, payload.to)) {
    return validationError(
      'Choose a translation language different from the reading language.',
      'to'
    );
  }

  try {
    const profile = await loadReaderProfile(userId);
    const ownLanguage = getReaderProfileStringValue(profile, 'ownLang');
    const targetLanguage = getReaderProfileStringValue(profile, 'targetLang');

    if (!ownLanguage || !targetLanguage) {
      return validationIssues('Translation languages require a complete reader profile.', {
        ...(!targetLanguage
          ? { from: ['Learning language is missing from your reader profile.'] }
          : {}),
        ...(!ownLanguage ? { to: ['Own language is missing from your reader profile.'] } : {}),
      });
    }

    if (normalizeTranslationLanguage(payload.to) !== normalizeTranslationLanguage(ownLanguage)) {
      return validationError('Target language must match your own language.', 'to');
    }

    const content = await authorizeTranslationContent({
      context: payload.context,
      targetLanguage: normalizeTranslationLanguage(targetLanguage),
      requestedSourceLanguage: payload.from,
    });
    if (!content) return notFound(payload.context);

    if (
      payload.context.kind === 'book-page' &&
      normalizeTranslationLanguage(content.sourceLanguage) !==
        normalizeTranslationLanguage(targetLanguage)
    ) {
      return validationError(
        'Source language must match your learning language.',
        'from'
      );
    }

    if (
      normalizeTranslationLanguage(payload.from) !==
      normalizeTranslationLanguage(content.sourceLanguage)
    ) {
      return validationError('Source language must match the requested content language.', 'from');
    }

    if (!containsTranslationText(payload.text, content.sourceText)) {
      return validationError('Text was not found in the requested content.', 'text');
    }

    // Authorization and source-membership checks deliberately precede cache
    // access: a cache hit must never disclose translations for hidden content.
    const translationInput = {
      text: payload.text,
      from: content.sourceLanguage,
      to: ownLanguage,
    };
    const cachedTranslation = await getCachedTranslation(translationInput);
    const translation = cachedTranslation ?? (await translateAndCacheText(translationInput));

    await recordTranslateEvent({
      userId,
      translation,
      context: payload.context,
    });

    return json({ ok: true, translation });
  } catch (error) {
    if (error instanceof TranslationProviderError) {
      return json(
        { error: 'translation_provider', message: error.message },
        { status: error.status }
      );
    }

    return json({ error: 'translation', message: 'Could not translate text.' }, { status: 502 });
  }
};

export const POST = protectRoute(postTranslation, {
  require: { feature: 'api:lingocafe', session: true },
});
