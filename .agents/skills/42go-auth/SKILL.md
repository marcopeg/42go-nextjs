---
name: 42go-auth
description: Configure, extend, or review 42Go authentication, including AppConfig auth providers, credentials, Google/GitHub OAuth, email magic-link/code auth, NextAuth callbacks, app-scoped users/accounts/tokens, login UI, and production email delivery.
---

# 42Go Auth

Use this skill when adding, changing, documenting, or reviewing authentication.

Core files:

- `src/42go/auth/lib/authOptions.ts`
- `src/42go/auth/lib/callbacks.ts`
- `src/42go/auth/lib/providers/types.ts`
- `src/42go/auth/lib/providers/get-providers.ts`
- `src/42go/auth/lib/adapter/knex-adapter.ts`
- `src/42go/auth/lib/email/`
- `src/42go/auth/components/login-strategies/`
- `src/app/(public)/login/page.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/email/request/route.ts`
- `src/app/api/auth/email/verify-code/route.ts`
- `knex/migrations/20240320_auth.js`

## AppConfig Source of Truth

Providers live at `auth.providers` in each app config.

Supported provider types:

- `credentials`
- `github`
- `google`
- `email`

Do not hard-code LingoCafe-only auth behavior in shared auth code. Resolve the
current app from the request and keep provider behavior app-scoped.

## App Scope Rules

- Credentials user lookup must query `auth.users` by `app_id`.
- OAuth account lookup/linking must query `auth.accounts` by `app_id`.
- Email verification tokens must use `app_id + normalized email + hashed token`.
- JWT sessions must carry `user.appId`, roles, and grants for the resolved app.

## Email Auth Rules

Email auth uses NextAuth v4 EmailProvider plus the custom Knex adapter.

Do not create a parallel session system. Manual code verification must redirect
into `/api/auth/callback/email` after validating the app-scoped token; NextAuth
creates the cookie.

Delivered codes are generated from config:

```ts
code: { length: 6, mode: "digits", caseSensitive: false, duration: "5m" }
```

Supported modes are `digits`, `alphabet`, `alphanumeric`, and `complex`.
Email durations use explicit strings such as `"30s"`, `"5m"`, or `"1h"`;
plain numbers are invalid. Request throttling uses
`throttle.delay: ["30s", "1m", "2m", "3m", "5m", "10m"]` by default, where the
last value applies to all later resend attempts.

Email delivery strategies:

- `console`: default; prints the rendered email to server logs with visible
  `FROM`, `TO`, `SUBJECT`, and `BODY` sections.
- `resend`: production HTTP sender. Prefer passing the API key explicitly in
  the strategy config from app-owned server-only environment variables or a
  secret manager.

Strategy entries keep their own `type` discriminator because dispatch chooses
the implementation from that field. The provider-level `useStrategy` selects a
key from `strategies`.
The `console` strategy is always available even when omitted from `strategies`.
Provider-level `from`, `subject`, and `body` apply across delivery strategies;
strategy entries should hold transport-specific configuration such as Resend's
`apiKey`. Subjects may include `{{code}}`. Body may be a plain text template
string or an object with `text` and/or `html`; body templates may include
`{{code}}`, `{{url}}`, `{{magicLink}}`, `{{expiry}}`, and `{{expiresAt}}`.

For Resend production setup, update `contents/default/docs/authentication/README.md`
and `.env.example` when config changes.

## Login UI Rules

- Credentials-only: show username/email and password fields.
- Email-only: show username/email, then send email and show code screen.
- Credentials plus email: first screen shows username/email, primary email
  action, and link-style `Continue with password`.
- Email primary text comes from `auth.providers[].config.ui.primaryActionLabel`
  and defaults to `Send me a magic link`.
- Use the shared strategy components; do not build one-off login forms.

## Event Rules

Email auth event names must use dot/dash syntax:

- `auth.email.requested`
- `auth.email.resent`
- `auth.email.code-verified`
- `auth.email.login-failed`

Never log raw codes, raw tokens, OAuth tokens, or account-existence status.

## Token Cleanup

Used email tokens are deleted immediately by `DELETE ... RETURNING`.

Do not clean expired unused tokens on every login request. Prefer a scheduled
cleanup with a grace window:

```sql
DELETE FROM auth.verification_tokens
WHERE expires < now() - interval '24 hours';
```

## Validation

After auth code changes, run:

```bash
npm run qa
```

For LingoCafe visual/auth checks, use `https://lc42go.ngrok.app/`.
Credentials test user: `john` / `john`.
