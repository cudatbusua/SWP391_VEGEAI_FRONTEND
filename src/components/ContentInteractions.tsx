import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Star, Trash2, Pencil, X, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { contentInteractionService } from '../services/contentInteractionService';
import { errorMessage } from '../services/apiClient';
import type { ContentInteractions as ContentInteractionsData, InteractionComment, InteractionTarget } from '../types/contentInteraction';
import '../styles/contentInteractions.css';

export function ContentInteractions({ type, id }: { type: InteractionTarget; id: string }) {
  const { isAuthenticated, user } = useAuth();
  const canInteract = isAuthenticated && user?.role !== 'admin';
  const [data, setData] = useState<ContentInteractionsData | null>(null);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<InteractionComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  const load = useCallback((signal?: AbortSignal) => contentInteractionService.load(type, id, page, signal), [type, id, page]);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    load(controller.signal).then(result => { if (!controller.signal.aborted) setData(result ?? null); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [load, reload]);

  const mutate = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); setReload(value => value + 1); return true; }
    catch (reason) { setError(errorMessage(reason)); return false; }
    finally { setBusy(false); }
  };
  const saveComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const saved = await mutate(() => contentInteractionService.comment(type, id, draft.trim(), editing || undefined), editing ? 'Đã cập nhật bình luận.' : 'Đã gửi bình luận.');
    if (saved) { setDraft(''); setEditing(null); }
  };
  const removeComment = (comment: InteractionComment) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    void mutate(() => contentInteractionService.deleteComment(type, id, comment.id, comment.version), 'Đã xóa bình luận.');
  };

  const rating = data?.rating;
  const comments = data?.comments;
  return <section className="content-interactions" aria-label={type === 'BLOG' ? 'Đánh giá và bình luận bài viết' : 'Đánh giá và bình luận công thức'}>
    <div className="ci-rating-panel">
      <div><span className="ci-eyebrow">Ý KIẾN CỘNG ĐỒNG</span><h2>Chia sẻ cảm nhận của bạn</h2>
        <p>{rating?.ratingCount ? `${rating.averageStars?.toFixed(1)} / 5 từ ${rating.ratingCount} lượt đánh giá` : 'Chưa có đánh giá. Hãy là người đầu tiên!'}</p></div>
      <div className="ci-stars" role="group" aria-label="Đánh giá từ 1 đến 5 sao">
        {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" title={`${star} sao`} aria-label={`Đánh giá ${star} sao`} aria-pressed={rating?.myRating === star}
          disabled={!canInteract || busy} onClick={() => void mutate(() => contentInteractionService.rate(type, id, star), 'Đã lưu đánh giá của bạn.')}>
          <Star size={24} fill={(rating?.myRating ?? 0) >= star ? 'currentColor' : 'none'} />
        </button>)}
      </div>
      {rating?.myRating && canInteract && <button className="ci-clear-rating" type="button" disabled={busy} onClick={() => void mutate(() => contentInteractionService.removeRating(type, id), 'Đã gỡ đánh giá của bạn.')}>Gỡ đánh giá</button>}
      {!isAuthenticated && <Link className="ci-login-link" to="/login">Đăng nhập để đánh giá</Link>}
    </div>
    <div className="ci-comments-heading"><h2><MessageCircle size={19} /> Bình luận</h2><span>{comments?.totalElements ?? 0}</span></div>
    {error && <p className="ci-message is-error" role="alert">{error}</p>}{notice && <p className="ci-message" role="status">{notice}</p>}
    {canInteract ? <form className="ci-form" onSubmit={saveComment}>
      <label htmlFor={`ci-comment-${id}`}>{editing ? 'Chỉnh sửa bình luận' : 'Viết bình luận'}</label>
      <textarea id={`ci-comment-${id}`} value={draft} maxLength={2000} rows={3} placeholder="Chia sẻ cảm nhận của bạn..." onChange={event => setDraft(event.target.value)} />
      <div className="ci-form-actions"><span>{draft.length}/2000</span>{editing && <button type="button" className="ci-cancel" onClick={() => { setEditing(null); setDraft(''); }}>Hủy sửa <X size={14} /></button>}<button type="submit" disabled={busy || !draft.trim()}><Send size={15} />{editing ? 'Lưu thay đổi' : 'Gửi bình luận'}</button></div>
    </form> : isAuthenticated ? <p className="ci-signin">Tài khoản quản trị chỉ quản lý tương tác, không gửi đánh giá hoặc bình luận.</p> : <p className="ci-signin">Bạn cần <Link to="/login">đăng nhập</Link> để bình luận.</p>}
    <div className="ci-comment-list" aria-live="polite">
      {comments?.items.map(comment => <article className="ci-comment" key={comment.id}>
        <div className="ci-comment-avatar" aria-hidden="true">{comment.authorName.slice(0, 1).toLocaleUpperCase('vi')}</div>
        <div className="ci-comment-content"><div className="ci-comment-byline"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</time></div>
          <p>{comment.content}</p></div>
        {(user?.id === comment.authorId || user?.role === 'admin') && <div className="ci-comment-actions">
          {user?.id === comment.authorId && <button type="button" title="Sửa bình luận" aria-label="Sửa bình luận" disabled={busy} onClick={() => { setEditing(comment); setDraft(comment.content); }}><Pencil size={15} /></button>}
          <button type="button" title="Xóa bình luận" aria-label="Xóa bình luận" disabled={busy} onClick={() => removeComment(comment)}><Trash2 size={15} /></button>
        </div>}
      </article>)}
      {comments && comments.items.length === 0 && <p className="ci-empty">Chưa có bình luận. Bắt đầu cuộc trò chuyện nhé!</p>}
    </div>
    {comments && comments.totalPages > 1 && <nav className="ci-pagination" aria-label="Trang bình luận">
      <button type="button" disabled={comments.first} onClick={() => setPage(value => Math.max(0, value - 1))}>Trước</button><span>Trang {comments.page + 1} / {comments.totalPages}</span>
      <button type="button" disabled={comments.last} onClick={() => setPage(value => value + 1)}>Sau</button>
    </nav>}
  </section>;
}
