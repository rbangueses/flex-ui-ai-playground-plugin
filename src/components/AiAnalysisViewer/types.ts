export type AnalysisOutputFormat = 'CLASSIFICATION' | 'TEXT' | 'JSON' | 'EXTRACTION';

export interface ConversationParticipant {
  id?: string;
  name?: string;
  type?: string;
  addressValues?: string[];
}

export interface IntelligenceConversation {
  id: string;
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt?: string;
  updatedAt?: string;
  channels?: string[];
  channelIds?: string[];
  participants?: ConversationParticipant[];
  intelligenceConfigurationIds?: string[];
  conversationConfigurationId?: string;
  operatorResultIds?: string[];
}

export interface OperatorResult {
  id?: string;
  outputFormat?: AnalysisOutputFormat;
  intelligenceConfiguration?: {
    id?: string;
    ruleId?: string;
    version?: number;
  };
  conversationId?: string;
  operator?: {
    id?: string;
    version?: number;
    displayName?: string;
    parameters?: Record<string, unknown>;
  };
  dateCreated?: string;
  referenceIds?: string[];
  executionDetails?: {
    trigger?: {
      on?: string;
      timestamp?: string;
    };
    channels?: string[];
    participants?: ConversationParticipant[];
    resolvedContext?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items?: T[];
  conversations?: T[];
  meta?: {
    nextToken?: string;
    previousToken?: string;
    pageSize?: number;
    key?: string;
  };
}

export interface ConversationFilters {
  pageSize?: number;
  pageToken?: string;
  createdAtAfter?: string;
  createdAtBefore?: string;
  status?: string;
  channelId?: string;
  channels?: string;
  conversationConfigurationId?: string;
  intelligenceConfigurationIds?: string;
  operatorIds?: string;
}

export interface OperatorResultFilters {
  conversationId: string;
  intelligenceConfigurationId?: string;
  operatorId?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface OperatorResultGroup {
  key: string;
  triggerOn: string;
  operatorName: string;
  results: OperatorResult[];
}
