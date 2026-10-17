export type BlogStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
export type BlogCategory = 'KITCHEN' | 'GREEN_LIVING' | 'EXPLORATION' | 'NUTRITION';
export interface BlogPost {
  postId: string; authorId: string; authorName: string; title: string; excerpt: string;
  content?: string; coverImage?: string; videoUrl?: string; category: BlogCategory; status: BlogStatus;
  version: number; readingMinutes: number; createdAt: string; updatedAt: string;
  submittedAt?: string; reviewedAt?: string; publishedAt?: string; reviewerName?: string; moderationReason?: string;
  aiModerationStatus?: string; aiSafetyScore?: number; aiModerationNotes?: string;
}
export interface BlogInput { title: string; excerpt: string; content: string; category: BlogCategory; coverImage: string; videoUrl?: string; version?: number; }
export const blogCategories: Record<BlogCategory, string> = { KITCHEN: 'Vào bếp & Video chay', GREEN_LIVING: 'Sống xanh', EXPLORATION: 'Khám phá', NUTRITION: 'Dinh dưỡng' };
export const blogStatuses: Record<BlogStatus, string> = { DRAFT: 'Bản nháp', PENDING_REVIEW: 'Chờ AI & Admin duyệt', PUBLISHED: 'Đã xuất bản', REJECTED: 'Bị từ chối' };
