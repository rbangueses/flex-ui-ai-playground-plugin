const { formatAnalysisResult, groupOperatorResults } = require('./utils');

describe('AI Analysis Viewer utilities', () => {
  test('groupOperatorResults groups by trigger and operator display name', () => {
    const groups = groupOperatorResults([
      {
        id: 'result-1',
        outputFormat: 'CLASSIFICATION',
        dateCreated: '2026-07-21T10:00:00Z',
        operator: { id: 'op-sentiment', displayName: 'Sentiment' },
        executionDetails: { trigger: { on: 'COMMUNICATION' } },
        result: { label: 'positive' },
      },
      {
        id: 'result-2',
        outputFormat: 'TEXT',
        dateCreated: '2026-07-21T10:05:00Z',
        operator: { id: 'op-summary', displayName: 'Summary' },
        executionDetails: { trigger: { on: 'CONVERSATION_END' } },
        result: { text: 'Customer needed help.' },
      },
      {
        id: 'result-3',
        outputFormat: 'CLASSIFICATION',
        dateCreated: '2026-07-21T10:01:00Z',
        operator: { id: 'op-sentiment', displayName: 'Sentiment' },
        executionDetails: { trigger: { on: 'COMMUNICATION' } },
        result: { label: 'mixed' },
      },
    ]);

    expect(groups).toEqual([
      {
        key: 'COMMUNICATION::Sentiment',
        triggerOn: 'COMMUNICATION',
        operatorName: 'Sentiment',
        results: [
          expect.objectContaining({ id: 'result-1' }),
          expect.objectContaining({ id: 'result-3' }),
        ],
      },
      {
        key: 'CONVERSATION_END::Summary',
        triggerOn: 'CONVERSATION_END',
        operatorName: 'Summary',
        results: [expect.objectContaining({ id: 'result-2' })],
      },
    ]);
  });

  test('formatAnalysisResult returns readable values for common output shapes', () => {
    expect(formatAnalysisResult({
      outputFormat: 'CLASSIFICATION',
      result: { label: 'positive' },
    })).toBe('positive');

    expect(formatAnalysisResult({
      outputFormat: 'TEXT',
      result: { text: 'Call summary.' },
    })).toBe('Call summary.');

    expect(formatAnalysisResult({
      outputFormat: 'JSON',
      result: { score: 5, explanation: 'Great support.' },
    })).toBe('{\n  "score": 5,\n  "explanation": "Great support."\n}');
  });
});
