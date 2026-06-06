import type { EmailBodyTemplates, EmailProviderConfig } from '@/42go/auth/lib/providers/types';
import { parseEmailDurationSeconds } from '@/42go/auth/lib/email/duration';

export const DEFAULT_EMAIL_CODE_CONFIG = {
  length: 6,
  mode: 'digits',
  caseSensitive: false,
  duration: '5m',
} satisfies Required<NonNullable<EmailProviderConfig['code']>>;

export const DEFAULT_EMAIL_EVENTS_CONFIG = {
  requested: true,
  resent: true,
  codeVerified: true,
  loginFailed: true,
} satisfies Required<NonNullable<EmailProviderConfig['events']>>;

export const DEFAULT_EMAIL_THROTTLE_DELAY = [
  '30s',
  '1m',
  '2m',
  '3m',
  '5m',
  '10m',
] satisfies NonNullable<EmailProviderConfig['throttle']>['delay'];

export const DEFAULT_EMAIL_THROTTLE_CONFIG = {
  delay: DEFAULT_EMAIL_THROTTLE_DELAY,
  message: 'Wait before requesting another sign-in email.',
} satisfies NonNullable<EmailProviderConfig['throttle']>;

export const DEFAULT_EMAIL_LOGIN_UI_CONFIG = {
  primaryActionLabel: 'Continue with email',
} satisfies Required<NonNullable<EmailProviderConfig['ui']>>;

export const DEFAULT_EMAIL_BODY_CONFIG = {
  text: [
    'Your sign-in code is {{code}}.',
    'Magic link: {{magicLink}}',
    'Expires: {{expiresAt}}',
  ].join('\n'),
  html: [
    '<p>Your sign-in code is <strong>{{code}}</strong>.</p>',
    '<p><a href="{{magicLink}}">Sign in with this magic link</a></p>',
    '<p>This request expires at {{expiresAt}}.</p>',
  ].join(''),
} satisfies Required<EmailBodyTemplates>;

const resolveEmailBodyConfig = (body?: EmailProviderConfig['body']): EmailBodyTemplates => {
  if (typeof body === 'string') {
    return { text: body };
  }

  if (!body) {
    return DEFAULT_EMAIL_BODY_CONFIG;
  }

  const resolvedBody: EmailBodyTemplates = {};

  if (body.text !== undefined) {
    resolvedBody.text = body.text;
  } else if (body.html === undefined) {
    resolvedBody.text = DEFAULT_EMAIL_BODY_CONFIG.text;
  }

  if (body.html !== undefined) {
    resolvedBody.html = body.html;
  } else if (body.text === undefined) {
    resolvedBody.html = DEFAULT_EMAIL_BODY_CONFIG.html;
  }

  return resolvedBody;
};

export const getEmailProviderConfig = (
  config?: Partial<EmailProviderConfig>
): EmailProviderConfig => {
  const resolvedConfig: EmailProviderConfig = {
    code: {
      ...DEFAULT_EMAIL_CODE_CONFIG,
      ...(config?.code || {}),
    },
    throttle: {
      ...DEFAULT_EMAIL_THROTTLE_CONFIG,
      ...(config?.throttle || {}),
    },
    events: {
      ...DEFAULT_EMAIL_EVENTS_CONFIG,
      ...(config?.events || {}),
    },
    ui: {
      ...DEFAULT_EMAIL_LOGIN_UI_CONFIG,
      ...(config?.ui || {}),
    },
    strategies: {
      console: { type: 'console' },
      ...(config?.strategies || {}),
    },
    body: resolveEmailBodyConfig(config?.body),
    useStrategy: config?.useStrategy || 'console',
    from: config?.from || '42Go <no-reply@example.com>',
    subject: config?.subject || 'Your sign-in code',
  };

  parseEmailDurationSeconds(
    resolvedConfig.code!.duration!,
    'auth.providers[].config.code.duration'
  );
  if (resolvedConfig.throttle!.delay!.length === 0) {
    throw new Error('auth.providers[].config.throttle.delay must contain at least one duration.');
  }
  resolvedConfig.throttle!.delay!.forEach((delay, index) => {
    parseEmailDurationSeconds(delay, `auth.providers[].config.throttle.delay[${index}]`);
  });

  return resolvedConfig;
};
