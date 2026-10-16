import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Clock, Search, Plus, FileText, UserRound, ClipboardCheck } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { BlogBody, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { blogCategories } from '../types/blog';
import type { BlogCategory, BlogPost } from '../types/blog';
import type { PageResponse } from '../types/api';
import '../styles/blog.css';

export function BlogPage() {
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlogCategory | ''>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    const timer = setTimeout(() => {
      blogService.published({ keyword: search, category, page }, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
        .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, category, page, reload]);
  return <MainLayout><div className="blog-shell">
    <header className="blog-page-heading"><div><span className="blog-eyebrow"><BookOpen size={15} /> BLOG CỘNG ĐỒNG</span><h1>Blog VEGEAI</h1><p>Chuyện căn bếp, những bữa ăn và một chút cảm hứng mỗi ngày.</p></div><div className="blog-actions">{user?.role === 'admin' && <Link className="blog-button secondary" to="/admin/blog"><ClipboardCheck size={16} /> Duyệt bài</Link>}{isAuthenticated && <Link className="blog-button secondary" to="/blog/my-posts"><FileText size={16} /> Bài viết của tôi</Link>}<Link className="blog-button" to="/blog/write"><Plus size={17} /> Viết bài</Link></div></header>
    <div className="blog-filter-bar"><div className="blog-tabs"><button aria-pressed={!category} onClick={() => { setCategory(''); setPage(0); }}>Tất cả</button>{Object.entries(blogCategories).map(([code, label]) => <button key={code} aria-pressed={category === code} onClick={() => { setCategory(code as BlogCategory); setPage(0); }}>{label}</button>)}</div><label className="blog-search"><Search size={17} /><input aria-label="Tìm bài viết" placeholder="Tìm bài viết..." value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></div>
    {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
    {busy && !data && <p role="status" className="blog-empty">Đang tải bài viết...</p>}
    {!busy && !error && !data?.items.length && <div className="blog-empty"><BookOpen size={36} /><h2>Chưa có bài viết được xuất bản</h2><p>Chia sẻ câu chuyện sống chay của bạn cùng cộng đồng.</p><Link to="/blog/write" className="blog-button"><Plus size={16} /> Viết bài đầu tiên</Link></div>}
    {!error && <div className={'blog-public-grid ' + (busy ? 'is-loading' : '')}>{data?.items.map(post => <Link to={'/blog/' + post.postId} key={post.postId} className="blog-public-card"><BlogCover post={post} /><div className="blog-public-card-body"><span className="blog-eyebrow">{blogCategories[post.category]}</span><h2>{post.title}</h2><p>{post.excerpt}</p><div className="blog-public-meta"><span><UserRound size={13} />{post.authorName}</span><span><Clock size={13} />{post.readingMinutes} phút đọc</span></div><span className="blog-read-link">Đọc bài viết <ArrowUpRight size={16} /></span></div></Link>)}</div>}
    <BlogPagination data={data} busy={busy} change={setPage} />
  </div></MainLayout>;
}
export function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(''); setPost(null);
    blogService.publicPost(id || '', controller.signal).then(value => { if (!controller.signal.aborted) setPost(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [id, reload]);
  return <MainLayout><article className="blog-article-shell"><Link to="/blog" className="blog-back"><ArrowLeft size={15} /> Blog cộng đồng</Link>{busy && <p role="status" className="blog-empty">Đang tải bài viết...</p>}{error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}{post && <><span className="blog-eyebrow">{blogCategories[post.category]}</span><h1>{post.title}</h1><p className="blog-lead">{post.excerpt}</p><div className="blog-public-meta"><span><UserRound size={14} />{post.authorName}</span><span>{blogDate(post.publishedAt)}</span><span><Clock size={14} />{post.readingMinutes} phút đọc</span></div><BlogCover post={post} /><BlogBody content={post.content || ''} /><Link to="/blog" className="blog-read-link"><ArrowLeft size={15} /> Khám phá bài viết khác</Link></>}</article></MainLayout>;
}
