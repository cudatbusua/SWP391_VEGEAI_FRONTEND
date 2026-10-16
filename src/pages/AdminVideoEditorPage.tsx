import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { videoCategories, type VideoInput, type VideoStatus } from '../types/community';
import { safeMediaUrl } from '../utils/communityVideo';
import { CommunityAdminNav, CommunityError, CommunityGuard, CommunityLoading, VideoCover } from '../components/CommunityUi';

interface EditorForm { title: string; description: string; videoUrl: string; thumbnailUrl: string; category: string; duration: string; status: VideoStatus }
const empty: EditorForm = { title: '', description: '', videoUrl: '', thumbnailUrl: '', category: '', duration: '', status: 'DRAFT' };
function VideoEditor({ videoId }: { videoId?: string }) {
  const navigate = useNavigate();
  const query = useCommunityQuery('edit-video:' + videoId, signal => communityService.adminVideo(videoId || '', signal), !!videoId);
  const [form, setForm] = useState<EditorForm>(empty);
  const [initial, setInitial] = useState(JSON.stringify(empty));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!query.data) return;
    const video = query.data;
    const values: EditorForm = { title: video.title, description: video.description || '', videoUrl: video.videoUrl, thumbnailUrl: video.thumbnailUrl || '', category: video.category || '', duration: video.durationSeconds ? String(video.durationSeconds) : '', status: video.status };
    setForm(values); setInitial(JSON.stringify(values));
  }, [query.data]);
  const dirty = initial !== JSON.stringify(form);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (field: keyof EditorForm, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || (videoId && !query.data)) return;
    setError('');
    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề video.'); return; }
    if (!safeMediaUrl(form.videoUrl) || (form.thumbnailUrl.trim() && !safeMediaUrl(form.thumbnailUrl))) { setError('Vui lòng dùng URL HTTP(S) đầy đủ, không chứa tên đăng nhập hoặc mật khẩu.'); return; }
    setBusy(true);
    try {
      const input: VideoInput = { title: form.title.trim(), description: form.description, videoUrl: form.videoUrl.trim(), thumbnailUrl: form.thumbnailUrl.trim(), category: form.category, durationSeconds: form.duration ? Number(form.duration) : undefined, status: form.status, version: videoId ? query.data?.version : undefined };
      await communityService.saveVideo(input, videoId);
      setInitial(JSON.stringify(form));
      navigate('/admin/videos', { replace: true, state: { message: videoId ? 'Đã cập nhật video.' : 'Đã thêm video.' } });
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const categoryOptions = Array.from(new Set([...Object.keys(videoCategories), form.category])).filter(Boolean);
  return <div className="cm-shell"><CommunityAdminNav /><Link to="/admin/videos" className="cm-back"><ArrowLeft size={15} /> Quản lý video</Link><header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> NỘI DUNG VEGEAI</span><h1>{videoId ? 'Chỉnh sửa video' : 'Thêm video'}</h1></div></header>
    {query.busy ? <CommunityLoading /> : query.error ? <CommunityError message={query.error} retry={query.refresh} /> : <div className="cm-editor-layout"><form className="cm-form" onSubmit={save}>
      {error && <CommunityError message={error} />}
      <label className="cm-field">Tiêu đề<input aria-label="Tiêu đề video" value={form.title} onChange={event => update('title', event.target.value)} maxLength={200} required disabled={busy} placeholder="Tên món ăn hoặc câu chuyện căn bếp" /></label>
      <label className="cm-field">Mô tả<textarea aria-label="Mô tả video" value={form.description} onChange={event => update('description', event.target.value)} maxLength={10000} disabled={busy} rows={6} /><small>{form.description.length}/10000</small></label>
      <label className="cm-field">Đường dẫn video<input aria-label="Đường dẫn video" type="url" value={form.videoUrl} onChange={event => update('videoUrl', event.target.value)} maxLength={2000} required disabled={busy} placeholder="https://www.youtube.com/watch?v=..." /></label>
      <label className="cm-field">Đường dẫn ảnh bìa<input aria-label="Đường dẫn ảnh bìa" type="url" value={form.thumbnailUrl} onChange={event => update('thumbnailUrl', event.target.value)} maxLength={2000} disabled={busy} placeholder="https://..." /></label>
      <div className="cm-grid-two"><label className="cm-field">Danh mục<select aria-label="Danh mục video" value={form.category} disabled={busy} onChange={event => update('category', event.target.value)}><option value="">Chưa phân loại</option>{categoryOptions.map(value => <option key={value} value={value}>{videoCategories[value] || value}</option>)}</select></label><label className="cm-field">Thời lượng (giây)<input aria-label="Thời lượng (giây)" type="number" min={1} max={86400} step={1} value={form.duration} disabled={busy} onChange={event => update('duration', event.target.value)} /></label></div>
      <label className="cm-field">Trạng thái hiển thị<select aria-label="Trạng thái hiển thị" value={form.status} disabled={busy} onChange={event => update('status', event.target.value)}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Công khai</option></select></label>
      <div className="cm-actions"><button className="cm-button" disabled={busy || (!!videoId && !dirty)}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Save size={16} />} Lưu video</button><Link className="cm-button secondary" to="/admin/videos">Hủy</Link></div>
    </form><aside className="cm-editor-preview"><h2>Ảnh bìa</h2><VideoCover video={{ title: form.title || 'Video VEGEAI', videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl, durationSeconds: form.duration ? Number(form.duration) : undefined }} /><h3>{form.title || 'Video mới'}</h3><p>{form.description}</p></aside></div>}
  </div>;
}
export function AdminVideoEditorPage() { const { id } = useParams(); return <MainLayout><CommunityGuard admin><VideoEditor key={id || 'new'} videoId={id} /></CommunityGuard></MainLayout>; }
