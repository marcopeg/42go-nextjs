import { z } from "zod";

export const QUICKLIST_LIST_NAME_MAX_LENGTH = 250;
export const QUICKLIST_ITEM_TEXT_MAX_LENGTH = 250;
export const QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH = 4_000;

export const countQuicklistUnicodeCharacters = (value: string): number =>
  Array.from(value).length;

const createTrimmedQuicklistTextSchema = (
  label: string,
  maximumLength: number
) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine(
      (value) => countQuicklistUnicodeCharacters(value) <= maximumLength,
      `${label} must be ${maximumLength} characters or fewer.`
    );

export const quicklistListNameSchema = createTrimmedQuicklistTextSchema(
  "List name",
  QUICKLIST_LIST_NAME_MAX_LENGTH
);

export const quicklistItemTextSchema = createTrimmedQuicklistTextSchema(
  "Item text",
  QUICKLIST_ITEM_TEXT_MAX_LENGTH
);

export const quicklistSortingInstructionsSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(
    (value) =>
      countQuicklistUnicodeCharacters(value) <=
      QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH,
    `Sorting instructions must be ${QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH} characters or fewer.`
  );

export const quicklistSortingInstructionsRequestSchema = z
  .object({
    sortingInstructions: quicklistSortingInstructionsSchema,
  })
  .strict();
