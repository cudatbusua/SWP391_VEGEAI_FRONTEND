import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FilePenLine, Image, Save, Send, ShieldCheck, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError } from '../components/BlogUi';
import { VideoPlayer } from '../components/CommunityUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
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
    blogService
      .ownPost(id, controller.signal)
      .then(value => {
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
        setDirty(false);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
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
      setError('Vui lòng nhập tiêu đề bài đăng.');
      return;
    }
    const submitting = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'submit';
    if (
      (submitting || post?.status === 'PUBLISHED') &&
      (form.title.trim().length < 5 || form.content.trim().length < 80)
    ) {
      setError('Tiêu đề cần ít nhất 5 ký tự và nội dung ít nhất 80 ký tự trước khi gửi kiểm duyệt.');
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
        navigate(isAdmin ? '/admin/blog/' + saved.postId : '/blog/my-posts/' + saved.postId);
      } else {
        setMessage(saved.status === 'PUBLISHED' ? 'Đã cập nhật bài đăng công khai.' : 'Đã lưu bản nháp.');
        if (!id) navigate('/blog/my-posts/' + saved.postId + '/edit', { replace: true });
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const editable =
    !post || ['DRAFT', 'REJECTED'].includes(post.status) || (isAdmin && post.status === 'PUBLISHED');

  return (
    <MainLayout>
      <div className="blog-shell">
        <BlogAccess>
          <Link to="/blog/my-posts" className="blog-back">
            <ArrowLeft size={15} /> Bài đăng Cộng đồng của tôi
          </Link>
          <header className="blog-page-heading">
            <div>
              <span className="blog-eyebrow">CHIA SẺ CÙNG CỘNG ĐỒNG VEGEAI</span>
              <h1>{id ? 'Chỉnh sửa bài đăng Cộng đồng' : 'Đăng bài / Chia sẻ Video Bếp Chay'}</h1>
            </div>
            {post && <BlogBadge status={post.status} />}
          </header>

          {error && <BlogError message={error} retry={id ? () => setReload(value => value + 1) : undefined} />}
          {message && (
            <p role="status" className="blog-message">
              {message}
            </p>
          )}
          {loading ? (
            <p role="status" className="blog-empty">
              Đang tải bản nháp...
            </p>
          ) : id && error && !post ? null : !editable ? (
            <div className="blog-empty">
              <p>Bài đăng hiện đang trong quy trình kiểm duyệt và không thể chỉnh sửa.</p>
              <Link to={'/blog/my-posts/' + id} className="blog-button secondary">
                Xem trạng thái kiểm duyệt
              </Link>
            </div>
          ) : (
            <form onSubmit={save} className="blog-editor-grid">
              <div className="blog-editor-main">
                <div className="blog-editor-tabs">
                  <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
                    <FilePenLine size={16} /> Soạn bài & Video
                  </button>
                  <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
                    <Eye size={16} /> Xem trước
                  </button>
                </div>
                {post?.status === 'REJECTED' && post.moderationReason && (
                  <div className="blog-rejection-note">
                    <strong>Góp ý từ Admin kiểm duyệt</strong>
                    <p>{post.moderationReason}</p>
                  </div>
                )}
                <fieldset
                  disabled={busy}
                  className={preview ? 'blog-editor-fields is-hidden' : 'blog-editor-fields'}
                >
                  <label>
                    Tiêu đề bài đăng / Video Bếp Chay
                    <input
                      required={!preview}
                      maxLength={150}
                      value={form.title}
                      onChange={event => change('title', event.target.value)}
                      placeholder="Một câu chuyện, công thức hoặc video từ căn bếp chay của bạn..."
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
                      placeholder="Đôi dòng mở đầu cho bài chia sẻ của bạn"
                    />
                  </label>
                  <label>
                    Nội dung chi tiết (Công thức, nguyên liệu, cách chế biến)
                    <textarea
                      aria-label="Nội dung"
                      rows={17}
                      maxLength={50000}
                      value={form.content}
                      onChange={event => change('content', event.target.value)}
                      placeholder="Chia sẻ công thức, trải nghiệm hoặc câu chuyện sống chay của bạn..."
                    />
                  </label>
                  <span className="blog-character-count">
                    {form.content.length.toLocaleString('vi-VN')} / 50.000 ký tự
                  </span>
                </fieldset>
                {preview && (
                  <article className="blog-editor-preview">
                    <span className="blog-eyebrow">{blogCategories[form.category]}</span>
                    <h2>{form.title || 'Tiêu đề bài đăng'}</h2>
                    <p className="blog-lead">{form.excerpt}</p>
                    <BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} />
                    {form.videoUrl && (
                      <div className="my-4">
                        <VideoPlayer
                          video={{
                            id: 'preview',
                            title: form.title || 'Video Bếp Chay',
                            videoUrl: form.videoUrl,
                            thumbnailUrl: form.coverImage,
                          }}
                        />
                      </div>
                    )}
                    <BlogBody content={form.content || 'Nội dung bài đăng'} />
                  </article>
                )}
              </div>
              <aside className="blog-editor-side">
                <fieldset disabled={busy}>
                  <label>
                    Chủ đề Cộng đồng
                    <select value={form.category} onChange={event => change('category', event.target.value)}>
                      {Object.entries(blogCategories).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="blog-inline-label">
                      <Video size={16} /> Video Bếp Chay (YouTube / MP4 tùy chọn)
                    </span>
                    <input
                      value={form.videoUrl || ''}
                      maxLength={1000}
                      onChange={event => change('videoUrl', event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </label>
                  <label>
                    <span className="blog-inline-label">
                      <Image size={16} /> Ảnh bìa
                    </span>
                    <input
                      value={form.coverImage}
                      maxLength={1000}
                      onChange={event => change('coverImage', event.target.value)}
                      placeholder="https://..."
                    />
                  </label>
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
                </fieldset>
                <div className="blog-editor-submit">
                  <button name="intent" value="draft" type="submit" className="blog-button secondary" disabled={busy}>
                    <Save size={16} />
                    {busy ? 'Đang xử lý...' : post?.status === 'PUBLISHED' ? 'Lưu thay đổi' : 'Lưu bản nháp'}
                  </button>
                  {post?.status !== 'PUBLISHED' && (
                    <button name="intent" value="submit" type="submit" className="blog-button" disabled={busy}>
                      <Send size={16} />
                      Gửi AI & Admin duyệt
                    </button>
                  )}
                </div>
                <div className="blog-moderation-note flex items-start gap-2">
                  <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Quy trình 2 lớp: Tất cả bài đăng (của Thành viên và Admin) sẽ được{' '}
                    <strong>AI Kiểm duyệt tự động (Lớp 1)</strong> trước khi <strong>Admin phê duyệt (Lớp 2)</strong> để public lên Cộng đồng.
                  </span>
                </div>
              </aside>
            </form>
          )}
        </BlogAccess>
      </div>
    </MainLayout>
  );
}
