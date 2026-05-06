# User Consent

Consent evidence lives in `auth.users.consent` as nullable JSONB.

Configure consent under `app.consent.items`. The `Consent` profile block renders
those items only when it is explicitly listed in `app.profile.items`.

Each item requires:

- `name`
- `version`
- `label`

`label` is the consent statement. When it is a string, it is rendered in the UI
and converted to plain text for the stable evidence statement. String labels
support basic presentation markdown: `**bold**`, `__bold__`, `*italic*`,
`_italic_`, and `\n` line breaks.

String labels may include markdown links. Links always open in a new tab:

```ts
{
  name: "terms",
  required: true,
  version: "terms-2026-05-05",
  label: "I accept the [**Terms**](/terms)",
}
```

Rendered links affect only UI; evidence stores the plain label text as the
statement.

Evidence is stored as history arrays:

```json
{
  "terms": [
    {
      "value": true,
      "changedAt": "2026-05-05T12:00:00.000Z",
      "version": "terms-2026-05-05",
      "statement": "I accept the Terms and Conditions",
      "source": "profile",
      "method": "checkbox-submit"
    }
  ]
}
```

The last array item is the current value. A new entry is appended when the value,
configured version, or plain label statement changes.

`collect` has no default. Add fields such as `source`, `method`, `ip`, and `ua`
only when the app intentionally wants them. The app owner owns legal wording and
legal-basis review. Chuck Norris can approve a roundhouse kick. Not your GDPR.
