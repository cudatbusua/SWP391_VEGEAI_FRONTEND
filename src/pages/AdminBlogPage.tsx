import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
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
    const controller = new AbortController();
    setBusy(true);
    setError('');
    const timer = setTimeout(() => {
      blogService
        .queue(status, keyword, page, controller.signal)
        .then(value => {
          if (!controller.signal.aborted) setData(value);
        })
        .catch(reason => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, user?.role, status, keyword, page, reload]);

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess admin>
          <Link to="/admin" className="blog-back">
            <ArrowLeft size={15} /> Quản trị hệ thống
          </Link>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">
                <ShieldCheck size={15} /> KIỂM DUYỆT CỘNG ĐỒNG 2 LỚP (AI → ADMIN)
              </span>
              <h1>Quản lý & Phê duyệt Cộng đồng</h1>
              <p>
                Xem báo cáo AI Kiểm duyệt (Lớp 1) và thực hiện phê duyệt của Admin (Lớp 2) trước khi public bài đăng của Thành viên hoặc Admin lên Cộng đồng.
              </p>
            </div>
            <div className="blog-actions">
              <Link className="blog-button" to="/blog/write">
                <Plus size={16} /> Đăng bài Cộng đồng
              </Link>
              <Link className="blog-button secondary" to="/blog/my-posts">
                <FileText size={16} /> Bài tôi đăng
              </Link>
              <Link className="blog-button secondary" to="/blog">
                Xem Cộng đồng <ArrowUpRight size={15} />
              </Link>
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
          </header>

          <div className="blog-filter-bar">
            <div className="blog-tabs">
              {(['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] as BlogStatus[]).map(value => (
                <button
                  key={value}
                  aria-pressed={status === value}
                  onClick={() => {
                    setStatus(value);
                    setPage(0);
                  }}
                >
                  {blogStatuses[value]}
                </button>
              ))}
            </div>
            <label className="blog-search">
              <Search size={17} />
              <input
                aria-label="Tìm bài chờ duyệt"
                value={keyword}
                onChange={event => {
                  setKeyword(event.target.value);
                  setPage(0);
                }}
                placeholder="Tìm theo tiêu đề bài đăng..."
              />
            </label>
          </div>

          {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
          {busy && (
            <p role="status" className="blog-empty">
              Đang tải hàng chờ kiểm duyệt...
            </p>
          )}
          {!busy && !error && !data?.items.length && (
            <div className="blog-empty">
              <ShieldCheck size={34} />
              <h2>Không có bài đăng Cộng đồng ở mục này</h2>
            </div>
          )}
          {!busy && !error && (
            <div className="blog-own-list">
              {data?.items.map(post => (
                <article key={post.postId} className="blog-own-row">
                  <Link className="blog-own-image" to={'/admin/blog/' + post.postId}>
                    <BlogCover post={post} />
                  </Link>
                  <div className="blog-own-info">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <BlogBadge status={post.status} />
                      {post.aiModerationStatus && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            post.aiModerationStatus === 'AI_FLAGGED'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {post.aiModerationStatus === 'AI_FLAGGED' ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          {post.aiModerationStatus === 'AI_FLAGGED' ? 'AI Cảnh báo' : 'AI Đạt chuẩn'}{' '}
                          {post.aiSafetyScore != null ? `(${post.aiSafetyScore}/100)` : ''}
                        </span>
                      )}
                      {post.videoUrl && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                          <Video size={12} /> Kèm Video
                        </span>
                      )}
                    </div>
                    <Link to={'/admin/blog/' + post.postId}>
                      <h2>{post.title}</h2>
                    </Link>
                    <p>
                      Tác giả: {post.authorName} · {blogDate(post.submittedAt || post.updatedAt)}
                    </p>
                    <p>{post.excerpt}</p>
                    {post.aiModerationNotes && (
                      <p className="text-xs text-emerald-800 mt-1">
                        <strong>AI Lớp 1:</strong> {post.aiModerationNotes}
                      </p>
                    )}
                  </div>
                  <Link className="blog-button secondary" to={'/admin/blog/' + post.postId}>
                    Duyệt Lớp 2 <ArrowUpRight size={16} />
                  </Link>
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
