import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  ChefHat,
  Image as ImageIcon,
  Video as VideoIcon,
  MapPin,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogService } from '../services/blogService';
import { errorMessage } from '../services/apiClient';
import { BlogBody, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { useAuth } from '../hooks/useAuth';
import { videoSource } from '../utils/communityVideo';
import { aiService } from '../services/aiService';
import { blogCategories, BLOG_POST_TEMPLATES, resolvePostAiMode } from '../types/blog';
import type { BlogCategory, BlogComment, BlogPost } from '../types/blog';
import type { GeneratedRecipeAiResponse, PageResponse } from '../types/api';
import type { SmartMarketItem } from '../data/smartMarketData';
import '../styles/blog.css';

interface KnowledgeAiAnalysisResult {
  headline: string;
  categoryBadge: string;
  keyTakeaways: string[];
  scientificOrLifestyleInsight: string;
  actionableSteps: string[];
  suggestedFollowUpPrompt: string;
}

/**
 * Deterministic (non-AI) quick summary built only from the post's own text.
 * It never invents facts. Deeper analysis is delegated to the AI chef through the chat hand-off.
 */
function buildKnowledgeFallback(post: BlogPost): KnowledgeAiAnalysisResult {
  const tpl = BLOG_POST_TEMPLATES[post.category] || BLOG_POST_TEMPLATES.GREEN_LIVING;
  const sentences = `${post.excerpt || ''}\n${post.content || ''}`
    .split(/\n|(?<=[.!?])\s+/)
    .map(line => line.replace(/^[#>\-*•\d.\s]+/, '').trim())
    .filter(line => line.length >= 20 && line.length <= 220);
  const keyTakeaways = [...new Set(sentences)].slice(0, 3);
  return {
    headline: `Tóm tắt nhanh: ${post.title}`,
    categoryBadge: tpl.badgeLabel,
    keyTakeaways: keyTakeaways.length ? keyTakeaways : ['Bài viết chưa có đủ nội dung văn bản để trích ý chính.'],
    scientificOrLifestyleInsight:
      'Phần tóm tắt trên được trích trực tiếp từ nội dung bài viết, không phải kết luận y khoa. Hãy chuyển sang AI Bếp Trưởng để được tư vấn dựa trên hồ sơ của bạn (thông tin chỉ mang tính tham khảo).',
    actionableSteps: [
      'Chuyển sang AI Bếp Trưởng để hỏi sâu hơn về chủ đề của bài viết.',
      'Dùng bản đồ GPS của VEGEAI để tìm quán chay hoặc nơi bán nguyên liệu gần bạn.',
      'Lên thực đơn tuần trong Lịch biểu nếu muốn áp dụng vào bữa ăn.'
    ],
    suggestedFollowUpPrompt: `Tôi vừa đọc bài đăng "${post.title}" (${post.excerpt || ''}). Hãy giải thích sâu hơn về chủ đề này và tư vấn cách áp dụng phù hợp với chế độ ăn chay của tôi, kèm lưu ý an toàn dinh dưỡng.`
  };
}

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
      mealNote: `Từ bài đăng: ${recipeTitle}`,
      checked: false,
    };
  });
}

