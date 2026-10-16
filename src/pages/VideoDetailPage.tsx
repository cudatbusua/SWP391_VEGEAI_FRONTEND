import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Clock3, ExternalLink, Loader2, MessageCircle, Pencil, Send, Trash2, UserRound } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { safeMediaUrl } from '../utils/communityVideo';
import type { VideoComment } from '../types/community';
import { videoCategories } from '../types/community';
import { communityDate, CommunityConfirm, CommunityError, CommunityLoading, CommunityPagination, VideoCard, VideoPlayer } from '../components/CommunityUi';

function VideoComments({ videoId }: { videoId: string }) {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(JSON.stringify(['comments', videoId, page]), signal => communityService.comments(videoId, page, signal));
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<VideoComment | null>(null);
  const [deleting, setDeleting] = useState<VideoComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !draft.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await communityService.comment(videoId, draft, editing || undefined);
      setMessage(editing ? 'Đã cập nhật bình luận.' : 'Đã gửi bình luận.');
      const nextPage = editing ? page : Math.floor((query.data?.totalElements ?? 0) / 10);
      setEditing(null); setDraft('');
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
  return <section className="cm-comments" id="video-comments"><h2><MessageCircle size={20} style={{ display: 'inline', marginRight: 9 }} />Bình luận {query.data ? '(' + query.data.totalElements + ')' : ''}</h2>
    {error && <CommunityError message={error} />}{message && <p role="status" className="cm-alert">{message}</p>}
    {isAuthenticated ? <form className="cm-form" onSubmit={submit} style={{ marginTop: 15, marginBottom: 10 }}><label className="cm-field">{editing ? 'Chỉnh sửa bình luận' : 'Chia sẻ cảm nhận của bạn'}<textarea aria-label="Nội dung bình luận" rows={3} value={draft} maxLength={2000} required disabled={busy} onChange={event => setDraft(event.target.value)} placeholder="Bạn đã thử nấu món này chưa?" /><small>{draft.length}/2000</small></label><div className="cm-actions"><button className="cm-button" disabled={busy || !draft.trim()}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Send size={16} />}{editing ? 'Lưu chỉnh sửa' : 'Gửi bình luận'}</button>{editing && <button type="button" className="cm-button secondary" disabled={busy} onClick={() => { setEditing(null); setDraft(''); }}>Hủy chỉnh sửa</button>}</div></form>
      : <Link className="cm-button secondary" to="/login" state={{ from: '/videos/' + videoId }}><UserRound size={16} /> Đăng nhập để bình luận</Link>}
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
      <div className="cm-actions" style={{ marginBottom: 18 }}>{isAuthenticated ? <button className={'cm-button ' + (isSaved ? '' : 'secondary')} onClick={toggle} disabled={busy || favoriteQuery.busy || !!favoriteQuery.error} aria-pressed={isSaved}>{busy ? <Loader2 size={16} className="cm-spin" /> : isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{isSaved ? 'Đã lưu video' : 'Lưu video'}</button> : <Link to="/login" state={{ from: '/videos/' + videoId }} className="cm-button secondary"><Bookmark size={16} /> Đăng nhập để lưu</Link>}{user?.role === 'admin' && <Link className="cm-button secondary" to={'/admin/videos/' + videoId + '/edit'}><Pencil size={15} /> Sửa video</Link>}</div>
      {error && <CommunityError message={error} />}{favoriteQuery.error && <CommunityError message={favoriteQuery.error} retry={favoriteQuery.refresh} />}
      {query.data.description && <p className="cm-video-description">{query.data.description.split('\n').map((line, index) => {
        const sourceUrl = safeMediaUrl(line.trim());
        return <Fragment key={index}>{index > 0 && '\n'}{sourceUrl ? <a className="cm-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{new URL(sourceUrl).hostname} <ExternalLink size={14} /></a> : line}</Fragment>;
      })}</p>}<VideoComments videoId={videoId} />
    </div>{!!recommendations.length && <aside className="cm-video-sidebar"><h2>Cùng vào bếp</h2>{recommendations.map(video => <VideoCard key={video.id} video={video} />)}</aside>}</div>}
  </div>;
}
export function VideoDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  return <MainLayout><VideoDetail key={id + ':' + (user?.id || 'guest')} videoId={id} /></MainLayout>;
}
