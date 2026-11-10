import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, FilePenLine, Image, Video, Sparkles, Wand2, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { videoSource } from '../utils/communityVideo';
import type { BlogCategory, BlogInput, BlogPost, PostClassificationTemplate } from '../types/blog';
import { blogCategories, BLOG_POST_TEMPLATES } from '../types/blog';
import '../styles/blog.css';

const initial: BlogInput = {
  title: '',
  excerpt: '',
  content: BLOG_POST_TEMPLATES.KITCHEN.contentTemplate,
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
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [form, setForm] = useState<BlogInput>(initial);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'image' | 'video' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!id) {
      setPost(null);
      const state = location.state as {
        recipeTitle?: string;
        recipeExcerpt?: string;
        recipeContent?: string;
        recipeCategory?: BlogCategory;
        coverImage?: string;
        videoUrl?: string;
        mediaTab?: 'image' | 'video';
      } | null;

      if (state?.recipeTitle || state?.recipeContent || state?.recipeCategory) {
        const selectedCat: BlogCategory = state.recipeCategory || 'KITCHEN';
        const tpl = BLOG_POST_TEMPLATES[selectedCat] || BLOG_POST_TEMPLATES.KITCHEN;
        setForm({
          ...initial,
          title: state.recipeTitle || '',
          excerpt: state.recipeExcerpt || '',
          content: state.recipeContent || tpl.contentTemplate,
          category: selectedCat,
          coverImage: state.coverImage || tpl.defaultCover,
          videoUrl: state.videoUrl || '',
        });
        if (state.mediaTab === 'video' || state.videoUrl) {
          setMediaTab('video');
        }
        setMessage(`✨ Đã nạp khung bài đăng chuẩn "${tpl.badgeLabel}". Bạn có thể điền nội dung, đính kèm hình ảnh/video và đăng bài!`);
        setDirty(true);
      } else {
        setForm(initial);
        setDirty(false);
      }
      setLoading(false);
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

  const applyClassificationTemplate = (cat: BlogCategory, forceReplaceContent = false) => {
    const tpl = BLOG_POST_TEMPLATES[cat];
    const isUsingDefaultTemplate = (Object.values(BLOG_POST_TEMPLATES) as PostClassificationTemplate[]).some(
      t => t.contentTemplate.trim() === form.content.trim()
    );
    const shouldReplaceContent = forceReplaceContent || !form.content.trim() || isUsingDefaultTemplate;
    setForm(prev => ({
      ...prev,
      category: cat,
      coverImage: prev.coverImage || tpl.defaultCover,
      content: shouldReplaceContent ? tpl.contentTemplate : prev.content,
    }));
    setDirty(true);
    setMessage(`Đã chọn phân loại "${tpl.badgeLabel}".`);
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
      const saved = post?.status === 'PUBLISHED' && !isAdmin
        ? await blogService.requestPublishedEdit(post.postId, { ...form, version: post.version })
        : await blogService.save({ ...form, version: post?.version }, post?.postId || id);
      setPost(saved);
      setForm(previous => ({ ...previous, version: saved.version }));
      setDirty(false);
      if (submitting) {
        await blogService.submit(saved.postId, saved.version);
        navigate('/blog/my-posts/' + saved.postId);
      } else {
        setMessage(post?.status === 'PUBLISHED' && !isAdmin ? 'Đã gửi bản chỉnh sửa để ban biên tập duyệt.' : saved.status === 'PUBLISHED' ? 'Đã cập nhật bài viết công khai.' : 'Đã lưu bản nháp.');
        if (!id) navigate('/blog/my-posts/' + saved.postId + '/edit', { replace: true });
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const editable = !post || ['DRAFT', 'REJECTED', 'PUBLISHED'].includes(post.status);
  const videoSourceObj = form.videoUrl ? videoSource(form.videoUrl) : null;
  const activeTemplate = BLOG_POST_TEMPLATES[form.category] || BLOG_POST_TEMPLATES.KITCHEN;

  const uploadMedia = async (file: File | undefined, video: boolean) => {
    if (!file || uploadingMedia) return;
    setUploadingMedia(video ? 'video' : 'image');
    setError('');
    try {
      const result = await (isAdmin
        ? communityService.uploadVideoAsset(file, video)
        : communityService.uploadMyVideoAsset(file, video));
      change(video ? 'videoUrl' : 'coverImage', result.url);
      setMessage(video ? 'Đã tải video lên bài viết.' : 'Đã tải ảnh bìa lên bài viết.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setUploadingMedia(null);
    }
  };

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Link to="/blog" className="blog-back">
              <ArrowLeft size={15} /> Bảng tin Cộng đồng
            </Link>
            <Link to="/blog/my-posts" className="text-xs font-bold text-emerald-700 hover:underline">
              Quản lý bài đăng của tôi →
            </Link>
          </div>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">ĐĂNG BÀI CỘNG ĐỒNG</span>
              <h1>{id ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng mới'}</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Chọn phân loại phù hợp để bài viết được trình bày rõ ràng và dễ tìm kiếm.
              </p>
            </div>
            {post && <BlogBadge status={post.status} />}
          </header>

          {/* 4 STANDARDIZED POST TEMPLATES SELECTOR */}
          {editable && (
            <section className="mb-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Phân loại &amp; mẫu bài đăng
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeTemplate.classificationRule}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyClassificationTemplate(form.category, true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                >
                  <Wand2 size={13} /> Áp dụng lại khung mẫu của phân loại này
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(Object.keys(BLOG_POST_TEMPLATES) as BlogCategory[]).map(catKey => {
                  const tpl = BLOG_POST_TEMPLATES[catKey];
                  const isSelected = form.category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => applyClassificationTemplate(catKey, false)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900'
                          : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {tpl.badgeLabel}
                          </span>
                          {isSelected && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                          {tpl.description}
                        </p>
                      </div>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-slate-700">
                        {tpl.aiActionLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
                    <FilePenLine size={16} /> Soạn bài ({activeTemplate.shortLabel})
                  </button>
                  <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
                    <Eye size={16} /> Xem trước hiển thị
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
                    Tiêu đề bài đăng
                    <input
                      required={!preview}
                      maxLength={150}
                      value={form.title}
                      onChange={event => change('title', event.target.value)}
                      placeholder={activeTemplate.titlePlaceholder}
                    />
                  </label>
                  <label>
                    Mô tả ngắn / Caption mở đầu
                    <textarea
                      aria-label="Tóm tắt"
                      rows={3}
                      maxLength={400}
                      value={form.excerpt}
                      onChange={event => change('excerpt', event.target.value)}
                      placeholder={activeTemplate.excerptPlaceholder}
                    />
                  </label>
                  <label>
                    Nội dung chi tiết
                    <textarea
                      aria-label="Nội dung"
                      rows={17}
                      maxLength={50000}
                      value={form.content}
                      onChange={event => change('content', event.target.value)}
                      placeholder="Chia sẻ công thức, kiến thức dinh dưỡng hoặc câu chuyện sống chay của bạn..."
                    />
                  </label>
                  <span className="blog-character-count">{form.content.length.toLocaleString('vi-VN')} / 50.000 ký tự</span>
                </fieldset>

                {preview && (
                  <article className="blog-editor-preview">
                    <span className="blog-eyebrow">{blogCategories[form.category]}</span>
                    <h2>{form.title || 'Tiêu đề bài viết'}</h2>
                    <p className="blog-lead">{form.excerpt}</p>

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
                    ) : videoSourceObj?.kind === 'file' ? (
                      <video controls preload="metadata" src={videoSourceObj.src} className="my-5 aspect-video w-full rounded-2xl bg-black object-contain shadow-md" />
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
                    Chủ đề phân loại
                    <select value={form.category} onChange={event => applyClassificationTemplate(event.target.value as BlogCategory, false)}>
                      {Object.entries(blogCategories).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Media Format Switcher */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Định dạng Hình ảnh / Video đính kèm:</span>
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
                        <Image size={14} /> Ảnh minh họa
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
                        <Video size={14} /> Đính kèm Video
                      </button>
                    </div>

                    {mediaTab === 'image' ? (
                      <div className="space-y-2 pt-1">
                        <label>
                          <span className="blog-inline-label"><Image size={15} /> Link ảnh minh họa</span>
                          <input
                            value={form.coverImage}
                            maxLength={1000}
                            onChange={event => change('coverImage', event.target.value)}
                            placeholder="https://..."
                          />
                        </label>
                        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {uploadingMedia === 'image' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          {uploadingMedia === 'image' ? 'Đang tải ảnh...' : 'Tải ảnh bìa từ thiết bị'}
                          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploadingMedia} onChange={event => void uploadMedia(event.target.files?.[0], false)} />
                        </label>
                        <span className="text-[11px] text-slate-500 block">JPG, PNG hoặc WebP; tối đa 5 MB.</span>
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

                        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {uploadingMedia === 'video' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          {uploadingMedia === 'video' ? 'Đang tải video...' : 'Tải MP4 / WebM từ thiết bị'}
                          <input className="sr-only" type="file" accept="video/mp4,video/webm" disabled={!!uploadingMedia} onChange={event => void uploadMedia(event.target.files?.[0], true)} />
                        </label>
                        <span className="text-[11px] text-slate-500 block">MP4 hoặc WebM; tối đa 150 MB.</span>

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
                              <span>Video sẽ được nhận diện và hiển thị cùng bài viết sau khi xuất bản.</span>
                            </div>
                          </div>
                        ) : videoSourceObj?.kind === 'file' ? (
                          <div className="space-y-2">
                            <video controls preload="metadata" src={videoSourceObj.src} className="aspect-video w-full rounded-xl bg-black object-contain" />
                            <button type="button" onClick={() => change('videoUrl', '')} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><X size={13} /> Gỡ video đính kèm</button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                            Dán liên kết YouTube vào ô trên để nhúng video vào bài đăng.
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
                      {isAdmin ? 'Xuất bản ngay' : 'Đăng bài (Gửi duyệt)'}
                    </button>
                  )}
                </div>

                {!isAdmin && (
                  <p className="blog-moderation-note">
                    Bài đăng sử dụng mẫu thống nhất để ban biên tập duyệt và người đọc theo dõi dễ dàng.
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
