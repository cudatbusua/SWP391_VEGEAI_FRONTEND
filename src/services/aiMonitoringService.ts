import { apiRequest } from './apiClient';
import type { PageResponse } from '../types/api';
import type {
  AiAuditEntry,
  AiEvent,
  AiEventFilters,
  AiMonitoringOverview,
  AiReplayResult,
  SystemLogEntry,
  SystemLogFilters,
} from '../types/aiMonitoring';

const BASE = '/admin/ai/monitoring';

function eventQuery(filters: AiEventFilters): URLSearchParams {
  const query = new URLSearchParams({ range: filters.range });
  if (filters.operation) query.set('operation', filters.operation);
  if (filters.level) query.set('level', filters.level);
  if (filters.search.trim()) query.set('search', filters.search.trim());
  return query;
}

async function data<T>(path: string, fallbackError: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const response = await apiRequest<T>(path, options);
  if (response.data === undefined || response.data === null) throw new Error(fallbackError);
  return response.data;
}

export const aiMonitoringService = {
  overview(signal?: AbortSignal) {
    return data<AiMonitoringOverview>(`${BASE}/overview`, 'Không thể tải số liệu giám sát AI.', { signal });
  },
  events(filters: AiEventFilters, page: number, size: number, signal?: AbortSignal) {
    const query = eventQuery(filters);
    query.set('page', String(page));
    query.set('size', String(size));
    return data<PageResponse<AiEvent>>(`${BASE}/events?${query.toString()}`, 'Không thể tải nhật ký AI.', { signal });
  },
  exportEvents(filters: AiEventFilters) {
    return data<AiEvent[]>(`${BASE}/events/export?${eventQuery(filters).toString()}`, 'Không thể xuất nhật ký AI.');
  },
  toggleLock(requestId: string) {
    return data<{ requestId: string; locked: boolean }>(`${BASE}/events/${requestId}/lock`, 'Không thể khóa request.', { method: 'POST' });
  },
  replay(requestId: string) {
    return data<AiReplayResult>(`${BASE}/events/${requestId}/replay`, 'Không thể chạy kiểm thử.', { method: 'POST' });
  },
  audit(page: number, size: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return data<PageResponse<AiAuditEntry>>(`${BASE}/audit?${query.toString()}`, 'Không thể tải nhật ký quản trị viên.', { signal });
  },
  systemLogs(filters: SystemLogFilters, page: number, size: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.level) query.set('level', filters.level);
    if (filters.search.trim()) query.set('search', filters.search.trim());
    return data<PageResponse<SystemLogEntry>>(`${BASE}/system-logs?${query.toString()}`, 'Không thể tải log hệ thống.', { signal });
  },
};
