import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Copy,
  FilePenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Video,
  XCircle,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError, blogDate } from '../components/BlogUi';
import { VideoPlayer } from '../components/CommunityUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import type { BlogPost } from '../types/blog';
import { blogCategories } from '../types/blog';
import '../styles/blog.css';

export function BlogPostStatusPage({ adminMode = false }: { adminMode?: boolean }) {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<'APPROVE' | 'REJECT' | 'DELETE' | 'WITHDRAW' | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || (adminMode && user?.role !== 'admin')) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPost(null);
    setConfirm(null);
    setReason('');
    (adminMode
      ? blogService.reviewPost(id || '', controller.signal)
      : blogService.ownPost(id || '', controller.signal)
    )
      .then(value => {
        if (!controller.signal.aborted) setPost(value);
      })
      .catch(value => {
        if (!controller.signal.aborted) setError(errorMessage(value));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, isAuthenticated, user?.role, adminMode, reload]);

  useEffect(() => {
    if (adminMode || !isAuthenticated || !id || post?.status !== 'PENDING_REVIEW' || busy || confirm) return;
    const controller = new AbortController();
    let inFlight = false;
    const timer = window.setInterval(async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const latest = await blogService.ownPost(id, controller.signal);
        if (!controller.signal.aborted) {
          setPost(latest);
          if (latest.status !== 'PENDING_REVIEW') setMessage('Trạng thái bài đăng vừa được cập nhật.');
        }
      } catch {
        /* Keep the current view during transient polling failures. */
      } finally {
        inFlight = false;
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [adminMode, isAuthenticated, id, post?.status, busy, confirm]);

  const action = async (operation: 'SUBMIT' | 'WITHDRAW' | 'DELETE' | 'APPROVE' | 'REJECT') => {
    if (!post || busy) return;
    if (operation === 'REJECT' && !reason.trim()) {
      setError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (operation === 'DELETE') {
        await blogService.remove(post.postId, post.version);
        navigate('/blog/my-posts');
        return;
      }
      const value =
        operation === 'SUBMIT'
          ? await blogService.submit(post.postId, post.version)
          : operation === 'WITHDRAW'
          ? await blogService.withdraw(post.postId, post.version)
          : await blogService.review(post.postId, post.version, operation, reason.trim());
      setPost(value);
      setConfirm(null);
      setReason('');
      setMessage(
        operation === 'SUBMIT'
          ? 'Bài đăng đã hoàn tất Lớp 1 (AI Kiểm duyệt) và chuyển sang Lớp 2 (Chờ Admin phê duyệt).'
          : operation === 'WITHDRAW'
          ? 'Đã rút bài về bản nháp.'
          : operation === 'APPROVE'
          ? 'Đã phê duyệt Lớp 2 — Bài đăng đã được công khai lên Cộng đồng!'
          : 'Đã gửi lý do từ chối cho tác giả.'
      );
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setBusy(false);
    }
  };

  const publicUrl = post ? window.location.origin + '/blog/' + post.postId : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Đã sao chép liên kết.');
    } catch {
      setError('Không thể sao chép tự động. Bạn có thể chọn đường dẫn bên dưới.');
    }
  };

  const headline = post
    ? {
        DRAFT: 'Bài chia sẻ của bạn đang ở trạng thái nháp',
        PENDING_REVIEW: 'Đã qua AI Kiểm duyệt (Lớp 1) · Đang chờ Admin duyệt (Lớp 2)',
        PUBLISHED: 'Bài đăng đã được công khai trên Cộng đồng',
        REJECTED: 'Bài đăng cần được chỉnh sửa theo góp ý',
      }[post.status]
    : '';
  const StatusIcon =
    post?.status === 'PUBLISHED'
      ? BadgeCheck
      : post?.status === 'REJECTED'
      ? XCircle
      : post?.status === 'PENDING_REVIEW'
      ? Clock
      : FilePenLine;

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess admin={adminMode}>
          <Link to={adminMode ? '/admin/blog' : '/blog/my-posts'} className="blog-back">
            <ArrowLeft size={15} />
            {adminMode ? 'Hàng chờ duyệt Cộng đồng (AI & Admin)' : 'Bài đăng Cộng đồng của tôi'}
          </Link>
          {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
          {message && (
            <p role="status" className="blog-message">
              {message}
            </p>
          )}
          {loading && (
            <p role="status" className="blog-empty">
              Đang tải thông tin kiểm duyệt bài đăng...
            </p>
          )}
          {post && (
            <>
              <header className={'blog-status-banner ' + post.status.toLowerCase()}>
                <StatusIcon size={42} />
                <div>
                  <BlogBadge status={post.status} />
                  <h1>
                    {adminMode && post.status === 'PENDING_REVIEW'
                      ? 'Kiểm duyệt Lớp 2 (Admin): Xem xét bài đăng Cộng đồng'
                      : headline}
                  </h1>
                  <p>
                    {post.status === 'PUBLISHED'
                      ? 'Bài đăng đã vượt qua 2 lớp kiểm duyệt (AI & Admin) và xuất hiện công khai trên Cộng đồng VEGEAI.'
                      : post.status === 'PENDING_REVIEW'
                      ? 'AI Kiểm duyệt (Lớp 1) đã đánh giá nội dung. Admin đang thực hiện phê duyệt (Lớp 2) trước khi public.'
                      : post.status === 'REJECTED'
                      ? 'Xem góp ý bên dưới, chỉnh sửa và gửi duyệt lại.'
                      : 'Lưu ý tưởng của bạn và nhấn Gửi AI & Admin duyệt khi đã sẵn sàng.'}
                  </p>
                </div>
              </header>

              {/* Layer 1 AI Content Moderation Report Card */}
              {post.aiModerationStatus && (
                <section
                  aria-label="Báo cáo AI Kiểm duyệt Lớp 1"
                  className={`mb-6 rounded-2xl border p-5 ${
                    post.aiModerationStatus === 'AI_FLAGGED'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {post.aiModerationStatus === 'AI_FLAGGED' ? (
                        <AlertTriangle size={18} className="text-amber-600" />
                      ) : (
                        <Sparkles size={18} className="text-emerald-700" />
                      )}
                      <span>
                        Báo cáo Kiểm duyệt Lớp 1 (AI Moderation):{' '}
                        {post.aiModerationStatus === 'AI_FLAGGED'
                          ? 'AI Cảnh báo cần Admin lưu ý'
                          : 'AI Đánh giá Đạt chuẩn Thuần chay & An toàn'}
                      </span>
                    </div>
                    {post.aiSafetyScore != null && (
                      <span className="px-3 py-1 rounded-full bg-white border border-emerald-200 text-xs font-extrabold text-emerald-800">
                        Điểm an toàn AI: {post.aiSafetyScore}/100
                      </span>
                    )}
                  </div>
                  {post.aiModerationNotes && <p className="text-xs leading-6">{post.aiModerationNotes}</p>}
                </section>
              )}

              <div className="blog-review-grid">
                <div className="blog-review-main">
                  <div className="blog-review-title">
                    <span className="blog-eyebrow">{blogCategories[post.category]}</span>
                    <h2>{post.title}</h2>
                    <div className="blog-public-meta">
                      <span>Tác giả: {post.authorName}</span>
                      <span>{post.readingMinutes} phút đọc</span>
                      <span>Cập nhật {blogDate(post.updatedAt)}</span>
                    </div>
                  </div>
                  {post.status === 'REJECTED' && (
                    <section className="blog-rejection-note">
                      <h3>
                        <ShieldCheck size={17} /> Lý do từ chối từ Admin kiểm duyệt
                      </h3>
                      <p>{post.moderationReason}</p>
                      <span>
                        {post.reviewerName} · {blogDate(post.reviewedAt)}
                      </span>
                    </section>
                  )}
                  <BlogCover post={post} />
                  {post.videoUrl && (
                    <div className="my-5">
                      <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                        <Video size={16} /> Video Bếp Chay đính kèm
                      </h3>
                      <VideoPlayer
                        video={{
                          id: post.postId,
                          title: post.title,
                          videoUrl: post.videoUrl,
                          thumbnailUrl: post.coverImage,
                        }}
                      />
                    </div>
                  )}
                  <p className="blog-lead">{post.excerpt}</p>
                  <BlogBody content={post.content || ''} />
                  <section className="blog-review-history">
                    <h3>
                      <ShieldCheck size={17} /> Tiến trình Kiểm duyệt 2 lớp (AI → Admin)
                    </h3>
                    <ol>
                      <li>
                        <span>Khởi tạo bản nháp</span>
                        <time>{blogDate(post.createdAt)}</time>
                      </li>
                      {post.submittedAt && (
                        <li>
                          <span>
                            Lớp 1 — AI Kiểm duyệt tự động (
                            {post.aiModerationStatus === 'AI_FLAGGED' ? 'Cảnh báo' : 'Đạt chuẩn'}{' '}
                            {post.aiSafetyScore != null ? `${post.aiSafetyScore}/100` : ''})
                          </span>
                          <time>{blogDate(post.submittedAt)}</time>
                        </li>
                      )}
                      {post.reviewedAt && (
                        <li>
                          <span>
                            Lớp 2 — Admin {post.status === 'PUBLISHED' ? 'Phê duyệt & Public' : 'Từ chối'} ·{' '}
                            {post.reviewerName}
                          </span>
                          <time>{blogDate(post.reviewedAt)}</time>
                        </li>
                      )}
                    </ol>
                  </section>
                </div>
                <aside className="blog-review-side">
                  <h3>{adminMode ? 'Quyết định Kiểm duyệt Lớp 2 (Admin)' : 'Hành động tiếp theo'}</h3>
                  {adminMode ? (
                    post.status === 'PENDING_REVIEW' ? (
                      <>
                        <button
                          className="blog-button"
                          disabled={busy}
                          onClick={() => {
                            setConfirm('APPROVE');
                            setError('');
                          }}
                        >
                          <BadgeCheck size={17} /> Duyệt Lớp 2 & Public bài
                        </button>
                        <button
                          className="blog-button danger-outline"
                          disabled={busy}
                          onClick={() => {
                            setConfirm('REJECT');
                            setError('');
                          }}
                        >
                          <XCircle size={17} /> Từ chối kèm lý do
                        </button>
                      </>
                    ) : (
                      <p className="blog-moderation-note">Bài đăng đã hoàn tất quy trình kiểm duyệt 2 lớp.</p>
                    )
                  ) : (
                    <>
                      {['DRAFT', 'REJECTED'].includes(post.status) && (
                        <>
                          <Link className="blog-button" to={'/blog/my-posts/' + post.postId + '/edit'}>
                            <FilePenLine size={17} />
                            {post.status === 'REJECTED' ? 'Chỉnh sửa và gửi lại' : 'Tiếp tục viết'}
                          </Link>
                          {post.status === 'DRAFT' && (
                            <button
                              className="blog-button secondary"
                              disabled={busy}
                              onClick={() => action('SUBMIT')}
                            >
                              <Send size={16} />
                              Gửi AI & Admin duyệt
                            </button>
                          )}
                          <button
                            className="blog-button danger-outline"
                            disabled={busy}
                            onClick={() => setConfirm('DELETE')}
                          >
                            <Trash2 size={16} /> Xóa bài đăng
                          </button>
                        </>
                      )}
                      {post.status === 'PENDING_REVIEW' && (
                        <>
                          {user?.role === 'admin' && (
                            <Link className="blog-button" to={'/admin/blog/' + post.postId}>
                              <ShieldCheck size={16} /> Chuyển sang trang Admin Phê duyệt (Lớp 2)
                            </Link>
                          )}
                          <button
                            className="blog-button secondary"
                            disabled={busy}
                            onClick={() => setConfirm('WITHDRAW')}
                          >
                            <Undo2 size={16} /> Rút bài để chỉnh sửa
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {post.status === 'PUBLISHED' && (
                    <>
                      {!adminMode && user?.role === 'admin' && post.authorId === user.id && (
                        <Link className="blog-button secondary" to={'/blog/my-posts/' + post.postId + '/edit'}>
                          <FilePenLine size={16} /> Chỉnh sửa bài đăng
                        </Link>
                      )}
                      <Link to={'/blog/' + post.postId} className="blog-button">
                        <ArrowUpRight size={17} /> Xem bài trên Cộng đồng
                      </Link>
                      <label className="blog-link-field">
                        Đường dẫn công khai
                        <input
                          aria-label="Đường dẫn công khai"
                          readOnly
                          value={publicUrl}
                          onFocus={event => event.target.select()}
                        />
                      </label>
                      <button className="blog-button secondary" onClick={copy}>
                        <Copy size={16} /> Sao chép liên kết
                      </button>
                    </>
                  )}
                  {confirm && (
                    <div className="blog-confirm" role="alert">
                      <h4>
                        {confirm === 'APPROVE'
                          ? 'Phê duyệt Lớp 2 và Public bài đăng này lên Cộng đồng?'
                          : confirm === 'REJECT'
                          ? 'Lý do từ chối'
                          : confirm === 'WITHDRAW'
                          ? 'Rút bài về bản nháp?'
                          : 'Xóa vĩnh viễn bài đăng?'}
                      </h4>
                      {confirm === 'REJECT' && (
                        <textarea
                          aria-label="Lý do từ chối"
                          maxLength={2000}
                          rows={5}
                          value={reason}
                          onChange={event => setReason(event.target.value)}
                          placeholder="Góp ý cụ thể để tác giả chỉnh sửa..."
                        />
                      )}
                      <div>
                        <button
                          className={'blog-button ' + (confirm === 'DELETE' || confirm === 'REJECT' ? 'danger' : '')}
                          disabled={busy || (confirm === 'REJECT' && !reason.trim())}
                          onClick={() => action(confirm)}
                        >
                          {busy ? 'Đang xử lý...' : 'Xác nhận'}
                        </button>
                        <button className="blog-button secondary" disabled={busy} onClick={() => setConfirm(null)}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                  <Link className="blog-back" to={adminMode ? '/admin/blog' : '/blog/my-posts'}>
                    <ArrowLeft size={15} /> Về danh sách
                  </Link>
                </aside>
              </div>
            </>
          )}
        </BlogAccess>
      </div>
    </MainLayout>
  );
}
