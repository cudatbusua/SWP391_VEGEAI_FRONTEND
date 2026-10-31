import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  UserRound,
  Sparkles,
  ChefHat,
  Utensils,
  ShoppingBag,
  CheckCircle2,
  Flame,
  AlertCircle,
  Star
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { aiService } from '../services/aiService';
import { errorMessage } from '../services/apiClient';
import { safeMediaUrl } from '../utils/communityVideo';
import type { VideoComment } from '../types/community';
import { videoCategories } from '../types/community';
import type { GeneratedRecipeAiResponse } from '../types/api';
import { communityDate, CommunityConfirm, CommunityError, CommunityLoading, CommunityPagination, VideoCard, VideoPlayer } from '../components/CommunityUi';

function VideoAiRecipeCopilot({
  title,
  description,
  videoUrl
}: {
  title: string;
  description?: string;
  videoUrl: string;
}) {
  const [recipe, setRecipe] = useState<GeneratedRecipeAiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtractRecipe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiService.extractRecipeFromVideo(title, description, videoUrl);
      setRecipe(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/20 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <Sparkles size={13} /> AI Video-to-Recipe Copilot
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
            <ChefHat className="text-emerald-700 dark:text-emerald-400" size={22} />
            Tự động bóc tách công thức nấu ăn từ Video
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            AI tự động phân tích video ẩm thực chay, liệt kê danh sách nguyên liệu định lượng và từng bước chế biến chi tiết.
          </p>
        </div>

        {!recipe && (
          <button
            type="button"
            onClick={handleExtractRecipe}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>AI đang phân tích video...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Bóc tách công thức ngay</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mt-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={handleExtractRecipe} className="underline font-bold ml-auto cursor-pointer">Thử lại</button>
        </div>
      )}

      {recipe && (
        <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-slate-800 space-y-5 animate-in fade-in duration-300">
          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Clock3 size={14} className="text-emerald-600" /> {recipe.cookTimeMinutes} phút
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Flame size={14} className="text-orange-500" /> ~{recipe.estimatedCalories} kcal/khẩu phần
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={14} /> Độ khó: {recipe.difficulty === 'EASY' ? 'Dễ làm' : recipe.difficulty === 'MEDIUM' ? 'Vừa phải' : 'Công phu'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-xs font-black text-emerald-900 dark:text-emerald-200">
              🌱 {recipe.dietaryType || 'Thuần chay'}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Ingredients */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-4 border border-emerald-100 dark:border-slate-700">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Utensils size={15} className="text-emerald-700 dark:text-emerald-400" />
                Nguyên liệu cần chuẩn bị ({recipe.ingredients?.length || 0})
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
                {recipe.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-4 border border-emerald-100 dark:border-slate-700">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <ChefHat size={15} className="text-emerald-700 dark:text-emerald-400" />
                Các bước thực hiện
              </h3>
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200 max-h-60 overflow-y-auto pr-1">
                {recipe.instructions?.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-slate-50/70 dark:bg-slate-900/50 p-2 rounded-lg">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-black text-white">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step.replace(/^Bước\s*\d+:\s*/i, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety & Chef Tips */}
          {recipe.safetyNotes && recipe.safetyNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
              <strong className="block mb-1 font-bold">💡 Mẹo dinh dưỡng & an toàn từ Bếp trưởng:</strong>
              <ul className="list-disc list-inside space-y-1">
                {recipe.safetyNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleExtractRecipe}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline cursor-pointer"
            >
              Phân tích lại công thức
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/ai-chef"
                state={{
                  source: 'video-recipe',
                  title: `Nấu: ${recipe.title}`,
                  initialPrompt: `Tôi muốn hỏi thêm về món "${recipe.title}" từ video "${title}". Nguyên liệu chính: ${recipe.ingredients.slice(0, 8).join(', ')}. Thời gian khoảng ${recipe.cookTimeMinutes} phút, ước tính ${recipe.estimatedCalories} kcal. Hãy tư vấn ngắn gọn và trả lời câu hỏi tiếp theo của tôi dựa trên thông tin món này.`
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
              >
                <ChefHat size={14} /> Chuyển sang AI Bếp Trưởng
              </Link>
              <Link
                to="/smart-market"
                state={{
                  planTitle: recipe.title,
                  importedItems: recipe.ingredients?.map((ing, idx) => ({
                    id: `vid-ing-${Date.now()}-${idx}`,
                    name: ing.split('(')[0].trim(),
                    amount: ing.includes('(') ? ing.split('(')[1].replace(')', '').trim() : '1 phần',
                    category: 'produce' as const,
                    categoryLabel: 'Rau củ & Gia vị',
                    mealNote: recipe.title,
                    checked: false
                  }))
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
              >
                <ShoppingBag size={14} /> Đi chợ mua nguyên liệu
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoComments({ videoId }: { videoId: string }) {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(JSON.stringify(['comments', videoId, page]), signal => communityService.comments(videoId, page, signal));
  const ratingQuery = useCommunityQuery(JSON.stringify(['video-rating', videoId, user?.id]), signal => communityService.videoRating(videoId, signal));
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [editing, setEditing] = useState<VideoComment | null>(null);
  const [deleting, setDeleting] = useState<VideoComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !draft.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!editing) {
        const summary = await communityService.rateVideo(videoId, rating);
        setRating(summary.myRating || rating);
      }
      await communityService.comment(videoId, draft, editing || undefined);
      setMessage(editing ? 'Đã cập nhật bình luận.' : 'Cảm ơn bạn đã gửi đánh giá và bình luận!');
      const nextPage = editing ? page : Math.floor((query.data?.totalElements ?? 0) / 10);
      setEditing(null); setDraft('');
      ratingQuery.refresh();
      if (nextPage !== page) setPage(nextPage); else query.refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await communityService.deleteComment(videoId, deleting.id, deleting.version);
      if (editing?.id === deleting.id) { setEditing(null); setDraft(''); }
      setDeleting(null); setMessage('Đã xóa bình luận.');
      if (page > 0 && query.data?.items.length === 1) setPage(value => value - 1); else query.refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const average = ratingQuery.data?.averageStars || 0;
  const ratingCount = ratingQuery.data?.ratingCount || 0;
  const currentRating = hoverRating || rating;
  const starLabels = ['', 'Rất tệ', 'Chưa đạt', 'Tương đối ổn', 'Rất hay & hữu ích', 'Tuyệt vời, 5 sao!'];

  return <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-8" id="video-comments">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400"><MessageCircle size={16} /> ĐÁNH GIÁ & BÌNH LUẬN CỘNG ĐỒNG</div><h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Cảm nhận từ người xem ({query.data?.totalElements || 0})</h2></div>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50/80 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 shadow-xs">
        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{ratingCount ? average.toFixed(1) : '—'}</div>
        <div><div className="flex text-amber-500">{[1, 2, 3, 4, 5].map(value => <Star key={value} size={14} fill={value <= Math.round(average) ? '#f59e0b' : 'none'} className={value <= Math.round(average) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} />)}</div><span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">{ratingCount} lượt đánh giá</span></div>
      </div>
    </div>
    {error && <CommunityError message={error} />}{message && <p role="status" className="cm-alert">{message}</p>}
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
      {isAuthenticated ? <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{editing ? 'Chỉnh sửa bình luận của bạn:' : 'Gửi đánh giá và bình luận của bạn:'}</h3><span className="text-[11px] text-slate-500">Đang đánh giá với tên: <strong>{user?.name || user?.username || 'Thành viên'}</strong></span></div>
        {!editing && <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Đánh giá của bạn:</span><div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRating(value)} onMouseEnter={() => setHoverRating(value)} onMouseLeave={() => setHoverRating(0)} className="p-1 hover:scale-110 transition cursor-pointer focus:outline-none" aria-label={`Đánh giá ${value} sao`}><Star size={22} fill={value <= currentRating ? '#f59e0b' : 'none'} className={value <= currentRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} /></button>)}</div><span className="text-xs font-bold text-amber-600 dark:text-amber-400">{starLabels[currentRating]} ({currentRating}/5)</span></div>}
        <textarea aria-label="Nội dung bình luận" rows={3} value={draft} maxLength={2000} required disabled={busy} onChange={event => setDraft(event.target.value)} placeholder="Chia sẻ trải nghiệm nấu ăn hoặc cảm nhận của bạn về video này..." className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-y" />
        <div className="flex items-center justify-between gap-3"><small className="text-slate-400">{draft.length}/2000</small><div className="cm-actions"><button className="cm-button" disabled={busy || !draft.trim()}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Send size={16} />}{editing ? 'Lưu chỉnh sửa' : 'Gửi đánh giá & bình luận'}</button>{editing && <button type="button" className="cm-button secondary" disabled={busy} onClick={() => { setEditing(null); setDraft(''); }}>Hủy chỉnh sửa</button>}</div></div>
      </form> : <div className="text-center py-4 space-y-3"><p className="text-xs text-slate-600 dark:text-slate-400">Bạn cần đăng nhập để gửi đánh giá 5 sao và bình luận về video.</p><Link className="cm-button" to="/login" state={{ from: '/videos/' + videoId }}><UserRound size={16} /> Đăng nhập ngay</Link></div>}
    </div>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}
    {!query.busy && !query.error && query.data?.items.length === 0 && <p className="cm-empty">Chưa có bình luận. Hãy để lại cảm nhận đầu tiên.</p>}
    {query.data?.items.map(comment => <article className="cm-comment" key={comment.id}><div className="cm-comment-heading"><span className="cm-avatar">{comment.authorName.charAt(0).toUpperCase()}</span><div><strong>{comment.authorName}</strong><small>{communityDate(comment.createdAt)}</small></div><div className="cm-actions">{user?.id === comment.authorId && <button className="cm-icon" disabled={busy} title="Sửa bình luận" aria-label="Sửa bình luận" onClick={() => { setEditing(comment); setDraft(comment.content); setError(''); document.getElementById('video-comments')?.scrollIntoView({ block: 'start' }); }}><Pencil size={15} /></button>}{(user?.id === comment.authorId || user?.role === 'admin') && <button className="cm-icon danger" disabled={busy} title="Xóa bình luận" aria-label="Xóa bình luận" onClick={() => setDeleting(comment)}><Trash2 size={15} /></button>}</div></div><p>{comment.content}</p></article>)}
    <CommunityPagination data={query.data} change={setPage} /><CommunityConfirm open={!!deleting} title="Xóa bình luận?" busy={busy} destructive onCancel={() => setDeleting(null)} onConfirm={remove}><p>Bình luận này sẽ bị xóa vĩnh viễn.</p>{error && <CommunityError message={error} />}</CommunityConfirm>
  </section>;
}

function VideoDetail({ videoId }: { videoId: string }) {
  const { user, isAuthenticated } = useAuth();
  const query = useCommunityQuery('video:' + videoId, signal => communityService.video(videoId, signal));
  const related = useCommunityQuery('related-videos', signal => communityService.videos({ page: 0 }, signal));
  const favoriteQuery = useCommunityQuery(JSON.stringify(['favorite', videoId, user?.id]), signal => communityService.favorite(videoId, signal), isAuthenticated);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isSaved = saved ?? favoriteQuery.data?.favorite ?? false;

  const toggle = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { setSaved((await communityService.setFavorite(videoId, !isSaved)).favorite); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const recommendations = related.data?.items.filter(video => video.id !== videoId).slice(0, 3) || [];

  return <div className="cm-shell"><Link to="/videos" className="cm-back"><ArrowLeft size={15} /> Video bếp chay</Link>{query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}
    {query.data && <div className={'cm-video-detail ' + (!recommendations.length ? 'single' : '')}><div><VideoPlayer video={query.data} /><div className="cm-video-card-meta"><span>{videoCategories[query.data.category || ''] || query.data.category || 'Bếp chay'}</span></div><h1 className="cm-video-title">{query.data.title}</h1><div className="cm-video-byline"><span><UserRound size={13} style={{ display: 'inline', marginRight: 5 }} />{query.data.createdBy}</span><span><Clock3 size={13} style={{ display: 'inline', marginRight: 5 }} />{communityDate(query.data.createdAt)}</span></div>
      
      <div className="cm-actions" style={{ marginBottom: 18 }}>
        {isAuthenticated ? <button className={'cm-button ' + (isSaved ? '' : 'secondary')} onClick={toggle} disabled={busy || favoriteQuery.busy || !!favoriteQuery.error} aria-pressed={isSaved}>{busy ? <Loader2 size={16} className="cm-spin" /> : isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{isSaved ? 'Đã lưu video' : 'Lưu video'}</button> : <Link to="/login" state={{ from: '/videos/' + videoId }} className="cm-button secondary"><Bookmark size={16} /> Đăng nhập để lưu</Link>}
        {user?.role === 'admin' && <Link className="cm-button secondary" to={'/admin/videos/' + videoId + '/edit'}><Pencil size={15} /> Sửa video</Link>}
      </div>

      {/* AI Video-to-Recipe Extraction Copilot */}
      <VideoAiRecipeCopilot
        title={query.data.title}
        description={query.data.description}
        videoUrl={query.data.videoUrl}
      />

      {error && <CommunityError message={error} />}
      {favoriteQuery.error && <CommunityError message={favoriteQuery.error} retry={favoriteQuery.refresh} />}
      {query.data.description && <p className="cm-video-description">{query.data.description.split('\n').map((line, index) => {
        const sourceUrl = safeMediaUrl(line.trim());
        return <Fragment key={index}>{index > 0 && '\n'}{sourceUrl ? <a className="cm-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{new URL(sourceUrl).hostname} <ExternalLink size={14} /></a> : line}</Fragment>;
      })}</p>}
      <VideoComments videoId={videoId} />
    </div>{!!recommendations.length && <aside className="cm-video-sidebar"><h2>Cùng vào bếp</h2>{recommendations.map(video => <VideoCard key={video.id} video={video} />)}</aside>}</div>}
  </div>;
}

export function VideoDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  return <MainLayout><VideoDetail key={id + ':' + (user?.id || 'guest')} videoId={id} /></MainLayout>;
}
