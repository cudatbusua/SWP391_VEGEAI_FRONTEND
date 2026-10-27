export type BlogStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type BlogCategory = 'KITCHEN' | 'GREEN_LIVING' | 'EXPLORATION' | 'NUTRITION';

export interface BlogPost {
  postId: string;
  authorId: string;
  authorName: string;
  title: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  videoUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
  category: BlogCategory;
  status: BlogStatus;
  version: number;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  reviewerName?: string;
  moderationReason?: string;
  aiModerationStatus?: string;
  aiModerationReason?: string;
}

export interface BlogInput {
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  coverImage: string;
  videoUrl?: string;
  version?: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  rating: number;
  createdAt: string;
}

export const blogCategories: Record<BlogCategory, string> = {
  KITCHEN: 'Vào bếp',
  GREEN_LIVING: 'Sống xanh',
  EXPLORATION: 'Khám phá',
  NUTRITION: 'Dinh dưỡng'
};

export const blogStatuses: Record<BlogStatus, string> = {
  ARCHIVED: 'Kho đã ẩn',
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối'
};
