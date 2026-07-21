import React from 'react';
import { Badge } from '@twilio-paste/core/badge';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
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
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" columnGap="space30">
              <Text as="span" fontWeight="fontWeightSemibold">
                {analysisUtils.getConversationTitle(conversation)}
              </Text>
              {conversation.status && (
                <Badge as="span" variant={conversation.status === 'CLOSED' ? 'decorative20' : 'decorative10'}>
                  {conversation.status}
                </Badge>
              )}
            </Box>
            <Box display="flex" flexDirection="column" rowGap="space10" marginTop="space30">
              <Text as="span" color="colorTextWeak" fontSize="fontSize20">
                {analysisUtils.formatDateTime(conversation.createdAt)}
              </Text>
              <Text as="span" color="colorTextWeak" fontSize="fontSize20">
                {analysisUtils.getConversationPrimaryChannelId(conversation) || conversation.id}
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
