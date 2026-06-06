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
    subject: "{{code}} is your sign-in code",
    body: "code: {{code}}\n\nlink: {{url}}\n\nThis code will expire at {{expiry}}.",
    // code, throttle, and ui may be omitted to use the defaults.
    strategies: {
      resend: {
        type: "resend",
        apiKey: "re_...",
      },
    },
  },
}
```

The selected strategy defaults to `console` only when `useStrategy` is omitted. The console strategy is always available, even when it is not listed in `strategies`. It prints the fully rendered email to server logs and is useful for local development and test runs. Production use is allowed when selected, but it exposes sign-in secrets to logs and is operator responsibility.

The example above uses inline values to show the final AppConfig shape. In a
real app, source secrets such as the Resend API key from server-only environment
variables or a secret manager.

Resend is available as the first external delivery strategy.
For local development, select `useStrategy: "console"`.
Provider-level subjects support `{{code}}`. Provider-level body templates can
be a plain string or an object with `text` and/or `html`. Body templates support
`{{code}}`, `{{url}}`, `{{magicLink}}`, `{{expiry}}`, and `{{expiresAt}}`.
`{{url}}` and `{{magicLink}}` are aliases. `{{expiry}}` and `{{expiresAt}}`
are aliases. Transport strategies should only hold transport-specific options,
such as `strategies.resend.apiKey`.

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

Email identifiers pass through the shared auth-grade validator in
`src/42go/auth/lib/email/validation.ts` before the app-owned request and manual
code routes proceed. The validator is static/global in v1 and is safe to import
from client and server code. Invalid input receives generic failure copy only.
Do not expose account existence or provider-specific validation reasons.

Current validation policy:

- Reject malformed email syntax, quoted/IP-literal forms, missing TLDs, comma
  separated addresses, whitespace, leading/trailing local dots, and repeated
  dots.
- Reject any `+` in the local-part because major providers support plus
  subaddressing and the auth flow prefers avoiding duplicate accounts over
  accepting every technically deliverable address.
- Reject dotted local-parts for consumer Gmail domains (`gmail.com` and
  `googlemail.com`) because Google documents that dots do not change the
  mailbox for consumer Gmail.
- Reject known disposable/temporary email domains from the vendored static
  denylist.
- Do not block privacy relay or forwarding domains only because they forward
  mail. Apple private relay, Firefox Relay, DuckDuckGo Email Protection, Proton,
  and SimpleLogin-style addresses are considered real accounts unless a domain
  is explicitly added to the disposable denylist.

Primary policy references:

- Gmail dot behavior: https://support.google.com/mail/answer/7436150
- Microsoft plus addressing: https://learn.microsoft.com/en-us/exchange/recipients-in-exchange-online/plus-addressing-in-exchange-online
- Fastmail plus/subdomain addressing: https://www.fastmail.help/hc/en-us/articles/360060591053
- Proton aliases: https://proton.me/support/creating-aliases
- Yahoo disposable addresses: https://help.yahoo.com/kb/SLN36718.html
- Maintained disposable-domain lists:
  https://github.com/disposable/disposable-email-domains and
  https://github.com/disposable-email-domains/disposable-email-domains

Review the disposable-domain denylist and provider-alias assumptions
periodically. Disposable providers rotate domains, and mailbox providers change
alias behavior. A release that changes email auth should include a quick review
of `DISPOSABLE_EMAIL_DOMAINS`, Gmail/Microsoft/Fastmail/Proton/Yahoo/iCloud
policy notes, and any new LingoCafe abuse patterns.

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
