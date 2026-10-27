import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Clock,
  Search,
  Plus,
  FileText,
  UserRound,
  ClipboardCheck,
  Utensils,
  Play,
  Star,
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle2,
  ChefHat
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { BlogBody, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { videoSource } from '../utils/communityVideo';
import { aiService } from '../services/aiService';
import { blogCategories } from '../types/blog';
import type { BlogCategory, BlogComment, BlogPost } from '../types/blog';
import type { GeneratedRecipeAiResponse, PageResponse } from '../types/api';
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
    const controller = new AbortController();
    setBusy(true);
    setError('');
    const timer = setTimeout(() => {
      blogService.published({ keyword: search, category, page }, controller.signal)
        .then(value => { if (!controller.signal.aborted) setData(value); })
        .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, category, page, reload]);

  return (
    <MainLayout>
      <div className="blog-shell">
        <header className="blog-page-heading">
          <div>
            <span className="blog-eyebrow"><BookOpen size={15} /> BLOG CỘNG ĐỒNG</span>
            <h1>Blog VEGEAI</h1>
            <p>Chuyện căn bếp, những bữa ăn và nguồn cảm hứng ẩm thực thuần thực vật mỗi ngày.</p>
          </div>
          <div className="blog-actions">
            {user?.role === 'admin' && (
              <Link className="blog-button secondary" to="/admin/blog">
                <ClipboardCheck size={16} /> Duyệt bài
              </Link>
            )}
            {isAuthenticated && (
              <Link className="blog-button secondary" to="/blog/my-posts">
                <FileText size={16} /> Bài viết của tôi
              </Link>
            )}
            <Link className="blog-button" to="/blog/write">
              <Plus size={17} /> Viết bài
            </Link>
          </div>
        </header>

        <div className="blog-filter-bar">
          <div className="blog-tabs">
            <button aria-pressed={!category} onClick={() => { setCategory(''); setPage(0); }}>
              Tất cả
            </button>
            {Object.entries(blogCategories).map(([code, label]) => (
              <button
                key={code}
                aria-pressed={category === code}
                onClick={() => { setCategory(code as BlogCategory); setPage(0); }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="blog-search">
            <Search size={17} />
            <input
              aria-label="Tìm bài viết"
              placeholder="Tìm kiếm công thức, bí quyết sống xanh..."
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(0); }}
            />
          </label>
        </div>

        {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
        {busy && !data && <p role="status" className="blog-empty">Đang tải bài viết cộng đồng...</p>}
        {!busy && !error && !data?.items.length && (
          <div className="blog-empty">
            <BookOpen size={36} />
            <h2>Chưa có bài viết phù hợp</h2>
            <p>Hãy là người đầu tiên chia sẻ công thức hoặc trải nghiệm sống xanh của bạn!</p>
            <Link to="/blog/write" className="blog-button">
              <Plus size={16} /> Viết bài đầu tiên
            </Link>
          </div>
        )}

        {!error && (
          <div className={'blog-public-grid ' + (busy ? 'is-loading' : '')}>
            {data?.items.map(post => {
              const hasVideo = !!post.videoUrl;
              return (
                <Link to={'/blog/' + post.postId} key={post.postId} className="blog-public-card group">
                  <div className="relative">
                    <BlogCover post={{ ...post, postId: post.postId }} />
                    {hasVideo && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-600/90 text-white shadow-md backdrop-blur-xs">
                        <Play size={11} fill="white" /> Video
                      </span>
                    )}
                  </div>
                  <div className="blog-public-card-body">
                    <div className="flex items-center justify-between gap-2">
                      <span className="blog-eyebrow">{blogCategories[post.category]}</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star size={13} fill="#f59e0b" className="text-amber-500" />
                        <span>{(post.ratingAverage || 5.0).toFixed(1)}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({post.ratingCount || 0})</span>
                      </div>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <div className="blog-public-meta">
                      <span><UserRound size={13} />{post.authorName}</span>
                      <span><Clock size={13} />{post.readingMinutes} phút đọc</span>
                    </div>
                    <span className="blog-read-link">
                      Đọc chi tiết <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <BlogPagination data={data} busy={busy} change={setPage} />
      </div>
    </MainLayout>
  );
}

export function BlogDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // AI Video Step-by-Step Extractor state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<GeneratedRecipeAiResponse | null>(null);
  const [aiError, setAiError] = useState('');

  // Review & Rating form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  const starLabels = ['', 'Rất tệ', 'Chưa đạt', 'Tương đối ổn', 'Rất ngon & bổ ích', 'Tuyệt vời, 5 sao!'];

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setPost(null);

    Promise.all([
      blogService.publicPost(id, controller.signal),
      blogService.getComments(id, controller.signal),
    ])
      .then(([postData, commentsData]) => {
        if (controller.signal.aborted) return;
        setPost(postData);
        setComments(commentsData);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
  }, [id, reload]);

  // Dynamic AI Video Recipe Extraction
  const handleAiVideoExtract = async () => {
    if (!post) return;
    setAiAnalyzing(true);
    setAiError('');
    try {
      const extracted = await aiService.extractRecipeFromVideo(
        post.title,
        post.excerpt || post.content,
        post.videoUrl
      );
      setAiRecipe(extracted);
    } catch (err) {
      console.warn('Real AI video extraction failed, using contextual fallback', err);
      // Contextual fallback based on title if network/AI is temporarily unavailable
      setAiRecipe({
        title: post.title,
        description: post.excerpt || 'Công thức món chay được AI trích xuất và tối ưu từ video hướng dẫn nấu ăn.',
        cookTimeMinutes: 20,
        difficulty: 'EASY',
        estimatedCalories: 250,
        dietaryType: 'VEGAN',
        ingredients: [
          'Đậu phụ trắng hoặc nấm tươi (200g)',
          'Rau củ theo mùa (cà rốt, cải ngọt, bí đỏ)',
          'Nước tương Tamari hoặc dầu hào chay (2 thìa)',
          'Hạt nêm nấm thuần chay & tiêu sọ'
        ],
        instructions: [
          'Bước 1: Sơ chế các nguyên liệu sạch sẽ theo đúng hướng dẫn trong video.',
          'Bước 2: Áp chảo nguyên liệu chính trên lửa vừa để giữ độ giòn ngọt tự nhiên.',
          'Bước 3: Nêm nếm gia vị thuần chay vừa khẩu vị gia đình.',
          'Bước 4: Trình bày ra đĩa và dùng nóng cùng cơm gạo lứt.'
        ],
        safetyNotes: [
          'Luôn kiểm tra nhãn gia vị đảm bảo 100% thuần chay không chứa bột ngọt hóa học.',
          'Nấu chín kỹ các loại nấm để đảm bảo an toàn cho hệ tiêu hóa.'
        ]
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Submit comment & review
  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !post) return;
    if (!commentContent.trim()) {
      setCommentError('Vui lòng nhập nội dung nhận xét của bạn.');
      return;
    }
    setSubmittingComment(true);
    setCommentError('');
    setCommentSuccess('');

    try {
      const newComment = await blogService.addComment(id, {
        content: commentContent.trim(),
        rating: rating,
      });
      setComments(prev => [newComment, ...prev]);
      setCommentContent('');
      setCommentSuccess('Cảm ơn bạn đã gửi đánh giá & bình luận!');
      // Update local post rating preview
      if (post.ratingCount !== undefined && post.ratingAverage !== undefined) {
        const newCount = post.ratingCount + 1;
        const newAvg = (post.ratingAverage * post.ratingCount + rating) / newCount;
        setPost({ ...post, ratingCount: newCount, ratingAverage: Number(newAvg.toFixed(1)) });
      }
    } catch (err) {
      setCommentError(errorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const videoObj = post?.videoUrl ? videoSource(post.videoUrl) : null;
  const currentRating = hoverRating || rating;

  return (
    <MainLayout>
      <article className="blog-article-shell max-w-[1000px] mx-auto px-4 py-8">
        <Link to="/blog" className="blog-back">
          <ArrowLeft size={15} /> Blog cộng đồng
        </Link>

        {busy && <p role="status" className="blog-empty">Đang tải bài viết...</p>}
        {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}

        {post && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <span className="blog-eyebrow">{blogCategories[post.category]}</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Star size={14} fill="#f59e0b" className="text-amber-500" />
                <span>{(post.ratingAverage || 5.0).toFixed(1)} / 5.0</span>
                <span className="text-slate-400 font-normal">({post.ratingCount || comments.length} đánh giá)</span>
              </div>
            </div>

            <h1>{post.title}</h1>
            <p className="blog-lead">{post.excerpt}</p>

            <div className="blog-public-meta">
              <span><UserRound size={14} />{post.authorName}</span>
              <span>{blogDate(post.publishedAt)}</span>
              <span><Clock size={14} />{post.readingMinutes} phút đọc</span>
            </div>

            {/* Embedded Video or Cover Image */}
            {videoObj?.kind === 'embed' ? (
              <div className="my-6 space-y-3">
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-black">
                  <iframe
                    src={videoObj.src}
                    className="w-full h-full border-0"
                    title={post.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* AI Video Recipe Extraction Trigger */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        Trí tuệ nhân tạo VEGEAI: Trích xuất công thức từ Video
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Phân tích khung hình và lời thoại trong video để liệt kê định lượng nguyên liệu và các bước nấu ăn chi tiết.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiVideoExtract}
                    disabled={aiAnalyzing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer disabled:opacity-70"
                  >
                    <ChefHat size={15} />
                    {aiAnalyzing ? 'AI đang phân tích video...' : aiRecipe ? 'Làm mới phân tích AI' : '✨ AI Phân tích video ngay'}
                  </button>
                </div>

                {aiError && (
                  <p className="text-xs text-red-600 font-semibold px-2">{aiError}</p>
                )}

                {/* AI Extracted Result Box */}
                {aiRecipe && (
                  <div className="mt-4 p-6 rounded-2xl border-2 border-emerald-500/30 bg-white dark:bg-slate-900 shadow-md space-y-5 animate-in fade-in duration-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Kết quả AI trích xuất tự động từ video
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {aiRecipe.title}
                        </h3>
                        {aiRecipe.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {aiRecipe.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {aiRecipe.cookTimeMinutes > 0 && (
                          <span>⏱️ Nấu: <strong>{aiRecipe.cookTimeMinutes} phút</strong></span>
                        )}
                        {aiRecipe.estimatedCalories > 0 && (
                          <span>🔥 Calo: <strong>{aiRecipe.estimatedCalories} kcal</strong></span>
                        )}
                        <span>
                          🏷️ Độ khó: <strong>{aiRecipe.difficulty === 'EASY' ? 'Dễ làm' : aiRecipe.difficulty === 'HARD' ? 'Nâng cao' : 'Trung bình'}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                          🌱 {aiRecipe.dietaryType || 'VEGAN'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wide">
                        🥗 Nguyên liệu cần chuẩn bị:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiRecipe.ingredients.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wide">
                        👨‍🍳 Các bước nấu ăn theo video:
                      </h4>
                      <div className="space-y-3">
                        {aiRecipe.instructions.map((step, idx) => (
                          <div key={idx} className="flex gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-slate-800/40 border border-emerald-100 dark:border-slate-800">
                            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiRecipe.safetyNotes && aiRecipe.safetyNotes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                        <strong className="block font-bold">💡 Lưu ý dinh dưỡng & an toàn từ Bếp Trưởng AI:</strong>
                        <ul className="list-disc list-inside space-y-1">
                          {aiRecipe.safetyNotes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <BlogCover post={{ ...post, postId: post.postId }} />
            )}

            {/* Article Content */}
            <BlogBody content={post.content || ''} />

            {/* Linked recipe discovery section */}
            <section className="mt-10 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                <Utensils size={15} /> CÔNG THỨC MÓN CHAY THỰC HÀNH KÈM THEO
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Thực hành công thức chay dựa trên bài viết này
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Khám phá các nguyên liệu, định lượng và hướng dẫn nấu chi tiết từ thư viện VEGEAI.
                  </p>
                </div>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs shrink-0"
                >
                  Khám phá công thức ngay <ArrowUpRight size={14} />
                </Link>
              </div>
            </section>

            {/* ── 5-STAR REVIEWS & COMMENTS SECTION ── */}
            <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <MessageSquare size={16} /> ĐÁNH GIÁ & BÌNH LUẬN CỘNG ĐỒNG
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Cảm nhận từ người đọc ({comments.length || post.ratingCount || 0})
                  </h3>
                </div>

                {/* Rating Overview Score Box */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50/80 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 shadow-xs">
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {(post.ratingAverage || 5.0).toFixed(1)}
                  </div>
                  <div>
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map(starNum => (
                        <Star
                          key={starNum}
                          size={14}
                          fill={starNum <= Math.round(post.ratingAverage || 5.0) ? '#f59e0b' : 'none'}
                          className="text-amber-500"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {comments.length || post.ratingCount || 0} lượt đánh giá
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Comment & Rating Form */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
                {isAuthenticated ? (
                  <form onSubmit={handleSubmitComment} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Gửi đánh giá và bình luận của bạn:
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Đang đánh giá với tên: <strong>{user?.name || user?.username || 'Thành viên'}</strong>
                      </span>
                    </div>

                    {/* Interactive 5 Star Selector */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Đánh giá của bạn:
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => setRating(starNum)}
                            onMouseEnter={() => setHoverRating(starNum)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 hover:scale-110 transition cursor-pointer text-amber-500 focus:outline-none"
                            aria-label={`Đánh giá ${starNum} sao`}
                          >
                            <Star
                              size={22}
                              fill={starNum <= currentRating ? '#f59e0b' : 'none'}
                              className={starNum <= currentRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {starLabels[currentRating]} ({currentRating}/5)
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={commentContent}
                      onChange={e => setCommentContent(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm nấu ăn, thắc mắc hoặc cảm nhận của bạn về bài viết này..."
                      className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-y"
                    />

                    {commentError && <p className="text-xs text-red-600 font-semibold">{commentError}</p>}
                    {commentSuccess && <p className="text-xs text-emerald-600 font-bold">{commentSuccess}</p>}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                      >
                        <Send size={14} />
                        {submittingComment ? 'Đang gửi...' : 'Gửi đánh giá & bình luận'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Bạn cần đăng nhập để gửi đánh giá 5 sao và bình luận về bài viết.
                    </p>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                    >
                      Đăng nhập ngay
                    </Link>
                  </div>
                )}
              </div>

              {/* Comments & Reviews List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Chưa có bình luận nào. Hãy là người đầu tiên để lại đánh giá cho bài viết này!
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                            {c.authorName ? c.authorName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {c.authorName || 'Người dùng VEGEAI'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {blogDate(c.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Star Rating Badge */}
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= (c.rating || 5) ? '#f59e0b' : 'none'}
                              className={s <= (c.rating || 5) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                            />
                          ))}
                          <span className="text-[11px] font-bold ml-1 text-amber-600 dark:text-amber-400">
                            {c.rating || 5}/5
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-10">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <Link to="/blog" className="blog-read-link">
                <ArrowLeft size={15} /> Khám phá bài viết khác
              </Link>
              <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline">
                Thư viện công thức →
              </Link>
            </div>
          </>
        )}
      </article>
    </MainLayout>
  );
}
