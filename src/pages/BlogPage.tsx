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
  MessageSquare,
  CheckCircle2,
  ChefHat,
  Image as ImageIcon,
  Video as VideoIcon,
  MapPin,
  Brain,
  Lightbulb,
  Bookmark,
  TrendingUp,
  X,
  AlertCircle,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import { BlogBody, BlogCover, BlogError, BlogPagination, blogDate } from '../components/BlogUi';
import { ContentInteractions } from '../components/ContentInteractions';
import { useAuth } from '../hooks/useAuth';
import { videoSource } from '../utils/communityVideo';
import { aiService } from '../services/aiService';
import { blogCategories, BLOG_POST_TEMPLATES, resolvePostAiMode } from '../types/blog';
import type { BlogCategory, BlogPost } from '../types/blog';
import type { BlogInsightAiResponse, GeneratedRecipeAiResponse, PageResponse } from '../types/api';
import type { SmartMarketItem } from '../data/smartMarketData';
import '../styles/blog.css';

function getBlogAiAccessError(isAuthenticated: boolean, role: string | undefined, mode: 'RECIPE_STEPS' | 'KNOWLEDGE_INSIGHT'): string | null {
  if (!isAuthenticated) {
    return mode === 'RECIPE_STEPS'
      ? 'Vui lòng đăng nhập tài khoản thành viên để AI bóc tách công thức từ bài đăng.'
      : 'Vui lòng đăng nhập tài khoản thành viên để Google Gemini AI phân tích bài đăng theo hồ sơ sức khỏe của bạn.';
  }
  if (role === 'admin' && mode === 'KNOWLEDGE_INSIGHT') {
    return 'Tài khoản Quản trị viên không sử dụng trợ lý AI cá nhân. Vui lòng dùng tài khoản Thành viên để trải nghiệm.';
  }
  return null;
}

function BlogAiErrorBanner({ message, isAuthenticated }: { message: string; isAuthenticated: boolean }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold"
    >
      <span className="flex items-start gap-2">
        <AlertCircle size={15} className="shrink-0 mt-0.5" />
        <span>{message}</span>
      </span>
      {!isAuthenticated && (
        <Link
          to="/login"
          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold transition shrink-0"
        >
          Đăng nhập ngay
        </Link>
      )}
    </div>
  );
}

