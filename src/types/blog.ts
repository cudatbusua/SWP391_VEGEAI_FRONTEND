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
  KITCHEN: 'Góc bếp & Công thức',
  NUTRITION: 'Dinh dưỡng thực vật',
  GREEN_LIVING: 'Lối sống xanh',
  EXPLORATION: 'Khám phá & Quán chay'
};

export const RECIPE_POST_TEMPLATE = `Nguyên liệu:
- Đậu hũ khuôn: 3 bìa
- Nấm đông cô tươi: 150 g
- Tiêu xanh: 2 chùm
- Nước tương Tamari, mật mía, nước dừa tươi: Vừa đủ

Các bước thực hiện:
1. Đậu hũ khuôn cắt miếng vuông, chiên vàng giòn 4 mặt.
2. Nấm đông cô ngâm mềm rửa sạch, khía chữ thập trên mũ nấm.
3. Cho đậu hũ và nấm vào tộ đất, ướp cùng nước tương Tamari, mật mía, tiêu xanh đập dập trong 10 phút.
4. Bắc tộ lên bếp đun sôi, thêm 100ml nước dừa, kho nhỏ lửa 15 phút cho nước keo lại óng ánh.`;

export const blogStatuses: Record<BlogStatus, string> = {
  ARCHIVED: 'Kho đã ẩn',
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối'
};
