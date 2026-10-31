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
function VideoEditor({ videoId, member = false }: { videoId?: string; member?: boolean }) {
  const navigate = useNavigate();
  const query = useCommunityQuery('edit-video:' + member + ':' + videoId, signal => member ? communityService.myVideo(videoId || '', signal) : communityService.adminVideo(videoId || '', signal), !!videoId);
  const [form, setForm] = useState<EditorForm>(empty);
  const [initial, setInitial] = useState(JSON.stringify(empty));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (file: File | undefined, video: boolean) => {
    if (!file) return;
    setBusy(true); setError('');
    try { const result = await (member ? communityService.uploadMyVideoAsset(file, video) : communityService.uploadVideoAsset(file, video)); update(video ? 'videoUrl' : 'thumbnailUrl', result.url); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
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
    if (!safeMediaUrl(form.videoUrl) || (form.thumbnailUrl.trim() && !safeMediaUrl(form.thumbnailUrl))) { setError('Vui lòng dùng URL hợp lệ hoặc tải tệp trực tiếp.'); return; }
    setBusy(true);
    try {
      const input: VideoInput = { title: form.title.trim(), description: form.description, videoUrl: form.videoUrl.trim(), thumbnailUrl: form.thumbnailUrl.trim(), category: form.category, durationSeconds: form.duration ? Number(form.duration) : undefined, status: form.status, version: videoId ? query.data?.version : undefined };
      await (member ? communityService.saveMyVideo(input, videoId) : communityService.saveVideo(input, videoId));
      setInitial(JSON.stringify(form));
      navigate(member ? '/videos/mine' : '/admin/videos', { replace: true, state: { message: videoId ? 'Đã cập nhật video.' : 'Đã thêm video.' } });
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const categoryOptions = Array.from(new Set([...Object.keys(videoCategories), form.category])).filter(Boolean);
  return <div className="cm-shell">{!member && <CommunityAdminNav />}<Link to={member ? "/videos/mine" : "/admin/videos"} className="cm-back"><ArrowLeft size={15} /> Quản lý video</Link><header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> NỘI DUNG VEGEAI</span><h1>{videoId ? 'Chỉnh sửa video' : 'Thêm video'}</h1></div></header>
    {query.busy ? <CommunityLoading /> : query.error ? <CommunityError message={query.error} retry={query.refresh} /> : <div className="cm-editor-layout"><form className="cm-form" onSubmit={save}>
      {error && <CommunityError message={error} />}
      <label className="cm-field">Tiêu đề<input aria-label="Tiêu đề video" value={form.title} onChange={event => update('title', event.target.value)} maxLength={200} required disabled={busy} placeholder="Tên món ăn hoặc câu chuyện căn bếp" /></label>
      <label className="cm-field">Mô tả<textarea aria-label="Mô tả video" value={form.description} onChange={event => update('description', event.target.value)} maxLength={10000} disabled={busy} rows={6} /><small>{form.description.length}/10000</small></label>
      <label className="cm-field">Video<input aria-label="Đường dẫn video" value={form.videoUrl} onChange={event => update('videoUrl', event.target.value)} maxLength={2000} required disabled={busy} placeholder="Dán URL hoặc tải tệp MP4/WebM" /><input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={event => void upload(event.target.files?.[0], true)} /><small>Tải trực tiếp tối đa 150 MB hoặc dùng URL có sẵn.</small></label>
      <label className="cm-field">Ảnh bìa<input aria-label="Đường dẫn ảnh bìa" value={form.thumbnailUrl} onChange={event => update('thumbnailUrl', event.target.value)} maxLength={2000} disabled={busy} placeholder="Dán URL hoặc tải ảnh" /><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void upload(event.target.files?.[0], false)} /><small>JPG, PNG hoặc WebP; tối đa 5 MB.</small></label>
      <div className="cm-grid-two"><label className="cm-field">Danh mục<select aria-label="Danh mục video" value={form.category} disabled={busy} onChange={event => update('category', event.target.value)}><option value="">Chưa phân loại</option>{categoryOptions.map(value => <option key={value} value={value}>{videoCategories[value] || value}</option>)}</select></label><label className="cm-field">Thời lượng (giây)<input aria-label="Thời lượng (giây)" type="number" min={1} max={86400} step={1} value={form.duration} disabled={busy} onChange={event => update('duration', event.target.value)} /></label></div>
      <label className="cm-field">Trạng thái hiển thị<select aria-label="Trạng thái hiển thị" value={form.status} disabled={busy} onChange={event => update('status', event.target.value)}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Công khai</option><option value="ARCHIVED">Đã ẩn</option></select></label>
      <div className="cm-actions"><button className="cm-button" disabled={busy || (!!videoId && !dirty)}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Save size={16} />} Lưu video</button><Link className="cm-button secondary" to={member ? "/videos/mine" : "/admin/videos"}>Hủy</Link></div>
    </form><aside className="cm-editor-preview"><h2>Ảnh bìa</h2><VideoCover video={{ title: form.title || 'Video VEGEAI', videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl, durationSeconds: form.duration ? Number(form.duration) : undefined }} /><h3>{form.title || 'Video mới'}</h3><p>{form.description}</p></aside></div>}
  </div>;
}
export function AdminVideoEditorPage() { const { id } = useParams(); return <MainLayout><CommunityGuard admin><VideoEditor key={id || 'new'} videoId={id} /></CommunityGuard></MainLayout>; }
export function UserVideoEditorPage() { const { id } = useParams(); return <MainLayout><CommunityGuard><VideoEditor member key={id || 'new'} videoId={id} /></CommunityGuard></MainLayout>; }
