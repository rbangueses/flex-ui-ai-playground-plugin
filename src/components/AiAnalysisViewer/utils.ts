import type {
  IntelligenceConversation,
  OperatorResult,
  OperatorResultGroup,
} from './types';

function getOperatorName(result: OperatorResult): string {
  return (
    result.operator?.displayName ||
    result.operator?.id ||
    'Unknown operator'
  );
}

function getTriggerName(result: OperatorResult): string {
  return result.executionDetails?.trigger?.on || 'UNKNOWN_TRIGGER';
}

export function groupOperatorResults(results: OperatorResult[]): OperatorResultGroup[] {
  const grouped = new Map<string, OperatorResultGroup>();

  for (const result of results || []) {
    const triggerOn = getTriggerName(result);
    const operatorName = getOperatorName(result);
    const key = `${triggerOn}::${operatorName}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        triggerOn,
        operatorName,
        results: [],
      });
    }

    grouped.get(key)?.results.push(result);
  }

  return Array.from(grouped.values());
}

export function formatAnalysisResult(result: OperatorResult): string {
  const data = result?.result;
  if (!data) return JSON.stringify(result || {}, null, 2);

  if (result.outputFormat === 'CLASSIFICATION' && data.label) {
    return String(data.label);
  }

  if (result.outputFormat === 'TEXT' && data.text) {
    return String(data.text);
  }

  if (data.response) return String(data.response);
  if (data.summary) return String(data.summary);
  if (data.text) return String(data.text);
  if (data.label) return String(data.label);

  return JSON.stringify(data, null, 2);
}

export function getConversationTitle(conversation: IntelligenceConversation): string {
  return conversation.name || conversation.id;
}

export function getConversationPrimaryChannelId(conversation: IntelligenceConversation): string {
  return conversation.channelIds?.[0] || '';
}

export function formatDateTime(value?: string): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
