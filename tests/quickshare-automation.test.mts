import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import 'dotenv/config';

import quickShareDatabase from '../src/42go/db/index.ts';
import quickShareAutomationContract from '../src/lib/quickshare/server/automation-contract.ts';
import quickShareAutomationService from '../src/lib/quickshare/server/automation-service.ts';
import quickShareApiTokenStore from '../src/lib/quickshare/server/api-token-store.ts';

const { getDB } = quickShareDatabase;
const { getQuickShareAutomationDiscovery, getQuickShareAutomationOperationIds } = quickShareAutomationContract;
const {
  createQuickShareAutomationResource,
  deleteQuickShareAutomationResource,
  getQuickShareAutomationResource,
  listQuickShareAutomationResources,
  publishQuickShareAutomationResource,
  saveQuickShareAutomationResource,
  setQuickShareAutomationIdentifier,
  unpublishQuickShareAutomationResource,
} = quickShareAutomationService;
const db = getDB();
const { authenticateQuickShareApiToken, createQuickShareApiTokenCredential } = quickShareApiTokenStore;

const sourceFor = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) && 'source' in value
    ? { ...(value as { source: string }), source: 'Created by the discovery-driven workflow.' }
    : value;

describe('QuickShare automation discovery and lifecycle', () => {
  it('publishes a deterministic live contract without a second type vocabulary', () => {
    const discovery = getQuickShareAutomationDiscovery();
    assert.equal(discovery.contractVersion, '2026-08-01');
    assert.deepEqual(
      discovery.operations.map(operation => operation.id),
      getQuickShareAutomationOperationIds()
    );
    assert.equal(discovery.authentication.browserCookiesAccepted, false);
    assert.ok(discovery.resourceTypes.every(type => type.contentSchema));
    assert.ok(discovery.resourceTypes.every(type => type.available && !type.deprecated));
    assert.ok(
      discovery.templates.every(
        template => template.configuration && template.configurationSchema && template.version
      )
    );
    assert.ok(
      discovery.operations.some(
        operation => operation.id === 'resources.delete' && operation.effects.destructive
      )
    );
    assert.ok(
      discovery.operations.some(
        operation => operation.id === 'resources.unpublish' && operation.effects.disruptive
      )
    );
    const publish = discovery.operations.find(operation => operation.id === 'resources.publish');
    assert.equal(publish?.pathParameters.resourceId.format, 'uuid');
    const webPage = discovery.resourceTypes.find(type => type.id === 'web-page');
    assert.equal(webPage?.contentSchema.properties.assets.items.properties.data.pattern.length > 0, true);
  });

  it('routes discovery through the bearer-only context and never reads browser sessions', async () => {
    const [route, context] = await Promise.all([
      readFile('src/app/api/quickshare/v1/discovery/route.ts', 'utf8'),
      readFile('src/lib/quickshare/server/api-context.ts', 'utf8'),
    ]);
    assert.match(route, /withQuickShareAutomationContext/);
    assert.match(context, /request\.headers\.get\("authorization"\)/);
    assert.doesNotMatch(context, /getServerSession|cookies\(/);
  });

  it('uses one bearer-derived principal to execute every discovered resource lifecycle', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const appId = `za41-${suffix}`;
    const userId = randomUUID();
    const root = await mkdtemp(path.join(tmpdir(), 'quickshare-automation-'));
    const priorRoot = process.env.QUICKSHARE_PUBLICATION_ROOT;
    process.env.QUICKSHARE_PUBLICATION_ROOT = root;

    try {
      const credentials = await db.transaction(async transaction => {
        const now = new Date();
        await transaction('auth.users').insert({
          app_id: appId,
          id: userId,
          email: `${suffix}@quickshare.test`,
          created_at: now,
          updated_at: now,
        });
        const [account] = await transaction('quickshare.accounts')
          .insert({
            app_id: appId,
            user_id: userId,
            handle: `owner-${suffix.slice(0, 18)}`,
            normalized_handle: `owner-${suffix.slice(0, 18)}`,
          })
          .returning(['id']);
        const created = await createQuickShareApiTokenCredential(transaction, {
          appId,
          accountId: account.id,
          userId,
        });
        const authenticated = await authenticateQuickShareApiToken(
          transaction,
          appId,
          `Bearer ${created.token}`
        );
        assert.deepEqual(authenticated, { appId, accountId: account.id, userId });
        return { principal: authenticated!, token: created.token };
      });

      const { principal, token } = credentials;
      assert.equal(
        await authenticateQuickShareApiToken(db, `foreign-${appId}`, `Bearer ${token}`),
        null
      );

      const foreignUserId = randomUUID();
      const [foreignAccount] = await db('auth.users')
        .insert({
          app_id: appId,
          id: foreignUserId,
          email: `foreign-${suffix}@quickshare.test`,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning(['id']);
      const [foreignQuickShareAccount] = await db('quickshare.accounts')
        .insert({
          app_id: appId,
          user_id: foreignAccount.id,
          handle: `foreign-${suffix.slice(0, 16)}`,
          normalized_handle: `foreign-${suffix.slice(0, 16)}`,
        })
        .returning(['id']);
      const foreignPrincipal = {
        appId,
        accountId: foreignQuickShareAccount.id,
        userId: foreignUserId,
      };

      const discovery = getQuickShareAutomationDiscovery();
      const operationIds = new Set(discovery.operations.map(operation => operation.id));
      for (const operation of [
        'resources.create',
        'resources.save',
        'resources.publish',
        'resources.unpublish',
        'resources.delete',
      ]) {
        assert.ok(operationIds.has(operation));
      }

      // The test derives type, template version, and default payload solely
      // from discovery. It deliberately does not maintain an alternate list.
      for (const [index, capability] of discovery.resourceTypes.entries()) {
        const created = await createQuickShareAutomationResource(principal, {
          type: capability.id,
          title: `${capability.label} ${index}`,
          content: sourceFor(capability.defaultContent),
          ...(index === 0 ? {} : { customId: `share-${suffix.slice(0, 18)}-${index}` }),
        });
        assert.equal(created.publishedUrl, null);
        assert.ok(created.nextPublicUrl.startsWith('https://'));
        assert.deepEqual(await listQuickShareAutomationResources(foreignPrincipal), []);
        await assert.rejects(
          getQuickShareAutomationResource(foreignPrincipal, created.id),
          { code: 'resource_missing' }
        );

        const saved = await saveQuickShareAutomationResource(principal, created.id, {
          title: `${capability.label} saved`,
          content: sourceFor(capability.defaultContent),
          expectedRevision: created.revision,
        });
        assert.equal(saved.revision, created.revision + 1);

        const published = await publishQuickShareAutomationResource(principal, saved.id, {
          expectedDraftRevision: saved.currentDraftRevision,
        });
        assert.equal(published.lifecycle, 'published');
        assert.equal(published.publishedUrl, published.nextPublicUrl);

        const identifierChanged = index === 0
          ? await setQuickShareAutomationIdentifier(principal, saved.id, {
              customId: `renamed-${suffix.slice(0, 16)}`,
              expectedRevision: published.revision,
            })
          : published;
        if (index === 0) {
          assert.notEqual(identifierChanged.publishedUrl, identifierChanged.nextPublicUrl);
          const republished = await publishQuickShareAutomationResource(principal, saved.id, {
            expectedDraftRevision: saved.currentDraftRevision,
          });
          assert.equal(republished.publishedUrl, republished.nextPublicUrl);
        }

        const read = await getQuickShareAutomationResource(principal, saved.id);
        assert.equal(read.publishedUrl, read.nextPublicUrl);

        const unpublished = await unpublishQuickShareAutomationResource(principal, saved.id);
        assert.equal(unpublished.lifecycle, 'unpublished');
        assert.equal(unpublished.publishedUrl, null);

        await deleteQuickShareAutomationResource(principal, saved.id, {
          confirmation: 'delete-published',
        });
      }

      assert.deepEqual(await listQuickShareAutomationResources(principal), []);
    } finally {
      if (priorRoot === undefined) delete process.env.QUICKSHARE_PUBLICATION_ROOT;
      else process.env.QUICKSHARE_PUBLICATION_ROOT = priorRoot;
      await rm(root, { recursive: true, force: true });
      await db('quickshare.accounts').where({ app_id: appId }).delete().catch(() => undefined);
      await db('auth.users').where({ app_id: appId }).delete().catch(() => undefined);
    }
  });
});

after(async () => {
  await db.destroy();
});
