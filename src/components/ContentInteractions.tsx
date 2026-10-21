import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ImagePlus, MessageCircle, Pencil, Send, Star, Trash2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { contentInteractionService } from '../services/contentInteractionService';
import { errorMessage } from '../services/apiClient';
import type { ContentInteractions as ContentInteractionsData, InteractionComment, InteractionTarget } from '../types/contentInteraction';
import '../styles/contentInteractions.css';

const quickTags = ['Dễ làm', 'Chuẩn vị', 'Ít calo', 'Cả nhà đều thích', 'Nguyên liệu dễ tìm'];
const stars = [1, 2, 3, 4, 5];
const ratingPhrases: Record<number, string> = {
  1: 'Chưa hợp khẩu vị',
  2: 'Chưa thật sự hài lòng',
  3: 'Ổn, có thể thử',
  4: 'Rất ngon, đáng thử!',
  5: 'Tuyệt vời, rất hợp khẩu vị!',
};
type ReviewPhoto = { file: File | null; url: string };

export function ContentInteractions({ type, id }: { type: InteractionTarget; id: string }) {
  const { isAuthenticated, user } = useAuth();
  const canInteract = isAuthenticated && user?.role !== 'admin';
  const [data, setData] = useState<ContentInteractionsData | null>(null);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [selectedStars, setSelectedStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [publicDisplayName, setPublicDisplayName] = useState(true);
  const [editing, setEditing] = useState<InteractionComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  const load = useCallback((signal?: AbortSignal) => contentInteractionService.load(type, id, page, signal), [type, id, page]);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    load(controller.signal).then(result => {
      if (controller.signal.aborted || !result) return;
      setData(result);
      setSelectedStars(current => current || result.rating.myRating || 0);
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [load, reload]);
  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const resetForm = () => {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url));
    objectUrls.current = [];
    setDraft('');
    setSelectedStars(data?.rating.myRating || 0);
    setSelectedTags([]);
    setPhotos([]);
    setPublicDisplayName(true);
    setEditing(null);
  };

  const addPhotos = (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (photos.length + selected.length > 4) {
      setError('Bạn chỉ có thể thêm tối đa 4 ảnh cho mỗi đánh giá.');
      return;
    }
    const invalid = selected.find(file => !['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setError('Ảnh phải có định dạng JPG hoặc PNG và dung lượng không quá 5 MB.');
      return;
    }
    const additions = selected.map(file => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return { file, url };
    });
    setError('');
    setPhotos(current => [...current, ...additions]);
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addPhotos(event.target.files);
    event.target.value = '';
  };

  const onPhotoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) addPhotos(event.dataTransfer.files);
  };

  const saveReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) { setError('Hãy nhập cảm nhận của bạn trước khi gửi.'); return; }
    if (!selectedStars) { setError('Hãy chọn số sao trước khi gửi đánh giá.'); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await contentInteractionService.submitReview(type, id, {
        content: draft.trim(),
        stars: selectedStars,
        tags: selectedTags,
        publicDisplayName,
        photoUrls: photos.filter(photo => !photo.file).map(photo => photo.url),
      }, photos.flatMap(photo => photo.file ? [photo.file] : []), editing || undefined);
      setNotice(editing ? 'Đã cập nhật đánh giá.' : 'Đã gửi đánh giá của bạn.');
      resetForm();
      setSelectedStars(selectedStars);
      setReload(value => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (comment: InteractionComment) => {
    setEditing(comment);
    setDraft(comment.content);
    setSelectedStars(comment.reviewStars ?? data?.rating.myRating ?? 0);
    setSelectedTags(comment.tags ?? []);
    setPhotos((comment.photoUrls ?? []).map(url => ({ file: null, url })));
    setPublicDisplayName(comment.publicDisplayName);
    setError('');
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo.file) {
      URL.revokeObjectURL(photo.url);
      objectUrls.current = objectUrls.current.filter(url => url !== photo.url);
    }
    setPhotos(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeComment = (comment: InteractionComment) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    contentInteractionService.deleteComment(type, id, comment.id, comment.version)
      .then(() => { setNotice('Đã xóa đánh giá.'); setReload(value => value + 1); })
      .catch(reason => setError(errorMessage(reason)))
      .finally(() => setBusy(false));
  };

  const rating = data?.rating;
  const comments = data?.comments;
  const targetLabel = type === 'BLOG' ? 'bài viết' : type === 'VIDEO' ? 'video' : 'công thức';
  const ratingSummary = rating?.ratingCount
    ? `${rating.averageStars?.toFixed(1)} / 5 từ ${rating.ratingCount} lượt đánh giá`
    : 'Chưa có đánh giá. Hãy là người đầu tiên!';

  return <section className="content-interactions" aria-label={`Đánh giá và bình luận ${targetLabel}`}>
    <header className="ci-review-heading">
      <span className="ci-review-dot" aria-hidden="true" />
      <div><h2>Đánh giá &amp; Chia sẻ trải nghiệm</h2><p>Ý kiến của bạn giúp cộng đồng chọn món phù hợp.</p></div>
    </header>
    <div className="ci-review-rating">
      <div className="ci-review-rating-copy"><strong>Đánh giá chất lượng {type === 'RECIPE' ? 'món ăn' : targetLabel}</strong><span>{ratingSummary}</span></div>
      <div className="ci-stars ci-review-stars" role="group" aria-label="Đánh giá từ 1 đến 5 sao">
        {stars.map(star => <button key={star} type="button" title={`${star} sao`} aria-label={`Đánh giá ${star} sao`} aria-pressed={selectedStars === star}
          disabled={!canInteract || busy} onClick={() => setSelectedStars(star)}>
          <Star size={28} fill={selectedStars >= star ? 'currentColor' : 'none'} />
        </button>)}
      </div>
      {selectedStars > 0 && <span className="ci-rating-phrase">{ratingPhrases[selectedStars]}</span>}
    </div>
    {canInteract ? <form className="ci-review-form" onSubmit={saveReview}>
      <div className="ci-review-label-row"><label htmlFor={`ci-comment-${id}`}>Cảm nhận của bạn về {targetLabel}</label><span>{draft.length} / 500 ký tự</span></div>
      <textarea id={`ci-comment-${id}`} value={draft} maxLength={500} rows={4}
        placeholder="Chia sẻ cảm nhận của bạn..." onChange={event => setDraft(event.target.value)} />
      <div className="ci-review-quick-tags" aria-label="Gắn thẻ cảm nhận">
        {quickTags.map(tag => <button key={tag} type="button" aria-pressed={selectedTags.includes(tag)}
          className={selectedTags.includes(tag) ? 'is-selected' : ''} disabled={busy}
          onClick={() => setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}>{tag}</button>)}
      </div>
      <div className="ci-review-photos">
        <div className="ci-review-label-row"><strong><Camera size={16} /> Ảnh thành phẩm của bạn</strong><span>{photos.length} / 4 ảnh</span></div>
        <div className="ci-photo-grid" onDragOver={event => event.preventDefault()} onDrop={onPhotoDrop}>
          {Array.from({ length: 4 }, (_, index) => {
            const photo = photos[index];
            if (photo) return <figure className="ci-photo-preview" key={photo.url}>
              <img src={photo.url} alt={`Ảnh đánh giá ${index + 1}`} />
              <button type="button" aria-label={`Bỏ ảnh ${index + 1}`} title="Bỏ ảnh" disabled={busy} onClick={() => removePhoto(index)}><X size={15} /></button>
              <figcaption>Ảnh {index + 1}</figcaption>
            </figure>;
            if (index === photos.length) return <button type="button" className="ci-photo-add" key="add" disabled={busy} onClick={() => fileInput.current?.click()}>
              <ImagePlus size={20} /><span>+ Thêm ảnh</span>
            </button>;
            return <div className="ci-photo-empty" key={`empty-${index}`} aria-hidden="true"><ImagePlus size={19} /></div>;
          })}
        </div>
        <input ref={fileInput} className="ci-file-input" type="file" accept="image/png,image/jpeg" multiple onChange={onFilesSelected} />
        <p className="ci-photo-hint">Kéo thả ảnh vào đây hoặc chọn ảnh (JPG/PNG, tối đa 4 ảnh, mỗi ảnh 5 MB).</p>
      </div>
      <label className="ci-public-name"><input type="checkbox" checked={publicDisplayName} onChange={event => setPublicDisplayName(event.target.checked)} />
        <span>Hiển thị tên công khai trong cộng đồng VEGEAI <strong>({user?.name || user?.username})</strong></span></label>
      <div className="ci-review-actions">
        <button type="button" className="ci-cancel" disabled={busy} onClick={resetForm}>Hủy bỏ</button>
        <button type="submit" disabled={busy}><Send size={15} />{busy ? 'Đang gửi...' : editing ? 'Lưu đánh giá' : 'Gửi đánh giá'}</button>
      </div>
    </form> : isAuthenticated ? <p className="ci-signin">Tài khoản quản trị chỉ quản lý tương tác, không gửi đánh giá hoặc bình luận.</p>
      : <p className="ci-signin">Bạn cần <Link to="/login">đăng nhập</Link> để đánh giá và bình luận.</p>}
    {error && <p className="ci-message is-error" role="alert">{error}</p>}
    {notice && <p className="ci-message" role="status">{notice}</p>}
    <div className="ci-comments-heading"><h2><MessageCircle size={19} /> Đánh giá &amp; bình luận</h2><span>{comments?.totalElements ?? 0}</span></div>
    <div className="ci-comment-list" aria-live="polite">
      {comments?.items.map(comment => <article className="ci-comment" key={comment.id}>
        <div className="ci-comment-avatar" aria-hidden="true">{comment.authorName.slice(0, 1).toLocaleUpperCase('vi')}</div>
        <div className="ci-comment-content"><div className="ci-comment-byline"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</time></div>
          {!!comment.reviewStars && <div className="ci-comment-stars" aria-label={`Đánh giá ${comment.reviewStars} trên 5 sao`}>{stars.map(star => <Star key={star} size={14} fill={star <= comment.reviewStars! ? 'currentColor' : 'none'} />)}</div>}
          <p>{comment.content}</p>
          {!!comment.tags?.length && <div className="ci-comment-tags">{comment.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
          {!!comment.photoUrls?.length && <div className="ci-comment-photos">{comment.photoUrls.map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={`Ảnh trong đánh giá ${index + 1}`} loading="lazy" /></a>)}</div>}
        </div>
        {(user?.id === comment.authorId || user?.role === 'admin') && <div className="ci-comment-actions">
          {user?.id === comment.authorId && <button type="button" title="Sửa đánh giá" aria-label="Sửa đánh giá" disabled={busy} onClick={() => beginEdit(comment)}><Pencil size={15} /></button>}
          <button type="button" title="Xóa đánh giá" aria-label="Xóa đánh giá" disabled={busy} onClick={() => removeComment(comment)}><Trash2 size={15} /></button>
        </div>}
      </article>)}
      {comments && comments.items.length === 0 && <p className="ci-empty">Chưa có đánh giá. Hãy chia sẻ trải nghiệm đầu tiên!</p>}
    </div>
    {comments && comments.totalPages > 1 && <nav className="ci-pagination" aria-label="Trang đánh giá">
      <button type="button" disabled={comments.first} onClick={() => setPage(value => Math.max(0, value - 1))}>Trước</button><span>Trang {comments.page + 1} / {comments.totalPages}</span>
      <button type="button" disabled={comments.last} onClick={() => setPage(value => value + 1)}>Sau</button>
    </nav>}
  </section>;
}
