export const COMMUNICATION_KINDS = [
  "notification",
  "poll",
  "input",
  "email",
] as const;
export const COMMUNICATION_STYLES = [
  "info",
  "warning",
  "danger",
  "success",
] as const;
export const AUDIENCE_MODES = [
  "everyone",
  "whitelist",
  "blacklist",
] as const;
export const REACTION_TEMPLATES = {
  acknowledge: ["OK"],
  confirm: ["I accept", "I reject"],
  hard_confirm: ["I accept"],
  agreement: ["Agree", "Disagree"],
  hard_agreement: ["Agree"],
  yes_no: ["Yes", "No"],
} as const;

export type CommunicationKind = (typeof COMMUNICATION_KINDS)[number];
export type CommunicationStyle = (typeof COMMUNICATION_STYLES)[number];
export type AudienceMode = (typeof AUDIENCE_MODES)[number];
export type ReactionTemplate = keyof typeof REACTION_TEMPLATES;

export type PollOption = { id: string; label: string };
export type PollConfig = {
  selection: "single" | "multiple";
  required: boolean;
  allowOther: boolean;
  allowNotes: boolean;
  options: PollOption[];
};
export type InputConfig = {
  inputType: "short" | "long";
  required: boolean;
};

export type Communication = {
  id: string;
  appId: string;
  channel: "in_app" | "email";
  kind: CommunicationKind;
  style: CommunicationStyle;
  priority: 0 | 5 | 10 | null;
  audienceMode: AudienceMode;
  title: string | null;
  subject: string | null;
  bodyMarkdown: string | null;
  linkUrl: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  reactionTemplate: ReactionTemplate | null;
  interactionConfig: PollConfig | InputConfig | Record<string, never>;
  createdBy: string | null;
  creatorName?: string | null;
  createdAt: string;
  updatedAt: string;
  availableFrom: string | null;
  availableUntil: string | null;
  publishedAt: string | null;
  abortedAt: string | null;
  firstDisplayedAt?: string | null;
  reaction?: string | null;
  response?: CommunicationResponse | null;
  skipped?: boolean;
  respondedAt?: string | null;
};

export type CommunicationResponse = {
  reaction?: string;
  optionIds?: string[];
  other?: string;
  notes?: string;
  input?: string;
  skip?: boolean;
};
