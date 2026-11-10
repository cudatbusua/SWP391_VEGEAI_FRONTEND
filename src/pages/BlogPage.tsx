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
  ChefHat,
  ShoppingBag,
  MapPin,
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
import type { SmartMarketItem } from '../data/smartMarketData';
import '../styles/blog.css';

function parseMarketItemsFromStrings(rawIngredients: string[], recipeTitle: string): SmartMarketItem[] {
  return rawIngredients.map((raw, idx) => {
    const colonIdx = raw.indexOf(':');
    let name = raw.trim();
    let amount = '1 phần';
    if (colonIdx > 0) {
      name = raw.slice(0, colonIdx).trim();
      amount = raw.slice(colonIdx + 1).trim() || '1 phần';
    } else {
      const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (parenMatch) {
        name = parenMatch[1].trim();
        amount = parenMatch[2].trim();
      }
    }
    const lower = name.toLowerCase();
    const isProtein = lower.includes('đậu') || lower.includes('hạt') || lower.includes('tofu');
    const isSpice = lower.includes('sốt') || lower.includes('dầu') || lower.includes('tương') || lower.includes('tiêu') || lower.includes('muối');
    const category: SmartMarketItem['category'] = isProtein ? 'protein' : isSpice ? 'spices' : 'produce';
    const categoryLabel = isProtein ? 'Đậu hũ & Đạm thực vật' : isSpice ? 'Gia vị bếp chay' : 'Rau củ & Nấm tươi';
    return {
      id: `blog-ing-${Date.now()}-${idx}`,
      name,
      amount,
      category,
      categoryLabel,
      mealNote: `Món: ${recipeTitle}`,
      checked: false,
    };
  });
}

