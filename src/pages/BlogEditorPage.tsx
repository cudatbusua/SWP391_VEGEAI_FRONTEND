import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, FilePenLine, Image, Video, Sparkles, Utensils, Upload, Loader2, Trash2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { videoSource } from '../utils/communityVideo';
import type { BlogCategory, BlogInput, BlogPost } from '../types/blog';
import { blogCategories, RECIPE_POST_TEMPLATE } from '../types/blog';
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
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [form, setForm] = useState<BlogInput>(initial);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
  const [uploadingMedia, setUploadingMedia] = useState<'image' | 'video' | null>(null);
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
        setForm({
          ...initial,
          title: state.recipeTitle || '',
          excerpt: state.recipeExcerpt || '',
          content: state.recipeContent || '',
          category: selectedCat,
          coverImage: state.coverImage || initial.coverImage,
          videoUrl: state.videoUrl || '',
        });
        if (state.mediaTab === 'video' || state.videoUrl) {
          setMediaTab('video');
        }
        if (state.recipeContent) {
          setMessage('Đã nạp sẵn nội dung bản nháp. Bạn có thể chỉnh sửa trước khi gửi bài.');
        }
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
  }, [id, isAuthenticated, user?.id, reload, location.state]);

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

  const uploadBlogMedia = async (file: File | undefined, isVideo: boolean) => {
    if (!file || uploadingMedia) return;
    setUploadingMedia(isVideo ? 'video' : 'image');
    setError('');
    setMessage('');
    try {
      const asset = await communityService.uploadMyVideoAsset(file, isVideo);
      if (isVideo) {
        change('videoUrl', asset.url);
        setMessage('Đã tải video lên từ thiết bị thành công.');
      } else {
        change('coverImage', asset.url);
        setMessage('Đã tải ảnh bìa lên từ thiết bị thành công.');
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setUploadingMedia(null);
    }
  };

  const insertRecipeStructure = () => {
    setForm(prev => ({
      ...prev,
      category: 'KITCHEN',
      content: prev.content.trim() ? `${prev.content.trim()}\n\n${RECIPE_POST_TEMPLATE}` : RECIPE_POST_TEMPLATE,
    }));
    setDirty(true);
    setMessage('Đã chèn khung Nguyên liệu & Các bước thực hiện. Bấm "Xem trước" để xem hiển thị dạng 2 cột chuẩn Công thức!');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || uploadingMedia) return;
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
      if (post?.status === 'PUBLISHED' && !isAdmin) {
        const updated = await blogService.requestPublishedEdit(post.postId, { ...form, version: post.version });
        setPost(updated);
        setDirty(false);
        navigate('/blog/my-posts/' + updated.postId);
        return;
      }
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

  const editable = !post || ['DRAFT', 'REJECTED', 'PUBLISHED'].includes(post.status);
  const videoSourceObj = form.videoUrl ? videoSource(form.videoUrl) : null;

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Link to="/blog" className="blog-back">
              <ArrowLeft size={15} /> Blog cộng đồng
            </Link>
            <Link to="/blog/my-posts" className="text-xs font-bold text-emerald-700 hover:underline">
              Bài viết của tôi →
            </Link>
          </div>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">BLOG CỘNG ĐỒNG</span>
              <h1>{id ? 'Chỉnh sửa bài viết' : 'Viết bài chia sẻ mới'}</h1>
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
                    <FilePenLine size={16} /> Soạn thảo
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
                    Tiêu đề bài viết
                    <input
                      required={!preview}
                      maxLength={150}
                      value={form.title}
                      onChange={event => change('title', event.target.value)}
                      placeholder="VD: Đậu khuôn kho nấm đông cô tiêu xanh đậm đà đưa cơm"
                    />
                  </label>
                  <label>
                    Tóm tắt ngắn
                    <textarea
                      aria-label="Tóm tắt"
                      rows={3}
                      maxLength={400}
                      value={form.excerpt}
                      onChange={event => change('excerpt', event.target.value)}
                      placeholder="Giới thiệu ngắn gọn về món ăn hoặc câu chuyện bạn muốn chia sẻ..."
                    />
                  </label>

                  {form.category === 'KITCHEN' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-800/60 border border-emerald-200/80 dark:border-slate-700 text-xs">
                      <span className="text-slate-600 dark:text-slate-300">
                        Mẹo: Trình bày theo mục <strong>Nguyên liệu:</strong> và <strong>Các bước thực hiện:</strong> để bài viết hiển thị dạng bảng 2 cột chuẩn Công thức.
                      </span>
                      <button
                        type="button"
                        onClick={insertRecipeStructure}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 font-bold transition cursor-pointer shrink-0"
                      >
                        <Utensils size={13} /> + Chèn khung Nguyên liệu &amp; Các bước
                      </button>
                    </div>
                  )}

                  <label>
                    Nội dung bài viết
                    <textarea
                      aria-label="Nội dung"
                      rows={16}
                      maxLength={50000}
                      value={form.content}
                      onChange={event => change('content', event.target.value)}
                      placeholder="Chia sẻ công thức, kinh nghiệm dinh dưỡng hoặc câu chuyện sống xanh của bạn..."
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
                      <div className="my-5 aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 bg-black">
                        <video src={videoSourceObj.src} controls className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} />
                    )}

                    <BlogBody content={form.content || 'Nội dung bài viết'} />
                  </article>
                )}
              </div>

              <aside className="blog-editor-side">
                <fieldset disabled={busy || !!uploadingMedia} className="space-y-4">
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
                        <Video size={14} /> Đính kèm Video
                      </button>
                    </div>

                    {mediaTab === 'image' ? (
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <span className="blog-inline-label mb-1.5 block"><Upload size={14} /> Tải ảnh bìa từ thiết bị</span>
                          <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer transition">
                            {uploadingMedia === 'image' ? (
                              <>
                                <Loader2 size={15} className="animate-spin" /> Đang tải ảnh lên...
                              </>
                            ) : (
                              <>
                                <Upload size={15} /> Chọn file ảnh (JPG, PNG, WebP · tối đa 5MB)
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={busy || !!uploadingMedia}
                              onChange={event => {
                                uploadBlogMedia(event.target.files?.[0], false);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                        <label>
                          <span className="blog-inline-label"><Image size={15} /> Hoặc dán Link ảnh bìa (URL)</span>
                          <input
                            value={form.coverImage}
                            maxLength={1000}
                            onChange={event => change('coverImage', event.target.value)}
                            placeholder="https://... hoặc /api/public/community-media/..."
                          />
                        </label>
                        <div className="blog-cover-picks">
                          <span>Hoặc chọn ảnh mẫu có sẵn:</span>
                          <div>
                            {covers.map(item => (
                              <button
                                key={item.src}
                                type="button"
                                className={form.coverImage === item.src ? 'is-selected' : ''}
                                onClick={() => change('coverImage', item.src)}
                              >
                                <img src={item.src} alt={item.label} />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <BlogCover post={{ title: form.title || 'Ảnh bìa xem trước', coverImage: form.coverImage }} />
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div>
                          <span className="blog-inline-label mb-1.5 block"><Upload size={14} /> Tải file Video từ thiết bị</span>
                          <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer transition">
                            {uploadingMedia === 'video' ? (
                              <>
                                <Loader2 size={15} className="animate-spin" /> Đang tải video lên...
                              </>
                            ) : (
                              <>
                                <Upload size={15} /> Chọn file video (MP4, WebM · tối đa 60MB)
                              </>
                            )}
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              className="hidden"
                              disabled={busy || !!uploadingMedia}
                              onChange={event => {
                                uploadBlogMedia(event.target.files?.[0], true);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                        <label>
                          <span className="blog-inline-label"><Video size={15} /> Hoặc dán Link YouTube / Video URL</span>
                          <input
                            value={form.videoUrl || ''}
                            maxLength={500}
                            onChange={event => change('videoUrl', event.target.value)}
                            placeholder="VD: https://www.youtube.com/watch?v=... hoặc file đã tải lên"
                          />
                        </label>
                        {form.videoUrl && (
                          <button
                            type="button"
                            onClick={() => change('videoUrl', '')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
                          >
                            <Trash2 size={13} /> Gỡ video đính kèm
                          </button>
                        )}
                        {videoSourceObj?.kind === 'embed' ? (
                          <div className="space-y-2">
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                              <iframe
                                src={videoSourceObj.src.replace('autoplay=1', 'autoplay=0')}
                                className="w-full h-full border-0"
                                title="Xem trước video"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Sparkles size={14} className="shrink-0" />
                              <span>Người đọc có thể xem trực tiếp video và bóc tách các bước nấu từ bài viết này.</span>
                            </div>
                          </div>
                        ) : videoSourceObj?.kind === 'file' ? (
                          <div className="space-y-2">
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                              <video src={videoSourceObj.src} controls className="w-full h-full object-contain" />
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Sparkles size={14} className="shrink-0" />
                              <span>Video tải lên từ thiết bị đã sẵn sàng hiển thị trong bài viết.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                            Tải file video MP4/WebM từ thiết bị hoặc dán liên kết YouTube vào ô trên.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </fieldset>

                <div className="blog-editor-actions">
                  {post?.status === 'PUBLISHED' && !isAdmin ? (
                    <button name="intent" value="submit" type="submit" className="blog-button" disabled={busy || !!uploadingMedia}>
                      <Send size={16} />
                      Gửi bản chỉnh sửa chờ duyệt
                    </button>
                  ) : (
                    <>
                      <button name="intent" value="draft" type="submit" className="blog-button secondary" disabled={busy || !!uploadingMedia}>
                        <Save size={16} />
                        {post?.status === 'PUBLISHED' ? 'Cập nhật bài viết' : 'Lưu bản nháp'}
                      </button>
                      {post?.status !== 'PUBLISHED' && (
                        <button name="intent" value="submit" type="submit" className="blog-button" disabled={busy || !!uploadingMedia}>
                          <Send size={16} />
                          {isAdmin ? 'Xuất bản ngay' : 'Gửi duyệt bài'}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {!isAdmin && (
                  <p className="blog-moderation-note">
                    Bài viết sẽ hiển thị công khai sau khi được ban biên tập và hệ thống kiểm duyệt nội dung.
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
