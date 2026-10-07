import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Camera, Bookmark, Flame, Scale, Clock, SlidersHorizontal, Leaf } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { RECIPES } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';

export const RecipeDiscoveryPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activePill, setActivePill] = useState('Tất cả');
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());

  // Filter criteria
  const [selectedCookTimes, setSelectedCookTimes] = useState<string[]>([]);
  const [selectedCalories, setSelectedCalories] = useState<string[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popular');

  const pills = ['Tất cả', 'Giàu Protein', 'Low GI', 'Dưới 20 phút', 'Thuần Chay', 'Món Nước'];

  const filteredRecipes = RECIPES.filter((r) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Pill
    if (activePill !== 'Tất cả') {
      const matchPill =
        r.categoryPills.includes(activePill) ||
        r.badge === activePill ||
        r.secondaryBadge === activePill;
      if (!matchPill) return false;
    }

    // Cook times
    if (selectedCookTimes.length > 0) {
      const match = selectedCookTimes.some((t) => {
        if (t === 'under15') return r.cookTime <= 15;
        if (t === '15to30') return r.cookTime > 15 && r.cookTime <= 30;
        if (t === 'over30') return r.cookTime > 30;
        return true;
      });
      if (!match) return false;
    }

    // Calories
    if (selectedCalories.length > 0) {
      const match = selectedCalories.some((c) => {
        if (c === 'under300') return r.calories < 300;
        if (c === '300to500') return r.calories >= 300 && r.calories <= 500;
        if (c === 'over500') return r.calories > 500;
        return true;
      });
      if (!match) return false;
    }

    // Meal types
    if (selectedMeals.length > 0 && !selectedMeals.includes(r.mealType)) {
      return false;
    }

    // Ingredients
    if (selectedIngredients.length > 0) {
      const match = selectedIngredients.some((ing) => r.mainIngredients.includes(ing));
      if (!match) return false;
    }

    return true;
  });

  const toggleArrayItem = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActivePill('Tất cả');
    setSelectedCookTimes([]);
    setSelectedCalories([]);
    setSelectedMeals([]);
    setSelectedIngredients([]);
    setSortBy('popular');
  };

  const handleBookmark = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const next = new Set(savedRecipes);
    if (next.has(recipeId)) next.delete(recipeId);
    else next.add(recipeId);
    setSavedRecipes(next);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search & AI Scan Box */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs mb-8">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm món chay, nguyên liệu, công thức..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login');
                } else {
                  alert('Tính năng AI Quét Tủ Lạnh: Đang mở máy ảnh nhận diện nguyên liệu...');
                }
              }}
              className="w-full md:w-auto px-6 py-3.5 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>AI Quét Tủ Lạnh</span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2.5 mt-5 overflow-x-auto pb-1 text-sm no-scrollbar">
            {pills.map((pill) => {
              const isActive = activePill === pill;
              return (
                <button
                  key={pill}
                  onClick={() => setActivePill(pill)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full border transition cursor-pointer font-medium ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar & Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-base">
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                <span>Bộ Lọc</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-emerald-600 transition cursor-pointer"
              >
                Đặt lại
              </button>
            </div>

            {/* Thời gian nấu */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Thời gian nấu</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {[
                  { id: 'under15', label: 'Dưới 15 phút' },
                  { id: '15to30', label: '15 - 30 phút' },
                  { id: 'over30', label: 'Trên 30 phút' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCookTimes.includes(item.id)}
                      onChange={() => toggleArrayItem(selectedCookTimes, setSelectedCookTimes, item.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mức Calo */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Mức Calo</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {[
                  { id: 'under300', label: 'Dưới 300 kcal' },
                  { id: '300to500', label: '300 - 500 kcal' },
                  { id: 'over500', label: 'Trên 500 kcal' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCalories.includes(item.id)}
                      onChange={() => toggleArrayItem(selectedCalories, setSelectedCalories, item.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Loại bữa ăn */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Loại bữa ăn</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt / Tráng Miệng'].map((meal) => (
                  <label key={meal} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedMeals.includes(meal)}
                      onChange={() => toggleArrayItem(selectedMeals, setSelectedMeals, meal)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{meal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nguyên liệu chính */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Nguyên liệu chính</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {['Đậu hũ & Tàu hũ ky', 'Nấm các loại', 'Rau củ quả tươi', 'Các loại hạt & Đậu gà'].map((ing) => (
                  <label key={ing} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(ing)}
                      onChange={() => toggleArrayItem(selectedIngredients, setSelectedIngredients, ing)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{ing}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Grid */}
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="text-sm text-gray-600">
                Hiển thị <span className="font-bold text-gray-900">{filteredRecipes.length}</span> công thức thuần chay
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="calories_asc">Calo thấp nhất</option>
                  <option value="time_asc">Thời gian nấu nhanh</option>
                </select>
              </div>
            </div>

            {filteredRecipes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Không tìm thấy công thức phù hợp</h3>
                <p className="text-sm text-gray-500 mb-4">Hãy thử tìm từ khóa khác hoặc bỏ chọn một số bộ lọc.</p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[16/11] overflow-hidden bg-gray-100">
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white shadow-2xs">
                          {recipe.badge}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleBookmark(recipe.id, e)}
                        className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm transition cursor-pointer ${
                          savedRecipes.has(recipe.id) ? 'text-emerald-600 fill-emerald-600' : ''
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base hover:text-emerald-600 transition line-clamp-1 mb-1.5">
                          {recipe.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                          {recipe.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span>{recipe.calories} kcal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Scale className="w-4 h-4 text-emerald-600" />
                          <span>{recipe.protein}g Protein</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{recipe.cookTime} phút</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-12 mb-6">
              <button className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">‹</button>
              <button className="w-10 h-10 rounded-lg bg-emerald-600 text-white font-medium flex items-center justify-center shadow-2xs">1</button>
              <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium flex items-center justify-center">2</button>
              <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium flex items-center justify-center">3</button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium flex items-center justify-center">8</button>
              <button className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">›</button>
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
};
