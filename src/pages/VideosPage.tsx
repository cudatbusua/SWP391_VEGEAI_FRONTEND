import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CirclePlay, Search, Settings2, Trash2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { videoCategories } from '../types/community';
import { CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, VideoCard } from '../components/CommunityUi';

function VideoList({ saved }: { saved: boolean }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [removing, setRemoving] = useState('');
  const [error, setError] = useState('');
  const query = useCommunityQuery(JSON.stringify(['videos', saved, saved ? user?.id : '', keyword, category, page]), signal => saved ? communityService.savedVideos(page, signal) : communityService.videos({ keyword, category, page }, signal));
  const categories = Array.from(new Set([...Object.keys(videoCategories), category, ...(query.data?.items.map(video => video.category || '') || [])])).filter(Boolean);
  const remove = async (id: string) => {
    if (removing) return;
    setRemoving(id); setError('');
    try {
      await communityService.setFavorite(id, false);
      if (page > 0 && query.data?.items.length === 1) setPage(value => value - 1); else query.refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setRemoving(''); }
  };
  return <div className="cm-shell"><header className="cm-heading"><div><span className="cm-eyebrow"><CirclePlay size={15} /> VÀO BẾP CÙNG VEGEAI</span><h1>{saved ? 'Video đã lưu' : 'Video bếp chay'}</h1><p>Những món chay gần gũi, kể bằng hình ảnh.</p></div><div className="cm-actions"><Link to={saved ? '/videos' : '/videos/saved'} className="cm-button secondary">{saved ? <CirclePlay size={16} /> : <Bookmark size={16} />}{saved ? 'Tất cả video' : 'Video đã lưu'}</Link>{user?.role === 'admin' && <Link to="/admin/videos" className="cm-button secondary"><Settings2 size={16} /> Quản lý video</Link>}</div></header>
    {!saved && <div className="cm-toolbar"><div className="cm-tabs"><button aria-pressed={!category} onClick={() => { setCategory(''); setPage(0); }}>Tất cả video</button><select className="cm-select" aria-label="Danh mục video" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}><option value="">Mọi danh mục</option>{categories.map(value => <option key={value} value={value}>{videoCategories[value] || value}</option>)}</select></div><label className="cm-search"><Search size={17} /><input aria-label="Tìm video" placeholder="Bạn muốn nấu món gì?" maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></div>}
    {error && <CommunityError message={error} />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.busy && <CommunityLoading />}
    {!query.busy && query.data && <><p className="cm-count" style={{ marginBottom: 20 }}>{query.data.totalElements} video</p>{query.data.items.length ? <div className="cm-video-grid">{query.data.items.map(video => <VideoCard key={video.id} video={video} extra={saved && <div className="cm-saved-remove"><button className="cm-link-button" disabled={!!removing} onClick={() => remove(video.id)}><Trash2 size={14} /> {removing === video.id ? 'Đang bỏ lưu...' : 'Bỏ lưu'}</button></div>} />)}</div> : <div className="cm-empty"><img src="/images/vegan-tofu-meal.png" alt="Bữa ăn chay với đậu phụ và rau củ" /><h2>{keyword || category ? 'Chưa tìm thấy video phù hợp' : saved ? 'Góc video yêu thích còn trống' : 'Căn bếp đang chờ thước phim mới'}</h2>{keyword || category ? <button className="cm-button secondary" onClick={() => { setSearch(''); setCategory(''); setPage(0); }}>Xóa bộ lọc</button> : <Link className="cm-button secondary" to={saved ? '/videos' : user?.role === 'admin' ? '/admin/videos/new' : '/'}>{saved ? 'Khám phá video' : user?.role === 'admin' ? 'Thêm video' : 'Khám phá công thức'}</Link>}</div>}<CommunityPagination data={query.data} change={setPage} /></>}
  </div>;
}
export function VideosPage({ saved = false }: { saved?: boolean }) { return <MainLayout>{saved ? <CommunityGuard><VideoList saved /></CommunityGuard> : <VideoList saved={false} />}</MainLayout>; }
