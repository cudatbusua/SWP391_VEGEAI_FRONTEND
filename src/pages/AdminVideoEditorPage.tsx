import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image, Loader2, Save, Upload, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { videoCategories, type VideoInput, type VideoStatus } from '../types/community';
import { safeMediaUrl, videoSource } from '../utils/communityVideo';
import { CommunityAdminNav, CommunityError, CommunityGuard, CommunityLoading, VideoCover } from '../components/CommunityUi';

interface EditorForm { title: string; description: string; videoUrl: string; thumbnailUrl: string; category: string; duration: string; status: VideoStatus }
const empty: EditorForm = { title: '', description: '', videoUrl: '', thumbnailUrl: '', category: '', duration: '', status: 'DRAFT' };

function detectVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise(resolve => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      const cleanup = () => URL.revokeObjectURL(objectUrl);
      probe.onloadedmetadata = () => {
        const seconds = Number.isFinite(probe.duration) && probe.duration > 0 ? Math.round(probe.duration) : null;
        cleanup();
        resolve(seconds);
      };
      probe.onerror = () => {
        cleanup();
        resolve(null);
      };
      probe.src = objectUrl;
    } catch {
      resolve(null);
    }
  });
}

function VideoEditor({ videoId, member = false }: { videoId?: string; member?: boolean }) {
  const navigate = useNavigate();
  const query = useCommunityQuery('edit-video:' + member + ':' + videoId, signal => member ? communityService.myVideo(videoId || '', signal) : communityService.adminVideo(videoId || '', signal), !!videoId);
  const [form, setForm] = useState<EditorForm>(empty);
  const [initial, setInitial] = useState(JSON.stringify(empty));
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState<'video' | 'thumbnail' | null>(null);
  const [uploadNotice, setUploadNotice] = useState('');
  const [error, setError] = useState('');

  const upload = async (file: File | undefined, video: boolean) => {
    if (!file || busy) return;
    setBusy(true);
    setUploadingType(video ? 'video' : 'thumbnail');
    setError('');
    setUploadNotice('');
    try {
      const [result, detectedSeconds] = await Promise.all([
        member ? communityService.uploadMyVideoAsset(file, video) : communityService.uploadVideoAsset(file, video),
        video ? detectVideoDurationSeconds(file) : Promise.resolve(null),
      ]);
      setForm(previous => ({
        ...previous,
        [video ? 'videoUrl' : 'thumbnailUrl']: result.url,
        ...(video && detectedSeconds && !previous.duration ? { duration: String(detectedSeconds) } : {}),
      }));
      setUploadNotice(video
        ? `Đã tải tệp video "${file.name}" lên thành công${detectedSeconds ? ` (${detectedSeconds} giây)` : ''}.`
        : `Đã tải ảnh bìa "${file.name}" lên thành công.`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
      setUploadingType(null);
    }
  };

  useEffect(() => {
    if (!query.data) return;
    const video = query.data;
    const normalizedStatus: VideoStatus = member && video.status === 'PENDING_REVIEW' ? 'PUBLISHED' : video.status;
    const values: EditorForm = { title: video.title, description: video.description || '', videoUrl: video.videoUrl, thumbnailUrl: video.thumbnailUrl || '', category: video.category || '', duration: video.durationSeconds ? String(video.durationSeconds) : '', status: normalizedStatus };
    setForm(values); setInitial(JSON.stringify(values));
  }, [query.data, member]);

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
  const previewSource = form.videoUrl ? videoSource(form.videoUrl) : null;

  return <div className="cm-shell">{!member && <CommunityAdminNav />}<Link to={member ? "/videos/mine" : "/admin/videos"} className="cm-back"><ArrowLeft size={15} /> Quản lý video</Link><header className="cm-heading"><div><span className="cm-eyebrow"><Video size={15} /> NỘI DUNG VEGEAI</span><h1>{videoId ? 'Chỉnh sửa video' : 'Thêm video'}</h1></div></header>
    {query.busy ? <CommunityLoading /> : query.error ? <CommunityError message={query.error} retry={query.refresh} /> : <div className="cm-editor-layout"><form className="cm-form" onSubmit={save}>
      {error && <CommunityError message={error} />}
      {uploadNotice && <p role="status" className="cm-alert success">{uploadNotice}</p>}
      <label className="cm-field">Tiêu đề<input aria-label="Tiêu đề video" value={form.title} onChange={event => update('title', event.target.value)} maxLength={200} required disabled={busy} placeholder="Tên món ăn hoặc câu chuyện căn bếp" /></label>
      <label className="cm-field">Mô tả<textarea aria-label="Mô tả video" value={form.description} onChange={event => update('description', event.target.value)} maxLength={10000} disabled={busy} rows={6} /><small>{form.description.length}/10000</small></label>

      <div className="cm-field">
        <span>Tệp Video hoặc Liên kết ngoài</span>
        <div className="flex flex-wrap items-center gap-2 my-1">
          <label className="cm-button secondary cursor-pointer">
            {uploadingType === 'video' ? <Loader2 size={15} className="cm-spin" /> : <Upload size={15} />}
            <span>{uploadingType === 'video' ? 'Đang tải video...' : 'Tải video từ máy (MP4, WebM)'}</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              disabled={busy}
              onChange={event => {
                void upload(event.target.files?.[0], true);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <span className="text-xs opacity-75">hoặc nhập liên kết bên dưới:</span>
        </div>
        <div className="relative">
          <input aria-label="Đường dẫn video" value={form.videoUrl} onChange={event => update('videoUrl', event.target.value)} maxLength={2000} required disabled={busy} placeholder="https://www.youtube.com/watch?v=... hoặc /api/public/community-media/..." />
        </div>
        <small>Hỗ trợ tải tệp trực tiếp (MP4/WebM, tối đa {member ? '60 MB' : '150 MB'}) hoặc dán link YouTube / Vimeo.</small>
      </div>

      <div className="cm-field">
        <span>Ảnh bìa thu nhỏ (Thumbnail)</span>
        <div className="flex flex-wrap items-center gap-2 my-1">
          <label className="cm-button secondary cursor-pointer">
            {uploadingType === 'thumbnail' ? <Loader2 size={15} className="cm-spin" /> : <Image size={15} />}
            <span>{uploadingType === 'thumbnail' ? 'Đang tải ảnh bìa...' : 'Tải ảnh bìa từ máy (JPG, PNG, WebP)'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={event => {
                void upload(event.target.files?.[0], false);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <span className="text-xs opacity-75">hoặc nhập URL ảnh:</span>
        </div>
        <input aria-label="Đường dẫn ảnh bìa" value={form.thumbnailUrl} onChange={event => update('thumbnailUrl', event.target.value)} maxLength={2000} disabled={busy} placeholder="Dán URL ảnh hoặc để trống để tự lấy từ YouTube" />
        <small>Định dạng JPG, PNG hoặc WebP; dung lượng tối đa 5 MB.</small>
      </div>

      <div className="cm-grid-two"><label className="cm-field">Danh mục<select aria-label="Danh mục video" value={form.category} disabled={busy} onChange={event => update('category', event.target.value)}><option value="">Chưa phân loại</option>{categoryOptions.map(value => <option key={value} value={value}>{videoCategories[value] || value}</option>)}</select></label><label className="cm-field">Thời lượng (giây)<input aria-label="Thời lượng (giây)" type="number" min={1} max={86400} step={1} value={form.duration} disabled={busy} onChange={event => update('duration', event.target.value)} placeholder="Tự động điền khi tải file MP4/WebM" /></label></div>
      <label className="cm-field">Trạng thái hiển thị<select aria-label="Trạng thái hiển thị" value={form.status} disabled={busy} onChange={event => update('status', event.target.value)}><option value="DRAFT">Bản nháp (Chỉ mình tôi)</option><option value="PUBLISHED">{member ? 'Gửi duyệt công khai (Chờ kiểm duyệt)' : 'Công khai'}</option><option value="ARCHIVED">Đã ẩn (Lưu trữ)</option></select></label>
      <div className="cm-actions"><button className="cm-button" disabled={busy || (!!videoId && !dirty)}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Save size={16} />} Lưu video</button><Link className="cm-button secondary" to={member ? "/videos/mine" : "/admin/videos"}>Hủy</Link></div>
    </form><aside className="cm-editor-preview">
      <h2>Xem trước Video &amp; Ảnh bìa</h2>
      {previewSource?.kind === 'file' ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-3 border border-slate-200 dark:border-slate-700">
          <video src={previewSource.src} poster={safeMediaUrl(form.thumbnailUrl) || undefined} controls className="w-full h-full object-contain" />
        </div>
      ) : previewSource?.kind === 'embed' ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-3 border border-slate-200 dark:border-slate-700">
          <iframe src={previewSource.src} title={form.title || 'Preview'} className="w-full h-full border-0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null}
      <VideoCover video={{ title: form.title || 'Video VEGEAI', videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl, durationSeconds: form.duration ? Number(form.duration) : undefined }} />
      <h3>{form.title || 'Video mới'}</h3>
      <p>{form.description}</p>
    </aside></div>}
  </div>;
}
export function AdminVideoEditorPage() { const { id } = useParams(); return <MainLayout><CommunityGuard admin><VideoEditor key={id || 'new'} videoId={id} /></CommunityGuard></MainLayout>; }
export function UserVideoEditorPage() { const { id } = useParams(); return <MainLayout><CommunityGuard><VideoEditor member key={id || 'new'} videoId={id} /></CommunityGuard></MainLayout>; }
