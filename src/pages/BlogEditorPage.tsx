import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, FilePenLine, Image, Video, Sparkles } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { videoSource } from '../utils/communityVideo';
import type { BlogInput, BlogPost } from '../types/blog';
import { blogCategories } from '../types/blog';
import '../styles/blog.css';

const initial: BlogInput = {
  title: '',
  excerpt: '',
  content: '',
  category: 'KITCHEN',
  coverImage: '/images/vietnamese-vegan-table.png',
  videoUrl: '',
};

const covers = [
  { src: '/images/vietnamese-vegan-table.png', label: 'Bữa cơm chay' },
  { src: '/images/vegan-tofu-meal.png', label: 'Món đậu phụ' },
  { src: '/images/fresh-vegetables.png', label: 'Rau xanh' },
];

export function BlogEditorPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [form, setForm] = useState<BlogInput>(initial);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!id) {
      setPost(null);
      setForm(initial);
      setLoading(false);
      setDirty(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPost(null);
    blogService.ownPost(id, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setPost(value);
      setForm({
        title: value.title,
        excerpt: value.excerpt,
        content: value.content || '',
        category: value.category,
        coverImage: value.coverImage || '',
        videoUrl: value.videoUrl || '',
        version: value.version,
      });
      if (value.videoUrl) setMediaTab('video');
      setDirty(false);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(errorMessage(reason));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, isAuthenticated, user?.id, reload]);

  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (dirty && !busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty, busy]);

  const change = (key: keyof BlogInput, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!form.title.trim()) {
      setPreview(false);
      setError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    const submitting = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'submit';
    if ((submitting || post?.status === 'PUBLISHED') && (form.title.trim().length < 5 || form.content.trim().length < 80)) {
      setError('Tiêu đề cần ít nhất 5 ký tự và nội dung ít nhất 80 ký tự trước khi gửi bài.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await blogService.save({ ...form, version: post?.version }, post?.postId || id);
      setPost(saved);
      setForm(previous => ({ ...previous, version: saved.version }));
      setDirty(false);
      if (submitting) {
        await blogService.submit(saved.postId, saved.version);
        navigate('/blog/my-posts/' + saved.postId);
      } else {
        setMessage(saved.status === 'PUBLISHED' ? 'Đã cập nhật bài viết công khai.' : 'Đã lưu bản nháp.');
        if (!id) navigate('/blog/my-posts/' + saved.postId + '/edit', { replace: true });
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const editable = !post || ['DRAFT', 'REJECTED'].includes(post.status) || (isAdmin && post.status === 'PUBLISHED');
  const videoSourceObj = form.videoUrl ? videoSource(form.videoUrl) : null;

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess>
          <Link to="/blog/my-posts" className="blog-back">
            <ArrowLeft size={15} /> Bài viết của tôi
          </Link>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">CHIA SẺ CÙNG CỘNG ĐỒNG</span>
              <h1>{id ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h1>
            </div>
            {post && <BlogBadge status={post.status} />}
          </header>

          {error && <BlogError message={error} retry={id ? () => setReload(value => value + 1) : undefined} />}
          {message && <p role="status" className="blog-message">{message}</p>}

          {loading ? (
            <p role="status" className="blog-empty">Đang tải bản nháp...</p>
          ) : id && error && !post ? null : !editable ? (
            <div className="blog-empty">
              <p>Bài viết hiện không thể chỉnh sửa.</p>
              <Link to={'/blog/my-posts/' + id} className="blog-button secondary">Xem trạng thái</Link>
            </div>
          ) : (
            <form onSubmit={save} className="blog-editor-grid">
              <div className="blog-editor-main">
                <div className="blog-editor-tabs">
                  <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
                    <FilePenLine size={16} /> Soạn bài
                  </button>
                  <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
                    <Eye size={16} /> Xem trước
                  </button>
                </div>

                {post?.status === 'REJECTED' && post.moderationReason && (
                  <div className="blog-rejection-note">
                    <strong>Góp ý từ ban biên tập</strong>
                    <p>{post.moderationReason}</p>
                  </div>
                )}

                <fieldset disabled={busy} className={preview ? 'blog-editor-fields is-hidden' : 'blog-editor-fields'}>
                  <label>
                    Tiêu đề
                    <input
                      required={!preview}
                      maxLength={150}
                      value={form.title}
                      onChange={event => change('title', event.target.value)}
                      placeholder="Một câu chuyện từ căn bếp của bạn..."
                    />
                  </label>
                  <label>
                    Tóm tắt
                    <textarea
                      aria-label="Tóm tắt"
                      rows={3}
                      maxLength={400}
                      value={form.excerpt}
                      onChange={event => change('excerpt', event.target.value)}
                      placeholder="Đôi dòng mở đầu cho bài viết"
                    />
                  </label>
                  <label>
                    Nội dung
                    <textarea
                      aria-label="Nội dung"
                      rows={17}
                      maxLength={50000}
                      value={form.content}
                      onChange={event => change('content', event.target.value)}
                      placeholder="Chia sẻ công thức, trải nghiệm hoặc câu chuyện sống chay của bạn..."
                    />
                  </label>
                  <span className="blog-character-count">{form.content.length.toLocaleString('vi-VN')} / 50.000 ký tự</span>
                </fieldset>

                {preview && (
                  <article className="blog-editor-preview">
                    <span className="blog-eyebrow">{blogCategories[form.category]}</span>
                    <h2>{form.title || 'Tiêu đề bài viết'}</h2>
                    <p className="blog-lead">{form.excerpt}</p>
                    
                    {/* Render Video or Cover preview */}
                    {videoSourceObj?.kind === 'embed' ? (
                      <div className="my-5 aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
                        <iframe
                          src={videoSourceObj.src.replace('autoplay=1', 'autoplay=0')}
                          className="w-full h-full border-0"
                          title="Preview video"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} />
                    )}

                    <BlogBody content={form.content || 'Nội dung bài viết'} />
                  </article>
                )}
              </div>

              <aside className="blog-editor-side">
                <fieldset disabled={busy} className="space-y-4">
                  <label>
                    Chủ đề
                    <select value={form.category} onChange={event => change('category', event.target.value)}>
                      {Object.entries(blogCategories).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Media Format Switcher */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Định dạng Media đính kèm:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setMediaTab('image')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition ${
                          mediaTab === 'image'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Image size={14} /> Ảnh bìa
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaTab('video')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition ${
                          mediaTab === 'video'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Video size={14} /> Video hướng dẫn
                      </button>
                    </div>

                    {mediaTab === 'image' ? (
                      <div className="space-y-2 pt-1">
                        <label>
                          <span className="blog-inline-label"><Image size={15} /> Link ảnh bìa tuỳ chỉnh</span>
                          <input
                            value={form.coverImage}
                            maxLength={1000}
                            onChange={event => change('coverImage', event.target.value)}
                            placeholder="https://..."
                          />
                        </label>
                        <span className="text-[11px] text-slate-500 block">Hoặc chọn ảnh mẫu có sẵn:</span>
                        <div className="blog-cover-options">
                          {covers.map(cover => (
                            <label key={cover.src} title={cover.label}>
                              <input
                                type="radio"
                                name="cover"
                                aria-label={cover.label}
                                checked={form.coverImage === cover.src}
                                onChange={() => change('coverImage', cover.src)}
                              />
                              <img src={cover.src} alt={cover.label} />
                            </label>
                          ))}
                        </div>
                        <BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} />
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <label>
                          <span className="blog-inline-label text-red-600 dark:text-red-400 font-bold">
                            <Video size={15} /> Đường dẫn Video (YouTube, Shorts)
                          </span>
                          <input
                            type="url"
                            value={form.videoUrl || ''}
                            maxLength={1000}
                            onChange={event => change('videoUrl', event.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </label>

                        {videoSourceObj?.kind === 'embed' ? (
                          <div className="space-y-2">
                            <div className="aspect-video w-full rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
                              <iframe
                                src={videoSourceObj.src.replace('autoplay=1', 'autoplay=0')}
                                className="w-full h-full border-0"
                                title="Video preview"
                                allowFullScreen
                              />
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Sparkles size={14} className="shrink-0" />
                              <span>AI sẽ tự động nhận diện video và hỗ trợ trích xuất công thức món chay khi bạn xuất bản!</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                            Dán liên kết YouTube vào ô trên để phát thử video nấu ăn.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </fieldset>

                <div className="blog-editor-submit">
                  <button name="intent" value="draft" type="submit" className="blog-button secondary" disabled={busy}>
                    <Save size={16} />
                    {busy ? 'Đang xử lý...' : post?.status === 'PUBLISHED' ? 'Lưu thay đổi' : 'Lưu bản nháp'}
                  </button>
                  {post?.status !== 'PUBLISHED' && (
                    <button name="intent" value="submit" type="submit" className="blog-button" disabled={busy}>
                      <Send size={16} />
                      {isAdmin ? 'Xuất bản' : 'Gửi admin duyệt'}
                    </button>
                  )}
                </div>

                {!isAdmin && (
                  <p className="blog-moderation-note">
                    Bài viết chỉ xuất hiện công khai sau khi được ban biên tập và AI kiểm duyệt chất lượng.
                  </p>
                )}
              </aside>
            </form>
          )}
        </BlogAccess>
      </div>
    </MainLayout>
  );
}
