import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, FilePenLine, Image } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { BlogAccess, BlogBadge, BlogBody, BlogCover, BlogError } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import type { BlogInput, BlogPost } from '../types/blog';
import { blogCategories } from '../types/blog';
import { blogContentForEditor } from '../utils/blogContent';
import '../styles/blog.css';

const initial: BlogInput = { title: '', excerpt: '', content: '', category: 'KITCHEN', coverImage: '/images/vietnamese-vegan-table.png' };
const covers = [{ src: '/images/vietnamese-vegan-table.png', label: 'Bữa cơm chay' }, { src: '/images/vegan-tofu-meal.png', label: 'Món đậu phụ' }, { src: '/images/fresh-vegetables.png', label: 'Rau xanh' }];
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
    if (!id) { setPost(null); setForm(initial); setLoading(false); setDirty(false); return; }
    const controller = new AbortController(); setLoading(true); setError(''); setPost(null);
    blogService.ownPost(id, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setPost(value); setForm({ title: value.title, excerpt: value.excerpt, content: blogContentForEditor(value.content || ''), category: value.category, coverImage: value.coverImage || '', version: value.version }); setDirty(false);
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, isAuthenticated, user?.id, reload]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (dirty && !busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', preventLoss); return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty, busy]);
  const change = (key: keyof BlogInput, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setDirty(true); setMessage(''); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    if (!form.title.trim()) { setPreview(false); setError('Vui lòng nhập tiêu đề bài viết.'); return; }
    const submitting = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'submit';
    if ((submitting || post?.status === 'PUBLISHED') && (form.title.trim().length < 5 || form.content.trim().length < 80)) { setError('Tiêu đề cần ít nhất 5 ký tự và nội dung ít nhất 80 ký tự trước khi gửi bài.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (post?.status === 'PUBLISHED' && !isAdmin) {
        const submitted = await blogService.requestPublishedEdit(post.postId, { ...form, version: post.version });
        setPost(submitted); setDirty(false);
        navigate('/blog/my-posts/' + submitted.postId);
        return;
      }
      const saved = await blogService.save({ ...form, version: post?.version }, post?.postId || id);
      setPost(saved); setForm(previous => ({ ...previous, version: saved.version })); setDirty(false);
      if (submitting) { await blogService.submit(saved.postId, saved.version); navigate('/blog/my-posts/' + saved.postId); }
      else { setMessage(saved.status === 'PUBLISHED' ? 'Đã cập nhật bài viết công khai.' : 'Đã lưu bản nháp.'); if (!id) navigate('/blog/my-posts/' + saved.postId + '/edit', { replace: true }); }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const publishedMemberEdit = post?.status === 'PUBLISHED' && !isAdmin;
  const editable = !post || ['DRAFT', 'REJECTED'].includes(post.status) || (isAdmin && post.status === 'PUBLISHED') || publishedMemberEdit;
  return <MainLayout><div className="blog-shell"><BlogAccess><Link to="/blog/my-posts" className="blog-back"><ArrowLeft size={15} /> Bài viết của tôi</Link><header className="blog-page-heading"><div><span className="blog-eyebrow">CHIA SẺ CÙNG CỘNG ĐỒNG</span><h1>{id ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h1></div>{post && <BlogBadge status={post.status} />}</header>
    {error && <BlogError message={error} retry={id ? () => setReload(value => value + 1) : undefined} />}{message && <p role="status" className="blog-message">{message}</p>}
    {loading ? <p role="status" className="blog-empty">Đang tải bản nháp...</p> : id && error && !post ? null : !editable ? <div className="blog-empty"><p>Bài viết hiện không thể chỉnh sửa.</p><Link to={'/blog/my-posts/' + id} className="blog-button secondary">Xem trạng thái</Link></div> : <form onSubmit={save} className="blog-editor-grid">
      <div className="blog-editor-main"><div className="blog-editor-tabs"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}><FilePenLine size={16} /> Soạn bài</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={16} /> Xem trước</button></div>
        {post?.status === 'REJECTED' && post.moderationReason && <div className="blog-rejection-note"><strong>Góp ý từ ban biên tập</strong><p>{post.moderationReason}</p></div>}
        <fieldset disabled={busy} className={preview ? 'blog-editor-fields is-hidden' : 'blog-editor-fields'}><label>Tiêu đề<input required={!preview} maxLength={150} value={form.title} onChange={event => change('title', event.target.value)} placeholder="Một câu chuyện từ căn bếp của bạn..." /></label><label>Tóm tắt<textarea aria-label="Tóm tắt" rows={3} maxLength={400} value={form.excerpt} onChange={event => change('excerpt', event.target.value)} placeholder="Đôi dòng mở đầu cho bài viết" /></label><label>Nội dung<textarea aria-label="Nội dung" rows={17} maxLength={50000} value={form.content} onChange={event => change('content', event.target.value)} placeholder="Chia sẻ công thức, trải nghiệm hoặc câu chuyện sống chay của bạn..." /></label><span className="blog-character-count">{form.content.length.toLocaleString('vi-VN')} / 50.000 ký tự</span></fieldset>
        {preview && <article className="blog-editor-preview"><span className="blog-eyebrow">{blogCategories[form.category]}</span><h2>{form.title || 'Tiêu đề bài viết'}</h2><p className="blog-lead">{form.excerpt}</p><BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} /><BlogBody content={form.content || 'Nội dung bài viết'} /></article>}
      </div>
      <aside className="blog-editor-side"><fieldset disabled={busy}><label>Chủ đề<select value={form.category} onChange={event => change('category', event.target.value)}>{Object.entries(blogCategories).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label><span className="blog-inline-label"><Image size={16} /> Ảnh bìa</span><input value={form.coverImage} maxLength={1000} onChange={event => change('coverImage', event.target.value)} placeholder="https://..." /></label><div className="blog-cover-options">{covers.map(cover => <label key={cover.src} title={cover.label}><input type="radio" name="cover" aria-label={cover.label} checked={form.coverImage === cover.src} onChange={() => change('coverImage', cover.src)} /><img src={cover.src} alt={cover.label} /></label>)}</div><BlogCover post={{ title: form.title || 'Ảnh bìa', coverImage: form.coverImage }} /></fieldset>
        <div className="blog-editor-submit">{!publishedMemberEdit && <button name="intent" value="draft" type="submit" className="blog-button secondary" disabled={busy}><Save size={16} />{busy ? 'Đang xử lý...' : post?.status === 'PUBLISHED' ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>}{(post?.status !== 'PUBLISHED' || publishedMemberEdit) && <button name="intent" value="submit" type="submit" className="blog-button" disabled={busy}><Send size={16} />{publishedMemberEdit ? 'Lưu thay đổi và gửi duyệt' : isAdmin ? 'Xuất bản' : 'Gửi admin duyệt'}</button>}</div>
        {!isAdmin && <p className="blog-moderation-note">{publishedMemberEdit ? 'Bài đã xuất bản sẽ chuyển sang chờ duyệt sau khi gửi chỉnh sửa.' : 'Bài viết chỉ xuất hiện công khai sau khi được ban biên tập duyệt.'}</p>}
      </aside>
    </form>}
  </BlogAccess></div></MainLayout>;
}
