# User Profile

Core user profile data lives in `auth.users.profile` as nullable JSONB.

Use `src/42go/profile/server.ts` from server code:

- `loadProfile({ userId, appId, config })`
- `saveProfile({ userId, appId, profile, consent, config })`
- `validateProfileData(profile, config)`
- `getProfileKeys({ userId, appId, keys, config })`
- `setProfileKey({ userId, appId, key, value, config })`
- `setProfileKeys({ userId, appId, values, config })`

Writes reject non-object profile values and run AJV validation when
`app.profile.schema` exists. `setProfileKey()` rejects `undefined`; explicit
delete semantics are not part of this contract.

The HTTP route is `/api/profile`. It is protected by `api:profile` and an
authenticated session. Do not trust client-supplied user ids.

Profile JSON uses camelCase keys. Unknown keys are allowed unless the app schema
sets `additionalProperties: false`.
