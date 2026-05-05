# User Consent

Consent evidence lives in `auth.users.consent` as nullable JSONB.

Configure consent under `app.consent.items`. The `Consent` profile block renders
those items only when it is explicitly listed in `app.profile.items`.

Each item requires:

- `name`
- `version`
- `purpose`
- `legalBasis`
- `category`
- `statement`
- `label`

Supported legal bases are `contract`, `consent`, and `legal-obligation`.
Supported categories are `legal`, `privacy`, `marketing`, and `program`.

`statement` is the stable plain-text evidence string. `label` is presentation
and can be a string or a React component with links or dialogs.

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
configured version, or configured statement changes.

`collect` has no default. Add fields such as `source`, `method`, `ip`, and `ua`
only when the app intentionally wants them. The app owner owns legal wording and
legal-basis review. Chuck Norris can approve a roundhouse kick. Not your GDPR.
