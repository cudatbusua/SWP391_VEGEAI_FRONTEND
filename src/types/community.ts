export type QuestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export interface Question {
  id: string; authorName: string; content: string; status: QuestionStatus;
  answer?: string; answeredBy?: string; answeredAt?: string;
  moderationReason?: string; reviewedBy?: string; reviewedAt?: string;
  createdAt: string; updatedAt: string; version: number;
}
export interface CommunityVideo {
  id: string; title: string; description?: string; videoUrl: string; thumbnailUrl?: string;
  category?: string; durationSeconds?: number; status: VideoStatus; createdBy: string;
  aiModerationStatus?: 'NOT_CHECKED' | 'CHECKING' | 'SAFE' | 'FLAGGED' | 'UNAVAILABLE';
  aiModerationReason?: string; aiModerationAgreedWithAdmin?: boolean;
  createdAt: string; updatedAt: string; version: number;
}
export interface VideoInput {
  title: string; description: string; videoUrl: string; thumbnailUrl: string;
  category: string; durationSeconds?: number; status: VideoStatus; version?: number;
}
export interface VideoComment {
  id: string; videoId: string; authorId: string; authorName: string; content: string;
  createdAt: string; updatedAt: string; version: number;
}
export const questionStatuses: Record<QuestionStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
export const videoCategories: Record<string, string> = { MON_CHAY: 'Món chay', MON_VIET: 'Món Việt', DO_UONG: 'Đồ uống', LAM_BANH: 'Làm bánh', MEO_BEP: 'Mẹo nhà bếp' };
