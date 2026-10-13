import type { AiChatResponse, FridgeScanResponse } from '../types/api';
import { apiRequest } from './apiClient';
export const aiService = {
  async chat(message: string, sessionId?: string): Promise<AiChatResponse> {
    if (!message.trim() || message.length > 2000) throw new Error('Tin nhắn cần có từ 1 đến 2.000 ký tự.');
    const response = await apiRequest<AiChatResponse>('/ai/chat', {
      method: 'POST', auth: 'optional', body: { message: message.trim(), sessionId }, timeoutMs: 90000,
    });
    if (!response.data) throw new Error('AI chưa trả về kết quả.');
    return response.data;
  },
  async scanFridge(image: File): Promise<FridgeScanResponse> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
    if (image.size === 0 || image.size > 5 * 1024 * 1024) throw new Error('Ảnh phải có dung lượng từ 1 byte đến 5 MB.');
    const body = new FormData();
    body.append('image', image);
    const response = await apiRequest<FridgeScanResponse>('/ai/fridge-scan', { method: 'POST', auth: 'optional', body, timeoutMs: 90000 });
    if (!response.data) throw new Error('AI chưa trả về kết quả quét.');
    return response.data;
  },
};
