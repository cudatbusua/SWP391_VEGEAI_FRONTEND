import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { contentInteractionService } from '../services/contentInteractionService';
import type { InteractionRating, InteractionTarget } from '../types/contentInteraction';
import '../styles/contentRatingBadge.css';

/** Shows the public average score and number of ratings on a content card. */
export function ContentRatingBadge({ type, id }: { type: InteractionTarget; id: string }) {
  const [rating, setRating] = useState<InteractionRating | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    contentInteractionService.loadRating(type, id)
      .then(result => { if (!controller.signal.aborted) { setRating(result); setLoaded(true); } })
      .catch(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, [type, id]);

  if (!loaded) return <span className="content-rating-badge is-loading" aria-label="Đang tải đánh giá">Đang tải đánh giá…</span>;
  if (!rating) return <span className="content-rating-badge is-unavailable" aria-label="Không tải được đánh giá">Chưa tải được đánh giá</span>;

  const average = rating.averageStars;
  const averageText = average == null ? 'Chưa có' : average.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const countText = `${rating.ratingCount} lượt đánh giá`;

  return <span className="content-rating-badge" aria-label={`Điểm trung bình ${average == null ? 'chưa có' : averageText + ' trên 5 sao'}, ${countText}`}>
    <Star size={15} aria-hidden="true" fill={average == null ? 'none' : 'currentColor'} />
    <strong>{averageText}</strong>
    <span>·</span>
    <span>{countText}</span>
  </span>;
}
