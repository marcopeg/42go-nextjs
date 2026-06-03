# Email Authentication

42Go apps can enable passwordless sign-in with `auth.providers` entry `type: "email"`.
The implementation uses NextAuth v4 EmailProvider, JWT sessions, and an app-scoped Knex adapter.

Public operator documentation lives at `contents/default/docs/authentication/README.md`.

## Provider Shape

```ts
{
  type: "email",
  config: {
    useStrategy: "resend",
    from: "LingoCafe <login@auth.lingocafe.app>",
    // code, throttle, and ui may be omitted to use the defaults.
    strategies: {
      console: { type: "console" },
      resend: {
        type: "resend",
        apiKey: "re_...",
        from: "LingoCafe <login@auth.lingocafe.app>",
      },
    },
  },
}
```

The selected strategy defaults to `console` only when `useStrategy` is omitted. The console strategy prints the magic link and code to server logs. It is useful for local development and test runs. Production use is allowed when selected, but it exposes sign-in secrets to logs and is operator responsibility.

The example above uses inline values to show the final AppConfig shape. In a
real app, source secrets such as the Resend API key from server-only environment
variables or a secret manager.

Resend is available as the first external delivery strategy.
For local development, select `useStrategy: "console"` while keeping both
`console` and `resend` entries in `strategies`.

For production Resend delivery:

1. Verify a sending domain or subdomain in Resend.
2. Add the SPF and DKIM DNS records shown by Resend.
3. Create a sending-only API key.
4. Configure `useStrategy: "resend"`.
5. Configure `strategies.resend.apiKey`.
6. Configure `from` to an address on the verified domain.

Primary Resend references:

- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction
- https://resend.com/docs/api-reference/emails
- https://resend.com/docs/knowledge-base/how-to-handle-api-keys

## Security Model

Verification tokens are stored in `auth.verification_tokens` with `app_id`, `identifier`, and hashed token as the primary key. Tokens issued for one app cannot be consumed by another app.

Manual code entry posts to `/api/auth/email/verify-code`. That route validates the app-scoped stored token and redirects the browser into the normal NextAuth email callback. Session cookies are still created by NextAuth, not by custom route code.

Email auth events use lowercase dot/dash names such as `auth.email.requested`, `auth.email.resent`, `auth.email.code-verified`, and `auth.email.login-failed`.

Request and resend throttling is keyed by `app_id + normalized email` in v1. The schema stores `meta` for future IP or user-agent expansion without collecting them now.

Email durations are explicit strings: `"30s"`, `"5m"`, or `"1h"`. Plain
numbers such as `"4"` are invalid. `code.duration` controls token lifetime.
`throttle.delay` controls resend cooldowns; the last configured delay is reused
for all later attempts. The default delay sequence is
`["30s", "1m", "2m", "3m", "5m", "10m"]`.

Used tokens are deleted immediately through `DELETE ... RETURNING`. Expired
unused tokens should be cleaned by a scheduled maintenance job with a grace
window, for example:

```sql
DELETE FROM auth.verification_tokens
WHERE expires < now() - interval '24 hours';
```
