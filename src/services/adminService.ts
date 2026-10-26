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
  }
};
