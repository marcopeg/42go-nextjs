import 'server-only';

import { z } from 'zod';

import { QuickShareCompilationError } from '@/lib/quickshare/server/resource-compiler';
import { QuickShareDomainError } from '@/lib/quickshare/server/account-service';
import {
  isQuickShareApiContext,
  loadQuickShareApiContext,
  type QuickShareApiContext,
} from '@/lib/quickshare/server/api-context';
import { quickShareApiError } from '@/lib/quickshare/server/api-response';

export const quickShareAutomationPolicy = {
  require: { feature: 'api:quickshare' },
} as const;

export const quickShareAutomationFailure = (error: unknown): Response => {
  if (error instanceof QuickShareDomainError)
    return quickShareApiError(error.status, error.code, error.message);
  if (error instanceof QuickShareCompilationError)
    return Response.json(
      { error: error.code, message: error.message, location: error.location },
      { status: 422, headers: { 'Cache-Control': 'no-store' } }
    );
  if (error instanceof z.ZodError)
    return quickShareApiError(
      422,
      'invalid_payload',
      error.issues[0]?.message ?? 'Invalid request payload.'
    );
  console.error('QuickShare automation API error', error);
  return quickShareApiError(500, 'quickshare_error', 'QuickShare could not complete that request.');
};

export const withQuickShareAutomationContext = async (
  request: Request,
  action: (context: QuickShareApiContext) => Promise<Response>
) => {
  const context = await loadQuickShareApiContext(request);
  if (!isQuickShareApiContext(context)) return context;
  try {
    return await action(context);
  } catch (error) {
    return quickShareAutomationFailure(error);
  }
};

export const parseQuickShareAutomationJson = async (request: Request): Promise<unknown> => {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) throw new z.ZodError([]);
  return body;
};
