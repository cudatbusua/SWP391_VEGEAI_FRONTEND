import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Search, ShieldCheck, RefreshCw } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogStatus } from '../types/blog';
import { blogStatuses } from '../types/blog';
import type { PageResponse } from '../types/api';
import '../styles/blog.css';

export function AdminBlogPage() {
  const { isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<BlogStatus>('PENDING_REVIEW');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    const controller = new AbortController(); setBusy(true); setError('');
    const timer = setTimeout(() => { blogService.queue(status, keyword, page, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); }); }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isAuthenticated, user?.role, status, keyword, page, reload]);
  return <MainLayout><div className="blog-shell"><BlogAccess admin><Link to="/admin" className="blog-back"><ArrowLeft size={15} /> Quản trị hệ thống</Link><header className="blog-page-heading"><div><span className="blog-eyebrow"><ShieldCheck size={15} /> BAN BIÊN TẬP VEGEAI</span><h1>Duyệt bài Blog</h1><p>Xem xét những câu chuyện được gửi từ cộng đồng.</p></div><div className="blog-actions"><span className="blog-count">{data?.totalElements ?? 0} bài viết</span><button className="blog-icon-button" title="Tải lại danh sách" aria-label="Tải lại danh sách" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /></button></div></header>
    <div className="blog-filter-bar"><div className="blog-tabs">{(['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] as BlogStatus[]).map(value => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(0); }}>{blogStatuses[value]}</button>)}</div><label className="blog-search"><Search size={17} /><input aria-label="Tìm bài chờ duyệt" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(0); }} placeholder="Tìm theo tiêu đề..." /></label></div>
    {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}{busy && <p role="status" className="blog-empty">Đang tải hàng chờ...</p>}
    {!busy && !error && !data?.items.length && <div className="blog-empty"><ShieldCheck size={34} /><h2>Không có bài viết ở mục này</h2></div>}
    {!busy && !error && <div className="blog-own-list">{data?.items.map(post => <article key={post.postId} className="blog-own-row"><Link className="blog-own-image" to={'/admin/blog/' + post.postId}><BlogCover post={post} /></Link><div className="blog-own-info"><BlogBadge status={post.status} /><Link to={'/admin/blog/' + post.postId}><h2>{post.title}</h2></Link><p>{post.authorName} · {blogDate(post.submittedAt || post.updatedAt)}</p><p>{post.excerpt}</p></div><Link className="blog-button secondary" to={'/admin/blog/' + post.postId}>Xem xét <ArrowUpRight size={16} /></Link></article>)}</div>}
    <BlogPagination data={data} busy={busy} change={setPage} />
  </BlogAccess></div></MainLayout>;
}
