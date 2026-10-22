import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Search, ShieldCheck, RefreshCw, Plus, FileText } from 'lucide-react';
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
  return <MainLayout><div className="blog-shell"><BlogAccess admin><Link to="/admin" className="blog-back"><ArrowLeft size={15} /> Quản trị hệ thống</Link><header className="blog-page-heading"><div><span className="blog-eyebrow"><ShieldCheck size={15} /> BAN BIÊN TẬP VEGEAI</span><h1>Quản lý Blog</h1><p>Xem xét những câu chuyện được gửi từ cộng đồng.</p></div><div className="blog-actions"><Link className="blog-button" to="/blog/write"><Plus size={16} /> Viết bài</Link><Link className="blog-button secondary" to="/blog/my-posts"><FileText size={16} /> Bài tôi viết</Link><Link className="blog-button secondary" to="/blog">Xem Blog <ArrowUpRight size={15} /></Link><button className="blog-icon-button" title="Tải lại danh sách" aria-label="Tải lại danh sách" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /></button></div></header>
    <div className="blog-filter-bar"><div className="blog-tabs">{(['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] as BlogStatus[]).map(value => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(0); }}>{blogStatuses[value]}</button>)}</div><label className="blog-search"><Search size={17} /><input aria-label="Tìm bài chờ duyệt" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(0); }} placeholder="Tìm theo tiêu đề..." /></label></div>
    {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}{busy && <p role="status" className="blog-empty">Đang tải hàng chờ...</p>}
    {!busy && !error && !data?.items.length && <div className="blog-empty"><ShieldCheck size={34} /><h2>Không có bài viết ở mục này</h2></div>}
    {!busy && !error && <div className="blog-own-list">{data?.items.map(post => <article key={post.postId} className="blog-own-row"><Link className="blog-own-image" to={'/admin/blog/' + post.postId}><BlogCover post={{ ...post, postId: post.postId }} /></Link><div className="blog-own-info"><div className="flex flex-wrap items-center gap-2"><BlogBadge status={post.status} />{post.aiModerationStatus === 'FLAGGED' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">⚠️ AI Cảnh báo: {post.aiModerationReason || 'Cần kiểm tra kỹ'}</span> : post.aiModerationStatus === 'PASSED' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">🛡️ AI Sơ kiểm an toàn</span> : null}</div><Link to={'/admin/blog/' + post.postId}><h2>{post.title}</h2></Link><p>{post.authorName} · {blogDate(post.submittedAt || post.updatedAt)}</p><p>{post.excerpt}</p></div><Link className="blog-button secondary" to={'/admin/blog/' + post.postId}>Xem xét <ArrowUpRight size={16} /></Link></article>)}</div>}
    <BlogPagination data={data} busy={busy} change={setPage} />
  </BlogAccess></div></MainLayout>;
}
