import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { BadgeCheck, Clock, FileText, XCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogStatus } from '../types/blog';
import { blogStatuses } from '../types/blog';
import type { PageResponse } from '../types/api';

export function BlogAccess({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { isLoading, isAuthenticated, user, sessionError, retrySession } = useAuth();
  const location = useLocation();
  if (isLoading) return <p className="blog-empty" role="status">Đang tải phiên đăng nhập...</p>;
  if (sessionError && !isAuthenticated) return <BlogError message={sessionError} retry={retrySession} />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user?.role !== 'admin') return <p role="alert" className="blog-empty">Bạn cần quyền admin để duyệt bài viết.</p>;
  return children;
}
export function BlogBadge({ status }: { status: BlogStatus }) {
  const Icon = { DRAFT: FileText, PENDING_REVIEW: Clock, PUBLISHED: BadgeCheck, REJECTED: XCircle }[status];
  return <span className={'blog-badge ' + status.toLowerCase()}><Icon size={14} />{blogStatuses[status]}</span>;
}
export function BlogCover({ post }: { post: Pick<BlogPost, 'coverImage' | 'title'> }) {
  return <div className="blog-cover"><img src={post.coverImage || '/images/vietnamese-vegan-table.png'} alt={post.title} loading="lazy" onError={event => {
    if (!event.currentTarget.src.endsWith('/images/vietnamese-vegan-table.png')) event.currentTarget.src = '/images/vietnamese-vegan-table.png';
  }} /></div>;
}
export function BlogBody({ content }: { content: string }) {
  return <div className="blog-body">{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>;
}
export function BlogError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="blog-error"><p>{message}</p>{retry && <button onClick={retry}><RefreshCw size={15} /> Tải lại</button>}</div>;
}
export function BlogPagination({ data, busy, change }: { data: PageResponse<BlogPost> | null; busy: boolean; change: (page: number) => void }) {
  if (!data || data.totalPages <= 1) return null;
  return <nav className="blog-pagination" aria-label="Phân trang bài viết"><button title="Trang trước" aria-label="Trang trước" disabled={busy || data.first} onClick={() => change(data.page - 1)}><ChevronLeft size={18} /></button><span>{data.page + 1} / {data.totalPages}</span><button title="Trang sau" aria-label="Trang sau" disabled={busy || data.last} onClick={() => change(data.page + 1)}><ChevronRight size={18} /></button></nav>;
}
export function blogDate(value?: string) {
  return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}
