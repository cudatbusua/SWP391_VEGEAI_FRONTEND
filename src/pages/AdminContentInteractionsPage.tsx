import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Star, Trash2, ExternalLink, RotateCw } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { contentInteractionService } from '../services/contentInteractionService';
import { errorMessage } from '../services/apiClient';
import type { InteractionComment, InteractionTarget } from '../types/contentInteraction';
import type { AdminInteractionRating } from '../types/contentInteraction';
import type { PageResponse } from '../types/api';
import '../styles/adminContentInteractions.css';

type Tab = 'comments' | 'ratings';

const targetLabels: Record<InteractionTarget, string> = { BLOG: 'Bài blog', RECIPE: 'Công thức', VIDEO: 'Video' };
const targetPath = (type: InteractionTarget, id: string) =>
  type === 'BLOG' ? `/admin/blog/${id}` : type === 'RECIPE' ? `/recipe/${id}` : `/videos/${id}`;

export function AdminContentInteractionsPage() {
  const [tab, setTab] = useState<Tab>('comments');
  const [type, setType] = useState<InteractionTarget | ''>('');
  const [page, setPage] = useState(0);
  const [comments, setComments] = useState<PageResponse<InteractionComment> | null>(null);
  const [ratings, setRatings] = useState<PageResponse<AdminInteractionRating> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    const request = tab === 'comments'
      ? contentInteractionService.adminComments(type, page, controller.signal).then(value => { if (!controller.signal.aborted) setComments(value ?? null); })
      : contentInteractionService.adminRatings(type, page, controller.signal).then(value => { if (!controller.signal.aborted) setRatings(value ?? null); });
    request.catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [tab, type, page, reload]);

  const remove = async (id: string, version?: number) => {
    if (!window.confirm(tab === 'comments' ? 'Gỡ bình luận này khỏi nội dung công khai?' : 'Xóa lượt đánh giá sao này?')) return;
    setBusy(true); setError('');
    try {
      if (tab === 'comments' && version !== undefined) await contentInteractionService.adminDeleteComment(id, version);
      else await contentInteractionService.adminDeleteRating(id);
      setReload(value => value + 1);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const data = tab === 'comments' ? comments : ratings;
  return <MainLayout><main className="ci-admin-shell">
    <header className="ci-admin-heading"><div><span>QUẢN LÝ NỘI DUNG CỘNG ĐỒNG</span><h1>Bình luận & đánh giá</h1><p>Kiểm tra, lọc và gỡ nội dung tương tác trên blog, công thức và video.</p></div></header>
    <div className="ci-admin-toolbar">
      <div className="ci-admin-tabs" role="tablist" aria-label="Loại tương tác">
        <button role="tab" aria-selected={tab === 'comments'} onClick={() => { setTab('comments'); setPage(0); }}><MessageCircle size={16} /> Bình luận</button>
        <button role="tab" aria-selected={tab === 'ratings'} onClick={() => { setTab('ratings'); setPage(0); }}><Star size={16} /> Đánh giá sao</button>
      </div>
      <label>Lọc nội dung<select value={type} onChange={event => { setType(event.target.value as InteractionTarget | ''); setPage(0); }}><option value="">Mọi nội dung</option><option value="BLOG">Blog</option><option value="RECIPE">Công thức khám phá</option><option value="VIDEO">Video</option></select></label>
      <button type="button" className="ci-admin-refresh" onClick={() => setReload(value => value + 1)} disabled={busy}><RotateCw size={15} /> Tải lại</button>
    </div>
    {error && <p className="ci-admin-error" role="alert">{error}</p>}
    {busy && !data && <p className="ci-admin-state" role="status">Đang tải dữ liệu...</p>}
    {!busy && data?.items.length === 0 && <p className="ci-admin-state">Chưa có dữ liệu trong mục này.</p>}
    {tab === 'comments' && comments?.items.map(comment => <article className="ci-admin-row" key={comment.id}>
      <div className="ci-admin-row-copy"><p>{comment.content}</p><small>{comment.authorName} · {new Date(comment.createdAt).toLocaleString('vi-VN')} · {targetLabels[comment.targetType]}</small></div>
      <Link className="ci-admin-open" to={targetPath(comment.targetType, comment.targetId)} target="_blank" rel="noreferrer">Mở nội dung <ExternalLink size={14} /></Link>
      <button type="button" className="ci-admin-delete" title="Gỡ bình luận" aria-label="Gỡ bình luận" disabled={busy} onClick={() => void remove(comment.id, comment.version)}><Trash2 size={16} /></button>
    </article>)}
    {tab === 'ratings' && ratings?.items.map(rating => <article className="ci-admin-row ci-admin-rating" key={rating.id}>
      <div className="ci-admin-row-copy"><p>{rating.userName} <span className="ci-admin-stars">{'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}</span></p><small>{targetLabels[rating.targetType]} · {new Date(rating.updatedAt).toLocaleString('vi-VN')}</small></div>
      <Link className="ci-admin-open" to={targetPath(rating.targetType, rating.targetId)} target="_blank" rel="noreferrer">Mở nội dung <ExternalLink size={14} /></Link>
      <button type="button" className="ci-admin-delete" title="Gỡ đánh giá" aria-label="Gỡ đánh giá" disabled={busy} onClick={() => void remove(rating.id)}><Trash2 size={16} /></button>
    </article>)}
    {data && data.totalPages > 1 && <nav className="ci-admin-pagination" aria-label="Trang dữ liệu"><button disabled={data.first || busy} onClick={() => setPage(value => Math.max(0, value - 1))}>Trước</button><span>Trang {data.page + 1} / {data.totalPages} · {data.totalElements} mục</span><button disabled={data.last || busy} onClick={() => setPage(value => value + 1)}>Sau</button></nav>}
  </main></MainLayout>;
}
