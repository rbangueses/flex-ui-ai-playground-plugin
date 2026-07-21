import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@twilio-paste/core/alert';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Heading } from '@twilio-paste/core/heading';
import { Spinner } from '@twilio-paste/core/spinner';
import { Text } from '@twilio-paste/core/text';
import { listConversations, listOperatorResults } from './api';
import ConversationFilters from './ConversationFilters';
import ConversationList from './ConversationList';
import OperatorResultsPanel from './OperatorResultsPanel';
import {
  ConversationFilters as ConversationFiltersState,
  IntelligenceConversation,
  OperatorResult,
} from './types';

const DEFAULT_FILTERS: ConversationFiltersState = {
  status: 'CLOSED',
  channels: 'VOICE',
  pageSize: 25,
};

const AiAnalysisViewer: React.FC = () => {
  const [filters, setFilters] = useState<ConversationFiltersState>(DEFAULT_FILTERS);
  const [conversations, setConversations] = useState<IntelligenceConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IntelligenceConversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [tokenHistory, setTokenHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const [operatorResults, setOperatorResults] = useState<OperatorResult[]>([]);
  const [operatorLoading, setOperatorLoading] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (pageToken?: string, nextPageIndex = 0) => {
    setConversationLoading(true);
    setConversationError(null);

    try {
      const response = await listConversations({
        ...filters,
        pageToken,
      });
      const items = response.items || response.conversations || [];
      setConversations(items);
      setNextToken(response.meta?.nextToken);
      setPageIndex(nextPageIndex);

      if (items.length > 0) {
        const stillSelected = selectedConversation
          ? items.find((conversation) => conversation.id === selectedConversation.id)
          : null;
        setSelectedConversation(stillSelected || items[0]);
      } else {
        setSelectedConversation(null);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setConversationError(err.message);
      setConversations([]);
      setSelectedConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }, [filters, selectedConversation]);

  const runSearch = useCallback(() => {
    setTokenHistory([undefined]);
    fetchConversations(undefined, 0);
  }, [fetchConversations]);

  const fetchNext = useCallback(() => {
    if (!nextToken) return;
    const nextIndex = pageIndex + 1;
    setTokenHistory((prev) => {
      const updated = prev.slice(0, nextIndex);
      updated[nextIndex] = nextToken;
      return updated;
    });
    fetchConversations(nextToken, nextIndex);
  }, [fetchConversations, nextToken, pageIndex]);

  const fetchPrevious = useCallback(() => {
    if (pageIndex === 0) return;
    const previousIndex = pageIndex - 1;
    fetchConversations(tokenHistory[previousIndex], previousIndex);
  }, [fetchConversations, pageIndex, tokenHistory]);

  useEffect(() => {
    fetchConversations(undefined, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedConversation?.id) {
      setOperatorResults([]);
      setOperatorError(null);
      return;
    }

    let cancelled = false;
    setOperatorLoading(true);
    setOperatorError(null);

    listOperatorResults({
      conversationId: selectedConversation.id,
      pageSize: 100,
    })
      .then((response) => {
        if (cancelled) return;
        setOperatorResults(response.items || []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setOperatorError(err.message);
        setOperatorResults([]);
      })
      .finally(() => {
        if (!cancelled) setOperatorLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedConversation?.id]);

  return (
    <Box height="100%" backgroundColor="colorBackgroundBody">
      <Box padding="space60" borderBottomWidth="borderWidth10" borderBottomStyle="solid" borderBottomColor="colorBorderWeaker">
        <Heading as="h1" variant="heading20" marginBottom="space0">
          AI Analysis Viewer
        </Heading>
        <ConversationFilters
          filters={filters}
          loading={conversationLoading}
          onChange={setFilters}
          onSubmit={runSearch}
        />
      </Box>

      <Box display="grid" gridTemplateColumns="minmax(360px, 420px) minmax(0, 1fr)" height="calc(100% - 180px)">
        <Box
          borderRightWidth="borderWidth10"
          borderRightStyle="solid"
          borderRightColor="colorBorderWeaker"
          padding="space50"
          overflowY="auto"
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="space40">
            <Heading as="h2" variant="heading40" marginBottom="space0">
              Conversations
            </Heading>
            <Box display="flex" columnGap="space20">
              <Button variant="secondary" size="small" onClick={fetchPrevious} disabled={conversationLoading || pageIndex === 0}>
                Previous
              </Button>
              <Button variant="secondary" size="small" onClick={fetchNext} disabled={conversationLoading || !nextToken}>
                Next
              </Button>
            </Box>
          </Box>

          {conversationLoading && (
            <Box display="flex" justifyContent="center" padding="space80">
              <Spinner decorative={false} title="Loading conversations" />
            </Box>
          )}

          {conversationError && (
            <Alert variant="error">
              <Text as="span">{conversationError}</Text>
            </Alert>
          )}

          {!conversationLoading && !conversationError && (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id}
              onSelect={setSelectedConversation}
            />
          )}
        </Box>

        <OperatorResultsPanel
          conversation={selectedConversation}
          loading={operatorLoading}
          error={operatorError}
          results={operatorResults}
        />
      </Box>
    </Box>
  );
};

export default AiAnalysisViewer;
