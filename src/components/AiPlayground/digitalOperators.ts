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

  // The Intelligence API returns results newest-first; OperatorResultCard
  // treats the last item in `items` as the latest, so sort ascending here.
  const sorted = [...results].sort(
    (a, b) => new Date(a.dateCreated || 0).getTime() - new Date(b.dateCreated || 0).getTime(),
  );

  for (const result of sorted) {
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
