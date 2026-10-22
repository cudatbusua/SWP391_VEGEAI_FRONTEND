import type { AiChatMessage, AiChatResponse, FridgeScanResponse, GeneratedRecipeAiResponse } from '../types/api';
import { apiRequest } from './apiClient';

export const aiService = {
  async chat(message: string, sessionId?: string, history?: AiChatMessage[]): Promise<AiChatResponse> {
    if (!message.trim() || message.length > 2000) throw new Error('Tin nhắn cần có từ 1 đến 2.000 ký tự.');
    if (history && (history.length > 10 || history.some(item => !item || !['user', 'model'].includes(item.role) || !item.text?.trim() || item.text.length > 4000))) {
      throw new Error('Ngữ cảnh trò chuyện không hợp lệ. Vui lòng bắt đầu cuộc trò chuyện mới.');
    }
    const response = await apiRequest<AiChatResponse>('/ai/chat', {
      method: 'POST', auth: 'optional', body: { message: message.trim(), sessionId, history }, timeoutMs: 90000,
    });
    if (!response.data?.reply?.trim()) throw new Error('AI chưa trả về kết quả.');
    return response.data;
  },

  async scanFridge(image: File): Promise<FridgeScanResponse> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
    if (image.size === 0 || image.size > 5 * 1024 * 1024) throw new Error('Ảnh phải có dung lượng từ 1 byte đến 5 MB.');
    const body = new FormData();
    body.append('image', image);
    const response = await apiRequest<FridgeScanResponse>('/ai/fridge-scan', { method: 'POST', auth: 'optional', body, timeoutMs: 90000 });
    if (!response.data || !Array.isArray(response.data.ingredients)) throw new Error('AI chưa trả về kết quả quét.');
    return response.data;
  },

  async extractRecipeFromVideo(title: string, description?: string, videoUrl?: string): Promise<GeneratedRecipeAiResponse> {
    const response = await apiRequest<GeneratedRecipeAiResponse>('/ai/video-recipe', {
      method: 'POST',
      auth: 'optional',
      body: { title, description, videoUrl },
      timeoutMs: 90000,
    });
    if (!response.data) throw new Error('AI chưa trả về công thức từ video.');
    return response.data;
  },
};
