import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, ArrowUpRight, BadgeCheck, Clock, Copy, FilePenLine, RotateCcw, Send, ShieldCheck, Trash2, Undo2, XCircle } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError, blogDate } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import type { BlogPost } from '../types/blog';
import { blogCategories } from '../types/blog';
import '../styles/blog.css';

const rejectionSuggestions = [
  'Tiêu đề hoặc nội dung chưa đủ rõ ràng',
  'Bài viết cần thêm thông tin, ví dụ hoặc hướng dẫn cụ thể',
  'Nội dung có dấu hiệu trùng lặp hoặc thiếu trích dẫn nguồn',
  'Ảnh bìa chưa phù hợp hoặc cần xác nhận quyền sử dụng',
  'Sai chính tả hoặc cần cải thiện cách diễn đạt',
  'Chưa phù hợp với chuyên mục đã chọn',
  'Cần điều chỉnh để phù hợp quy tắc cộng đồng',
];

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
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<'APPROVE' | 'REJECT' | 'ARCHIVE' | 'RESTORE' | 'PERMANENT_DELETE' | 'WITHDRAW' | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || (adminMode && user?.role !== 'admin')) return;
    const controller = new AbortController(); setLoading(true); setError(''); setPost(null); setConfirm(null); setReason(''); setSelectedReasons([]);
    (adminMode ? blogService.reviewPost(id || '', controller.signal) : blogService.ownPost(id || '', controller.signal)).then(value => { if (!controller.signal.aborted) setPost(value); })
      .catch(value => { if (!controller.signal.aborted) setError(errorMessage(value)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
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
          if (latest.status !== 'PENDING_REVIEW') setMessage('Trạng thái bài viết vừa được cập nhật.');
        }
      } catch { /* Keep the current view during transient polling failures. */ }
      finally { inFlight = false; }
    }, 15000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [adminMode, isAuthenticated, id, post?.status, busy, confirm]);
  useEffect(() => {
    if (!confirm) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setConfirm(null);
        setReason('');
        setSelectedReasons([]);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [confirm, busy]);
  const action = async (operation: 'SUBMIT' | 'WITHDRAW' | 'ARCHIVE' | 'RESTORE' | 'PERMANENT_DELETE' | 'APPROVE' | 'REJECT') => {
    if (!post || busy) return;
    // The backend stores selected reason suggestions and the moderator's detailed note in one field.
    const rejectionReason = [
      ...selectedReasons.map(value => `- ${value}`),
      ...(reason.trim() ? [reason.trim()] : []),
    ].join('\n');
    if (operation === 'REJECT' && !rejectionReason.trim()) { setError('Chọn ít nhất một gợi ý hoặc nhập góp ý cụ thể trước khi từ chối.'); return; }
    if (operation === 'REJECT' && rejectionReason.length > 2000) { setError('Lý do từ chối không được vượt quá 2.000 ký tự.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (operation === 'ARCHIVE') { await blogService.archive(post.postId, post.version); navigate('/blog/my-posts'); return; }
      if (operation === 'RESTORE') {
        const restored = await blogService.restore(post.postId, post.version);
        setPost(restored); setConfirm(null); setMessage('Đã khôi phục bài viết khỏi kho lưu trữ.'); return;
      }
      if (operation === 'PERMANENT_DELETE') {
        await blogService.deleteAny(post.postId, post.version); navigate('/blog/my-posts'); return;
      }
      const value = operation === 'SUBMIT' ? await blogService.submit(post.postId, post.version)
        : operation === 'WITHDRAW' ? await blogService.withdraw(post.postId, post.version)
        : await blogService.review(post.postId, post.version, operation, rejectionReason);
      setPost(value); setConfirm(null); setReason(''); setSelectedReasons([]); setMessage(operation === 'SUBMIT' ? (value.status === 'PUBLISHED' ? 'Đã xuất bản bài viết.' : 'Đã gửi bài chờ duyệt.') : operation === 'WITHDRAW' ? 'Đã rút bài về bản nháp.' : operation === 'APPROVE' ? 'Đã xuất bản bài viết.' : 'Đã gửi lý do từ chối cho tác giả.');
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  };
  const publicUrl = post ? window.location.origin + '/blog/' + post.postId : '';
  const rejectionReasonLength = selectedReasons.map(value => `- ${value}`).join('\n').length
    + (reason.trim() ? (selectedReasons.length ? 1 : 0) + reason.trim().length : 0);
  const remainingReasonLength = Math.max(0, 2000 - selectedReasons.map(value => `- ${value}`).join('\n').length - (selectedReasons.length ? 1 : 0));
  const toggleRejectionSuggestion = (suggestion: string) => {
    const next = selectedReasons.includes(suggestion)
      ? selectedReasons.filter(value => value !== suggestion)
      : [...selectedReasons, suggestion];
    const prefixLength = next.map(value => `- ${value}`).join('\n').length;
    const remaining = Math.max(0, 2000 - prefixLength - (next.length ? 1 : 0));
    setSelectedReasons(next);
    setReason(value => value.slice(0, remaining));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setMessage('Đã sao chép liên kết.'); }
    catch { setError('Không thể sao chép tự động. Bạn có thể chọn đường dẫn bên dưới.'); }
  };
  const headline = post ? { DRAFT: 'Câu chuyện của bạn đang thành hình', PENDING_REVIEW: 'Bài viết đang chờ admin duyệt', PUBLISHED: 'Bài viết đã được xuất bản', REJECTED: 'Bài viết cần được chỉnh sửa', ARCHIVED: 'Bài viết đang được ẩn' }[post.status] : '';
  const StatusIcon = post?.status === 'PUBLISHED' ? BadgeCheck : post?.status === 'REJECTED' ? XCircle : post?.status === 'PENDING_REVIEW' ? Clock : post?.status === 'ARCHIVED' ? Archive : FilePenLine;
  return <MainLayout><div className="blog-shell"><BlogAccess admin={adminMode}><Link to={adminMode ? '/admin/blog' : '/blog/my-posts'} className="blog-back"><ArrowLeft size={15} />{adminMode ? 'Hàng chờ duyệt Blog' : 'Bài viết của tôi'}</Link>
    {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}{message && <p role="status" className="blog-message">{message}</p>}
    {loading && <p role="status" className="blog-empty">Đang tải bài viết...</p>}
    {post && <><header className={'blog-status-banner ' + post.status.toLowerCase()}><StatusIcon size={42} /><div><BlogBadge status={post.status} /><h1>{adminMode && post.status === 'PENDING_REVIEW' ? 'Xem xét bài viết cộng đồng' : headline}</h1><p>{post.status === 'PUBLISHED' ? 'Câu chuyện của bạn đã xuất hiện trên Blog cộng đồng VEGEAI.' : post.status === 'PENDING_REVIEW' ? 'Ban biên tập sẽ xem xét nội dung trước khi xuất bản.' : post.status === 'REJECTED' ? 'Xem góp ý từ ban biên tập, chỉnh sửa và gửi duyệt lại.' : post.status === 'ARCHIVED' ? 'Bài viết đã được ẩn khỏi Blog và có thể khôi phục từ kho lưu trữ.' : 'Lưu những ý tưởng của bạn và gửi bài khi đã sẵn sàng.'}</p></div></header>
      <div className="blog-review-grid"><div className="blog-review-main"><div className="blog-review-title"><span className="blog-eyebrow">{blogCategories[post.category]}</span><h2>{post.title}</h2><div className="blog-public-meta"><span>{post.authorName}</span><span>{post.readingMinutes} phút đọc</span><span>Cập nhật {blogDate(post.updatedAt)}</span></div></div>
        {post.status === 'REJECTED' && <section className="blog-rejection-note"><h3><ShieldCheck size={17} /> Lý do từ chối từ ban biên tập</h3><p>{post.moderationReason}</p><span>{post.reviewerName} · {blogDate(post.reviewedAt)}</span></section>}
        {adminMode && <section className="blog-submission-details" aria-label="Thông tin bài gửi duyệt">
          <h3>Thông tin bài gửi duyệt</h3>
          <dl><div><dt>Tác giả</dt><dd>{post.authorName}</dd></div><div><dt>Chuyên mục</dt><dd>{blogCategories[post.category]}</dd></div>
            <div><dt>Thời gian gửi</dt><dd>{blogDate(post.submittedAt || post.updatedAt)}</dd></div><div><dt>Độ dài</dt><dd>{post.readingMinutes} phút đọc</dd></div></dl>
        </section>}
        {adminMode && <h3 className="blog-submission-heading">Nội dung bài viết gửi duyệt</h3>}
        <BlogCover key={post.postId} post={{ ...post, postId: post.postId }} useSubmittedImage={adminMode} />
        {!adminMode && <div className="blog-review-excerpt"><span>Tóm tắt bài viết</span><p className="blog-lead">{post.excerpt || 'Tác giả chưa cung cấp phần tóm tắt.'}</p></div>}
        <section className="blog-submission-content"><h3>{adminMode ? 'Nội dung đầy đủ' : 'Bài viết'}</h3>
          {post.content?.trim() ? <BlogBody content={post.content} /> : <p className="blog-empty">Bài viết chưa có nội dung.</p>}
        </section>
        <section className="blog-review-history"><h3><ShieldCheck size={17} /> Lịch sử bài viết</h3><ol><li><span>Tạo bản nháp</span><time>{blogDate(post.createdAt)}</time></li>{post.submittedAt && <li><span>Gửi ban biên tập</span><time>{blogDate(post.submittedAt)}</time></li>}{post.reviewedAt && <li><span>{post.status === 'PUBLISHED' ? 'Duyệt xuất bản' : 'Từ chối'} · {post.reviewerName}</span><time>{blogDate(post.reviewedAt)}</time></li>}</ol></section>
      </div>
      <aside className="blog-review-side"><h3>{adminMode ? 'Quyết định của ban biên tập' : 'Hành động tiếp theo'}</h3>
        {adminMode ? post.status === 'PENDING_REVIEW' ? <><button className="blog-button" disabled={busy} onClick={() => { setConfirm('APPROVE'); setError(''); }}><BadgeCheck size={17} /> Duyệt và xuất bản</button><button className="blog-button danger-outline" disabled={busy} onClick={() => { setConfirm('REJECT'); setError(''); }}><XCircle size={17} /> Từ chối kèm lý do</button></> : <p className="blog-moderation-note">Bài viết đã có kết quả xét duyệt.</p> : <>
          {post.status === 'ARCHIVED' ? <><button className="blog-button secondary" disabled={busy} onClick={() => setConfirm('RESTORE')}><RotateCcw size={16} /> Khôi phục bài viết</button><button className="blog-button danger-outline" disabled={busy} onClick={() => setConfirm('PERMANENT_DELETE')}><Trash2 size={16} /> Xóa vĩnh viễn</button></> : <>{['DRAFT', 'REJECTED'].includes(post.status) && <><Link className="blog-button" to={'/blog/my-posts/' + post.postId + '/edit'}><FilePenLine size={17} />{post.status === 'REJECTED' ? 'Chỉnh sửa và gửi lại' : 'Tiếp tục viết'}</Link>{post.status === 'DRAFT' && <button className="blog-button secondary" disabled={busy} onClick={() => action('SUBMIT')}><Send size={16} />{user?.role === 'admin' ? 'Xuất bản' : 'Gửi admin duyệt'}</button>}</>}
          {post.status === 'PENDING_REVIEW' && <button className="blog-button secondary" disabled={busy} onClick={() => setConfirm('WITHDRAW')}><Undo2 size={16} /> Rút bài để chỉnh sửa</button>}
          <button className="blog-button secondary" disabled={busy} onClick={() => setConfirm('ARCHIVE')}><Archive size={16} /> Ẩn bài viết</button>
          <button className="blog-button danger-outline" disabled={busy} onClick={() => setConfirm('PERMANENT_DELETE')}><Trash2 size={16} /> Xóa vĩnh viễn</button></>}
        </>}
        {post.status === 'PUBLISHED' && <>{!adminMode && post.authorId === user?.id && <Link className="blog-button secondary" to={'/blog/my-posts/' + post.postId + '/edit'}><FilePenLine size={16} /> Chỉnh sửa và gửi duyệt</Link>}<Link to={'/blog/' + post.postId} className="blog-button"><ArrowUpRight size={17} /> Xem bài trên Blog</Link><label className="blog-link-field">Đường dẫn công khai<input aria-label="Đường dẫn công khai" readOnly value={publicUrl} onFocus={event => event.target.select()} /></label><button className="blog-button secondary" onClick={copy}><Copy size={16} /> Sao chép liên kết</button></>}
        {confirm && <div className="blog-confirm-backdrop">
          <section className="blog-confirm" role="dialog" aria-modal="true" aria-labelledby="blog-confirm-title">
          <h4 id="blog-confirm-title">{confirm === 'APPROVE' ? 'Xuất bản bài viết này?' : confirm === 'REJECT' ? 'Lý do từ chối bài viết' : confirm === 'WITHDRAW' ? 'Rút bài về bản nháp?' : confirm === 'ARCHIVE' ? 'Ẩn bài viết khỏi Blog?' : confirm === 'RESTORE' ? 'Khôi phục bài viết?' : 'Xóa vĩnh viễn bài viết?'}</h4>
          {confirm === 'REJECT' && <div className="blog-rejection-form">
            <p className="blog-rejection-instructions">Chọn một hoặc nhiều gợi ý phù hợp, sau đó bổ sung hướng chỉnh sửa cụ thể để tác giả có thể hoàn thiện bài.</p>
            <fieldset disabled={busy} className="blog-rejection-suggestions"><legend>Gợi ý lý do từ chối</legend>
              {rejectionSuggestions.map(suggestion => <button key={suggestion} type="button" aria-pressed={selectedReasons.includes(suggestion)}
                onClick={() => toggleRejectionSuggestion(suggestion)}
                className={selectedReasons.includes(suggestion) ? 'selected' : ''}>{suggestion}</button>)}
            </fieldset>
            <label className="blog-rejection-detail">Góp ý cụ thể cho tác giả
              <textarea aria-label="Góp ý cụ thể cho tác giả" maxLength={remainingReasonLength}
                rows={5} value={reason} onChange={event => setReason(event.target.value)} placeholder="Nêu rõ phần nào cần bổ sung hoặc chỉnh sửa..." />
            </label>
            <p className="blog-rejection-counter">{selectedReasons.length} gợi ý đã chọn · {rejectionReasonLength} / 2000 ký tự</p>
          </div>}
            <div className="blog-confirm-actions"><button className={'blog-button ' + (confirm === 'PERMANENT_DELETE' || confirm === 'REJECT' ? 'danger' : '')}
              disabled={busy || (confirm === 'REJECT' && !selectedReasons.length && !reason.trim())} onClick={() => action(confirm)}>{busy ? 'Đang xử lý...' : confirm === 'REJECT' ? 'Xác nhận từ chối' : 'Xác nhận'}</button>
              <button className="blog-button secondary" disabled={busy} onClick={() => { setConfirm(null); setSelectedReasons([]); setReason(''); }}>Hủy</button></div>
          </section>
        </div>}
        <Link className="blog-back" to={adminMode ? '/admin/blog' : '/blog/my-posts'}><ArrowLeft size={15} /> Về danh sách</Link>
      </aside></div>
    </>}
  </BlogAccess></div></MainLayout>;
}
