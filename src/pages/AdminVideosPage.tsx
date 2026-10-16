import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Pencil, Plus, Search, Trash2, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { CommunityVideo, VideoStatus } from '../types/community';
import { communityDate, CommunityAdminNav, CommunityConfirm, CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, VideoCover } from '../components/CommunityUi';

function AdminVideoList() {
  const location = useLocation();
  const [status, setStatus] = useState<VideoStatus | ''>('');
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<CommunityVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useCommunityQuery(JSON.stringify(['admin-videos', status, keyword, page]), signal => communityService.adminVideos({ status, keyword, page }, signal));
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError('');
    try {
      await communityService.deleteVideo(deleting.id, deleting.version); setDeleting(null);
      if (page > 0 && query.data?.items.length === 1) setPage(value => value - 1); else query.refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <div className="cm-shell"><CommunityAdminNav /><header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> QUẢN TRỊ NỘI DUNG</span><h1>Quản lý video</h1></div><div className="cm-actions"><Link className="cm-button secondary" to="/videos">Video công khai <ArrowRight size={16} /></Link><Link className="cm-button" to="/admin/videos/new"><Plus size={17} /> Thêm video</Link></div></header>
    {typeof location.state?.message === 'string' && <p role="status" className="cm-alert">{location.state.message}</p>}{error && !deleting && <CommunityError message={error} retry={query.refresh} />}
    <div className="cm-toolbar"><select className="cm-select" aria-label="Trạng thái video" value={status} onChange={event => { setStatus(event.target.value as VideoStatus | ''); setPage(0); }}><option value="">Tất cả trạng thái</option><option value="PUBLISHED">Công khai</option><option value="DRAFT">Bản nháp</option></select><label className="cm-search"><Search size={17} /><input aria-label="Tìm video quản trị" maxLength={200} placeholder="Tìm tên hoặc mô tả video..." value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></div>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.data && <><p className="cm-count">{query.data.totalElements} video</p>{!query.data.items.length && <div className="cm-empty"><Video size={32} /><h2>Chưa có video trong danh sách này</h2><Link to="/admin/videos/new" className="cm-button"><Plus size={16} /> Thêm video</Link></div>}{query.data.items.map(video => <article className="cm-admin-row" key={video.id}><div className="cm-admin-video-info"><VideoCover video={video} /><div><h2>{video.title}</h2><small>{communityDate(video.createdAt)}</small></div></div><span className={'cm-badge ' + video.status.toLowerCase()}>{video.status === 'PUBLISHED' ? 'Công khai' : 'Bản nháp'}</span><div className="cm-actions"><Link to={'/admin/videos/' + video.id + '/edit'} className="cm-icon" title="Sửa video" aria-label={'Sửa video: ' + video.title}><Pencil size={16} /></Link><button className="cm-icon danger" title="Xóa video" aria-label={'Xóa video: ' + video.title} disabled={busy} onClick={() => { setDeleting(video); setError(''); }}><Trash2 size={16} /></button></div></article>)}<CommunityPagination data={query.data} change={setPage} /></>}
    <CommunityConfirm open={!!deleting} title="Xóa video?" busy={busy} destructive onCancel={() => setDeleting(null)} onConfirm={remove}><p>Video “{deleting?.title}” và các bình luận, lượt lưu liên quan sẽ bị xóa vĩnh viễn.</p>{error && <CommunityError message={error} retry={() => { setDeleting(null); query.refresh(); }} />}</CommunityConfirm>
  </div>;
}
export function AdminVideosPage() { return <MainLayout><CommunityGuard admin><AdminVideoList /></CommunityGuard></MainLayout>; }
