import { apiRequest } from './apiClient';
import type {
  AccountStatus,
  AdminDashboardStats,
  AdminUserRole,
  AiAuditLogEntry,
  AiOpsStatus,
  PageResponse,
  UserProfile,
} from '../types/api';
import type {
  AiMonitoringOverview,
  AiMonitoringEvent,
  AiAuditEntry,
  AiSystemLogEntry,
  AiReplayResult,
  TimeRange,
  EventLevel
} from '../types/aiMonitoring';

export const adminService = {
  async stats(signal?: AbortSignal): Promise<AdminDashboardStats> {
    const response = await apiRequest<AdminDashboardStats>('/admin/dashboard/stats', { signal });
    if (!response.data) throw new Error('Không thể tải thống kê admin.');
    return response.data;
  },

  async users(params: { page?: number; size?: number; search?: string; role?: AdminUserRole | ''; status?: AccountStatus | '' }, signal?: AbortSignal): Promise<PageResponse<UserProfile>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 10),
      sortBy: 'createdAt',
      direction: 'desc',
    });
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    const response = await apiRequest<PageResponse<UserProfile>>(`/admin/users?${query.toString()}`, { signal });
    if (!response.data) throw new Error('Không thể tải danh sách người dùng.');
    return response.data;
  },

  async updateStatus(userId: string, status: AccountStatus, reason: string): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status, reason } });
    if (!response.data) throw new Error('Không thể cập nhật trạng thái tài khoản.');
    return response.data;
  },

  async updateRole(userId: string, role: AdminUserRole): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } });
    if (!response.data) throw new Error('Không thể cập nhật vai trò.');
    return response.data;
  },

  async aiStatus(): Promise<AiOpsStatus> {
    const response = await apiRequest<AiOpsStatus>('/admin/ai/status');
    if (!response.data) throw new Error('Không thể tải trạng thái AI.');
    return response.data;
  },

  async aiAuditLogs(): Promise<AiAuditLogEntry[]> {
    const response = await apiRequest<AiAuditLogEntry[]>('/admin/ai/audit-logs');
    return response.data ?? [];
  },

  // AI Monitoring & Real-time Telemetry (Minh Khải's feature)
  async getAiMonitoringOverview(signal?: AbortSignal): Promise<AiMonitoringOverview> {
    const response = await apiRequest<AiMonitoringOverview>('/admin/ai/monitoring/overview', { signal });
    if (!response.data) throw new Error('Không thể tải dữ liệu giám sát AI.');
    return response.data;
  },

  async getAiMonitoringEvents(params: {
    range?: TimeRange;
    operation?: string;
    level?: EventLevel;
    search?: string;
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<PageResponse<AiMonitoringEvent>> {
    const query = new URLSearchParams();
    if (params.range) query.set('range', params.range);
    if (params.operation) query.set('operation', params.operation);
    if (params.level) query.set('level', params.level);
    if (params.search) query.set('search', params.search);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 25));

    const response = await apiRequest<PageResponse<AiMonitoringEvent>>(`/admin/ai/monitoring/events?${query.toString()}`, { signal });
    if (!response.data) throw new Error('Không thể tải nhật ký lượt gọi AI.');
    return response.data;
  },

  async lockAiMonitoringEvent(requestId: string, reason?: string): Promise<{ requestId: string; locked: boolean }> {
    const response = await apiRequest<{ requestId: string; locked: boolean }>(`/admin/ai/monitoring/events/${requestId}/lock`, {
      method: 'POST',
      body: reason ? { reason } : {}
    });
    if (!response.data) throw new Error('Không thể thay đổi trạng thái khóa request.');
    return response.data;
  },

  async replayAiMonitoringEvent(requestId: string): Promise<AiReplayResult> {
    const response = await apiRequest<AiReplayResult>(`/admin/ai/monitoring/events/${requestId}/replay`, {
      method: 'POST'
    });
    if (!response.data) throw new Error('Kiểm thử Replay thất bại.');
    return response.data;
  },

  async getAiMonitoringAudit(page = 0, size = 25, signal?: AbortSignal): Promise<PageResponse<AiAuditEntry>> {
    const response = await apiRequest<PageResponse<AiAuditEntry>>(`/admin/ai/monitoring/audit?page=${page}&size=${size}`, { signal });
    if (!response.data) throw new Error('Không thể tải nhật ký quản trị AI.');
    return response.data;
  },

  async getAiMonitoringSystemLogs(params?: { level?: string; search?: string; page?: number; size?: number }, signal?: AbortSignal): Promise<PageResponse<AiSystemLogEntry>> {
    const query = new URLSearchParams();
    if (params?.level) query.set('level', params.level);
    if (params?.search) query.set('search', params.search);
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 25));

    const response = await apiRequest<PageResponse<AiSystemLogEntry>>(`/admin/ai/monitoring/system-logs?${query.toString()}`, { signal });
    if (!response.data) throw new Error('Không thể tải server log gần đây.');
    return response.data;
  }
};
