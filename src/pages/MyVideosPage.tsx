import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Pencil, Plus, RotateCcw, Trash2, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { CommunityError, CommunityLoading, CommunityPagination, VideoCard } from '../components/CommunityUi';
import type { CommunityVideo } from '../types/community';

export function MyVideosPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const query = useCommunityQuery(`my-videos:${user?.id}:${page}`, signal => communityService.myVideos(page, signal));

  const changeVisibility = async (video: CommunityVideo) => {
    if (busy) return;
    const restore = video.status === 'ARCHIVED';
    if (!window.confirm(`${restore ? 'Gửi duyệt lại' : 'Ẩn'} video “${video.title}”?`)) return;
    setBusy(video.id); setActionError('');
    try {
      if (restore) await communityService.restoreMyVideo(video.id, video.version);
      else await communityService.archiveMyVideo(video.id, video.version);
      query.refresh();
    } catch (reason) { setActionError(errorMessage(reason)); }
    finally { setBusy(''); }
  };

  const remove = async (video: CommunityVideo) => {
    if (busy || !window.confirm(`Xóa vĩnh viễn video “${video.title}”?`)) return;
    setBusy(video.id); setActionError('');
    try {
      await communityService.deleteMyVideo(video.id, video.version);
      if (page > 0 && query.data?.items.length === 1) setPage(value => value - 1);
      else query.refresh();
    } catch (reason) { setActionError(errorMessage(reason)); }
    finally { setBusy(''); }
  };

  return <MainLayout><div className="cm-shell">
    <header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> NỘI DUNG CỦA BẠN</span><h1>Video của tôi</h1><p>Tạo video, theo dõi trạng thái duyệt và chỉnh sửa nội dung.</p></div><div className="cm-actions"><Link className="cm-button" to="/videos/new"><Plus size={16} /> Thêm video</Link><Link className="cm-button secondary" to="/videos">Xem video</Link></div></header>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{actionError && <CommunityError message={actionError} />}
    {query.data && <>{query.data.items.length ? <div className="cm-video-grid">{query.data.items.map(video => <VideoCard key={video.id} video={video} extra={<div className="cm-saved-remove"><span>{video.status}</span><Link className="cm-link-button" to={`/videos/mine/${video.id}/edit`}><Pencil size={14} /> Chỉnh sửa</Link><button className="cm-link-button" disabled={!!busy} onClick={() => void changeVisibility(video)}>{video.status === 'ARCHIVED' ? <RotateCcw size={14} /> : <Archive size={14} />} {video.status === 'ARCHIVED' ? 'Gửi duyệt lại' : 'Ẩn'}</button><button className="cm-link-button text-rose-600" disabled={!!busy} onClick={() => void remove(video)}><Trash2 size={14} /> Xóa</button></div>} />)}</div> : <div className="cm-empty"><h2>Bạn chưa có video</h2><Link className="cm-button" to="/videos/new"><Plus size={16} /> Thêm video đầu tiên</Link></div>}<CommunityPagination data={query.data} change={setPage} /></>}
  </div></MainLayout>;
}
