import React, { useEffect, useMemo, useState } from 'react';
import { ITask } from '@twilio/flex-ui';
import { Alert } from '@twilio-paste/core/alert';
import { Box } from '@twilio-paste/core/box';
import { Spinner } from '@twilio-paste/core/spinner';
import { Tab, TabList, TabPanel, TabPanels, Tabs, useTabState } from '@twilio-paste/core/tabs';
import { Text } from '@twilio-paste/core/text';
import { listConversations, listOperatorResults } from '../AiAnalysisViewer/api';
import type { IntelligenceConversation, OperatorResult as IntelligenceOperatorResult } from '../AiAnalysisViewer/types';
import { getDigitalChannelCandidates } from '../../utils/taskIdentity';
import { getDigitalOperatorGroups } from './digitalOperators';
import OperatorResultCard from './OperatorResultCard';

type DigitalOperatorsTabProps = {
  task?: ITask;
  mode: 'realtime' | 'postCall';
};

const POLL_INTERVAL_MS = 5000;
const TRIGGER_BY_MODE = {
  realtime: 'COMMUNICATION',
  postCall: 'CONVERSATION_END',
};

function getConversationItems(response: { items?: IntelligenceConversation[]; conversations?: IntelligenceConversation[] }): IntelligenceConversation[] {
  return response.items || response.conversations || [];
}

async function findConversationByCandidates(candidates: string[]): Promise<IntelligenceConversation | null> {
  for (const channelId of candidates) {
    const response = await listConversations({
      channelId,
      pageSize: 5,
    });
    const [conversation] = getConversationItems(response);
    if (conversation) return conversation;
  }

  return null;
}

const DigitalOperatorsTab: React.FC<DigitalOperatorsTabProps> = ({ task, mode }) => {
  const candidates = useMemo(() => getDigitalChannelCandidates(task), [task]);
  const [conversation, setConversation] = useState<IntelligenceConversation | null>(null);
  const [results, setResults] = useState<IntelligenceOperatorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabState = useTabState();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      if (candidates.length === 0) {
        setConversation(null);
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const activeConversation = conversation || (await findConversationByCandidates(candidates));
        if (cancelled) return;

        setConversation(activeConversation);

        if (!activeConversation?.id) {
          setResults([]);
          return;
        }

        const response = await listOperatorResults({
          conversationId: activeConversation.id,
          pageSize: 100,
        });
        if (cancelled) return;
        setResults(response.items || []);
      } catch (err: unknown) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    timer = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [candidates, conversation]);

  const triggerOn = TRIGGER_BY_MODE[mode];
  const groups = getDigitalOperatorGroups(results, triggerOn);
  const emptyCopy = mode === 'realtime'
    ? 'Waiting for realtime operator results...'
    : 'Waiting for post-call operator results...';

  if (candidates.length === 0) {
    return (
      <Box padding="space60">
        <Text as="p" color="colorTextWeak">No digital channel ID found on this task.</Text>
      </Box>
    );
  }

  if (loading && !conversation) {
    return (
      <Box display="flex" justifyContent="center" padding="space80">
        <Spinner decorative={false} title="Loading Conversation Intelligence data" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <Text as="span">{error}</Text>
      </Alert>
    );
  }

  if (!conversation) {
    return (
      <Box padding="space60">
        <Text as="p" color="colorTextWeak">Waiting for Conversation Intelligence conversation...</Text>
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box padding="space60">
        <Text as="p" color="colorTextWeak">{emptyCopy}</Text>
      </Box>
    );
  }

  return (
    <Box paddingTop="space40">
      <Tabs baseId={`digital-${mode}-operator-tabs`} state={tabState}>
        <TabList aria-label="Digital operator results" element="OPERATOR_TAB_LIST">
          {groups.map((group) => (
            <Tab key={group.key} element="OPERATOR_TAB">
              {group.displayName}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {groups.map((group) => (
            <TabPanel key={group.key}>
              <OperatorResultCard items={group.items} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DigitalOperatorsTab;
