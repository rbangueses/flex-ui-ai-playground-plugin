const {
  getDigitalOperatorGroups,
  mapIntelligenceResultToPlaygroundResult,
} = require('./digitalOperators');

describe('digital operator helpers', () => {
  test('mapIntelligenceResultToPlaygroundResult keeps fields used by OperatorResultCard', () => {
    expect(mapIntelligenceResultToPlaygroundResult({
      id: 'result-1',
      outputFormat: 'TEXT',
      dateCreated: '2026-07-21T10:00:00Z',
      operator: {
        id: 'operator-1',
        displayName: 'Summary',
      },
      result: {
        text: 'Customer asked for help.',
      },
    })).toEqual({
      id: 'result-1',
      operatorSid: 'operator-1',
      displayName: 'Summary',
      outputFormat: 'TEXT',
      result: {
        text: 'Customer asked for help.',
      },
      timestamp: '2026-07-21T10:00:00Z',
    });
  });

  test('getDigitalOperatorGroups filters by trigger and groups by operator name', () => {
    const groups = getDigitalOperatorGroups([
      {
        id: 'result-1',
        outputFormat: 'CLASSIFICATION',
        dateCreated: '2026-07-21T10:00:00Z',
        operator: { id: 'sentiment', displayName: 'Sentiment' },
        executionDetails: { trigger: { on: 'COMMUNICATION' } },
        result: { label: 'positive' },
      },
      {
        id: 'result-2',
        outputFormat: 'TEXT',
        dateCreated: '2026-07-21T10:05:00Z',
        operator: { id: 'summary', displayName: 'Summary' },
        executionDetails: { trigger: { on: 'CONVERSATION_END' } },
        result: { text: 'Finished.' },
      },
      {
        id: 'result-3',
        outputFormat: 'CLASSIFICATION',
        dateCreated: '2026-07-21T10:01:00Z',
        operator: { id: 'sentiment', displayName: 'Sentiment' },
        executionDetails: { trigger: { on: 'COMMUNICATION' } },
        result: { label: 'mixed' },
      },
    ], 'COMMUNICATION');

    expect(groups).toEqual([
      {
        key: 'Sentiment',
        displayName: 'Sentiment',
        items: [
          expect.objectContaining({ id: 'result-1' }),
          expect.objectContaining({ id: 'result-3' }),
        ],
      },
    ]);
  });
});
