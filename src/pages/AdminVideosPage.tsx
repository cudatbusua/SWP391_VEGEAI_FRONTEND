import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ArrowRight, Pencil, Plus, RotateCcw, Search, Trash2, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { CommunityVideo, VideoStatus } from '../types/community';
import { communityDate, CommunityAdminNav, CommunityConfirm, CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, VideoCover } from '../components/CommunityUi';

const tabs: Array<{ value: VideoStatus; label: string }> = [
  { value: 'PUBLISHED', label: 'Đã xuất bản' }, { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { value: 'REJECTED', label: 'Bị từ chối' }, { value: 'ARCHIVED', label: 'Kho đã ẩn' },
];
const statusLabels: Record<VideoStatus, string> = { DRAFT: 'Bản nháp', PENDING_REVIEW: 'Chờ duyệt', PUBLISHED: 'Đã xuất bản', REJECTED: 'Bị từ chối', ARCHIVED: 'Đã ẩn' };

function AdminVideoList() {
  const location = useLocation();
  const [status, setStatus] = useState<VideoStatus>('PUBLISHED');
  const [search, setSearch] = useState(''); const keyword = useDebouncedValue(search);
  const [page, setPage] = useState(0); const [deleting, setDeleting] = useState<CommunityVideo | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const query = useCommunityQuery(JSON.stringify(['admin-videos', status, keyword, page]), signal => communityService.adminVideos({ status, keyword, page }, signal));
  const remove = async () => { if (!deleting || busy) return; setBusy(true); setError(''); try { await communityService.deleteVideo(deleting.id, deleting.version); setDeleting(null); if (page > 0 && query.data?.items.length === 1) setPage(value => value - 1); else query.refresh(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  const visibility = async (video: CommunityVideo, restore: boolean) => { if (!window.confirm(`${restore ? 'Khôi phục' : 'Ẩn'} video “${video.title}”?`)) return; setBusy(true); setError(''); try { if (restore) await communityService.restoreVideo(video.id, video.version); else await communityService.archiveVideo(video.id, video.version); query.refresh(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  const review = async (video: CommunityVideo, decision: 'APPROVE' | 'REJECT') => { setBusy(true); setError(''); try { await communityService.reviewVideoModeration(video.id, video.version, decision); query.refresh(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <div className="cm-shell"><CommunityAdminNav />
    <header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> QUẢN TRỊ NỘI DUNG</span><h1>Quản lý Video</h1><p>Kiểm duyệt, xuất bản và quản lý kho video đã ẩn.</p></div><div className="cm-actions"><Link className="cm-button secondary" to="/videos">Video công khai <ArrowRight size={16} /></Link><Link className="cm-button" to="/admin/videos/new"><Plus size={17} /> Thêm video</Link></div></header>
    {typeof location.state?.message === 'string' && <p role="status" className="cm-alert">{location.state.message}</p>}{error && !deleting && <CommunityError message={error} retry={query.refresh} />}
    <div className="blog-filter-bar"><div className="blog-tabs">{tabs.map(tab => <button key={tab.value} aria-pressed={status === tab.value} onClick={() => { setStatus(tab.value); setPage(0); }}>{tab.label}</button>)}</div><label className="blog-search"><Search size={17} /><input aria-label="Tìm video" maxLength={200} placeholder="Tìm tên hoặc mô tả video..." value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></div>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.data && <><p className="cm-count">{query.data.totalElements} video</p>{!query.data.items.length && <div className="cm-empty"><Video size={32} /><h2>Không có video trong mục này</h2></div>}{query.data.items.map(video => <article className="cm-admin-row" key={video.id}><div className="cm-admin-video-info"><VideoCover video={video} /><div><h2>{video.title}</h2><small>{communityDate(video.createdAt)}</small>{video.aiModerationStatus === 'FLAGGED' && <small className="block text-rose-600">⚠ AI gắn cờ: {video.aiModerationReason || 'Cần Admin kiểm tra'}</small>}</div></div><span className={'cm-badge ' + video.status.toLowerCase()}>{statusLabels[video.status]}</span><div className="cm-actions">{video.status === 'PENDING_REVIEW' && <><button className="cm-button" disabled={busy} onClick={() => void review(video, 'APPROVE')}>Duyệt & xuất bản</button><button className="cm-button secondary" disabled={busy} onClick={() => void review(video, 'REJECT')}>Từ chối</button></>}{video.status === 'ARCHIVED' ? <button className="cm-button secondary" disabled={busy} onClick={() => void visibility(video, true)}><RotateCcw size={16} /> Xuất hiện lại</button> : video.status === 'PUBLISHED' && <button className="cm-button secondary" disabled={busy} onClick={() => void visibility(video, false)}><Archive size={16} /> Ẩn</button>}<Link to={'/admin/videos/' + video.id + '/edit'} className="cm-icon" title="Sửa video"><Pencil size={16} /></Link><button className="cm-icon danger" title="Xóa video" disabled={busy} onClick={() => { setDeleting(video); setError(''); }}><Trash2 size={16} /></button></div></article>)}<CommunityPagination data={query.data} change={setPage} /></>}
    <CommunityConfirm open={!!deleting} title="Xóa video?" busy={busy} destructive onCancel={() => setDeleting(null)} onConfirm={remove}><p>Video “{deleting?.title}” cùng bình luận và lượt lưu sẽ bị xóa vĩnh viễn.</p>{error && <CommunityError message={error} retry={() => { setDeleting(null); query.refresh(); }} />}</CommunityConfirm>
  </div>;
}
export function AdminVideosPage() { return <MainLayout><CommunityGuard admin><AdminVideoList /></CommunityGuard></MainLayout>; }
