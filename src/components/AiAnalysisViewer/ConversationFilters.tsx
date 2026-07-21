import React from 'react';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Input } from '@twilio-paste/core/input';
import { Label } from '@twilio-paste/core/label';
import { Option, Select } from '@twilio-paste/core/select';
import { ConversationFilters as ConversationFiltersState } from './types';

interface ConversationFiltersProps {
  filters: ConversationFiltersState;
  loading: boolean;
  onChange: (filters: ConversationFiltersState) => void;
  onSubmit: () => void;
}

const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  filters,
  loading,
  onChange,
  onSubmit,
}) => {
  const setFilter = (key: keyof ConversationFiltersState, value: string) => {
    onChange({ ...filters, [key]: value || undefined, pageToken: undefined });
  };

  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))"
      columnGap="space40"
      rowGap="space30"
      marginBottom="space50"
    >
      <Box>
        <Label htmlFor="analysis-status">Status</Label>
        <Select
          id="analysis-status"
          value={filters.status || 'CLOSED'}
          onChange={(event) => setFilter('status', event.target.value)}
        >
          <Option value="">Any</Option>
          <Option value="CLOSED">Closed</Option>
          <Option value="ACTIVE">Active</Option>
          <Option value="INACTIVE">Inactive</Option>
        </Select>
      </Box>

      <Box>
        <Label htmlFor="analysis-channel">Channel</Label>
        <Select
          id="analysis-channel"
          value={filters.channels || 'VOICE'}
          onChange={(event) => setFilter('channels', event.target.value)}
        >
          <Option value="">Any</Option>
          <Option value="VOICE">Voice</Option>
          <Option value="SMS">SMS</Option>
          <Option value="WHATSAPP">WhatsApp</Option>
          <Option value="CHAT">Chat</Option>
          <Option value="EMAIL">Email</Option>
          <Option value="RCS">RCS</Option>
        </Select>
      </Box>

      <Box>
        <Label htmlFor="analysis-channel-id">Call or channel SID</Label>
        <Input
          id="analysis-channel-id"
          type="text"
          value={filters.channelId || ''}
          onChange={(event) => setFilter('channelId', event.target.value.trim())}
          placeholder="CA..."
        />
      </Box>

      <Box>
        <Label htmlFor="analysis-created-after">Created after</Label>
        <Input
          id="analysis-created-after"
          type="text"
          value={filters.createdAtAfter || ''}
          onChange={(event) => setFilter('createdAtAfter', event.target.value.trim())}
          placeholder="2026-07-01T00:00:00Z"
        />
      </Box>

      <Box>
        <Label htmlFor="analysis-config-id">Intelligence config</Label>
        <Input
          id="analysis-config-id"
          type="text"
          value={filters.intelligenceConfigurationIds || ''}
          onChange={(event) => setFilter('intelligenceConfigurationIds', event.target.value.trim())}
          placeholder="intelligence_configuration_..."
        />
      </Box>

      <Box>
        <Label htmlFor="analysis-operator-id">Operator ID</Label>
        <Input
          id="analysis-operator-id"
          type="text"
          value={filters.operatorIds || ''}
          onChange={(event) => setFilter('operatorIds', event.target.value.trim())}
          placeholder="intelligence_operator_..."
        />
      </Box>

      <Box>
        <Label htmlFor="analysis-created-before">Created before</Label>
        <Input
          id="analysis-created-before"
          type="text"
          value={filters.createdAtBefore || ''}
          onChange={(event) => setFilter('createdAtBefore', event.target.value.trim())}
          placeholder="2026-07-31T23:59:59Z"
        />
      </Box>

      <Box display="flex" alignItems="flex-end">
        <Button variant="primary" onClick={onSubmit} disabled={loading}>
          {loading ? 'Loading' : 'Search'}
        </Button>
      </Box>
    </Box>
  );
};

export default ConversationFilters;
