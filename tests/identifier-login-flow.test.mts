import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldUsePasswordForIdentifier } from '../src/42go/auth/components/login-strategies/identifier-login-flow.ts';

test('routes a non-email identifier to credentials when credentials are available', () => {
  assert.equal(
    shouldUsePasswordForIdentifier({
      emailIsValid: false,
      hasCredentials: true,
      identifier: 'admin',
    }),
    true
  );
});

test('keeps valid email identifiers on the email login path', () => {
  assert.equal(
    shouldUsePasswordForIdentifier({
      emailIsValid: true,
      hasCredentials: true,
      identifier: 'reader@example.com',
    }),
    false
  );
});

test('does not route empty identifiers or email-only apps to credentials', () => {
  assert.equal(
    shouldUsePasswordForIdentifier({
      emailIsValid: false,
      hasCredentials: true,
      identifier: '   ',
    }),
    false
  );
  assert.equal(
    shouldUsePasswordForIdentifier({
      emailIsValid: false,
      hasCredentials: false,
      identifier: 'admin',
    }),
    false
  );
});
