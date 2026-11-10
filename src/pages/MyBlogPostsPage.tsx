import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, FilePenLine, RefreshCw, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogStatus } from '../types/blog';
import { blogStatuses, blogCategories } from '../types/blog';
import type { PageResponse } from '../types/api';
import '../styles/blog.css';

export function MyBlogPostsPage() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<BlogStatus | ''>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const runAction = async (post: BlogPost, action: 'archive' | 'restore' | 'delete') => {
    if (actionBusy) return;
    const destructive = action === 'delete';
    if (!window.confirm(destructive ? 'Xóa vĩnh viễn bài viết này?' : action === 'archive' ? 'Ẩn bài viết này khỏi cộng đồng?' : 'Khôi phục bài viết này?')) return;
    setActionBusy(post.postId); setError('');
    try {
      if (action === 'archive') await blogService.archive(post.postId, post.version);
      else if (action === 'restore') await blogService.restore(post.postId, post.version);
      else await blogService.deletePermanent(post.postId, post.version);
      setReload(value => value + 1);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setActionBusy(null); }
  };
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController(); setBusy(true); setError('');
    blogService.mine(status, page, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [isAuthenticated, status, page, reload]);
  return <MainLayout><div className="blog-shell"><BlogAccess><Link to="/blog" className="blog-back"><ArrowLeft size={15} /> Blog cộng đồng</Link><header className="blog-page-heading"><div><span className="blog-eyebrow">GÓC CHIA SẺ CỦA BẠN</span><h1>Bài viết của tôi</h1><p>Những câu chuyện bạn gửi đến cộng đồng VEGEAI.</p></div><Link className="blog-button" to="/blog/write"><Plus size={17} /> Viết bài mới</Link></header>
    <div className="blog-filter-bar"><div className="blog-tabs"><button aria-pressed={!status} onClick={() => { setStatus(''); setPage(0); }}>Tất cả</button>{Object.entries(blogStatuses).map(([code, label]) => <button key={code} aria-pressed={status === code} onClick={() => { setStatus(code as BlogStatus); setPage(0); }}>{label}</button>)}</div><div className="blog-actions"><span className="blog-count">{data?.totalElements ?? 0} bài viết</span><button className="blog-icon-button" title="Tải lại danh sách" aria-label="Tải lại danh sách" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /></button></div></div>
    {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
    {busy && <p role="status" className="blog-empty">Đang tải bài viết...</p>}
    {!busy && !error && !data?.items.length && <div className="blog-empty"><FilePenLine size={32} /><h2>Chưa có bài viết ở mục này</h2><p>Câu chuyện tiếp theo bắt đầu từ căn bếp của bạn.</p><Link className="blog-button" to="/blog/write"><Plus size={16} /> Viết bài</Link></div>}
    {!busy && !error && <div className="blog-own-list">{data?.items.map(post => <article key={post.postId} className="blog-own-row"><Link to={'/blog/my-posts/' + post.postId} className="blog-own-image"><BlogCover post={{ ...post, postId: post.postId }} /></Link><div className="blog-own-info"><div className="blog-own-meta"><BlogBadge status={post.status} /><span>{blogCategories[post.category]}</span></div><Link to={'/blog/my-posts/' + post.postId}><h2>{post.title}</h2></Link><p>Cập nhật {blogDate(post.updatedAt)}</p>{post.status === 'REJECTED' && post.moderationReason && <p className="blog-rejection-preview">{post.moderationReason}</p>}</div><div className="blog-row-actions owner-management-actions"><Link to={'/blog/my-posts/' + post.postId + '/edit'} className="owner-action edit" title="Chỉnh sửa bài viết"><FilePenLine size={16} /> Chỉnh sửa</Link>{post.status === 'ARCHIVED' && <button className="owner-action restore" disabled={actionBusy === post.postId} onClick={() => runAction(post, 'restore')} title="Hiện lại bài viết"><RotateCcw size={16} /> Hiện lại</button>}{post.status === 'PUBLISHED' && <button className="owner-action hide" disabled={actionBusy === post.postId} onClick={() => runAction(post, 'archive')} title="Ẩn bài viết"><Archive size={16} /> Ẩn</button>}<button className="owner-action delete" disabled={actionBusy === post.postId} onClick={() => runAction(post, 'delete')} title="Xóa vĩnh viễn bài viết"><Trash2 size={16} /> Xóa</button></div></article>)}</div>}
    <BlogPagination data={data} busy={busy} change={setPage} />
  </BlogAccess></div></MainLayout>;
}
