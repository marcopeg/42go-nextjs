---
title: Authentication
---

# Authentication

42Go authentication is configured per app through `AppConfig.auth.providers`.
Each app can enable credentials, OAuth providers, email magic links, or a mix.

```ts
auth: {
  providers: [
    { type: "credentials", config: {} },
    {
      type: "google",
      config: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        prompt: "select_account",
      },
    },
  ],
}
```

The active app is resolved from the request before authentication runs. Users,
OAuth accounts, roles, grants, and email verification tokens are scoped to the
resolved app ID.

## Provider Types

### Credentials

Credentials login uses `auth.users` and checks the submitted username or email
against the current app.

```ts
{
  type: "credentials",
  config: {},
}
```

Seed users in development include `john` / `john` and `jane` / `jane`.

### Google

```ts
{
  type: "google",
  config: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    prompt: "select_account",
  },
}
```

### GitHub

```ts
{
  type: "github",
  config: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
}
```

### Email Magic Link and Code

Email authentication sends both a magic link and a numeric code. The user can
click the link or enter the code. The verified flow creates a user for the
current app if one does not already exist.

Before a magic-link request starts, 42Go validates the submitted email address
with a shared static validator. The same validator is used by the login UI and
the app-owned email auth API routes. If the address is not accepted, the UI and
API return generic invalid-email copy. They do not explain whether the address
was rejected because of syntax, alias behavior, or a temporary-email domain.

```ts
{
  // Enables the passwordless email provider for this app.
  type: "email",
  config: {
    // Selects which delivery strategy key to use from config.strategies.
    // Supported today: "console" and "resend".
    // "console" prints the code/link to server logs.
    // "resend" sends real email through the Resend HTTP API.
    useStrategy: "resend",

    // Sender address shown in the email.
    // For Resend production delivery, this must belong to a verified domain.
    // Example: "LingoCafe <login@auth.lingocafe.app>"
    from: "LingoCafe <login@auth.lingocafe.app>",

    // Optional subject template shared by every delivery strategy.
    // Use {{code}} to include the generated sign-in code.
    subject: "{{code}} is your sign-in code",

    // Optional body template shared by every delivery strategy.
    // A string is sent as the plain-text body.
    // Supported placeholders: {{code}}, {{url}}, {{magicLink}},
    // {{expiry}}, and {{expiresAt}}.
    body: "code: {{code}}\n\nlink: {{url}}\n\nThis code will expire at {{expiry}}.",

    // Controls the human-entered code that is included in the email.
    code: {
      // Number of characters in the delivered code.
      // Default recommendation: 6.
      length: 6,

      // Character family used for generated codes.
      // Supported values:
      // - "digits": 0-9
      // - "alphabet": letters
      // - "alphanumeric": letters and digits
      // - "complex": letters, digits, and symbols
      mode: "digits",

      // When false, alphabetic codes are normalized to lowercase.
      // Digits are unaffected.
      caseSensitive: false,

      // How long the delivered code and magic link remain valid.
      // Supported format: positive integer plus unit.
      // Supported units: "s" seconds, "m" minutes, "h" hours.
      // Examples: "30s", "5m", "1h".
      // Plain numbers such as "4" are invalid and fail at startup.
      duration: "5m",
    },

    // Controls how often a user may request or resend an email.
    // This does not change how long a code remains valid.
    throttle: {
      // Progressive cooldown sequence between allowed requests.
      // The first value is stored after the first email is sent, so it gates
      // the first resend request. The second value gates the next resend.
      // The final value is reused for all later attempts.
      // If omitted, defaults to ["30s", "1m", "2m", "3m", "5m", "10m"].
      delay: ["30s", "1m", "2m", "3m", "5m", "10m"],

      // Safe user-facing message shown when a request is throttled.
      // Do not reveal whether the email belongs to an existing account.
      message: "Wait before requesting another sign-in email.",
    },

    // Login-page copy for this provider.
    ui: {
      // Text for the primary email action.
      primaryActionLabel: "Send me a magic link",
    },

    // Available delivery strategies for this app.
    // useStrategy selects one of these keys.
    strategies: {
      // Production strategy using Resend.
      // The type field is required because it selects the implementation.
      resend: {
        type: "resend",

        // Server-only Resend API key.
        apiKey: "re_...",
      },
    },
  },
}
```

