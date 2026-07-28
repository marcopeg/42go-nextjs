import { z } from "zod";
import {
  AUDIENCE_MODES,
  COMMUNICATION_KINDS,
  COMMUNICATION_STYLES,
  REACTION_TEMPLATES,
  type CommunicationResponse,
  type PollConfig,
  type InputConfig,
} from "./types.ts";

const optionalText = (limit: number) =>
  z.string().trim().max(limit).nullable().optional();
const optionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(200),
});

export const communicationDraftSchema = z
  .object({
    kind: z.enum(COMMUNICATION_KINDS),
    style: z.enum(COMMUNICATION_STYLES).default("info"),
    priority: z.union([z.literal(0), z.literal(5), z.literal(10)]).default(5),
    audienceMode: z.enum(AUDIENCE_MODES).default("everyone"),
    audienceUserIds: z.array(z.string().min(1)).max(10000).default([]),
    title: optionalText(160),
    subject: optionalText(200),
    bodyMarkdown: optionalText(20000),
    linkUrl: optionalText(2048),
    mediaUrl: optionalText(2048),
    mediaType: z.enum(["image", "video"]).nullable().optional(),
    reactionTemplate: z
      .enum(Object.keys(REACTION_TEMPLATES) as [keyof typeof REACTION_TEMPLATES, ...(keyof typeof REACTION_TEMPLATES)[]])
      .nullable()
      .optional(),
    availableFrom: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
    interactionConfig: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((value, ctx) => {
    const isEmail = value.kind === "email";
    if (isEmail && !value.subject) {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "Email subject is required." });
    }
    if (isEmail && !value.bodyMarkdown) {
      ctx.addIssue({ code: "custom", path: ["bodyMarkdown"], message: "Email body is required." });
    }
    if (!isEmail && !value.title && !value.bodyMarkdown) {
      ctx.addIssue({ code: "custom", path: ["title"], message: "Add a title or message." });
    }
    if (value.kind === "notification" && !value.reactionTemplate) {
      ctx.addIssue({ code: "custom", path: ["reactionTemplate"], message: "Choose a reaction template." });
    }
    if (value.audienceMode !== "everyone" && value.audienceUserIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["audienceUserIds"], message: "Select at least one user." });
    }
    if (value.availableFrom && value.availableUntil && new Date(value.availableUntil) <= new Date(value.availableFrom)) {
      ctx.addIssue({ code: "custom", path: ["availableUntil"], message: "Available until must be after available from." });
    }
    validateUrl(value.linkUrl, "linkUrl", ctx);
    validateUrl(value.mediaUrl, "mediaUrl", ctx);
    if (Boolean(value.mediaUrl) !== Boolean(value.mediaType)) {
      ctx.addIssue({ code: "custom", path: ["mediaUrl"], message: "Media URL and type must be set together." });
    }
    if (value.kind === "poll") {
      const parsed = pollConfigSchema.safeParse(value.interactionConfig);
      if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["interactionConfig", ...issue.path] }));
    }
    if (value.kind === "input") {
      const parsed = inputConfigSchema.safeParse(value.interactionConfig);
      if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["interactionConfig", ...issue.path] }));
    }
  });

const validateUrl = (
  value: string | null | undefined,
  path: string,
  ctx: z.RefinementCtx
) => {
  if (!value) return;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local)) {
      ctx.addIssue({ code: "custom", path: [path], message: "Use an HTTPS URL." });
    }
  } catch {
    ctx.addIssue({ code: "custom", path: [path], message: "Enter a valid URL." });
  }
};

export const pollConfigSchema = z.object({
  selection: z.enum(["single", "multiple"]),
  required: z.boolean(),
  allowOther: z.boolean(),
  allowNotes: z.boolean(),
  options: z.array(optionSchema).min(2).max(50).superRefine((options, ctx) => {
    const ids = new Set(options.map((option) => option.id));
    if (ids.size !== options.length) ctx.addIssue({ code: "custom", message: "Poll option IDs must be unique." });
  }),
});

export const inputConfigSchema = z.object({
  inputType: z.enum(["short", "long"]),
  required: z.boolean(),
});

export const validateResponse = (
  kind: string,
  reactionTemplate: keyof typeof REACTION_TEMPLATES | null,
  config: unknown,
  response: CommunicationResponse
) => {
  if (kind === "notification") {
    if (!reactionTemplate || !REACTION_TEMPLATES[reactionTemplate].includes(response.reaction as never)) {
      return "That reaction is not allowed.";
    }
    return null;
  }
  if (kind === "poll") {
    const parsed = pollConfigSchema.safeParse(config);
    if (!parsed.success) return "The poll configuration is invalid.";
    const poll = parsed.data as PollConfig;
    if (response.skip) return poll.required ? "This poll cannot be skipped." : null;
    const selected = [...new Set(response.optionIds || [])];
    if (selected.some((id) => !poll.options.some((option) => option.id === id))) return "The response contains an unknown option.";
    const other = response.other?.trim() || "";
    const notes = response.notes?.trim() || "";
    if (!poll.allowOther && other) return "Other answers are disabled.";
    if (!poll.allowNotes && notes) return "Notes are disabled.";
    if (other.length > 500 || notes.length > 5000) return "The response is too long.";
    if (poll.selection === "single" && selected.length + (other ? 1 : 0) > 1) return "Choose one option or provide Other, not both.";
    if (poll.required && selected.length === 0 && !other) return "An answer is required.";
    return null;
  }
  if (kind === "input") {
    const parsed = inputConfigSchema.safeParse(config);
    if (!parsed.success) return "The input configuration is invalid.";
    const input = response.input?.trim() || "";
    const limit = (parsed.data as InputConfig).inputType === "short" ? 500 : 5000;
    if (parsed.data.required && !input) return "A response is required.";
    if (input.length > limit) return "The response is too long.";
    return null;
  }
  return "Email communications cannot be answered here.";
};
