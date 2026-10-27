import { apiRequest } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/api';
import type { BlogCategory, BlogComment, BlogInput, BlogPost, BlogStatus } from '../types/blog';

function data<T>(response: ApiResponse<T>): T {
  if (!response.data) throw new Error('Máy chủ không trả về dữ liệu bài viết.');
  return response.data;
}

export const blogService = {
  async published(params: { keyword?: string; category?: BlogCategory | ''; page: number }, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(params.page), size: '9' });
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.category) query.set('category', params.category);
    return data(await apiRequest<PageResponse<BlogPost>>('/blog/posts?' + query, { auth: 'none', signal }));
  },
  async publicPost(id: string, signal?: AbortSignal) {
    return data(await apiRequest<BlogPost>('/blog/posts/' + encodeURIComponent(id), { auth: 'none', signal }));
  },
  async mine(status: BlogStatus | '', page: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: '9' });
    if (status) query.set('status', status);
    return data(await apiRequest<PageResponse<BlogPost>>('/blog/my-posts?' + query, { signal }));
  },
  async ownPost(id: string, signal?: AbortSignal) {
    return data(await apiRequest<BlogPost>('/blog/my-posts/' + encodeURIComponent(id), { signal }));
  },
  async save(input: BlogInput, id?: string) {
    return data(await apiRequest<BlogPost>(id ? '/blog/my-posts/' + encodeURIComponent(id) : '/blog/my-posts', { method: id ? 'PUT' : 'POST', body: input }));
  },
  async submit(id: string, version: number) {
    return data(await apiRequest<BlogPost>('/blog/my-posts/' + encodeURIComponent(id) + '/submit', { method: 'POST', body: { version } }));
  },
  async withdraw(id: string, version: number) {
    return data(await apiRequest<BlogPost>('/blog/my-posts/' + encodeURIComponent(id) + '/withdraw', { method: 'POST', body: { version } }));
  },
  async remove(id: string, version: number) {
    await apiRequest('/blog/my-posts/' + encodeURIComponent(id) + '?version=' + version, { method: 'DELETE' });
  },
  async queue(status: BlogStatus, keyword: string, page: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ status, page: String(page), size: '10' });
    if (keyword.trim()) query.set('keyword', keyword.trim());
    return data(await apiRequest<PageResponse<BlogPost>>('/admin/blog/posts?' + query, { signal }));
  },
  async reviewPost(id: string, signal?: AbortSignal) {
    return data(await apiRequest<BlogPost>('/admin/blog/posts/' + encodeURIComponent(id), { signal }));
  },
  async review(id: string, version: number, decision: 'APPROVE' | 'REJECT', reason: string) {
    return data(await apiRequest<BlogPost>('/admin/blog/posts/' + encodeURIComponent(id) + '/review', { method: 'POST', body: { version, decision, reason } }));
  },
  async adminArchive(id: string, version: number) {
    return data(await apiRequest<BlogPost>('/admin/blog/posts/' + encodeURIComponent(id) + '/archive', { method: 'POST', body: { version } }));
  },
  async adminRestore(id: string, version: number) {
    return data(await apiRequest<BlogPost>('/admin/blog/posts/' + encodeURIComponent(id) + '/restore', { method: 'POST', body: { version } }));
  },
  async adminDelete(id: string, version: number) {
    await apiRequest('/admin/blog/posts/' + encodeURIComponent(id) + '?version=' + version, { method: 'DELETE' });
  },

  // ── Comments & 5-Star Ratings ──────────────────────────────────────────────
  async getComments(postId: string, signal?: AbortSignal): Promise<BlogComment[]> {
    try {
      return data(await apiRequest<BlogComment[]>('/blog/posts/' + encodeURIComponent(postId) + '/comments', { auth: 'none', signal }));
    } catch {
      return [];
    }
  },
  async addComment(postId: string, input: { content: string; rating: number }): Promise<BlogComment> {
    return data(await apiRequest<BlogComment>('/blog/posts/' + encodeURIComponent(postId) + '/comments', { method: 'POST', body: input }));
  }
};
