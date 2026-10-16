import type { UpdateUserProfile, UserProfile } from '../types/api';
import { apiRequest } from './apiClient';
import { hashPassword } from '../utils/password';
export const userService = {
  async getProfile(signal?: AbortSignal): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>('/users/me', { signal });
    if (!response.data) throw new Error('Không thể tải hồ sơ người dùng.');
    return response.data;
  },
  async updateProfile(body: UpdateUserProfile): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>('/users/me', { method: 'PUT', body });
    if (!response.data) throw new Error('Không thể tải hồ sơ đã cập nhật.');
    return response.data;
  },
  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<void> {
    await apiRequest('/users/me/password', { method: 'PUT', body: {
      currentPassword: await hashPassword(currentPassword),
      newPassword: await hashPassword(newPassword),
      confirmNewPassword: await hashPassword(confirmNewPassword),
    } });
  },
};
