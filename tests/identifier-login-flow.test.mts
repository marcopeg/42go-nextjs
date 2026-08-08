import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIdentifierCancelTabIndex,
  getIndexedTabIndex,
  shouldUsePasswordForIdentifier,
} from '../src/42go/auth/components/login-strategies/identifier-login-flow.ts';

test('keeps login controls in one explicit keyboard sequence', () => {
  assert.equal(getIndexedTabIndex(4, 0), 4);
  assert.equal(getIndexedTabIndex(4, 1), 5);
  assert.equal(getIndexedTabIndex(4, 2), 6);
  assert.equal(getIndexedTabIndex(4, 3), 7);
  assert.equal(getIndexedTabIndex(0, 3), undefined);
});

test('places Cancel after the available identifier actions', () => {
  assert.equal(
    getIdentifierCancelTabIndex({
      baseTabIndex: 4,
      hasCredentials: false,
      step: 'identifier',
    }),
    6
  );
  assert.equal(
    getIdentifierCancelTabIndex({
      baseTabIndex: 4,
      hasCredentials: true,
      step: 'identifier',
    }),
    7
  );
  assert.equal(
    getIdentifierCancelTabIndex({
      baseTabIndex: 4,
      hasCredentials: true,
      step: 'password',
    }),
    7
  );
  assert.equal(
    getIdentifierCancelTabIndex({
      baseTabIndex: 4,
      hasCredentials: false,
      step: 'code',
    }),
    7
  );
});

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
