import { Link } from 'react-router-dom';
import { Pencil, Plus, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { CommunityError, CommunityLoading, CommunityPagination, VideoCard } from '../components/CommunityUi';
import { useState } from 'react';

export function MyVideosPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(`my-videos:${user?.id}:${page}`, signal => communityService.myVideos(page, signal));
  return <MainLayout><div className="cm-shell">
    <header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> NỘI DUNG CỦA BẠN</span><h1>Video của tôi</h1><p>Tạo video, theo dõi trạng thái duyệt và chỉnh sửa nội dung.</p></div><div className="cm-actions"><Link className="cm-button" to="/videos/new"><Plus size={16} /> Thêm video</Link><Link className="cm-button secondary" to="/videos">Xem video</Link></div></header>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}
    {query.data && <>{query.data.items.length ? <div className="cm-video-grid">{query.data.items.map(video => <VideoCard key={video.id} video={video} extra={<div className="cm-saved-remove"><span>{video.status}</span><Link className="cm-link-button" to={`/videos/mine/${video.id}/edit`}><Pencil size={14} /> Chỉnh sửa</Link></div>} />)}</div> : <div className="cm-empty"><h2>Bạn chưa có video</h2><Link className="cm-button" to="/videos/new"><Plus size={16} /> Thêm video đầu tiên</Link></div>}<CommunityPagination data={query.data} change={setPage} /></>}
  </div></MainLayout>;
}
