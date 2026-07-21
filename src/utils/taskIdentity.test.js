const {
  getAiPlaygroundTaskIdentity,
  getDigitalChannelCandidates,
  getVoiceCallSid,
  isDigitalTask,
} = require('./taskIdentity');

describe('task identity helpers', () => {
  test('getVoiceCallSid returns the call SID from task attributes', () => {
    expect(getVoiceCallSid({
      attributes: {
        call_sid: 'CA123',
        channelSid: 'CH123',
      },
    })).toBe('CA123');
  });

  test('getDigitalChannelCandidates returns deduped channel candidates in priority order', () => {
    const candidates = getDigitalChannelCandidates({
      attributes: {
        conversationSid: 'CH_CONVERSATION',
        channelSid: 'CH_CHANNEL',
        channel_sid: 'CH_CHANNEL',
        flexInteractionChannelSid: 'UO_CHANNEL',
        nested: {
          channelSid: 'IGNORED',
        },
      },
    });

    expect(candidates).toEqual([
      'CH_CONVERSATION',
      'CH_CHANNEL',
      'UO_CHANNEL',
    ]);
  });

  test('getAiPlaygroundTaskIdentity prefers voice when call_sid is present', () => {
    expect(getAiPlaygroundTaskIdentity({
      attributes: {
        call_sid: 'CA123',
        conversationSid: 'CH123',
      },
    })).toEqual({
      kind: 'voice',
      key: 'CA123',
      channelId: 'CA123',
      candidates: ['CA123'],
    });
  });

  test('getAiPlaygroundTaskIdentity returns digital identity for chat-like tasks', () => {
    const task = {
      taskChannelUniqueName: 'chat',
      attributes: {
        conversationSid: 'CH123',
      },
    };

    expect(isDigitalTask(task)).toBe(true);
    expect(getAiPlaygroundTaskIdentity(task)).toEqual({
      kind: 'digital',
      key: 'CH123',
      channelId: 'CH123',
      candidates: ['CH123'],
    });
  });

  test('getAiPlaygroundTaskIdentity supports custom digital task channels with channel IDs', () => {
    expect(getAiPlaygroundTaskIdentity({
      taskChannelUniqueName: 'customer_support',
      attributes: {
        channelSid: 'CH_CUSTOM',
      },
    })).toEqual({
      kind: 'digital',
      key: 'CH_CUSTOM',
      channelId: 'CH_CUSTOM',
      candidates: ['CH_CUSTOM'],
    });
  });
});
