import { apiRequest } from './apiClient';
import type { ContentInteractions, InteractionComment, InteractionRating, InteractionTarget } from '../types/contentInteraction';
import type { PageResponse } from '../types/api';
import type { AdminInteractionRating } from '../types/contentInteraction';

const base = (type: InteractionTarget, id: string) => `/content-interactions/${type}/${encodeURIComponent(id)}`;
type ReviewInput = {
  content: string;
  stars: number;
  tags: string[];
  publicDisplayName: boolean;
  photoUrls?: string[];
  version?: number;
};

function reviewForm(input: ReviewInput, photos: File[]) {
  const form = new FormData();
  form.append('review', new Blob([JSON.stringify(input)], { type: 'application/json' }));
  photos.forEach(photo => form.append('photos', photo));
  return form;
}

type RatingRequest = { type: InteractionTarget; id: string; resolve: (rating: InteractionRating | null) => void; reject: (reason: unknown) => void };
const pendingRatings = new Map<string, RatingRequest[]>();
let ratingFlushScheduled = false;

function queueRating(type: InteractionTarget, id: string): Promise<InteractionRating | null> {
  return new Promise((resolve, reject) => {
    const key = `${type}:${id}`;
    const requests = pendingRatings.get(key) ?? [];
    requests.push({ type, id, resolve, reject });
    pendingRatings.set(key, requests);
    if (!ratingFlushScheduled) {
      ratingFlushScheduled = true;
      void Promise.resolve().then(flushRatings);
    }
  });
}

async function flushRatings() {
  ratingFlushScheduled = false;
  const requests = [...pendingRatings.values()].flat();
  pendingRatings.clear();
  const groups = new Map<InteractionTarget, RatingRequest[]>();
  requests.forEach(request => groups.set(request.type, [...(groups.get(request.type) ?? []), request]));

  await Promise.all([...groups].flatMap(([type, group]) => {
    const batches: RatingRequest[][] = [];
    for (let index = 0; index < group.length; index += 50) batches.push(group.slice(index, index + 50));
    return batches.map(async batch => {
      const query = new URLSearchParams();
      batch.forEach(request => query.append('ids', request.id));
      try {
        const response = await apiRequest<InteractionRating[]>(`/public/content-interactions/${type}/ratings?${query}`, { auth: 'optional' });
        const ratings = new Map((response.data ?? []).map(rating => [rating.targetId, rating]));
        batch.forEach(request => request.resolve(ratings.get(request.id) ?? null));
      } catch (reason) {
        batch.forEach(request => request.reject(reason));
      }
    });
  }));
}

export const contentInteractionService = {
  async load(type: InteractionTarget, id: string, page = 0, signal?: AbortSignal) {
    const response = await apiRequest<ContentInteractions>(`/public${base(type, id)}?page=${page}&size=8`, { auth: 'optional', signal });
    return response.data;
  },
  loadRating(type: InteractionTarget, id: string) {
    return queueRating(type, id);
  },
  async rate(type: InteractionTarget, id: string, stars: number) {
    const response = await apiRequest<InteractionRating>(`${base(type, id)}/rating`, { method: 'PUT', body: { stars } });
    return response.data;
  },
  async removeRating(type: InteractionTarget, id: string) {
    const response = await apiRequest<InteractionRating>(`${base(type, id)}/rating`, { method: 'DELETE' });
    return response.data;
  },
  async comment(type: InteractionTarget, id: string, content: string, existing?: Pick<InteractionComment, 'id' | 'version'>) {
    const response = await apiRequest<InteractionComment>(`${base(type, id)}/comments${existing ? `/${encodeURIComponent(existing.id)}` : ''}`, {
      method: existing ? 'PUT' : 'POST', body: existing ? { content, version: existing.version } : { content },
    });
    return response.data;
  },
  async submitReview(type: InteractionTarget, id: string, input: ReviewInput, photos: File[], existing?: Pick<InteractionComment, 'id' | 'version'>) {
    const response = await apiRequest<InteractionComment>(
      existing
        ? `${base(type, id)}/comments/${encodeURIComponent(existing.id)}/review`
        : `${base(type, id)}/reviews`,
      {
        method: existing ? 'PUT' : 'POST',
        body: reviewForm({ ...input, version: existing?.version, photoUrls: existing ? input.photoUrls : [] }, photos),
      },
    );
    return response.data;
  },
  async deleteComment(type: InteractionTarget, id: string, commentId: string, version: number) {
    await apiRequest(`${base(type, id)}/comments/${encodeURIComponent(commentId)}?version=${version}`, { method: 'DELETE' });
  },
  async adminComments(type: InteractionTarget | '', page: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: '20' });
    if (type) query.set('type', type);
    const response = await apiRequest<PageResponse<InteractionComment>>(`/admin/content-interactions/comments?${query}`, { signal });
    return response.data;
  },
  async adminRatings(type: InteractionTarget | '', page: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: '20' });
    if (type) query.set('type', type);
    const response = await apiRequest<PageResponse<AdminInteractionRating>>(`/admin/content-interactions/ratings?${query}`, { signal });
    return response.data;
  },
  async adminDeleteComment(id: string, version: number) {
    await apiRequest(`/admin/content-interactions/comments/${encodeURIComponent(id)}?version=${version}`, { method: 'DELETE' });
  },
  async adminDeleteRating(id: string) {
    await apiRequest(`/admin/content-interactions/ratings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
