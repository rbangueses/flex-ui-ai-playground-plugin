type TaskLike = {
  taskChannelUniqueName?: string;
  channelType?: string;
  attributes?: Record<string, any>;
};

export type AiPlaygroundTaskIdentity = {
  kind: 'voice' | 'digital';
  key: string;
  channelId: string;
  candidates: string[];
};

const DIGITAL_CHANNEL_NAMES = new Set([
  'chat',
  'webchat',
  'sms',
  'whatsapp',
  'messaging',
  'email',
]);

const DIGITAL_ATTRIBUTE_KEYS = [
  'conversationSid',
  'conversation_sid',
  'channelSid',
  'channel_sid',
  'channelId',
  'channel_id',
  'chatChannelSid',
  'chat_channel_sid',
  'flexInteractionChannelSid',
  'interactionChannelSid',
];

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function unique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

export function getVoiceCallSid(task?: TaskLike): string | undefined {
  return readString(task?.attributes?.call_sid);
}

export function getDigitalChannelCandidates(task?: TaskLike): string[] {
  const attributes = task?.attributes || {};
  return unique(DIGITAL_ATTRIBUTE_KEYS.map((key) => readString(attributes[key])));
}

export function isDigitalTask(task?: TaskLike): boolean {
  const channelName = readString(task?.taskChannelUniqueName || task?.channelType)?.toLowerCase();
  return Boolean(
    !getVoiceCallSid(task) &&
    (
      getDigitalChannelCandidates(task).length > 0 ||
      (channelName && DIGITAL_CHANNEL_NAMES.has(channelName))
    ),
  );
}

export function getAiPlaygroundTaskIdentity(task?: TaskLike): AiPlaygroundTaskIdentity | null {
  const callSid = getVoiceCallSid(task);
  if (callSid) {
    return {
      kind: 'voice',
      key: callSid,
      channelId: callSid,
      candidates: [callSid],
    };
  }

  const candidates = getDigitalChannelCandidates(task);
  if (!isDigitalTask(task) || candidates.length === 0) {
    return null;
  }

  return {
    kind: 'digital',
    key: candidates[0],
    channelId: candidates[0],
    candidates,
  };
}