function BlogKnowledgeInsightCard({
  knowledge,
  postTitle,
  compact = false,
  onReanalyze,
  reanalyzing = false,
}: {
  knowledge: BlogInsightAiResponse;
  postTitle: string;
  compact?: boolean;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-4 text-xs' : 'p-5 rounded-2xl border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900 space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Kết quả AI phân tích Kiến thức &amp; Giá trị bài đăng
            </span>
            {knowledge.model && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                Gemini · {knowledge.model}
              </span>
            )}
          </div>
          <h3 className={compact ? 'text-sm font-black text-slate-900 dark:text-white mt-1' : 'text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5'}>
            {knowledge.headline}
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs font-bold">
          {knowledge.categoryBadge}
        </span>
      </div>

      <div className={compact ? 'space-y-3' : 'grid md:grid-cols-2 gap-4 text-xs'}>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-500" />
            <span>Luận điểm cốt lõi AI tổng hợp:</span>
          </h4>
          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
            {knowledge.keyTakeaways.map((item, idx) => (
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
            <span>Phân tích &amp; Gợi ý thực hành trên VEGEAI:</span>
          </h4>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {knowledge.scientificOrLifestyleInsight}
          </p>
          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300 font-semibold pt-1">
            {knowledge.actionableSteps.map((step, idx) => (
              <li key={idx}>• {step}</li>
            ))}
          </ul>
        </div>
      </div>

      {knowledge.personalizedNote && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-900 dark:text-emerald-200">
          <span className="font-extrabold">🎯 Cá nhân hóa theo hồ sơ của bạn: </span>
          <span>{knowledge.personalizedNote}</span>
        </div>
      )}

      {knowledge.nutritionSafetyDisclaimer && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
          {knowledge.nutritionSafetyDisclaimer}
        </p>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
        {onReanalyze && (
          <button
            type="button"
            onClick={onReanalyze}
            disabled={reanalyzing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <Sparkles size={13} />
            <span>{reanalyzing ? 'Đang phân tích...' : 'Phân tích lại với AI'}</span>
          </button>
        )}
        <Link
          to="/ai-chef"
          state={{
            source: 'blog-knowledge',
            title: `Tư vấn: ${postTitle}`,
            initialPrompt: knowledge.suggestedFollowUpPrompt,
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-xs"
        >
          <ChefHat size={14} />
          <span>Chuyển sang Chatbot AI Bếp Trưởng để tư vấn &amp; hỗ trợ tiếp</span>
        </Link>
      </div>
    </div>
  );
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


function ModerationInfoBadge({ label }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer shadow-2xs"
        title="Quy trình kiểm duyệt bài đăng 2 lớp (AI-First & Admin Verified)"
        aria-label="Thông tin quy trình kiểm duyệt bài đăng"
      >
        <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-serif font-black italic">
          i
        </span>
        {label ? <span className="text-[11px] font-semibold">{label}</span> : <span className="text-[11px] font-semibold">Quy trình duyệt</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2.5 w-72 sm:w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 shadow-2xl z-50 text-left text-xs space-y-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-2">
              <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Quy trình kiểm duyệt 2 lớp
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold shrink-0">1.</span>
                <span><strong>AI sơ duyệt tự động:</strong> NLP lọc từ ngữ phản cảm/quảng cáo rác, Computer Vision kiểm duyệt ảnh thịt &amp; vi phạm.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold shrink-0">2.</span>
                <span><strong>Admin duyệt &amp; cấp Tích Xanh:</strong> Ban quản trị thẩm định dinh dưỡng trước khi bài đăng hiển thị công khai.</span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold italic border-t border-slate-100 dark:border-slate-800 pt-1.5">
              ✓ Giúp bài đăng luôn đạt chuẩn an toàn, thuần chay và hữu ích.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function BlogPage() {
  const [activeModalPost, setActiveAiModalPost] = useState<BlogPost | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlogCategory | ''>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<BlogPost> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'trending'>('newest');

  // Bookmarks
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vegeai_saved_posts') || '[]');
    } catch {
      return [];
    }
  });

  const toggleBookmark = (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedPostIds(prev => {
      const next = prev.includes(postId) ? prev.filter(i => i !== postId) : [...prev, postId];
      try {
        localStorage.setItem('vegeai_saved_posts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Video & Q&A count stats for bridge navigation cards
  const [videoCount, setVideoCount] = useState<number>(0);
  const [qaCount, setQaCount] = useState<number>(0);

  // Facebook-style quick composer state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<BlogCategory>('KITCHEN');

  // Per-card inline AI analysis state on the feed
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);
  const [feedRecipeResults, setFeedRecipeResults] = useState<Record<string, GeneratedRecipeAiResponse>>({});
  const [feedKnowledgeResults, setFeedKnowledgeResults] = useState<Record<string, BlogInsightAiResponse>>({});
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

  // Load video & question counts for the bridge navigation cards
  useEffect(() => {
    const controller = new AbortController();
    communityService.videos({ page: 0 }, controller.signal)
      .then(res => { if (!controller.signal.aborted && res?.totalElements !== undefined) setVideoCount(res.totalElements); })
      .catch(() => {});
    communityService.questions({ page: 0 }, controller.signal)
      .then(res => { if (!controller.signal.aborted && res?.totalElements !== undefined) setQaCount(res.totalElements); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleAnalyzePostOnFeed = async (post: BlogPost) => {
    const mode = resolvePostAiMode(post);
    setFeedErrors(prev => ({ ...prev, [post.postId]: '' }));
    const accessError = getBlogAiAccessError(isAuthenticated, user?.role, mode);
    if (accessError) {
      setFeedErrors(prev => ({ ...prev, [post.postId]: accessError }));
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
        const insight = await aiService.analyzeBlogPost(post.postId);
        setFeedKnowledgeResults(prev => ({ ...prev, [post.postId]: insight }));
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
      <div className="blog-shell max-w-[1320px] mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Editorial Blog Header */}
        <header className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-emerald-950 via-emerald-900 to-teal-700 px-6 py-8 text-white shadow-lg sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]"><BookOpen size={14} /> Blog VEGEAI</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Chuyện bếp chay, sống xanh mỗi ngày
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-50/85">
              Khám phá công thức, kiến thức dinh dưỡng và những câu chuyện truyền cảm hứng từ cộng đồng.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user?.role === 'admin' && (
              <Link className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20" to="/admin/blog">
                <ClipboardCheck size={16} /> Duyệt bài đăng
              </Link>
            )}
            {isAuthenticated && (
              <Link className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20" to="/blog/my-posts">
                <FileText size={16} /> Bài đăng của tôi
              </Link>
            )}
            <Link className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-900 shadow-sm transition hover:bg-emerald-50" to={isAuthenticated ? '/blog/write' : '/login'}>
              <Plus size={17} /> {isAuthenticated ? 'Tạo bài đăng mới' : 'Đăng nhập để đăng bài'}
            </Link>
          </div>
          </div>
        </header>

        {/* NAVIGATION BRIDGES TO DEDICATED MODULES (PHƯƠNG ÁN 1) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-rose-950 via-rose-900 to-amber-950 border border-rose-800/40 text-white shadow-xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-rose-200">
                <Play size={11} fill="currentColor" /> Thư viện Video nấu chay
              </span>
              <h3 className="text-base font-extrabold text-white">Học nấu món chay trực quan qua video</h3>
              <p className="text-xs text-rose-100/80 leading-relaxed">
                Trang chuyên biệt các thước phim nấu nướng, bộ lọc danh mục và công cụ AI trích xuất công thức từ video.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between">
              <Link
                to="/videos"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-white/20 hover:bg-white/30 px-3.5 py-2 rounded-xl transition shadow-2xs"
              >
                <span>Mở Thư viện Video riêng biệt</span>
                <ArrowUpRight size={14} />
              </Link>
              <span className="text-[11px] text-rose-200/70 font-semibold">{videoCount || 2} video</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-teal-950 via-teal-900 to-emerald-950 border border-teal-800/40 text-white shadow-xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-teal-200">
                <MessageSquare size={11} /> Hỏi đáp chuyên gia & cộng đồng
              </span>
              <h3 className="text-base font-extrabold text-white">Góc giải đáp dinh dưỡng & ẩm thực</h3>
              <p className="text-xs text-teal-100/80 leading-relaxed">
                Trang chuyên biệt để đặt câu hỏi về dinh dưỡng, kỹ thuật nấu chay và nhận giải đáp từ chuyên gia VEGEAI.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between">
              <Link
                to="/questions"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-white/20 hover:bg-white/30 px-3.5 py-2 rounded-xl transition shadow-2xs"
              >
                <span>Mở góc Hỏi đáp Q&A riêng biệt</span>
                <ArrowUpRight size={14} />
              </Link>
              <span className="text-[11px] text-teal-200/70 font-semibold">{qaCount || 0} câu hỏi</span>
            </div>
          </div>
        </div>

        {/* BÀI ĐĂNG CỘNG ĐỒNG */}
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
            <div className="flex items-center gap-2 shrink-0">
              <ModerationInfoBadge />
              <button
                type="button"
                onClick={() => handleStartComposer(quickCategory)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs cursor-pointer shrink-0"
              >
                Soạn bài đăng
              </button>
            </div>
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

          {/* POSTS SORT CONTROLS & BOOKMARK COUNTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Sắp xếp theo:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortBy('newest')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    sortBy === 'newest' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mới nhất
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rating')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    sortBy === 'rating' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Star size={13} fill="#f59e0b" className="text-amber-500" /> Đánh giá cao nhất
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('trending')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    sortBy === 'trending' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp size={13} /> Thịnh hành
                </button>
              </div>
            </div>
            {savedPostIds.length > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1.5">
                <Bookmark size={13} fill="currentColor" /> Bạn đã lưu {savedPostIds.length} bài viết
              </span>
            )}
          </div>
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

        
        {/* 4x4 RESPONSIVE GRID LAYOUT FOR COMMUNITY BLOG POSTS */}
        {!error && data && data.items.length > 0 && (
          <>
            <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 ' + (busy ? 'opacity-60' : '')}>
              {[...data.items]
                .sort((a, b) => {
                  if (sortBy === 'rating') {
                    return (b.ratingAverage || 5) - (a.ratingAverage || 5);
                  }
                  if (sortBy === 'trending') {
                    return ((b.ratingCount || 0) * 10 + (b.readingMinutes || 0)) - ((a.ratingCount || 0) * 10 + (a.readingMinutes || 0));
                  }
                  return 0;
                })
                .map((post) => {
                  const hasVideo = !!post.videoUrl;
                  const aiMode = resolvePostAiMode(post);
                  const tpl = BLOG_POST_TEMPLATES[post.category] || BLOG_POST_TEMPLATES.KITCHEN;
                  const isAnalyzingThis = analyzingPostId === post.postId;
                  const hasAnalysis = !!(feedRecipeResults[post.postId] || feedKnowledgeResults[post.postId]);

                  return (
                    <article
                      key={post.postId}
                      className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                    >
                      <div>
                        {/* Post Cover & Floating Badges */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <Link to={'/blog/' + post.postId} className="block w-full h-full">
                            <BlogCover post={{ ...post, postId: post.postId }} />
                          </Link>

                          {/* Category Tag on Top-Left */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-900/85 backdrop-blur-md text-white border border-white/20 shadow-xs">
                              {blogCategories[post.category] || tpl.badgeLabel}
                            </span>
                            {hasVideo && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/90 backdrop-blur-md text-white flex items-center gap-1 shadow-xs">
                                <Play size={10} fill="white" /> Video
                              </span>
                            )}
                          </div>

                          {/* Bookmark Button on Top-Right */}
                          <button
                            type="button"
                            onClick={e => toggleBookmark(post.postId, e)}
                            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border transition cursor-pointer shadow-xs ${
                              savedPostIds.includes(post.postId)
                                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                                : 'bg-white/80 hover:bg-white border-white/40 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300'
                            }`}
                            title={savedPostIds.includes(post.postId) ? 'Bỏ lưu bài viết' : 'Lưu bài viết này'}
                          >
                            <Bookmark size={13} fill={savedPostIds.includes(post.postId) ? 'currentColor' : 'none'} />
                          </button>
                        </div>

                        {/* Author & Rating Row */}
                        <div className="p-4 pb-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0">
                                {(post.authorName || 'V').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs" title={post.authorName}>
                                {post.authorName}
                              </span>
                              {/* Admin Verified Icon */}
                              <span title="Đã qua kiểm duyệt 2 lớp (Admin Verified)" className="text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center">
                                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                              <Star size={11} fill="#f59e0b" className="text-amber-500" />
                              <span>{(post.ratingAverage || 5.0).toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Post Title & Excerpt */}
                          <div className="mt-2.5 space-y-1">
                            <Link to={'/blog/' + post.postId} className="block group/title">
                              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400 transition leading-snug">
                                {post.title}
                              </h2>
                            </Link>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
                            <span>{blogDate(post.publishedAt)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {post.readingMinutes} phút</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAiModalPost(post);
                              if (!feedRecipeResults[post.postId] && !feedKnowledgeResults[post.postId]) {
                                void handleAnalyzePostOnFeed(post);
                              }
                            }}
                            disabled={isAnalyzingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-extrabold transition cursor-pointer shrink-0 disabled:opacity-60"
                            title="Bấm để AI bóc tách công thức hoặc tóm tắt kiến thức"
                          >
                            {aiMode === 'RECIPE_STEPS' ? <ChefHat size={12} /> : <Brain size={12} />}
                            <span>{isAnalyzingThis ? 'AI phân tích...' : hasAnalysis ? '✨ Xem AI tóm tắt' : '✨ AI Phân tích'}</span>
                          </button>

                          <Link
                            to={'/blog/' + post.postId}
                            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                          >
                            <span>Xem bài</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {/* AI ANALYSIS MODAL DIALOG (Keeps 4x4 Grid completely intact) */}
            {activeModalPost && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
                onClick={() => setActiveAiModalPost(null)}
              >
                <div
                  className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 p-6 shadow-2xl space-y-4 my-8"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setActiveAiModalPost(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    <X size={18} />
                  </button>

                  {/* Modal Header */}
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={14} /> AI Copilot — Phân tích bài đăng thông minh
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 pr-8">
                      {activeModalPost.title}
                    </h3>
                  </div>

                  {analyzingPostId === activeModalPost.postId && (
                    <div className="py-12 text-center space-y-2">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 animate-pulse">
                        🤖 AI đang đọc hiểu bài đăng và bóc tách dữ liệu...
                      </p>
                    </div>
                  )}

                  {feedErrors[activeModalPost.postId] && (
                    <BlogAiErrorBanner message={feedErrors[activeModalPost.postId]} isAuthenticated={isAuthenticated} />
                  )}

                  {/* RECIPE ANALYSIS RESULT */}
                  {feedRecipeResults[activeModalPost.postId] && (() => {
                    const recipe = feedRecipeResults[activeModalPost.postId];
                    return (
                      <div className="space-y-4 text-xs">
                        {(recipe.aiFallbackNotice || recipe.source === 'TEMPLATE_FALLBACK') && (
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span>
                              {recipe.aiFallbackNotice || 'Đang hiển thị công thức mẫu dự phòng do Gemini AI chưa cấu hình hoặc tạm gián đoạn.'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">⏱ Thời gian nấu: {recipe.cookTimeMinutes} phút</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">🔥 Ước tính: ~{recipe.estimatedCalories} kcal</span>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-extrabold uppercase text-slate-800 dark:text-slate-200">
                            🥗 Nguyên liệu cần chuẩn bị ({recipe.ingredients.length}):
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                            {recipe.ingredients.map((ing, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span>{ing}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-extrabold uppercase text-slate-800 dark:text-slate-200">
                            👨‍🍳 Hướng dẫn các bước nấu:
                          </h4>
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {recipe.instructions.map((step, idx) => (
                              <div key={idx} className="flex gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                          <Link
                            to="/smart-market"
                            state={{
                              planTitle: recipe.title,
                              recipeSummary: {
                                title: recipe.title,
                                cookingTimeMinutes: recipe.cookTimeMinutes,
                                caloriesEstimate: recipe.estimatedCalories,
                                source: 'blog-recipe',
                              },
                              importedItems: parseMarketItemsFromStrings(recipe.ingredients, recipe.title),
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold transition shadow-2xs"
                          >
                            <MapPin size={14} />
                            <span>Tìm điểm bán nguyên liệu (GPS)</span>
                          </Link>
                          <Link
                            to="/ai-chef"
                            state={{
                              source: 'blog-recipe',
                              title: recipe.title,
                              initialPrompt: `Tôi vừa dùng AI phân tích công thức "${recipe.title}" từ bài đăng blog. Bếp trưởng hãy tư vấn thêm mẹo nấu món này ngon nhất nhé!`
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold transition shadow-2xs"
                          >
                            <ChefHat size={14} />
                            <span>Hỏi tiếp AI Bếp Trưởng</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })()}

                  {/* KNOWLEDGE ANALYSIS RESULT */}
                  {feedKnowledgeResults[activeModalPost.postId] && (
                    <BlogKnowledgeInsightCard
                      knowledge={feedKnowledgeResults[activeModalPost.postId]}
                      postTitle={activeModalPost.title}
                      compact
                      onReanalyze={() => void handleAnalyzePostOnFeed(activeModalPost)}
                      reanalyzing={analyzingPostId === activeModalPost.postId}
                    />
                  )}
                </div>
              </div>
            )}
          </>
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
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Context-Aware AI Copilot state (supports both Recipe Steps & Knowledge Analysis)
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<GeneratedRecipeAiResponse | null>(null);
  const [aiKnowledge, setAiKnowledge] = useState<BlogInsightAiResponse | null>(null);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setPost(null);
    setAiRecipe(null);
    setAiKnowledge(null);

    blogService.publicPost(id, controller.signal)
      .then(postData => {
        if (controller.signal.aborted) return;
        setPost(postData);
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
    const accessError = getBlogAiAccessError(isAuthenticated, user?.role, mode);
    if (accessError) {
      setAiError(accessError);
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
        const insight = await aiService.analyzeBlogPost(post.postId);
        setAiKnowledge(insight);
      }
    } catch (reason) {
      setAiError(errorMessage(reason));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const videoObj = post?.videoUrl ? videoSource(post.videoUrl) : null;
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
                <span className="text-slate-400 font-normal">({post.ratingCount || 0} đánh giá)</span>
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
              <video controls preload="metadata" src={videoObj.src} className="my-6 aspect-video w-full rounded-2xl bg-black object-contain shadow-lg" />
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

                  <Link
                    to="/ai-chef"
                    state={{
                      source: 'blog-post',
                      title: `Tư vấn: ${post.title}`,
                      initialPrompt:
                        aiMode === 'RECIPE_STEPS'
                          ? `Tôi đang xem công thức "${post.title}" (${post.excerpt || ''}). Bếp trưởng hãy hướng dẫn chi tiết các bước nấu món này và gợi ý biến tấu nguyên liệu phù hợp với thể trạng của tôi nhé!`
                          : `Tôi đang đọc bài viết "${post.title}" (${post.excerpt || ''}). Bếp trưởng hãy tư vấn sâu hơn về chủ đề này nhé!`
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition shadow-2xs"
                  >
                    <ChefHat size={15} />
                    <span>Hỏi sâu hơn với AI Chef</span>
                  </Link>
                </div>
              </div>

              {aiError && <BlogAiErrorBanner message={aiError} isAuthenticated={isAuthenticated} />}

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

                  {(aiRecipe.aiFallbackNotice || aiRecipe.source === 'TEMPLATE_FALLBACK') && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        {aiRecipe.aiFallbackNotice || 'Đang hiển thị công thức mẫu dự phòng do Gemini AI chưa cấu hình hoặc tạm gián đoạn.'}
                      </span>
                    </div>
                  )}

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
                <BlogKnowledgeInsightCard
                  knowledge={aiKnowledge}
                  postTitle={post.title}
                />
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

            <ContentInteractions type="BLOG" id={post.postId} />
            {/* Legacy comments UI removed after migration to shared ContentInteractions.
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
            */}

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
