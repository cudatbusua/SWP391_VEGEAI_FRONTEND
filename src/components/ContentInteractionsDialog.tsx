import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Star, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { contentInteractionService } from '../services/contentInteractionService';
import { errorMessage } from '../services/apiClient';
import type { InteractionRating, InteractionTarget } from '../types/contentInteraction';
import { ContentInteractions } from './ContentInteractions';
import { ContentRatingBadge } from './ContentRatingBadge';
import '../styles/contentInteractionsDialog.css';

const subjectLabel: Record<InteractionTarget, string> = {
  BLOG: 'bài viết',
  RECIPE: 'công thức',
  VIDEO: 'video',
};

export function ContentInteractionsDialog({ type, id, children }: {
  type: InteractionTarget;
  id: string;
  children?: ReactNode;
}) {
  const location = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (location.hash === '#interactions' && !dialog.current?.open) {
      dialog.current?.showModal();
      setOpen(true);
    }
  }, [location.hash]);

  const show = () => {
    dialog.current?.showModal();
    setOpen(true);
  };

  return <section className="ci-launcher" id="interactions">
    <div className="ci-launcher-copy">
      <span className="ci-eyebrow">CỘNG ĐỒNG VEGEAI</span>
      <h2>Chia sẻ cảm nhận của bạn</h2>
      <p>Đánh giá và trao đổi về {subjectLabel[type]} với cộng đồng.</p>
      <ContentRatingBadge type={type} id={id} />
    </div>
    <button type="button" className="ci-launcher-button" aria-haspopup="dialog" onClick={show}>
      <Star size={17} fill="currentColor" />
      <MessageCircle size={17} />
      Bình luận & đánh giá
    </button>
    <dialog ref={dialog} className="ci-dialog" aria-labelledby={`ci-dialog-title-${id}`}
      onClose={() => setOpen(false)}>
      <header className="ci-dialog-heading">
        <div><span className="ci-eyebrow">CỘNG ĐỒNG VEGEAI</span><h2 id={`ci-dialog-title-${id}`}>Đánh giá & chia sẻ</h2></div>
        <button type="button" className="ci-dialog-close" aria-label="Đóng" onClick={() => dialog.current?.close()}><X size={20} /></button>
      </header>
      {open && <div className="ci-dialog-content">{children ?? <ContentInteractions type={type} id={id} />}</div>}
    </dialog>
  </section>;
}

export function VideoRatingPanel({ id }: { id: string }) {
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState<InteractionRating | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canRate = isAuthenticated && user?.role !== 'admin';

  useEffect(() => {
    const controller = new AbortController();
    contentInteractionService.load('VIDEO', id, 0, controller.signal)
      .then(value => { if (!controller.signal.aborted && value) setRating(value.rating); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [id]);

  const update = async (stars?: number) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = stars == null
        ? await contentInteractionService.removeRating('VIDEO', id)
        : await contentInteractionService.rate('VIDEO', id, stars);
      setRating(next ?? null);
      setNotice(stars == null ? 'Đã gỡ đánh giá của bạn.' : 'Đã lưu đánh giá của bạn.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return <section className="ci-video-rating" aria-label="Đánh giá video">
    <div><span className="ci-eyebrow">ĐÁNH GIÁ VIDEO</span><h3>Video này hữu ích với bạn không?</h3>
      <p>{rating?.ratingCount
        ? `${rating.averageStars?.toFixed(1)} / 5 từ ${rating.ratingCount} lượt đánh giá`
        : 'Chưa có đánh giá. Hãy là người đầu tiên!'}</p>
    </div>
    <div className="ci-stars" role="group" aria-label="Đánh giá từ 1 đến 5 sao">
      {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" title={`${star} sao`}
        aria-label={`Đánh giá ${star} sao`} aria-pressed={rating?.myRating === star}
        disabled={!canRate || busy} onClick={() => void update(star)}>
        <Star size={24} fill={(rating?.myRating ?? 0) >= star ? 'currentColor' : 'none'} />
      </button>)}
    </div>
    {rating?.myRating && canRate && <button className="ci-clear-rating" type="button" disabled={busy}
      onClick={() => void update()}>Gỡ đánh giá</button>}
    {!isAuthenticated && <Link className="ci-login-link" to="/login">Đăng nhập để đánh giá</Link>}
    {isAuthenticated && user?.role === 'admin' && <p className="ci-signin">Tài khoản quản trị chỉ quản lý tương tác.</p>}
    {error && <p className="ci-message is-error" role="alert">{error}</p>}
    {notice && <p className="ci-message" role="status">{notice}</p>}
  </section>;
}