`code.duration` and `throttle.delay` control different things.

`code.duration` is the lifetime of one generated code or magic link. If it is
`"5m"`, the user has 5 minutes to use that specific login secret. After that,
the stored token cannot create a session.

`throttle.delay` is the resend cooldown sequence for the same app and email
address. With `["30s", "1m", "2m", "3m", "5m", "10m"]`, the user waits
30 seconds before the first resend, 1 minute before the next resend, and then
continues through the configured sequence. The last value is reused after the
sequence is exhausted.

## Email Address Acceptance Policy

The email validator is intentionally strict because email magic-link login can
create a new app-scoped user after verification.

Accepted addresses must have normal mailbox syntax, a real-looking domain, and
a normal top-level domain. The validator rejects comma-separated addresses,
whitespace, missing TLDs, quoted local-parts, IP-literal domains, leading or
trailing local dots, repeated dots, plus-address aliases, known disposable
email domains, and consumer Gmail dotted variants such as
`first.last@gmail.com`.

Consumer Gmail dots are rejected because Google documents that dots do not
change the mailbox for `gmail.com` addresses. Plus-addresses are rejected
globally because major providers support plus addressing and the auth policy
prioritizes avoiding duplicate accounts. Examples:

- Accepted: `marco@gmail.com`
- Rejected: `marco+demo@gmail.com`
- Rejected: `mar.co@gmail.com`
- Rejected: `reader@mailinator.com`

Privacy forwarding services are allowed in v1. Apple private relay, Firefox
Relay, DuckDuckGo Email Protection, Proton, and SimpleLogin-style addresses are
treated as real accounts unless a specific domain is added to the disposable
denylist.

The disposable-domain denylist is static and must be reviewed periodically.
Disposable email providers rotate domains often, and provider alias behavior
can change. During authentication maintenance, review
`src/42go/auth/lib/email/validation.ts` against current provider docs and
maintained disposable-domain lists such as:

- Google Gmail dots: https://support.google.com/mail/answer/7436150
- Microsoft plus addressing: https://learn.microsoft.com/en-us/exchange/recipients-in-exchange-online/plus-addressing-in-exchange-online
- Fastmail plus/subdomain addressing: https://www.fastmail.help/hc/en-us/articles/360060591053
- Proton aliases: https://proton.me/support/creating-aliases
- Yahoo disposable addresses: https://help.yahoo.com/kb/SLN36718.html
- Disposable domain lists: https://github.com/disposable/disposable-email-domains and https://github.com/disposable-email-domains/disposable-email-domains

The default selected strategy is `console`. It prints the rendered email to
server logs and is useful in local development. The log includes `FROM`, `TO`,
`SUBJECT`, and `BODY`. It is allowed in production only when selected by
configuration, but it exposes login secrets to logs.
The example above uses inline values to show the final AppConfig shape. In a
real app, source secrets such as `apiKey` from server-only environment
variables or your secret manager.
Use `{{code}}` for subject templates. Body templates support `{{code}}`,
`{{url}}`, `{{magicLink}}`, `{{expiry}}`, and `{{expiresAt}}`. `{{url}}` and
`{{magicLink}}` are the same value. `{{expiry}}` and `{{expiresAt}}` are the
same ISO timestamp. The `console` strategy is always available, even when it is
not listed in `strategies`.

For rich email bodies, provide text and/or HTML templates:

```ts
body: {
  text: [
    "Your sign-in code is {{code}}.",
    "Magic link: {{url}}",
    "Expires: {{expiry}}",
  ].join("\n"),
  html: [
    "<p>Your sign-in code is <strong>{{code}}</strong>.</p>",
    '<p><a href="{{url}}">Sign in with this magic link</a></p>',
    "<p>This request expires at {{expiry}}.</p>",
  ].join(""),
}
```

