import * as Flex from '@twilio/flex-ui';
import {
  ConversationFilters,
  IntelligenceConversation,
  OperatorResult,
  OperatorResultFilters,
  PaginatedResponse,
} from './types';

const SERVERLESS_DOMAIN = process.env.FLEX_APP_SERVERLESS_DOMAIN || '';
const PROXY_URL = `https://${SERVERLESS_DOMAIN}/memoryProxy`;

async function callMemoryProxy<T>(params: Record<string, string | number | undefined>): Promise<T> {
  if (!SERVERLESS_DOMAIN) {
    throw new Error('FLEX_APP_SERVERLESS_DOMAIN is not configured');
  }

  const token = Flex.Manager.getInstance().user.token;
  const body = new URLSearchParams();
  body.set('Token', token);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      body.set(key, String(value));
    }
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `memoryProxy returned ${response.status}`);
  }

  return payload;
}

export async function listConversations(
  filters: ConversationFilters,
): Promise<PaginatedResponse<IntelligenceConversation>> {
  return callMemoryProxy<PaginatedResponse<IntelligenceConversation>>({
    action: 'listConversations',
    pageSize: filters.pageSize ?? 25,
    pageToken: filters.pageToken,
    createdAtAfter: filters.createdAtAfter,
    createdAtBefore: filters.createdAtBefore,
    status: filters.status,
    channelId: filters.channelId,
    channels: filters.channels,
    conversationConfigurationId: filters.conversationConfigurationId,
    intelligenceConfigurationIds: filters.intelligenceConfigurationIds,
    operatorIds: filters.operatorIds,
  });
}

export async function getConversation(conversationId: string): Promise<IntelligenceConversation> {
  return callMemoryProxy<IntelligenceConversation>({
    action: 'getConversation',
    conversationId,
  });
}

export async function listOperatorResults(
  filters: OperatorResultFilters,
): Promise<PaginatedResponse<OperatorResult>> {
  return callMemoryProxy<PaginatedResponse<OperatorResult>>({
    action: 'listOperatorResults',
    conversationId: filters.conversationId,
    intelligenceConfigurationId: filters.intelligenceConfigurationId,
    operatorId: filters.operatorId,
    pageSize: filters.pageSize ?? 100,
    pageToken: filters.pageToken,
  });
}
