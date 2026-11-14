import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Camera,
  Clock,
  RefreshCw,
  X,
  Leaf,
  ArrowUpRight,
  Soup,
  Zap,
  Play,
  MessageCircle,
  BookOpen,
  Sparkles,
  Utensils,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import '../styles/discovery.css';
import { recipeService } from '../services/recipeService';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { PageResponse } from '../types/api';
import type { RecipeSummary, RecipeTag } from '../types/recipe';
import type { BlogPost } from '../types/blog';
import type { CommunityVideo, Question } from '../types/community';

export type ExploreCategoryType = 'ALL' | 'RECIPES' | 'BLOGS' | 'VIDEOS' | 'QA';

interface UnifiedCard {
  id: string;
  type: 'RECIPE' | 'BLOG' | 'VIDEO' | 'QA';
  title: string;
  desc: string;
  imageUrl: string;
  author: string;
  rating: number;
  badgeLabel: string;
  badgeColor: string;
  badgeIcon: React.ReactNode;
  linkUrl: string;
  meta: string;
  actionLabel: string;
  isVerified?: boolean;
}

export function RecipeDiscoveryPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ExploreCategoryType>('ALL');
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState<Record<string, RecipeTag[]>>({});
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [mode, setMode] = useState<'AND' | 'OR'>('AND');
  const [time, setTime] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState('newest:desc');
  const [page, setPage] = useState(0);

  // Data states for 4 distinct content types
  const [recipesData, setRecipesData] = useState<PageResponse<RecipeSummary> | null>(null);
  const [blogsData, setBlogsData] = useState<PageResponse<BlogPost> | null>(null);
  const [videosData, setVideosData] = useState<PageResponse<CommunityVideo> | null>(null);
  const [qaData, setQaData] = useState<PageResponse<Question> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    recipeService
      .tags(controller.signal)
      .then(setTags)
      .catch(() => {});
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const timer = setTimeout(async () => {
      const [sortBy, sortDirection] = sort.split(':');
      try {
        const promises: Promise<any>[] = [];

        // 1. Recipes
        if (contentType === 'ALL' || contentType === 'RECIPES') {
          promises.push(
            recipeService.filter(
              {
                keyword: keyword.trim() || undefined,
                includeTagCodes: included,
                excludeTagCodes: excluded,
                inclusionMode: mode,
                maxCookTime: time ? Number(time) : undefined,
                maxCalories: calories ? Number(calories) : undefined,
                minProtein: protein ? Number(protein) : undefined,
                difficulty: difficulty || undefined,
                sortBy,
                sortDirection,
                page,
                size: contentType === 'ALL' ? 8 : 12,
              },
              controller.signal
            ).then(res => { if (!controller.signal.aborted) setRecipesData(res); })
          );
        } else {
          setRecipesData(null);
        }

        // 2. Blogs
        if (contentType === 'ALL' || contentType === 'BLOGS') {
          promises.push(
            blogService.published(
              { keyword: keyword.trim(), page },
              controller.signal
            ).then(res => { if (!controller.signal.aborted) setBlogsData(res); })
          );
        } else {
          setBlogsData(null);
        }

        // 3. Videos
        if (contentType === 'ALL' || contentType === 'VIDEOS') {
          promises.push(
            communityService.videos(
              { keyword: keyword.trim(), page },
              controller.signal
            ).then(res => { if (!controller.signal.aborted) setVideosData(res); })
          );
        } else {
          setVideosData(null);
        }

        // 4. Q&A Questions (account-only endpoint)
        if (isAuthenticated && (contentType === 'ALL' || contentType === 'QA')) {
          promises.push(
            communityService.questions(
              { keyword: keyword.trim(), page },
              controller.signal
            ).then(res => { if (!controller.signal.aborted) setQaData(res); })
          );
        } else {
          setQaData(null);
        }

        await Promise.all(promises);
      } catch (reason) {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, contentType, keyword, included, excluded, mode, time, calories, protein, difficulty, sort, page, reload]);

  const toggle = (code: string, exclusion: boolean) => {
    const setter = exclusion ? setExcluded : setIncluded;
    setter((previous) =>
      previous.includes(code) ? previous.filter((value) => value !== code) : [...previous, code]
    );
    setPage(0);
  };

  const reset = () => {
    setKeyword('');
    setContentType('ALL');
    setIncluded([]);
    setExcluded([]);
    setMode('AND');
    setTime('');
    setCalories('');
    setProtein('');
    setDifficulty('');
    setSort('newest:desc');
    setPage(0);
  };

  const availableTags = Object.values(tags).flat();

  const dietaryQuickFilters = [
    { name: 'Tất cả trường phái', code: '', icon: <Leaf size={15} /> },
    { name: 'Thuần chay (Vegan)', code: 'VEGAN', icon: <Leaf size={15} /> },
    { name: 'Chay có sữa (Lacto)', code: 'LACTO', icon: <Sparkles size={15} /> },
    { name: 'Chay có trứng (Ovo)', code: 'OVO', icon: <Utensils size={15} /> },
    { name: 'Giàu đạm thực vật', code: 'HIGH_PROTEIN', icon: <Zap size={15} /> },
    { name: 'Nấu nhanh (< 20p)', code: 'QUICK_15', icon: <Clock size={15} /> },
    { name: 'Món canh thanh đạm', code: 'SOUP', icon: <Soup size={15} /> },
  ].filter((item) => !item.code || availableTags.some((tag) => tag.code === item.code));

  // Build unified cards
  const unifiedCards: UnifiedCard[] = [];

  // Add Recipes
  if (recipesData?.items) {
    recipesData.items.forEach(r => {
      unifiedCards.push({
        id: 'recipe-' + r.recipeId,
        type: 'RECIPE',
        title: r.title,
        desc: 'Công thức chay chuẩn hóa định lượng gram và calo chi tiết.',
        imageUrl: r.imageUrl || '/images/vietnamese-vegan-table.png',
        author: 'Đầu bếp VEGEAI',
        rating: 5.0,
        badgeLabel: 'Công thức nấu ăn',
        badgeColor: 'bg-emerald-700/90',
        badgeIcon: <Utensils size={11} />,
        linkUrl: '/recipe/' + r.recipeId,
        meta: `⏱ ${r.cookTimeMinutes || 25} phút • 🔥 ${r.calories || 280} kcal`,
        actionLabel: 'Xem công thức',
        isVerified: r.isVerified ?? true,
      });
    });
  }

  // Add Blogs
  if (blogsData?.items) {
    blogsData.items.forEach(b => {
      unifiedCards.push({
        id: 'blog-' + b.postId,
        type: 'BLOG',
        title: b.title,
        desc: b.excerpt || b.content?.slice(0, 100) || 'Bài viết kiến thức dinh dưỡng và phong cách sống xanh.',
        imageUrl: b.coverImage || '/images/fresh-vegetables.png',
        author: b.authorName || 'Cộng đồng VEGEAI',
        rating: b.ratingAverage || 5.0,
        badgeLabel: 'Blog dinh dưỡng',
        badgeColor: 'bg-teal-700/90',
        badgeIcon: <BookOpen size={11} />,
        linkUrl: '/blog/' + b.postId,
        meta: `⏱ ${b.readingMinutes} phút đọc • Đã kiểm duyệt`,
        actionLabel: 'Đọc blog',
        isVerified: true,
      });
    });
  }

  // Add Videos
  if (videosData?.items) {
    videosData.items.forEach(v => {
      unifiedCards.push({
        id: 'video-' + v.id,
        type: 'VIDEO',
        title: v.title,
        desc: v.description || 'Thước phim nấu món chay trực quan và bóc tách nguyên liệu tự động.',
        imageUrl: v.thumbnailUrl || '/images/tofu-tomato.png',
        author: v.createdBy || 'Bếp chay VEGEAI',
        rating: 4.9,
        badgeLabel: 'Video nấu chay',
        badgeColor: 'bg-rose-600/90',
        badgeIcon: <Play size={11} fill="white" />,
        linkUrl: '/videos/' + v.id,
        meta: `▶ ${v.durationSeconds ? Math.round(v.durationSeconds / 60) + ' phút' : 'Video ngắn'} • AI bóc tách`,
        actionLabel: 'Xem video',
        isVerified: true,
      });
    });
  }

  // Add Q&A
  if (qaData?.items) {
    qaData.items.forEach(q => {
      unifiedCards.push({
        id: 'qa-' + q.id,
        type: 'QA',
        title: q.content.slice(0, 70),
        desc: q.answer ? `Bác sĩ / Chuyên gia: "${q.answer.slice(0, 100)}..."` : 'Câu hỏi đang chờ chuyên gia và cộng đồng giải đáp...',
        imageUrl: '/images/vegan-tofu-meal.png',
        author: q.authorName || 'Thành viên VEGEAI',
        rating: 5.0,
        badgeLabel: 'Hỏi đáp Q&A',
        badgeColor: 'bg-indigo-600/90',
        badgeIcon: <MessageCircle size={11} />,
        linkUrl: '/questions',
        meta: q.answer ? '✓ Đã có giải đáp chuyên gia' : 'Chờ phản hồi từ chuyên gia',
        actionLabel: 'Xem thảo luận',
        isVerified: !!q.answer,
      });
    });
  }

  // Sorting unified cards
  const sortedCards = [...unifiedCards].sort((a, b) => {
    if (sort.startsWith('rating')) return b.rating - a.rating;
    return 0; // default order preserved
  });

  const totalItemsCount = (recipesData?.totalElements || 0) + (blogsData?.totalElements || 0) + (videosData?.totalElements || 0) + (qaData?.totalElements || 0);

  return (
    <MainLayout>
      <div className="discovery-page max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* HERO BANNER */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-850 px-6 py-8 sm:px-10 sm:py-10 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-200">
                <Sparkles size={14} /> KHÁM PHÁ &amp; CỘNG ĐỒNG TOÀN DIỆN
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Cảm hứng món chay, kiến thức &amp; kết nối
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-emerald-50/85 max-w-xl">
                Hợp nhất 4 loại hình nội dung: Công thức nấu ăn, Blog dinh dưỡng, Video hướng dẫn và Diễn đàn Hỏi đáp Q&amp;A.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to="/blog/write" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-emerald-900 shadow-sm transition hover:bg-emerald-50">
                <Sparkles size={16} /> Chia sẻ bài viết mới
              </Link>
              {isAuthenticated && (
                <Link to="/fridge-scan" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">
                  <Camera size={16} /> Quét tủ lạnh
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* 4 DISTINCT CONTENT TYPE TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Tất cả khám phá', icon: <Sparkles size={15} />, count: totalItemsCount },
              { id: 'RECIPES', label: 'Công thức nấu ăn', icon: <Utensils size={15} />, count: recipesData?.totalElements },
              { id: 'BLOGS', label: 'Blog dinh dưỡng', icon: <BookOpen size={15} />, count: blogsData?.totalElements },
              { id: 'VIDEOS', label: 'Video nấu chay', icon: <Play size={15} />, count: videosData?.totalElements },
              { id: 'QA', label: 'Hỏi đáp Q&A', icon: <MessageCircle size={15} />, count: qaData?.totalElements },
            ].map(tab => {
              const active = contentType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'QA' && !isAuthenticated) {
                      navigate('/login', { state: { from: '/questions' } });
                      return;
                    }
                    setContentType(tab.id as ExploreCategoryType);
                    setPage(0);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    active
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-white/70 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 hidden sm:block">
            Hiển thị dạng lưới ô vuông với logo thể loại trực quan
          </div>
        </div>

        {/* INTEGRATED SEARCH & FILTER CONTROLS */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={e => {
                  setKeyword(e.target.value);
                  setPage(0);
                }}
                placeholder="Tìm công thức, bài blog, video nấu nướng hoặc thắc mắc dinh dưỡng..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => { setKeyword(''); setPage(0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-400">Sắp xếp:</span>
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(0); }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-none"
              >
                <option value="newest:desc">Mới nhất</option>
                <option value="rating:desc">Đánh giá cao nhất</option>
                <option value="cookTime:asc">Nấu nhanh nhất</option>
                <option value="calories:asc">Calo thấp nhất</option>
              </select>
            </div>
          </div>

          {/* Food-to-Vegan-Shop Bridge */}
          {keyword.trim().length >= 2 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
              <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                Muốn thưởng thức ngoài hàng hoặc mua nguyên liệu cho <strong>&ldquo;{keyword.trim()}&rdquo;</strong>?
              </span>
              <Link
                to={`/smart-market?food=${encodeURIComponent(keyword.trim())}#store-list`}
                className="inline-flex items-center gap-1 font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
              >
                Gợi ý quán chay &amp; điểm bán <ArrowUpRight size={13} />
              </Link>
            </div>
          )}

          {/* Dietary Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Leaf size={12} /> Trường phái:
            </span>
            {dietaryQuickFilters.map(item => {
              const active = (!item.code && !included.length) || included.includes(item.code);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    if (!item.code) setIncluded([]);
                    else toggle(item.code, false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4x4 RESPONSIVE UNIFIED GRID */}
        {loading && !sortedCards.length && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-center text-rose-800 dark:text-rose-300 space-y-2">
            <RefreshCw size={24} className="mx-auto" />
            <p className="font-bold text-sm">{error}</p>
            <button onClick={() => setReload(v => v + 1)} className="text-xs underline font-bold">Thử lại</button>
          </div>
        )}

        {!loading && !error && sortedCards.length === 0 && (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Soup size={36} className="mx-auto text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Không tìm thấy nội dung phù hợp</h3>
            <p className="text-xs">Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc thể loại khác.</p>
            <button onClick={reset} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Đặt lại bộ lọc</button>
          </div>
        )}

        {!error && sortedCards.length > 0 && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 ${loading ? 'opacity-60' : ''}`}>
            {sortedCards.map((card) => (
              <article
                key={card.id}
                className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Media & Floating Logo Badge */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <Link to={card.linkUrl} className="block w-full h-full">
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </Link>

                    {/* Logo/Badge Thể loại bài đăng */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md flex items-center gap-1 shadow-xs ${card.badgeColor}`}>
                        {card.badgeIcon}
                        <span>{card.badgeLabel}</span>
                      </span>
                    </div>

                    {/* Rating Top-Right */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                      <Star size={11} fill="#f59e0b" className="text-amber-500" />
                      <span>{card.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0">
                          {card.author.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs" title={card.author}>
                          {card.author}
                        </span>
                        {card.isVerified && (
                          <span title="Admin Verified" className="text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center">
                            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <Link to={card.linkUrl} className="block group/title">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400 transition leading-snug">
                          {card.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 font-medium">
                      <span>{card.meta}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {card.type === 'RECIPE' ? 'Công thức nấu' : card.type === 'BLOG' ? 'Bài chia sẻ' : card.type === 'VIDEO' ? 'Clip trực quan' : 'Cộng đồng hỏi'}
                  </span>
                  <Link
                    to={card.linkUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 text-[11px] font-extrabold transition cursor-pointer"
                  >
                    <span>{card.actionLabel}</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* BOTTOM NAVIGATION BRIDGES TO SPECIALIZED MODULES */}
        <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              CHUYỆN TỪ CĂN BẾP &amp; ĐIỀU HƯỚNG CHUYÊN SÂU
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Khám phá sâu theo từng không gian
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/recipes" className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 hover:shadow-md transition space-y-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs"><Utensils size={15} /></span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Kho Công Thức Chuẩn Hóa</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Định lượng gram, calo chi tiết và hướng dẫn nấu từng bước có bấm giờ.</p>
            </Link>

            <Link to="/blog" className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 hover:shadow-md transition space-y-2">
              <span className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xs"><BookOpen size={15} /></span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Blog Dinh Dưỡng Cộng Đồng</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kiến thức khoa học, mẹo sống xanh và câu chuyện từ các thành viên.</p>
            </Link>

            <Link to="/videos" className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 hover:shadow-md transition space-y-2">
              <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs"><Play size={15} fill="white" /></span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Thư Viện Video Nấu Chay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Học nấu trực quan qua video và nhờ AI tự động trích xuất công thức.</p>
            </Link>

            {isAuthenticated && user?.role !== 'admin' ? (
              <Link to="/questions" className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 hover:shadow-md transition space-y-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs"><MessageCircle size={15} /></span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Góc Hỏi Đáp Chuyên Gia</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Đặt câu hỏi dinh dưỡng, ẩm thực chay và nhận tư vấn chuyên môn.</p>
              </Link>
            ) : (
              <Link to="/smart-market" className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 hover:shadow-md transition space-y-2">
                <span className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs"><Sparkles size={15} /></span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Quán Chay &amp; Điểm Bán (GPS)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tìm nhà hàng thuần chay và cửa hàng nguyên liệu quanh khu vực của bạn.</p>
              </Link>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