## Production Email With Resend

Resend is the first external delivery strategy supported by 42Go email auth.
The implementation sends directly to the Resend HTTP API.

Useful Resend references:

- [Managing Domains](https://resend.com/docs/dashboard/domains/introduction)
- [API Keys](https://resend.com/docs/dashboard/api-keys/introduction)
- [Send Email API](https://resend.com/docs/api-reference/emails)
- [API key handling](https://resend.com/docs/knowledge-base/how-to-handle-api-keys)

### 1. Verify a Sending Domain

In Resend, add a domain or subdomain. Resend recommends using a subdomain such
as `auth.example.com` or `updates.example.com` to isolate sending reputation.

Add the DNS records shown by Resend:

- SPF
- DKIM

DMARC is optional, but recommended for production trust.

### 2. Create an API Key

Create a Resend API key with sending access. Store it only in server
environment variables.

### 3. Configure AppConfig

Use an address from the verified Resend domain and select the `resend` strategy.
The example uses inline values to show the final shape. Source secrets from
server-only environment variables or your secret manager in production.

```ts
{
  type: "email",
  config: {
    from: "LingoCafe <login@auth.lingocafe.app>",
    subject: "{{code}} is your sign-in code",
    body: "code: {{code}}\n\nlink: {{url}}\n\nThis code will expire at {{expiry}}.",
    useStrategy: "resend",
    // code, throttle, and ui may be omitted to use the defaults documented above.
    strategies: {
      resend: {
        type: "resend",
        apiKey: "re_...",
      },
    },
  },
}
```

For local development, select the console strategy and keep the same strategy
map:

```ts
{
  type: "email",
  config: {
    from: "LingoCafe <login@auth.lingocafe.app>",
    subject: "{{code}} is your sign-in code",
    body: "code: {{code}}\n\nlink: {{url}}\n\nThis code will expire at {{expiry}}.",
    useStrategy: "console",
    strategies: {
      resend: {
        type: "resend",
        apiKey: "re_...",
      },
    },
  },
}
```

### 4. Configure Auth Secret

Email token hashes and NextAuth JWT sessions require a stable secret.

```bash
AUTH_SECRET="long-random-secret"
```

Use `AUTH_SECRET` only in this repository.
Do not configure a static auth URL for normal deployments. The auth route
derives the public origin from the request host and forwarded protocol so each
app can run on its own domain.

### 5. Test the Flow

1. Start the app.
2. Open the app login page.
3. Enter an email address.
4. Click `Send me a magic link`.
5. Confirm the email arrives.
6. Sign in with either the link or code.
7. Try using the same link or code again. It must fail because the token is
   burned on first use.

## Security Model

Verification tokens are stored in `auth.verification_tokens` with:

```sql
PRIMARY KEY (app_id, identifier, token)
```

The stored token is a hash of the delivered code plus the auth secret. Raw
codes are not stored.

Token consumption requires all of:

- current app ID
- normalized email identifier
- hashed token

The consume operation deletes the token with `DELETE ... RETURNING`, so a valid
code or link can be used only once.

Expired unused tokens cannot sign in because NextAuth checks expiration.

## Cleanup

Used tokens are deleted immediately when consumed.

Expired unused tokens can remain until a maintenance cleanup removes them. Avoid
deleting expired tokens on every auth request because that creates needless dead
tuples and autovacuum work. Prefer a scheduled cleanup with a grace window:

```sql
DELETE FROM auth.verification_tokens
WHERE expires < now() - interval '24 hours';
```

## UI Behavior

When both credentials and email auth are enabled, the login screen shows:

1. one username/email field
2. a primary email action, configurable with `ui.primaryActionLabel`
3. a link-style `Continue with password` action

When only email auth is enabled, the password action is hidden.

When only credentials auth is enabled, the screen shows username and password
fields.

## Event Names

Email auth emits event names that match the 42Go event validator:

- `auth.email.requested`
- `auth.email.resent`
- `auth.email.code-verified`
- `auth.email.login-failed`
