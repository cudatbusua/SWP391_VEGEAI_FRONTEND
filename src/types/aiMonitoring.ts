export type TimeRange = 'TODAY' | 'LAST_24_HOURS' | 'LAST_7_DAYS' | 'LAST_30_DAYS';
export type EventLevel = 'SUCCESS' | 'FAILED' | 'FLAGGED';
export type ServiceHealth = 'HEALTHY' | 'WARNING' | 'DOWN' | 'NO_DATA';
export type CoreStatus = 'LIVE' | 'DEGRADED' | 'NO_DATA';

export interface AiServiceStatus {
  operation: string;
  health: ServiceHealth;
  totalRequests: number;
  failedRequests: number;
  successRatePercentage?: number;
  averageLatencyMs?: number;
  lastStatus?: string;
  lastCalledAt?: string;
  model?: string;
}

export interface AiMonitoringOverview {
  generatedAt: string;
  coreStatus: CoreStatus;
  totalRequests: number;
  previousTotalRequests: number;
  requestTrendPercentage?: number;
  p95LatencyMs?: number;
  averageLatencyMs?: number;
  successRatePercentage?: number;
  failedRequests: number;
  moderationChecks: number;
  moderationFlagged: number;
  flaggedRatePercentage?: number;
  totalTokens: number;
  guestRequestsToday: number;
  auditEntryCount: number;
  systemLogCount: number;
  systemLogSince?: string;
  services: AiServiceStatus[];
}

export interface AiMonitoringEvent {
  requestId: string;
  timestamp: string;
  operation: string;
  model: string;
  userType: string;
  userId?: string;
  userName?: string;
  status: string;
  outcome?: string;
  errorType?: string;
  latencyMs: number;
  promptTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  locked: boolean;
}

export interface AiAuditEntry {
  id: string;
  timestamp: string;
  adminName?: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  aiVerdict?: string;
  aiAgreedWithAdmin?: boolean;
  detail?: string;
}

export interface AiSystemLogEntry {
  id: number;
  timestamp: string;
  level: string;
  logger: string;
  loggerName: string;
  thread: string;
  message: string;
  error?: string;
}

export interface AiReplayResult {
  sourceRequestId: string;
  status: string;
  latencyMs: number;
  totalTokens?: number;
  errorType?: string;
  message: string;
}
