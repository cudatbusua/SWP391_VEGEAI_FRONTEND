// Admin AI monitoring (/api/admin/ai/monitoring). The backend never stores prompts, images or AI responses.

export type AiTimeRange = 'TODAY' | 'LAST_24_HOURS' | 'LAST_7_DAYS' | 'LAST_30_DAYS';
export type AiEventLevel = 'SUCCESS' | 'FAILED' | 'FLAGGED';
export type AiServiceHealth = 'HEALTHY' | 'WARNING' | 'DOWN' | 'NO_DATA';
export type AiCoreStatus = 'LIVE' | 'DEGRADED' | 'NO_DATA';

export interface AiServiceStatus {
  operation: string;
  health: AiServiceHealth;
  totalRequests: number;
  failedRequests: number;
  successRatePercentage?: number | null;
  averageLatencyMs?: number | null;
  lastStatus?: string | null;
  lastCalledAt?: string | null;
  model?: string | null;
}

export interface AiMonitoringOverview {
  generatedAt: string;
  coreStatus: AiCoreStatus;
  totalRequests: number;
  previousTotalRequests: number;
  requestTrendPercentage?: number | null;
  p95LatencyMs?: number | null;
  averageLatencyMs?: number | null;
  successRatePercentage?: number | null;
  failedRequests: number;
  moderationChecks: number;
  moderationFlagged: number;
  flaggedRatePercentage?: number | null;
  totalTokens: number;
  guestRequestsToday: number;
  auditEntryCount: number;
  systemLogCount: number;
  systemLogSince?: string | null;
  services: AiServiceStatus[];
}

export interface AiEvent {
  requestId: string;
  timestamp: string;
  operation: string;
  model: string;
  userType?: string | null;
  userId?: string | null;
  userName?: string | null;
  status: string;
  outcome?: string | null;
  errorType?: string | null;
  latencyMs: number;
  promptTokens?: number | null;
  responseTokens?: number | null;
  totalTokens?: number | null;
  locked: boolean;
}

export interface AiAuditEntry {
  id: string;
  timestamp: string;
  adminName?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string | null;
  aiVerdict?: string | null;
  aiAgreedWithAdmin?: boolean | null;
  detail?: string | null;
}

export interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: string;
  logger: string;
  loggerName: string;
  thread: string;
  message?: string | null;
  error?: string | null;
}

export interface AiReplayResult {
  sourceRequestId: string;
  status: string;
  latencyMs: number;
  totalTokens?: number | null;
  errorType?: string | null;
  message?: string | null;
}

export interface AiEventFilters {
  range: AiTimeRange;
  operation: string;
  level: AiEventLevel | '';
  search: string;
}

export interface SystemLogFilters {
  level: string;
  search: string;
}
