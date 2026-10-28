import React, { useEffect, useState } from 'react';
import { Leaf, Sparkles, RefreshCw, Flame, Info, ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mealPlanService } from '../services/mealPlanService';
import type { SeasonalRegionalResponse } from '../types/mealPlan';
import { sfx } from '../utils/soundEffects';

const SEASONS: { id: 'XUAN' | 'HA' | 'THU' | 'DONG'; label: string; icon: string }[] = [
  { id: 'XUAN', label: 'Mùa Xuân', icon: '🌸' },
  { id: 'HA', label: 'Mùa Hạ (Hè)', icon: '☀️' },
  { id: 'THU', label: 'Mùa Thu', icon: '🍂' },
  { id: 'DONG', label: 'Mùa Đông', icon: '❄️' },
];

const REGIONS: { id: 'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM' | 'MIEN_TAY'; label: string; tag: string }[] = [
  { id: 'MIEN_BAC', label: 'Miền Bắc', tag: 'Thanh tao · Giữ ấm' },
  { id: 'MIEN_TRUNG', label: 'Miền Trung', tag: 'Đậm đà · Nồng ấm' },
  { id: 'MIEN_NAM', label: 'Miền Nam', tag: 'Thanh mát · Tươi ngọt' },
  { id: 'MIEN_TAY', label: 'Miền Tây', tag: 'Mùa nước nổi · Hoa đồng' },
];

export const SeasonalRegionalMealsView: React.FC = () => {
  const [season, setSeason] = useState<'XUAN' | 'HA' | 'THU' | 'DONG'>('THU');
  const [region, setRegion] = useState<'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM' | 'MIEN_TAY'>('MIEN_NAM');
  const [data, setData] = useState<SeasonalRegionalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await mealPlanService.getSeasonalRegional(season, region);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải đề xuất mùa vụ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [season, region]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Gợi ý tham khảo · Thực đơn chay theo Mùa & Vùng Miền
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Thực Đơn Thuần Thực Vật Theo Thời Khí
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gợi ý cân bằng dưỡng chất dựa trên khí hậu bản địa và nông sản tươi rộ theo từng mùa (Dành cho mục đích tham khảo dinh dưỡng).
          </p>
        </div>

        <button
          type="button"
          onClick={() => { sfx.playTap(); fetchRecommendations(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới gợi ý</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Season Selector */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mùa trong năm</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SEASONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { sfx.playTap(); setSeason(s.id); }}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  season === s.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Region Selector */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Vùng miền ẩm thực</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {REGIONS.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { sfx.playTap(); setRegion(r.id); }}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                  region === r.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <span>{r.label}</span>
                <span className={`text-[9px] font-normal opacity-80 ${region === r.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {r.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data && (
        <p className="p-8 text-center text-xs text-slate-500">Đang tổng hợp đề xuất thời khí và nông sản mùa vụ...</p>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Climate & Highlighted Produce Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <span>{data.seasonNameVi} · {data.regionNameVi}</span>
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Đặc điểm khí hậu:</strong> {data.climateSummary}
            </p>

            {/* Produce Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Nông sản rộ vụ:
              </span>
              {data.highlightedProduce.map(p => (
                <span
                  key={p}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                >
                  ✓ {p}
                </span>
              ))}
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{data.nutritionAdvice}</span>
            </div>
          </div>

          {/* 4 Curated Seasonal Dishes Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.suggestions.map((dish, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-emerald-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                      {dish.mealType}
                    </span>
                    <span className="font-extrabold text-amber-500 flex items-center gap-0.5 text-xs">
                      <Flame className="w-3.5 h-3.5" />
                      {dish.estimatedCalories} kcal
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {dish.dishName}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    <strong className="text-slate-700 dark:text-slate-300">Nguyên liệu:</strong> {dish.seasonalIngredients}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 text-[11px]">
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold line-clamp-2">
                    💡 {dish.healthBenefits}
                  </p>
                  <p className="text-slate-400 text-[10px] line-clamp-2 italic">
                    Bếp mách: {dish.cookingTip}
                  </p>

                  <div className="pt-1">
                    {dish.matchedRecipeId ? (
                      <Link
                        to={`/recipes/${dish.matchedRecipeId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink size={12} />
                        <span>Xem công thức có sẵn</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/explore?search=${encodeURIComponent(dish.dishName.split('&')[0].trim())}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        <Search size={12} />
                        <span>Tìm công thức liên quan</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Safety & Nutritional Reference Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <p>
              {data.disclaimer || 'Gợi ý mang tính chất tham khảo dinh dưỡng theo mùa vụ, không thay thế tư vấn y khoa chuyên nghiệp.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
