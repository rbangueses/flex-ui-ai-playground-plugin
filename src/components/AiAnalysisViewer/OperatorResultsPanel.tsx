import React from 'react';
import { Alert } from '@twilio-paste/core/alert';
import { Badge } from '@twilio-paste/core/badge';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { Spinner } from '@twilio-paste/core/spinner';
import { Text } from '@twilio-paste/core/text';
import { IntelligenceConversation, OperatorResult, OperatorResultGroup } from './types';
import * as analysisUtils from './utils';

interface OperatorResultsPanelProps {
  conversation: IntelligenceConversation | null;
  loading: boolean;
  error: string | null;
  results: OperatorResult[];
}

const OperatorResultsPanel: React.FC<OperatorResultsPanelProps> = ({
  conversation,
  loading,
  error,
  results,
}) => {
  if (!conversation) {
    return (
      <Box padding="space60">
        <Text as="p" color="colorTextWeak">Select a conversation.</Text>
      </Box>
    );
  }

  const groups = analysisUtils.groupOperatorResults(results) as OperatorResultGroup[];
  const conversationTitle = conversation.name || conversation.id;

  return (
    <Box padding="space50" overflowX="hidden" overflowY="auto" height="100%" minWidth="0">
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" columnGap="space40">
        <Box minWidth="0" flex="1">
          <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={conversationTitle}>
            <Heading as="h3" variant="heading30" marginBottom="space0">
              {conversationTitle}
            </Heading>
          </Box>
          <Text as="p" color="colorTextWeak" marginBottom="space20">
            {analysisUtils.formatDateTime(conversation.createdAt)}
          </Text>
        </Box>
        {conversation.status && (
          <Box flexShrink={0}>
            <Badge as="span" variant="decorative20">
              {conversation.status}
            </Badge>
          </Box>
        )}
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" padding="space80">
          <Spinner decorative={false} title="Loading operator results" />
        </Box>
      )}

      {error && (
        <Alert variant="error">
          <Text as="span">{error}</Text>
        </Alert>
      )}

      {!loading && !error && groups.length === 0 && (
        <Box paddingY="space80">
          <Text as="p" color="colorTextWeak">No operator results found.</Text>
        </Box>
      )}

      {!loading && !error && groups.length > 0 && (
        <Box display="flex" flexDirection="column" rowGap="space50">
          {groups.map((group) => (
            <Box
              key={group.key}
              borderWidth="borderWidth10"
              borderStyle="solid"
              borderColor="colorBorderWeaker"
              borderRadius="borderRadius20"
              padding="space50"
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="space40">
                <Box display="flex" alignItems="center" columnGap="space30">
                  <Heading as="h4" variant="heading40" marginBottom="space0">
                    {group.operatorName}
                  </Heading>
                  <Badge as="span" variant="decorative10">
                    {group.triggerOn}
                  </Badge>
                </Box>
                <Text as="span" color="colorTextWeak" fontSize="fontSize20">
                  {group.results.length} result{group.results.length === 1 ? '' : 's'}
                </Text>
              </Box>

              <Box display="flex" flexDirection="column" rowGap="space40">
                {group.results.map((result, index) => (
                  <Box
                    key={result.id || `${group.key}-${index}`}
                    backgroundColor="colorBackground"
                    borderWidth="borderWidth10"
                    borderStyle="solid"
                    borderColor="colorBorderWeak"
                    borderRadius="borderRadius20"
                    padding="space40"
                  >
                    <Box display="flex" justifyContent="space-between" columnGap="space30" marginBottom="space30">
                      <Box display="flex" columnGap="space20" alignItems="center" minWidth="0" flex="1">
                        {result.outputFormat && (
                          <Badge as="span" variant="neutral">
                            {result.outputFormat}
                          </Badge>
                        )}
                        <Text as="span" color="colorTextWeak" fontSize="fontSize20">
                          {analysisUtils.formatDateTime(result.dateCreated)}
                        </Text>
                      </Box>
                      {result.id && (
                        <Box minWidth="0" maxWidth="size40" overflow="hidden" textOverflow="ellipsis" title={result.id} whiteSpace="nowrap">
                          <Text as="span" color="colorTextWeak" display="block" fontSize="fontSize20">
                            {result.id}
                          </Text>
                        </Box>
                      )}
                    </Box>
                    <Text
                      as="pre"
                      fontFamily={result.outputFormat === 'JSON' ? 'fontFamilyCode' : 'fontFamilyText'}
                      fontSize="fontSize30"
                      whiteSpace="pre-wrap"
                      wordBreak="break-word"
                      marginBottom="space0"
                    >
                      {analysisUtils.formatAnalysisResult(result)}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default OperatorResultsPanel;
