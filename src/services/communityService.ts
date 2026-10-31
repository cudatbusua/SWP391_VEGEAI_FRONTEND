import { apiRequest } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/api';
import type { CommunityVideo, ContentRatingSummary, Question, QuestionStatus, VideoComment, VideoInput, VideoStatus } from '../types/community';

function data<T>(response: ApiResponse<T>): T {
  if (response.data === undefined || response.data === null) throw new Error('Máy chủ chưa trả về dữ liệu.');
  return response.data;
}
function query(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(name, String(value));
  return '?' + params.toString();
}
const id = encodeURIComponent;
export const communityService = {
  async questions(params: { keyword?: string; answered?: boolean; page: number }, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<Question>>('/questions' + query({ ...params, size: 8 }), { auth: 'none', signal }));
  },
  async question(questionId: string, signal?: AbortSignal) {
    return data(await apiRequest<Question>('/questions/' + id(questionId), { auth: 'none', signal }));
  },
  async myQuestions(status: QuestionStatus | '', page: number, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<Question>>('/questions/mine' + query({ status, page, size: 8 }), { signal }));
  },
  async myQuestion(questionId: string, signal?: AbortSignal) {
    return data(await apiRequest<Question>('/questions/mine/' + id(questionId), { signal }));
  },
  async ask(content: string) {
    return data(await apiRequest<Question>('/questions', { method: 'POST', body: { content: content.trim() } }));
  },
  async questionQueue(status: QuestionStatus | '', keyword: string, page: number, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<Question>>('/admin/questions' + query({ status, keyword, page, size: 12 }), { signal }));
  },
  async adminQuestion(questionId: string, signal?: AbortSignal) {
    return data(await apiRequest<Question>('/admin/questions/' + id(questionId), { signal }));
  },
  async answer(questionId: string, content: string, version: number) {
    return data(await apiRequest<Question>('/admin/questions/' + id(questionId) + '/answer', { method: 'PUT', body: { content: content.trim(), version } }));
  },
  async moderate(questionId: string, decision: 'APPROVE' | 'REJECT', version: number, reason?: string) {
    return data(await apiRequest<Question>('/admin/questions/' + id(questionId) + '/moderation', { method: 'PUT', body: { decision, version, reason: reason?.trim() } }));
  },
  async deleteQuestion(questionId: string, version: number) {
    await apiRequest('/admin/questions/' + id(questionId) + query({ version }), { method: 'DELETE' });
  },
  async videos(params: { keyword?: string; category?: string; page: number }, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<CommunityVideo>>('/videos' + query({ ...params, size: 9 }), { auth: 'none', signal }));
  },
  async video(videoId: string, signal?: AbortSignal) {
    return data(await apiRequest<CommunityVideo>('/videos/' + id(videoId), { auth: 'none', signal }));
  },
  async savedVideos(page: number, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<CommunityVideo>>('/videos/favorites' + query({ page, size: 9 }), { signal }));
  },
  async myVideos(page: number, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<CommunityVideo>>('/videos/mine' + query({ page, size: 9 }), { signal }));
  },
  async myVideo(videoId: string, signal?: AbortSignal) {
    return data(await apiRequest<CommunityVideo>('/videos/mine/' + id(videoId), { signal }));
  },
  async saveMyVideo(input: VideoInput, videoId?: string) {
    return data(await apiRequest<CommunityVideo>(videoId ? '/videos/mine/' + id(videoId) : '/videos', { method: videoId ? 'PUT' : 'POST', body: input }));
  },
  async uploadMyVideoAsset(file: File, video: boolean) {
    const body = new FormData(); body.append('file', file);
    return data(await apiRequest<{ url: string }>('/videos/upload?video=' + video, { method: 'POST', body }));
  },
  async favorite(videoId: string, signal?: AbortSignal) {
    return data(await apiRequest<{ videoId: string; favorite: boolean }>('/videos/' + id(videoId) + '/favorite', { signal }));
  },
  async setFavorite(videoId: string, saved: boolean) {
    return data(await apiRequest<{ videoId: string; favorite: boolean }>('/videos/' + id(videoId) + '/favorite', { method: saved ? 'PUT' : 'DELETE' }));
  },
  async comments(videoId: string, page: number, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<VideoComment>>('/videos/' + id(videoId) + '/comments' + query({ page, size: 10 }), { auth: 'none', signal }));
  },
  async videoRating(videoId: string, signal?: AbortSignal) {
    const content = data(await apiRequest<{ rating: ContentRatingSummary }>(`/public/content-interactions/VIDEO/${id(videoId)}?page=0&size=1`, { auth: 'optional', signal }));
    return content.rating;
  },
  async rateVideo(videoId: string, stars: number) {
    return data(await apiRequest<ContentRatingSummary>(`/content-interactions/VIDEO/${id(videoId)}/rating`, { method: 'PUT', body: { stars } }));
  },
  async comment(videoId: string, content: string, existing?: { id: string; version: number }) {
    return data(await apiRequest<VideoComment>('/videos/' + id(videoId) + '/comments' + (existing ? '/' + id(existing.id) : ''), {
      method: existing ? 'PUT' : 'POST', body: { content: content.trim(), version: existing?.version },
    }));
  },
  async deleteComment(videoId: string, commentId: string, version: number) {
    await apiRequest('/videos/' + id(videoId) + '/comments/' + id(commentId) + query({ version }), { method: 'DELETE' });
  },
  async adminVideos(params: { status?: VideoStatus | ''; keyword?: string; category?: string; page: number }, signal?: AbortSignal) {
    return data(await apiRequest<PageResponse<CommunityVideo>>('/admin/videos' + query({ ...params, size: 12 }), { signal }));
  },
  async adminVideo(videoId: string, signal?: AbortSignal) {
    return data(await apiRequest<CommunityVideo>('/admin/videos/' + id(videoId), { signal }));
  },
  async saveVideo(input: VideoInput, videoId?: string) {
    return data(await apiRequest<CommunityVideo>('/admin/videos' + (videoId ? '/' + id(videoId) : ''), { method: videoId ? 'PUT' : 'POST', body: input }));
  },
  async uploadVideoAsset(file: File, video: boolean) {
    const body = new FormData(); body.append('file', file);
    return data(await apiRequest<{ url: string }>('/admin/videos/upload?video=' + video, { method: 'POST', body }));
  },
  async deleteVideo(videoId: string, version: number) {
    await apiRequest('/admin/videos/' + id(videoId) + query({ version }), { method: 'DELETE' });
  },
  async archiveVideo(videoId: string, version: number) {
    return data(await apiRequest<CommunityVideo>('/admin/videos/' + id(videoId) + '/archive', { method: 'POST', body: { version } }));
  },
  async restoreVideo(videoId: string, version: number) {
    return data(await apiRequest<CommunityVideo>('/admin/videos/' + id(videoId) + '/restore', { method: 'POST', body: { version } }));
  },
  async reviewVideoModeration(videoId: string, version: number, decision: 'APPROVE' | 'REJECT') {
    return data(await apiRequest<CommunityVideo>('/admin/videos/' + id(videoId) + '/moderation', { method: 'POST', body: { version, decision, reason: '' } }));
  },
};
