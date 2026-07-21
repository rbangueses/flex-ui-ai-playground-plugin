import React from 'react';
import { Badge } from '@twilio-paste/core/badge';
import { Box } from '@twilio-paste/core/box';
import { Text } from '@twilio-paste/core/text';
import { IntelligenceConversation } from './types';
import * as analysisUtils from './utils';

interface ConversationListProps {
  conversations: IntelligenceConversation[];
  selectedConversationId?: string;
  onSelect: (conversation: IntelligenceConversation) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelect,
}) => {
  if (conversations.length === 0) {
    return (
      <Box padding="space60">
        <Text as="p" color="colorTextWeak">No conversations found.</Text>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" rowGap="space30">
      {conversations.map((conversation) => {
        const selected = conversation.id === selectedConversationId;
        const title = analysisUtils.getConversationTitle(conversation);
        const channelId = analysisUtils.getConversationPrimaryChannelId(conversation) || conversation.id;

        return (
          <Box
            key={conversation.id}
            as="button"
            type="button"
            onClick={() => onSelect(conversation)}
            padding="space40"
            textAlign="left"
            borderWidth="borderWidth10"
            borderStyle="solid"
            borderColor={selected ? 'colorBorderPrimary' : 'colorBorderWeaker'}
            borderRadius="borderRadius20"
            backgroundColor={selected ? 'colorBackgroundPrimaryWeakest' : 'colorBackgroundBody'}
            cursor="pointer"
            width="100%"
            overflow="hidden"
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" columnGap="space30">
              <Box minWidth="0" flex="1">
                <Text
                  as="span"
                  display="block"
                  fontWeight="fontWeightSemibold"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={title}
                >
                  {title}
                </Text>
              </Box>
              {conversation.status && (
                <Box flexShrink={0}>
                  <Badge as="span" variant={conversation.status === 'CLOSED' ? 'decorative20' : 'decorative10'}>
                    {conversation.status}
                  </Badge>
                </Box>
              )}
            </Box>
            <Box display="flex" flexDirection="column" rowGap="space10" marginTop="space30">
              <Text as="span" color="colorTextWeak" fontSize="fontSize20">
                {analysisUtils.formatDateTime(conversation.createdAt)}
              </Text>
              <Text
                as="span"
                color="colorTextWeak"
                display="block"
                fontSize="fontSize20"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                title={channelId}
              >
                {channelId}
              </Text>
              <Box display="flex" columnGap="space20" flexWrap="wrap">
                {(conversation.channels || []).map((channel) => (
                  <Badge key={channel} as="span" variant="neutral">
                    {channel}
                  </Badge>
                ))}
                {conversation.operatorResultIds && (
                  <Badge as="span" variant="decorative30">
                    {conversation.operatorResultIds.length} results
                  </Badge>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ConversationList;
