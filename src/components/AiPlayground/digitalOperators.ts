import type { OperatorResult as IntelligenceOperatorResult } from '../AiAnalysisViewer/types';
import type { OperatorResult } from './types';

export type DigitalOperatorGroup = {
  key: string;
  displayName: string;
  items: OperatorResult[];
};

function getOperatorDisplayName(result: IntelligenceOperatorResult): string {
  return result.operator?.displayName || result.operator?.id || 'Unknown operator';
}

export function mapIntelligenceResultToPlaygroundResult(
  result: IntelligenceOperatorResult,
): OperatorResult {
  return {
    id: result.id,
    operatorSid: result.operator?.id,
    displayName: getOperatorDisplayName(result),
    outputFormat: result.outputFormat,
    result: result.result,
    timestamp: result.dateCreated,
  };
}

export function getDigitalOperatorGroups(
  results: IntelligenceOperatorResult[],
  triggerOn: string,
): DigitalOperatorGroup[] {
  const grouped = new Map<string, DigitalOperatorGroup>();

  for (const result of results) {
    if (result.executionDetails?.trigger?.on !== triggerOn) continue;

    const displayName = getOperatorDisplayName(result);
    if (!grouped.has(displayName)) {
      grouped.set(displayName, {
        key: displayName,
        displayName,
        items: [],
      });
    }

    grouped.get(displayName)?.items.push(mapIntelligenceResultToPlaygroundResult(result));
  }

  return Array.from(grouped.values());
}
