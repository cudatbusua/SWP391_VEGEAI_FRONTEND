import { apiRequest } from './apiClient';

export interface UserNotification {
  id: string;
  eventType: string;
  title: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
  redirectUrl?: string;
}

export interface NotificationPage {
  items: UserNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const notificationService = {
  async list(page = 0, size = 20): Promise<NotificationPage> {
    const response = await apiRequest<NotificationPage>(`/notifications?page=${page}&size=${size}`);
    if (!response.data) throw new Error('Máy chủ không trả về danh sách thông báo.');
    return response.data;
  },

  async unreadCount(): Promise<number> {
    const response = await apiRequest<{ unreadCount: number }>('/notifications/unread-count');
    if (response.data?.unreadCount === undefined) throw new Error('Máy chủ không trả về số thông báo chưa đọc.');
    return response.data.unreadCount;
  },

  async markRead(id: string): Promise<UserNotification> {
    const response = await apiRequest<UserNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    if (!response.data) throw new Error('Máy chủ không trả về trạng thái thông báo.');
    return response.data;
  },

  async markAllRead(): Promise<number> {
    const response = await apiRequest<{ updatedCount: number }>('/notifications/read-all', { method: 'PATCH' });
    if (response.data?.updatedCount === undefined) throw new Error('Máy chủ không xác nhận thao tác đọc tất cả.');
    return response.data.updatedCount;
  },
};
