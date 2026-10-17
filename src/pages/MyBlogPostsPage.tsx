import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, FilePenLine, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogStatus } from '../types/blog';
import { blogCategories, blogStatuses } from '../types/blog';
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
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    blogService
      .mine(status, page, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [isAuthenticated, status, page, reload]);
  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess>
          <Link to="/blog" className="blog-back">
            <ArrowLeft size={15} /> Cộng đồng VEGEAI
          </Link>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">GÓC CHIA SẺ CỦA BẠN</span>
              <h1>Bài đăng Cộng đồng của tôi</h1>
              <p>Theo dõi tiến trình AI Kiểm duyệt (Lớp 1) và Admin Phê duyệt (Lớp 2) cho các bài chia sẻ của bạn.</p>
            </div>
            <Link className="blog-button" to="/blog/write">
              <Plus size={17} /> Đăng bài / Chia sẻ Video
            </Link>
          </header>
          <div className="blog-filter-bar">
            <div className="blog-tabs">
              <button
                aria-pressed={!status}
                onClick={() => {
                  setStatus('');
                  setPage(0);
                }}
              >
                Tất cả
              </button>
              {Object.entries(blogStatuses).map(([code, label]) => (
                <button
                  key={code}
                  aria-pressed={status === code}
                  onClick={() => {
                    setStatus(code as BlogStatus);
                    setPage(0);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="blog-actions">
              <span className="blog-count">{data?.totalElements ?? 0} bài đăng</span>
              <button
                className="blog-icon-button"
                title="Tải lại danh sách"
                aria-label="Tải lại danh sách"
                disabled={busy}
                onClick={() => setReload(value => value + 1)}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
          {busy && (
            <p role="status" className="blog-empty">
              Đang tải bài đăng...
            </p>
          )}
          {!busy && !error && !data?.items.length && (
            <div className="blog-empty">
              <FilePenLine size={32} />
              <h2>Chưa có bài đăng ở mục này</h2>
              <p>Chia sẻ công thức hoặc video bếp chay đầu tiên của bạn với Cộng đồng VEGEAI.</p>
              <Link className="blog-button" to="/blog/write">
                <Plus size={16} /> Đăng bài mới
              </Link>
            </div>
          )}
          {!busy && !error && (
            <div className="blog-own-list">
              {data?.items.map(post => (
                <article key={post.postId} className="blog-own-row">
                  <Link to={'/blog/my-posts/' + post.postId} className="blog-own-image">
                    <BlogCover post={post} />
                  </Link>
                  <div className="blog-own-info">
                    <div className="blog-own-meta">
                      <BlogBadge status={post.status} />
                      <span>{blogCategories[post.category]}</span>
                      {post.aiModerationStatus && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Sparkles size={12} /> AI: {post.aiSafetyScore ?? 95}/100
                        </span>
                      )}
                    </div>
                    <Link to={'/blog/my-posts/' + post.postId}>
                      <h2>{post.title}</h2>
                    </Link>
                    <p>Cập nhật {blogDate(post.updatedAt)}</p>
                    {post.status === 'REJECTED' && post.moderationReason && (
                      <p className="blog-rejection-preview">{post.moderationReason}</p>
                    )}
                  </div>
                  <div className="blog-row-actions">
                    <Link
                      to={'/blog/my-posts/' + post.postId}
                      className="blog-icon-button"
                      title="Xem trạng thái"
                      aria-label={'Xem trạng thái ' + post.title}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                    {['DRAFT', 'REJECTED'].includes(post.status) && (
                      <Link
                        to={'/blog/my-posts/' + post.postId + '/edit'}
                        className="blog-icon-button"
                        title="Chỉnh sửa"
                        aria-label={'Chỉnh sửa ' + post.title}
                      >
                        <FilePenLine size={17} />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <BlogPagination data={data} busy={busy} change={setPage} />
        </BlogAccess>
      </div>
    </MainLayout>
  );
}