export function BlogPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlogCategory | ''>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Facebook-style quick composer state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<BlogCategory>('KITCHEN');

  // Per-card inline AI analysis state on the feed
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);
  const [feedRecipeResults, setFeedRecipeResults] = useState<Record<string, GeneratedRecipeAiResponse>>({});
  const [feedKnowledgeResults, setFeedKnowledgeResults] = useState<Record<string, KnowledgeAiAnalysisResult>>({});
  const [feedErrors, setFeedErrors] = useState<Record<string, string>>({});

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

  const handleAnalyzePostOnFeed = async (post: BlogPost) => {
    const mode = resolvePostAiMode(post);
    setFeedErrors(prev => ({ ...prev, [post.postId]: '' }));
    if (mode === 'RECIPE_STEPS' && !isAuthenticated) {
      setFeedErrors(prev => ({ ...prev, [post.postId]: 'Vui lòng đăng nhập để AI bóc tách công thức từ bài đăng.' }));
      return;
    }
    setAnalyzingPostId(post.postId);
    try {
      if (mode === 'RECIPE_STEPS') {
        const extracted = await aiService.extractRecipeFromVideo(
          post.title,
          post.excerpt || post.content || post.title,
          post.videoUrl
        );
        setFeedRecipeResults(prev => ({ ...prev, [post.postId]: extracted }));
      } else {
        setFeedKnowledgeResults(prev => ({ ...prev, [post.postId]: buildKnowledgeFallback(post) }));
      }
    } catch (reason) {
      setFeedErrors(prev => ({ ...prev, [post.postId]: errorMessage(reason) }));
    } finally {
      setAnalyzingPostId(null);
    }
  };

  const handleStartComposer = (selectedCat: BlogCategory, mediaTab?: 'image' | 'video') => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/blog/write' } });
      return;
    }
    const tpl = BLOG_POST_TEMPLATES[selectedCat];
    navigate('/blog/write', {
      state: {
        recipeTitle: quickTitle.trim() || '',
        recipeCategory: selectedCat,
        recipeContent: tpl.contentTemplate,
        coverImage: tpl.defaultCover,
        mediaTab,
      }
    });
  };

  return (
    <MainLayout>
      <div className="blog-shell max-w-[1120px] mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Top Social Feed Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <span className="blog-eyebrow"><BookOpen size={15} /> BẢNG TIN CỘNG ĐỒNG &amp; AI TÍCH HỢP</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Cộng đồng Sống Xanh &amp; Bếp Chay VEGEAI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Nơi mọi thành viên đăng bài chia sẻ <strong>Công thức nấu ăn</strong>, <strong>Kiến thức dinh dưỡng</strong> hoặc <strong>Lan tỏa lối sống xanh</strong> kèm hình ảnh/video — tích hợp AI phân tích tự động theo từng phân loại bài đăng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user?.role === 'admin' && (
              <Link className="blog-button secondary" to="/admin/blog">
                <ClipboardCheck size={16} /> Duyệt bài đăng
              </Link>
            )}
            {isAuthenticated && (
              <Link className="blog-button secondary" to="/blog/my-posts">
                <FileText size={16} /> Bài đăng của tôi
              </Link>
            )}
            <Link className="blog-button" to={isAuthenticated ? '/blog/write' : '/login'}>
              <Plus size={17} /> {isAuthenticated ? 'Tạo bài đăng mới' : 'Đăng nhập để đăng bài'}
            </Link>
          </div>
        </header>

        {/* FACEBOOK-STYLE QUICK POST COMPOSER BOX */}
        <section className="rounded-3xl border border-emerald-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {isAuthenticated ? (user?.name || user?.username || 'U').charAt(0).toUpperCase() : '🌱'}
            </div>
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleStartComposer(quickCategory);
                }
              }}
              placeholder={
                isAuthenticated
                  ? `${user?.name || user?.username || 'Bạn'} ơi, hôm nay bạn muốn chia sẻ công thức món chay, kiến thức dinh dưỡng hay câu chuyện sống xanh nào?`
                  : 'Đăng nhập để chia sẻ công thức, bài viết kiến thức kèm hình ảnh/video lên cộng đồng...'
              }
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleStartComposer(quickCategory)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs cursor-pointer shrink-0"
            >
              Soạn bài đăng
            </button>
          </div>

          {/* 4 Classification Rules & Media Quick Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Chọn mẫu bài đăng chuẩn:</span>
              {(Object.keys(BLOG_POST_TEMPLATES) as BlogCategory[]).map(catKey => {
                const tpl = BLOG_POST_TEMPLATES[catKey];
                const active = quickCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => {
                      setQuickCategory(catKey);
                      handleStartComposer(catKey);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:bg-emerald-50/50'
                    }`}
                    title={tpl.description}
                  >
                    <span>{tpl.badgeLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartComposer(quickCategory, 'image')}
                className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-800 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ImageIcon size={14} /> Đính kèm Ảnh
              </button>
              <button
                type="button"
                onClick={() => handleStartComposer('KITCHEN', 'video')}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <VideoIcon size={14} /> Đăng kèm Video
              </button>
            </div>
          </div>
        </section>

        {/* BEST-RULE CLASSIFICATION EXPLAINER & FILTER BAR */}
        <div className="space-y-3">
          <div className="blog-filter-bar">
            <div className="blog-tabs">
              <button aria-pressed={!category} onClick={() => { setCategory(''); setPage(0); }}>
                Tất cả bài đăng
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
                placeholder="Tìm kiếm bài đăng, công thức, kiến thức sống xanh..."
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(0); }}
              />
            </label>
          </div>

          {category && BLOG_POST_TEMPLATES[category] && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
                <Sparkles size={15} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>{BLOG_POST_TEMPLATES[category].badgeLabel}:</strong> {BLOG_POST_TEMPLATES[category].description}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0 border border-emerald-200 dark:border-slate-700">
                {BLOG_POST_TEMPLATES[category].aiActionLabel}
              </span>
            </div>
          )}
        </div>

        {error && <BlogError message={error} retry={() => setReload(value => value + 1)} />}
        {busy && !data && <p role="status" className="blog-empty">Đang tải bảng tin cộng đồng...</p>}
        {!busy && !error && !data?.items.length && (
          <div className="blog-empty">
            <BookOpen size={36} />
            <h2>Chưa có bài đăng phù hợp</h2>
            <p>Hãy là người đầu tiên chia sẻ công thức nấu ăn hoặc kiến thức sống xanh của bạn!</p>
            <Link to={isAuthenticated ? '/blog/write' : '/login'} className="blog-button">
              <Plus size={16} /> {isAuthenticated ? 'Đăng bài đầu tiên' : 'Đăng nhập để đăng bài'}
            </Link>
          </div>
        )}

        {/* FACEBOOK-STYLE SOCIAL FEED CARDS WITH INTEGRATED CONTEXT-AWARE AI */}
        {!error && data && data.items.length > 0 && (
          <div className={'space-y-6 ' + (busy ? 'opacity-60' : '')}>
            {data.items.map(post => {
              const hasVideo = !!post.videoUrl;
              const aiMode = resolvePostAiMode(post);
              const tpl = BLOG_POST_TEMPLATES[post.category] || BLOG_POST_TEMPLATES.KITCHEN;
              const recipeResult = feedRecipeResults[post.postId];
              const knowledgeResult = feedKnowledgeResults[post.postId];
              const isAnalyzingThis = analyzingPostId === post.postId;

              return (
                <article
                  key={post.postId}
                  className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition hover:shadow-md"
                >
                  {/* Post Author & Classification Header (Facebook Card Header) */}
                  <div className="p-4 sm:px-6 sm:pt-5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-sm flex items-center justify-center shrink-0">
                        {(post.authorName || 'V').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {post.authorName}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                            {blogCategories[post.category] || tpl.badgeLabel}
                          </span>
                          {hasVideo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                              <Play size={10} fill="white" /> Có Video
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{blogDate(post.publishedAt)}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {post.readingMinutes} phút đọc</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900">
                      <Star size={13} fill="#f59e0b" className="text-amber-500" />
                      <span>{(post.ratingAverage || 5.0).toFixed(1)}</span>
                      <span className="text-[11px] text-slate-400 font-normal">({post.ratingCount || 0})</span>
                    </div>
                  </div>

                  {/* Post Title & Description */}
                  <div className="px-4 sm:px-6 py-3 space-y-1.5">
                    <Link to={'/blog/' + post.postId} className="block group">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Post Image / Video Media */}
                  <Link to={'/blog/' + post.postId} className="block px-4 sm:px-6">
                    <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[380px]">
                      <BlogCover post={{ ...post, postId: post.postId }} />
                    </div>
                  </Link>

                  {/* Context-Aware Integrated AI Action Bar */}
                  <div className="p-4 sm:px-6 mt-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAnalyzePostOnFeed(post)}
                        disabled={isAnalyzingThis}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs cursor-pointer disabled:opacity-60"
                      >
                        {aiMode === 'RECIPE_STEPS' ? <ChefHat size={14} /> : <Brain size={14} />}
                        <span>
                          {isAnalyzingThis
                            ? 'AI đang phân tích bài đăng...'
                            : aiMode === 'RECIPE_STEPS'
                              ? '✨ AI Phân tích Công thức & Bước nấu'
                              : '🧠 AI Phân tích Kiến thức & Tư vấn'}
                        </span>
                      </button>

                      <Link
                        to="/ai-chef"
                        state={{
                          source: 'blog-feed',
                          title: `Tư vấn: ${post.title}`,
                          initialPrompt:
                            aiMode === 'RECIPE_STEPS'
                              ? `Tôi vừa xem bài đăng công thức "${post.title}" (${post.excerpt || ''}). Bếp trưởng hãy hướng dẫn chi tiết các bước nấu món này và gợi ý biến tấu phù hợp với thể trạng của tôi nhé!`
                              : `Tôi vừa đọc bài đăng "${post.title}" (${post.excerpt || ''}). Hãy phân tích sâu hơn về chủ đề này và tư vấn cách áp dụng phù hợp với chế độ ăn chay của tôi nhé!`
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition"
                      >
                        <MessageSquare size={14} />
                        <span>Chuyển sang Chatbot AI tư vấn tiếp</span>
                      </Link>
                    </div>

                    <Link
                      to={'/blog/' + post.postId}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <span>Xem chi tiết &amp; Bình luận</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>

                  {feedErrors[post.postId] && (
                    <p role="alert" className="mx-4 sm:mx-6 mb-3 text-xs font-semibold text-red-600">{feedErrors[post.postId]}</p>
                  )}
                  {/* INLINE AI ANALYSIS OUTPUT FOR RECIPE POSTS (Shows Ingredients + Cooking Steps + Switch to Chatbot) */}
                  {recipeResult && (
                    <div className="mx-4 sm:mx-6 mb-5 p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-slate-800/80 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200/60 dark:border-slate-700">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Sparkles size={13} /> AI Recipe Copilot — Đã bóc tách công thức &amp; các bước nấu
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {recipeResult.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span>⏱ {recipeResult.cookTimeMinutes} phút</span>
                          <span>·</span>
                          <span>🔥 ~{recipeResult.estimatedCalories} kcal</span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-12 gap-4">
                        <div className="md:col-span-5 space-y-1.5">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">
                            🥗 Nguyên liệu cần chuẩn bị ({recipeResult.ingredients.length}):
                          </h4>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {recipeResult.ingredients.map((ing, i) => (
                              <li key={i} className="flex items-start gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-900">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>{ing}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="md:col-span-7 space-y-1.5">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">
                            👨‍🍳 Các bước nấu thực hiện:
                          </h4>
                          <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                            {recipeResult.instructions.map((step, i) => (
                              <li key={i} className="flex gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
                                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-emerald-200/60 dark:border-slate-700 flex flex-wrap items-center justify-end gap-2">
                        <Link
                          to="/smart-market"
                          state={{
                            planTitle: recipeResult.title,
                            recipeSummary: {
                              title: recipeResult.title,
                              cookingTimeMinutes: recipeResult.cookTimeMinutes,
                              caloriesEstimate: recipeResult.estimatedCalories,
                              source: 'blog-recipe',
                            },
                            importedItems: parseMarketItemsFromStrings(recipeResult.ingredients, recipeResult.title),
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition shadow-2xs"
                        >
                          <MapPin size={14} />
                          <span>Tìm điểm bán nguyên liệu gần tôi (GPS)</span>
                        </Link>
                        <Link
                          to="/ai-chef"
                          state={{
                            source: 'blog-recipe',
                            title: recipeResult.title,
                            recipeContext: {
                              title: recipeResult.title,
                              cookingTimeMinutes: recipeResult.cookTimeMinutes,
                              caloriesEstimate: recipeResult.estimatedCalories,
                              ingredients: recipeResult.ingredients,
                              instructions: recipeResult.instructions,
                            },
                            initialPrompt: `Tôi vừa dùng AI phân tích công thức "${recipeResult.title}" từ bài đăng cộng đồng (Nguyên liệu: ${recipeResult.ingredients.join(', ')}). Bếp trưởng hãy tư vấn thêm mẹo nấu món này ngon nhất hoặc cách điều chỉnh khẩu phần cho tôi nhé!`
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs"
                        >
                          <ChefHat size={14} />
                          <span>Chuyển sang Chatbot AI Bếp Trưởng tư vấn tiếp</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* INLINE AI ANALYSIS OUTPUT FOR KNOWLEDGE / GREEN LIVING / REVIEW POSTS */}
                  {knowledgeResult && (
                    <div className="mx-4 sm:mx-6 mb-5 p-5 rounded-2xl border-2 border-teal-500/30 bg-teal-50/40 dark:bg-slate-800/80 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-teal-200/60 dark:border-slate-700">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
                            <Brain size={13} /> AI Knowledge &amp; Lifestyle Copilot — Phân tích chuyên sâu từ bài đăng
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {knowledgeResult.headline}
                          </h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[11px] font-bold">
                          {knowledgeResult.categoryBadge}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-slate-700 space-y-2">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                            <Lightbulb size={14} className="text-amber-500" />
                            <span>Điểm cốt lõi từ bài viết:</span>
                          </h4>
                          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                            {knowledgeResult.keyTakeaways.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-slate-700 space-y-2">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                            <Sparkles size={14} className="text-emerald-600" />
                            <span>Góc nhìn Khoa học &amp; Gợi ý áp dụng:</span>
                          </h4>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {knowledgeResult.scientificOrLifestyleInsight}
                          </p>
                          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300 font-semibold pt-1">
                            {knowledgeResult.actionableSteps.map((act, idx) => (
                              <li key={idx}>• {act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-teal-200/60 dark:border-slate-700 flex flex-wrap items-center justify-end gap-2">
                        {post.category === 'EXPLORATION' && (
                          <Link
                            to="/smart-market"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition"
                          >
                            <MapPin size={14} />
                            <span>Tìm quán chay &amp; cửa hàng gần tôi (GPS)</span>
                          </Link>
                        )}
                        <Link
                          to="/ai-chef"
                          state={{
                            source: 'blog-knowledge',
                            title: `Tư vấn: ${post.title}`,
                            initialPrompt: knowledgeResult.suggestedFollowUpPrompt,
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs"
                        >
                          <ChefHat size={14} />
                          <span>Chuyển sang Chatbot AI để tư vấn &amp; hỗ trợ tiếp</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </article>
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

  // Context-Aware AI Copilot state (supports both Recipe Steps & Knowledge Analysis)
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<GeneratedRecipeAiResponse | null>(null);
  const [aiKnowledge, setAiKnowledge] = useState<KnowledgeAiAnalysisResult | null>(null);
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
    setAiKnowledge(null);

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

  const handleAiAnalyzePost = async () => {
    if (!post) return;
    const mode = resolvePostAiMode(post);
    setAiError('');
    if (mode === 'RECIPE_STEPS' && !isAuthenticated) {
      setAiError('Vui lòng đăng nhập để AI bóc tách công thức từ bài đăng.');
      return;
    }
    setAiAnalyzing(true);
    try {
      if (mode === 'RECIPE_STEPS') {
        const extracted = await aiService.extractRecipeFromVideo(
          post.title,
          post.excerpt || post.content || post.title,
          post.videoUrl
        );
        setAiRecipe(extracted);
      } else {
        setAiKnowledge(buildKnowledgeFallback(post));
      }
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
  const aiMode = post ? resolvePostAiMode(post) : 'KNOWLEDGE_INSIGHT';

  return (
    <MainLayout>
      <article className="blog-article-shell max-w-[1000px] mx-auto px-4 py-8">
        <Link to="/blog" className="blog-back">
          <ArrowLeft size={15} /> Bảng tin Cộng đồng
        </Link>

        {busy && <p role="status" className="blog-empty">Đang tải bài đăng...</p>}
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
            ) : (
              <BlogCover post={{ ...post, postId: post.postId }} />
            )}

            {/* CONTEXT-AWARE AI ANALYSIS COPILOT BAR (Works for BOTH Recipe Posts & Knowledge/Lifestyle Posts!) */}
            <div className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    {aiMode === 'RECIPE_STEPS' ? <ChefHat size={20} /> : <Brain size={20} />}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      {aiMode === 'RECIPE_STEPS'
                        ? 'AI Recipe Copilot: Bóc tách Nguyên liệu & Các bước nấu từ bài đăng'
                        : 'AI Knowledge & Lifestyle Copilot: Phân tích Luận điểm & Tư vấn Cá nhân hóa'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {aiMode === 'RECIPE_STEPS'
                        ? 'Phân tích bài đăng / video món chay để hiển thị danh sách nguyên liệu, các bước nấu chi tiết và chuyển tiếp sang Chatbot AI Bếp Trưởng.'
                        : 'Đúc kết các điểm cốt lõi từ bài chia sẻ kiến thức / lối sống xanh và kết nối trực tiếp sang Chatbot AI để tư vấn theo hồ sơ sức khỏe của bạn.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleAiAnalyzePost()}
                    disabled={aiAnalyzing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-xs cursor-pointer disabled:opacity-70"
                  >
                    <Sparkles size={15} />
                    <span>
                      {aiAnalyzing
                        ? 'AI đang phân tích...'
                        : aiRecipe || aiKnowledge
                          ? 'Phân tích lại với AI'
                          : aiMode === 'RECIPE_STEPS'
                            ? '✨ AI Phân tích Công thức & Bước nấu'
                            : '🧠 AI Phân tích Bài đăng ngay'}
                    </span>
                  </button>
                </div>
              </div>

              {aiError && <p className="text-xs text-red-600 font-semibold">{aiError}</p>}

              {/* Output Type A: Recipe Steps + Switch to Chatbot + Find Nearby Stores */}
              {aiRecipe && (
                <div className="p-5 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Kết quả AI bóc tách công thức nấu ăn
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {aiRecipe.title}
                      </h3>
                      {aiRecipe.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{aiRecipe.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-bold">
                      {aiRecipe.cookTimeMinutes > 0 && <span>⏱ {aiRecipe.cookTimeMinutes} phút</span>}
                      {aiRecipe.estimatedCalories > 0 && <span>🔥 ~{aiRecipe.estimatedCalories} kcal</span>}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px]">
                        🌱 {aiRecipe.dietaryType || 'VEGAN'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2 uppercase">
                      🥗 Nguyên liệu cần chuẩn bị ({aiRecipe.ingredients.length}):
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
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2 uppercase">
                      👨‍🍳 Các bước nấu thực hiện:
                    </h4>
                    <div className="space-y-2.5">
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

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
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
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition shadow-xs"
                    >
                      <MapPin size={14} />
                      <span>Tìm điểm bán nguyên liệu gần tôi (GPS)</span>
                    </Link>
                    <Link
                      to="/ai-chef"
                      state={{
                        source: 'blog-recipe',
                        title: aiRecipe.title,
                        recipeContext: {
                          title: aiRecipe.title,
                          cookingTimeMinutes: aiRecipe.cookTimeMinutes,
                          caloriesEstimate: aiRecipe.estimatedCalories,
                          ingredients: aiRecipe.ingredients,
                          instructions: aiRecipe.instructions,
                        },
                        initialPrompt: `Tôi vừa phân tích công thức "${aiRecipe.title}" từ bài đăng cộng đồng (Nguyên liệu: ${aiRecipe.ingredients.join(', ')}). Bếp trưởng hãy hướng dẫn chi tiết hơn hoặc gợi ý cách biến tấu phù hợp với mục tiêu sức khỏe của tôi nhé!`
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-xs"
                    >
                      <ChefHat size={14} />
                      <span>Chuyển sang Chatbot AI Bếp Trưởng tư vấn tiếp</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Output Type B: Knowledge / Green Living / Review Analysis + Switch to Chatbot */}
              {aiKnowledge && (
                <div className="p-5 rounded-2xl border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        Kết quả AI phân tích Kiến thức &amp; Giá trị bài đăng
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {aiKnowledge.headline}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs font-bold">
                      {aiKnowledge.categoryBadge}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                        <Lightbulb size={14} className="text-amber-500" />
                        <span>Ý chính trích từ bài viết:</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                        {aiKnowledge.keyTakeaways.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span>Lưu ý &amp; Gợi ý thực hành trên VEGEAI:</span>
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {aiKnowledge.scientificOrLifestyleInsight}
                      </p>
                      <ul className="space-y-1 text-emerald-800 dark:text-emerald-300 font-semibold pt-1">
                        {aiKnowledge.actionableSteps.map((step, idx) => (
                          <li key={idx}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                    <Link
                      to="/ai-chef"
                      state={{
                        source: 'blog-knowledge',
                        title: `Tư vấn: ${post.title}`,
                        initialPrompt: aiKnowledge.suggestedFollowUpPrompt,
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-xs"
                    >
                      <ChefHat size={14} />
                      <span>Chuyển sang Chatbot AI Bếp Trưởng để tư vấn &amp; hỗ trợ tiếp</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Article Content */}
            <BlogBody content={post.content || ''} />

            {/* Action Bar below article */}
            <section className="mt-10 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                <Utensils size={15} /> TRỢ LÝ AI &amp; THỰC HÀNH CÙNG VEGEAI
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Tiếp tục thảo luận về bài viết này cùng AI Bếp Trưởng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mở phiên trò chuyện mới trên Chatbot để nhận tư vấn thực đơn, công thức hoặc giải đáp thắc mắc dựa trên bài đăng.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to="/ai-chef"
                    state={{
                      source: 'blog-detail',
                      title: `Tư vấn: ${post.title}`,
                      initialPrompt: `Tôi vừa đọc bài viết "${post.title}" (${post.excerpt || ''}). Bếp trưởng hãy tư vấn chuyên sâu và gợi ý thực đơn hoặc cách áp dụng thực tế cho tôi nhé!`
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    <ChefHat size={14} /> Chuyển sang Chatbot AI Bếp Trưởng
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
                      placeholder="Chia sẻ trải nghiệm nấu ăn, thắc mắc hoặc cảm nhận của bạn về bài đăng này..."
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
                <ArrowLeft size={15} /> Quay lại Bảng tin Cộng đồng
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
