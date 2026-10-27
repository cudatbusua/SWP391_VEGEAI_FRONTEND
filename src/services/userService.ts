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
  async updateAvatar(file: File): Promise<UserProfile> {
    const body = new FormData(); body.append('avatar', file);
    const response = await apiRequest<UserProfile>('/users/me/avatar', { method: 'POST', body });
    if (!response.data) throw new Error('Không thể cập nhật ảnh đại diện.');
    return response.data;
  },
  async changeEmail(newEmail: string, currentPassword: string): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>('/users/me/email', { method: 'PUT', body: {
      newEmail,
      currentPassword: await hashPassword(currentPassword),
    } });
    if (!response.data) throw new Error('Không thể cập nhật địa chỉ email.');
    return response.data;
  },
  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<void> {
    await apiRequest('/users/me/password-hashed', { method: 'PUT', body: {
      currentPassword: await hashPassword(currentPassword),
      newPassword: await hashPassword(newPassword),
      confirmNewPassword: await hashPassword(confirmNewPassword),
    } });
  },
};
