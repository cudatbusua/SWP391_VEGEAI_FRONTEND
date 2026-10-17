import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CirclePlay,
  ClipboardCheck,
  Clock,
  FileText,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { BlogBody, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { VideoCard, VideoPlayer } from '../components/CommunityUi';
import { useAuth } from '../hooks/useAuth';
import { blogCategories } from '../types/blog';
import type { BlogCategory, BlogPost } from '../types/blog';
import type { CommunityVideo } from '../types/community';
import type { PageResponse } from '../types/api';
import '../styles/blog.css';
import '../styles/community.css';

export function BlogPage() {
  const { isAuthenticated, user } = useAuth();
  const [contentMode, setContentMode] = useState<'all' | 'posts' | 'videos'>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlogCategory | ''>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [videoData, setVideoData] = useState<PageResponse<CommunityVideo> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    const timer = setTimeout(() => {
      Promise.all([
        blogService.published({ keyword: search, category, page }, controller.signal),
        communityService.videos({ keyword: search, page: 0 }, controller.signal).catch(() => null),
      ])
        .then(([postsValue, videosValue]) => {
          if (!controller.signal.aborted) {
            setData(postsValue);
            setVideoData(videosValue);
          }
        })
        .catch(reason => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, page, reload]);

  return (
    <MainLayout>
      <div className="blog-shell">
        <header className="blog-page-heading">
          <div>
            <span className="blog-eyebrow">
              <BookOpen size={15} /> CỘNG ĐỒNG VEGEAI — APP SHARE BLOG & VIDEO BẾP CHAY
            </span>
            <h1>Cộng đồng Ẩm thực Chay</h1>
            <p>
              Không gian chia sẻ bài viết, công thức và video bếp chay của Admin và Thành viên — tất cả bài đăng đều được kiểm duyệt 2 lớp (AI Kiểm duyệt & Admin Phê duyệt).
            </p>
          </div>
          <div className="blog-actions">
            {user?.role === 'admin' && (
              <>
                <Link className="blog-button secondary" to="/admin/blog">
                  <ClipboardCheck size={16} /> Duyệt bài Cộng đồng
                </Link>
                <Link className="blog-button secondary" to="/admin/videos">
                  <Settings2 size={16} /> Quản lý Video
                </Link>
              </>
            )}
            {isAuthenticated && (
              <>
                <Link className="blog-button secondary" to="/blog/my-posts">
                  <FileText size={16} /> Bài đăng của tôi
                </Link>
                <Link className="blog-button secondary" to="/videos/saved">
                  <Bookmark size={16} /> Video đã lưu
                </Link>
              </>
            )}
            <Link className="blog-button" to="/blog/write">
              <Plus size={17} /> Đăng bài / Chia sẻ Video
            </Link>
          </div>
        </header>

        {/* 2-Layer AI + Admin Moderation Info Banner */}
        <div className="mb-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Quy trình Kiểm duyệt Cộng đồng 2 lớp:</strong> Mọi bài đăng của Thành viên và Admin đều được{' '}
              <strong>AI Kiểm duyệt tự động (Lớp 1)</strong> đánh giá độ an toàn & thuần chay trước khi chuyển qua{' '}
              <strong>Admin Phê duyệt (Lớp 2)</strong> để hiển thị công khai.
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 font-bold shrink-0">
            <Sparkles size={13} /> AI + Admin Verified
          </span>
        </div>

        {/* Mode Switcher (All / Community Posts / Cooking Videos) */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            ['all', 'Tất cả Chia sẻ (Bài đăng & Video Bếp Chay)'],
            ['posts', 'Bài đăng Cộng đồng'],
            ['videos', 'Video Bếp Chay'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setContentMode(mode as 'all' | 'posts' | 'videos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                contentMode === mode
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="blog-filter-bar">
          <div className="blog-tabs">
            <button
              aria-pressed={!category}
              onClick={() => {
                setCategory('');
                setPage(0);
              }}
            >
              Tất cả chủ đề
            </button>
            {Object.entries(blogCategories).map(([code, label]) => (
              <button
                key={code}
                aria-pressed={category === code}
                onClick={() => {
                  setCategory(code as BlogCategory);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="blog-search">
            <Search size={17} />
            <input
              aria-label="Tìm bài viết"
              placeholder="Tìm bài đăng hoặc video bếp chay..."
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>

        {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
        {busy && !data && (
          <p role="status" className="blog-empty">
            Đang tải nội dung Cộng đồng...
          </p>
        )}

        {/* Community Posts Grid */}
        {contentMode !== 'videos' && (
          <>
            {!busy && !error && !data?.items.length && (
              <div className="blog-empty">
                <BookOpen size={36} />
                <h2>Chưa có bài đăng công khai</h2>
                <p>Chia sẻ bài viết, công thức hoặc video nấu chay của bạn cùng cộng đồng VEGEAI.</p>
                <Link to="/blog/write" className="blog-button">
                  <Plus size={16} /> Đăng bài đầu tiên
                </Link>
              </div>
            )}
            {!error && !!data?.items.length && (
              <div className={'blog-public-grid ' + (busy ? 'is-loading' : '')}>
                {data.items.map(post => (
                  <Link to={'/blog/' + post.postId} key={post.postId} className="blog-public-card">
                    <div className="relative">
                      <BlogCover post={post} />
                      {post.videoUrl && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 text-white text-[11px] font-bold">
                          <Video size={13} /> Kèm Video
                        </span>
                      )}
                    </div>
                    <div className="blog-public-card-body">
                      <div className="flex items-center justify-between gap-2">
                        <span className="blog-eyebrow">{blogCategories[post.category]}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck size={12} /> Đã duyệt 2 lớp
                        </span>
                      </div>
                      <h2>{post.title}</h2>
                      <p>{post.excerpt}</p>
                      <div className="blog-public-meta">
                        <span>
                          <UserRound size={13} />
                          {post.authorName}
                        </span>
                        <span>
                          <Clock size={13} />
                          {post.readingMinutes} phút đọc
                        </span>
                      </div>
                      <span className="blog-read-link">
                        Xem chi tiết <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <BlogPagination data={data} busy={busy} change={setPage} />
          </>
        )}

        {/* Integrated Cooking Videos Section (Merged Video Bếp Chay inside Cộng đồng) */}
        {contentMode !== 'posts' && videoData && videoData.items.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <span className="blog-eyebrow flex items-center gap-1.5">
                  <CirclePlay size={15} /> GÓC VIDEO BẾP CHAY CỘNG ĐỒNG
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Video hướng dẫn nấu món chay</h2>
              </div>
              <Link to="/videos" className="blog-button secondary">
                Xem toàn bộ kho Video ({videoData.totalElements}) <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="cm-video-grid">
              {videoData.items.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setPost(null);
    blogService
      .publicPost(id || '', controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setPost(value);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [id, reload]);
  return (
    <MainLayout>
      <article className="blog-article-shell">
        <Link to="/blog" className="blog-back">
          <ArrowLeft size={15} /> Cộng đồng VEGEAI
        </Link>
        {busy && (
          <p role="status" className="blog-empty">
            Đang tải bài đăng...
          </p>
        )}
        {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
        {post && (
          <>
            <span className="blog-eyebrow">{blogCategories[post.category]}</span>
            <h1>{post.title}</h1>
            <p className="blog-lead">{post.excerpt}</p>
            <div className="blog-public-meta">
              <span>
                <UserRound size={14} />
                {post.authorName}
              </span>
              <span>{blogDate(post.publishedAt)}</span>
              <span>
                <Clock size={14} />
                {post.readingMinutes} phút đọc
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck size={14} /> Đã qua AI & Admin kiểm duyệt
              </span>
            </div>
            <BlogCover post={post} />
            {post.videoUrl && (
              <div className="my-6">
                <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                  <Video size={16} /> Video Bếp Chay đính kèm bài đăng
                </h3>
                <VideoPlayer
                  video={{
                    id: post.postId,
                    title: post.title,
                    videoUrl: post.videoUrl,
                    thumbnailUrl: post.coverImage,
                  }}
                />
              </div>
            )}
            <BlogBody content={post.content || ''} />
            <Link to="/blog" className="blog-read-link">
              <ArrowLeft size={15} /> Khám phá các chia sẻ khác trong Cộng đồng
            </Link>
          </>
        )}
      </article>
    </MainLayout>
  );
}