function splitIngredientLine(raw: string): { name: string; amount: string } {
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 0) {
    return {
      name: raw.slice(0, colonIdx).trim(),
      amount: raw.slice(colonIdx + 1).trim(),
    };
  }
  const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      name: parenMatch[1].trim(),
      amount: parenMatch[2].trim(),
    };
  }
  return { name: raw.trim(), amount: '' };
}

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
            <p>Chuyện căn bếp, công thức món chay và nguồn cảm hứng ẩm thực thuần thực vật mỗi ngày.</p>
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
            <Link className="blog-button" to={isAuthenticated ? '/blog/write' : '/login'}>
              <Plus size={17} /> {isAuthenticated ? 'Viết bài chia sẻ' : 'Đăng nhập để viết bài'}
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
            <Link to={isAuthenticated ? '/blog/write' : '/login'} className="blog-button">
              <Plus size={16} /> {isAuthenticated ? 'Viết bài đầu tiên' : 'Đăng nhập để viết bài'}
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

  // AI Recipe Extractor state (for Kitchen / Video posts)
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
    setAiRecipe(null);

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

  const handleAiExtractRecipe = async () => {
    if (!post) return;
    setAiError('');
    if (!isAuthenticated) {
      setAiError('Vui lòng đăng nhập để AI bóc tách công thức từ bài viết.');
      return;
    }
    setAiAnalyzing(true);
    try {
      const extracted = await aiService.extractRecipeFromVideo(
        post.title,
        post.excerpt || post.content || post.title,
        post.videoUrl
      );
      setAiRecipe(extracted);
    } catch (reason) {
      setAiError(errorMessage(reason));
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
  const isKitchenOrVideoPost = post ? post.category === 'KITCHEN' || Boolean(post.videoUrl) : false;

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
              </div>
            ) : videoObj?.kind === 'file' ? (
              <div className="my-6 space-y-3">
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-black">
                  <video
                    src={videoObj.src}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <BlogCover post={{ ...post, postId: post.postId }} />
            )}

            {/* AI Recipe Extraction (Only for Kitchen / Cooking Video posts, formatted in the clean 2-column Recipe layout) */}
            {isKitchenOrVideoPost && (
              <div className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ChefHat size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        Bóc tách Công thức &amp; Các bước nấu từ bài viết
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Tổng hợp nhanh danh sách nguyên liệu và các bước thực hiện theo chuẩn bảng công thức 2 cột.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAiExtractRecipe()}
                    disabled={aiAnalyzing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-xs cursor-pointer disabled:opacity-70 shrink-0"
                  >
                    <Sparkles size={15} />
                    <span>
                      {aiAnalyzing
                        ? 'Đang bóc tách công thức...'
                        : aiRecipe
                          ? 'Bóc tách lại công thức'
                          : 'Bóc tách Công thức & Bước nấu'}
                    </span>
                  </button>
                </div>

                {aiError && <p className="text-xs text-red-600 font-semibold">{aiError}</p>}

                {aiRecipe && (
                  <div className="space-y-6 pt-2">
                    <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                            {aiRecipe.title}
                          </h3>
                          {aiRecipe.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                              {aiRecipe.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {aiRecipe.cookTimeMinutes > 0 && (
                            <span className="flex gap-1.5 items-center">
                              <Clock size={15} className="text-emerald-600" />
                              {aiRecipe.cookTimeMinutes} phút nấu
                            </span>
                          )}
                          {aiRecipe.estimatedCalories > 0 && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                              ~{aiRecipe.estimatedCalories} kcal / khẩu phần
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Link
                          to="/ai-chef"
                          state={{
                            source: 'blog-recipe',
                            title: `Nấu: ${aiRecipe.title}`,
                            recipeContext: {
                              title: aiRecipe.title,
                              cookingTimeMinutes: aiRecipe.cookTimeMinutes,
                              caloriesEstimate: aiRecipe.estimatedCalories,
                              ingredients: aiRecipe.ingredients,
                              instructions: aiRecipe.instructions,
                            },
                            initialPrompt: `Tôi đang xem công thức "${aiRecipe.title}" (Nguyên liệu: ${aiRecipe.ingredients.join(', ')}). Bếp trưởng hãy hướng dẫn chi tiết hơn hoặc gợi ý cách biến tấu phù hợp với mục tiêu sức khỏe của tôi nhé!`
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                        >
                          <ChefHat size={15} /> Chuyển sang AI Bếp Trưởng
                        </Link>
                        <Link
                          to="/smart-market"
                          state={{
                            planTitle: aiRecipe.title,
                            recipeSummary: {
                              title: aiRecipe.title,
                              cookingTimeMinutes: aiRecipe.cookTimeMinutes,
                              caloriesEstimate: aiRecipe.estimatedCalories,
                              source: 'blog-recipe',
                            },
                            importedItems: parseMarketItemsFromStrings(aiRecipe.ingredients, aiRecipe.title),
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <ShoppingBag size={15} /> Đi chợ mua nguyên liệu
                        </Link>
                        <Link
                          to="/restaurants"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-400 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                        >
                          <MapPin size={15} className="text-emerald-600" /> Quán chay gần đây
                        </Link>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-[1fr_2fr] gap-6">
                      <section className="min-w-0 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Nguyên liệu</h2>
                        <p className="text-xs text-slate-400 mb-4">Định lượng chuẩn bị</p>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                          {aiRecipe.ingredients.map((item, idx) => {
                            const parsed = splitIngredientLine(item);
                            return (
                              <li key={idx} className="py-2.5 flex justify-between gap-4">
                                <span className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-200">
                                  {parsed.name}
                                </span>
                                {parsed.amount && (
                                  <span className="text-slate-500 font-semibold shrink-0">{parsed.amount}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>

                      <section className="min-w-0 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Các bước thực hiện</h2>
                        <ol className="space-y-4">
                          {aiRecipe.instructions.map((step, idx) => (
                            <li key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                              <h3 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase">
                                Bước {idx + 1}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                {step.replace(/^Bước\s*\d+\s*[-:–]?\s*/i, '')}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Article Content */}
            <BlogBody content={post.content || ''} />

            {/* Action Bar below article */}
            <section className="mt-10 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                <Utensils size={15} /> GỢI Ý CÙNG VEGEAI
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Bạn muốn tìm thêm công thức hoặc hỏi đáp cùng AI Bếp Trưởng?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Khám phá thư viện công thức món chay hoặc nhận tư vấn dinh dưỡng dựa trên bài viết này.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to="/ai-chef"
                    state={{
                      source: 'blog-detail',
                      title: `Tư vấn: ${post.title}`,
                      initialPrompt: `Tôi vừa đọc bài viết "${post.title}" (${post.excerpt || ''}). Bếp trưởng hãy tư vấn thêm và gợi ý thực đơn hoặc cách áp dụng thực tế cho tôi nhé!`
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    <ChefHat size={14} /> Hỏi AI Bếp Trưởng
                  </Link>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                  >
                    Thư viện công thức <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </section>

            {/* ── 5-STAR REVIEWS & COMMENTS SECTION ── */}
            <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <MessageSquare size={16} /> ĐÁNH GIÁ &amp; BÌNH LUẬN CỘNG ĐỒNG
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Cảm nhận từ người đọc ({comments.length || post.ratingCount || 0})
                  </h3>
                </div>

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
                <ArrowLeft size={15} /> Quay lại Blog cộng đồng
              </Link>
              <Link to="/explore" className="text-xs font-bold text-emerald-700 hover:underline">
                Thư viện công thức →
              </Link>
            </div>
          </>
        )}
      </article>
    </MainLayout>
  );
}
