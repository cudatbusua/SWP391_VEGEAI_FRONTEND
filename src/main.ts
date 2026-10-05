import './style.css';
import { RECIPES, BLOG_POSTS, AI_PRESET_ANSWERS } from './data/mockData';
import type { Recipe, FilterState, ChatMessage } from './types';
import { icons } from './icons';

// Application State
class AppState {
  currentTab: 'discover' | 'detail' | 'blog' | 'restaurants' = 'discover';
  selectedRecipeId: string = 'dau-hu-sot-ca-chua';
  isAuthModalOpen: boolean = false;
  authModalReason: string = 'Mở khóa toàn bộ hướng dẫn nấu ăn từng bước, quét tủ lạnh thông minh, lưu công thức yêu thích và nhận thực đơn cá nhân hóa.';
  
  // Role: unauthorized (guest) or authorized (logged-in member)
  userRole: 'guest' | 'authorized' = 'guest';

  // Filters
  filters: FilterState = {
    searchQuery: '',
    categoryPill: 'Tất cả',
    cookTimes: [],
    calorieRanges: [],
    mealTypes: [],
    mainIngredients: [],
    sortBy: 'popular'
  };

  savedRecipes: Set<string> = new Set();

  // AI Chatbot State for Guest
  isChatOpen: boolean = false;
  guestQueriesUsed: number = 0;
  maxGuestQueries: number = 3;
  chatMessages: ChatMessage[] = [
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Xin chào bạn! Tôi là **Trợ lý Dinh Dưỡng VEGEAI**. Với tư cách khách dùng thử, bạn có thể hỏi tôi tối đa 3 câu về dinh dưỡng chay, thay thế nguyên liệu hoặc phân tích calo.',
      timestamp: 'Vừa xong'
    }
  ];

  currentPage: number = 1;
}

const state = new AppState();

// Utility to render markdown-like text simply
function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// Get filtered recipes
function getFilteredRecipes(): Recipe[] {
  let list = [...RECIPES];

  // Search query
  if (state.filters.searchQuery.trim()) {
    const q = state.filters.searchQuery.toLowerCase();
    list = list.filter(r => 
      r.title.toLowerCase().includes(q) || 
      r.description.toLowerCase().includes(q) ||
      r.ingredients.some(ing => ing.name.toLowerCase().includes(q))
    );
  }

  // Category pill
  if (state.filters.categoryPill !== 'Tất cả') {
    list = list.filter(r => 
      r.categoryPills.includes(state.filters.categoryPill) || 
      r.badge === state.filters.categoryPill ||
      r.secondaryBadge === state.filters.categoryPill
    );
  }

  // Cook times
  if (state.filters.cookTimes.length > 0) {
    list = list.filter(r => {
      return state.filters.cookTimes.some(t => {
        if (t === 'under15') return r.cookTime <= 15;
        if (t === '15to30') return r.cookTime > 15 && r.cookTime <= 30;
        if (t === 'over30') return r.cookTime > 30;
        return true;
      });
    });
  }

  // Calorie ranges
  if (state.filters.calorieRanges.length > 0) {
    list = list.filter(r => {
      return state.filters.calorieRanges.some(c => {
        if (c === 'under300') return r.calories < 300;
        if (c === '300to500') return r.calories >= 300 && r.calories <= 500;
        if (c === 'over500') return r.calories > 500;
        return true;
      });
    });
  }

  // Meal types
  if (state.filters.mealTypes.length > 0) {
    list = list.filter(r => state.filters.mealTypes.includes(r.mealType));
  }

  // Main ingredients
  if (state.filters.mainIngredients.length > 0) {
    list = list.filter(r => 
      state.filters.mainIngredients.some(ing => r.mainIngredients.includes(ing))
    );
  }

  // Sorting
  if (state.filters.sortBy === 'calories_asc') {
    list.sort((a, b) => a.calories - b.calories);
  } else if (state.filters.sortBy === 'time_asc') {
    list.sort((a, b) => a.cookTime - b.cookTime);
  } else if (state.filters.sortBy === 'rating_desc') {
    list.sort((a, b) => b.rating - a.rating);
  }

  return list;
}

// Render Main App
function renderApp() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <!-- Top Role Demonstration Banner -->
    <div class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-2 h-2 rounded-full ${state.userRole === 'guest' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}"></span>
        <span class="font-medium">Chế độ kiểm thử:</span>
        <span class="px-2 py-0.5 rounded-full font-semibold ${state.userRole === 'guest' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
          ${state.userRole === 'guest' ? 'Unauthorized User (Khách vãng lai)' : 'Authorized User (Thành viên đã đăng nhập)'}
        </span>
        <span class="hidden md:inline text-amber-700">| Quyền hạn khách: Tìm kiếm & xem blog/video, xem thông tin món cơ bản, 3 lượt dùng thử AI Chatbot.</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="toggle-role-btn" class="px-2.5 py-1 text-xs rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium transition cursor-pointer shadow-xs">
          ${state.userRole === 'guest' ? 'Đổi sang Authorized User (Thử nghiệm)' : 'Đổi về Guest (Unauthorized User)'}
        </button>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        <!-- Logo -->
        <div class="flex items-center gap-8">
          <a href="#" id="nav-brand" class="flex items-center gap-2 text-slate-800 font-bold text-xl tracking-tight">
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              ${icons.leaf}
            </div>
            <span>VEGEAI</span>
          </a>

          <!-- Nav Items -->
          <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button id="nav-home" class="hover:text-emerald-600 transition cursor-pointer ${state.currentTab === 'discover' ? 'text-gray-900 font-semibold' : ''}">Trang Chủ</button>
            <button id="nav-discover" class="hover:text-emerald-600 transition cursor-pointer ${state.currentTab === 'discover' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Khám Phá Công Thức</button>
            <button id="nav-blog" class="hover:text-emerald-600 transition cursor-pointer ${state.currentTab === 'blog' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Blog</button>
            <button id="nav-restaurants" class="hover:text-emerald-600 transition cursor-pointer ${state.currentTab === 'restaurants' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Quán Chay Gần Đây</button>
          </nav>
        </div>

        <!-- Auth Actions -->
        <div class="flex items-center gap-3">
          ${state.userRole === 'guest' ? `
            <button id="header-login-btn" class="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer">
              Đăng nhập
            </button>
            <button id="header-register-btn" class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-xs">
              Đăng ký
            </button>
          ` : `
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-gray-700">Chào bạn, Minh Thư</span>
              <div class="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">MT</div>
              <button id="header-logout-btn" class="text-xs text-red-500 hover:underline cursor-pointer ml-1">Đăng xuất</button>
            </div>
          `}
        </div>

      </div>
    </header>

    <!-- Main Content Container -->
    <main class="min-w-0 flex-1">
      ${renderCurrentTabContent()}
    </main>

    <!-- Footer -->
    ${renderFooter()}

    <!-- Auth Modal (Matches Image 3) -->
    ${state.isAuthModalOpen ? renderAuthModal() : ''}

    <!-- AI Nutrition Chatbot Floating Widget (Guest trial access) -->
    ${renderAiChatbotWidget()}
  `;

  bindEventListeners();
}

// Render dynamic tab content
function renderCurrentTabContent(): string {
  if (state.currentTab === 'detail') {
    return renderRecipeDetail();
  }
  if (state.currentTab === 'blog') {
    return renderBlogSection();
  }
  if (state.currentTab === 'restaurants') {
    return renderRestaurantsSection();
  }
  return renderDiscoverSection();
}

// Render Recipe Discovery (Screenshot 1)
function renderDiscoverSection(): string {
  const filteredRecipes = getFilteredRecipes();
  const pills = ['Tất cả', 'Giàu Protein', 'Low GI', 'Dưới 20 phút', 'Thuần Chay', 'Món Nước'];

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Top Search & AI Scan Box -->
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs mb-8">
        <div class="flex flex-col md:flex-row gap-3 items-center">
          <div class="relative flex-1 w-full">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              ${icons.search}
            </span>
            <input 
              type="text" 
              id="search-input" 
              value="${state.filters.searchQuery}"
              placeholder="Tìm kiếm món chay, nguyên liệu, công thức..." 
              class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <button 
            id="btn-ai-fridge-scan"
            class="w-full md:w-auto px-6 py-3.5 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            ${icons.cameraScan}
            <span>AI Quét Tủ Lạnh</span>
          </button>
        </div>

        <!-- Category Pills -->
        <div class="flex items-center gap-2.5 mt-5 overflow-x-auto pb-1 text-sm no-scrollbar">
          ${pills.map(pill => {
            const isActive = state.filters.categoryPill === pill;
            return `
              <button 
                data-pill="${pill}"
                class="pill-btn whitespace-nowrap px-4 py-2 rounded-full border transition cursor-pointer font-medium ${
                  isActive 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }"
              >
                ${pill}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Main Layout: Sidebar & Cards Grid -->
      <div class="flex flex-col lg:flex-row gap-8 items-start">
        
        <!-- Left Sidebar: Bộ Lọc -->
        <aside class="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
            <div class="flex items-center gap-2 font-bold text-gray-900 text-base">
              ${icons.filter}
              <span>Bộ Lọc</span>
            </div>
            <button id="btn-reset-filters" class="text-xs text-gray-500 hover:text-emerald-600 transition cursor-pointer">
              Đặt lại
            </button>
          </div>

          <!-- Thời gian nấu -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Thời gian nấu</h4>
            <div class="space-y-2 text-sm text-gray-600">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="cookTimes" value="under15" ${state.filters.cookTimes.includes('under15') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>Dưới 15 phút</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="cookTimes" value="15to30" ${state.filters.cookTimes.includes('15to30') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>15 - 30 phút</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="cookTimes" value="over30" ${state.filters.cookTimes.includes('over30') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>Trên 30 phút</span>
              </label>
            </div>
          </div>

          <!-- Mức Calo -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Mức Calo</h4>
            <div class="space-y-2 text-sm text-gray-600">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="calorieRanges" value="under300" ${state.filters.calorieRanges.includes('under300') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>Dưới 300 kcal</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="calorieRanges" value="300to500" ${state.filters.calorieRanges.includes('300to500') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>300 - 500 kcal</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-filter="calorieRanges" value="over500" ${state.filters.calorieRanges.includes('over500') ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                <span>Trên 500 kcal</span>
              </label>
            </div>
          </div>

          <!-- Loại bữa ăn -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Loại bữa ăn</h4>
            <div class="space-y-2 text-sm text-gray-600">
              ${['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt / Tráng Miệng'].map(meal => `
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" data-filter="mealTypes" value="${meal}" ${state.filters.mealTypes.includes(meal) ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>${meal}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Nguyên liệu chính -->
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Nguyên liệu chính</h4>
            <div class="space-y-2 text-sm text-gray-600">
              ${['Đậu hũ & Tàu hũ ky', 'Nấm các loại', 'Rau củ quả tươi', 'Các loại hạt & Đậu gà'].map(ing => `
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" data-filter="mainIngredients" value="${ing}" ${state.filters.mainIngredients.includes(ing) ? 'checked' : ''} class="filter-checkbox rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>${ing}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- Right Content: Recipe Cards & Sort -->
        <div class="flex-1 w-full">
          
          <!-- Results header & sorting -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div class="text-sm text-gray-600">
              Hiển thị <span class="font-bold text-gray-900">${filteredRecipes.length}</span> công thức thuần chay
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500 whitespace-nowrap">Sắp xếp theo:</span>
              <select id="sort-select" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer">
                <option value="popular" ${state.filters.sortBy === 'popular' ? 'selected' : ''}>Phổ biến nhất</option>
                <option value="calories_asc" ${state.filters.sortBy === 'calories_asc' ? 'selected' : ''}>Calo thấp nhất</option>
                <option value="time_asc" ${state.filters.sortBy === 'time_asc' ? 'selected' : ''}>Thời gian nấu nhanh</option>
                <option value="rating_desc" ${state.filters.sortBy === 'rating_desc' ? 'selected' : ''}>Đánh giá cao nhất</option>
              </select>
            </div>
          </div>

          <!-- Recipe Cards Grid (Screenshot 1) -->
          ${filteredRecipes.length === 0 ? `
            <div class="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                ${icons.leaf}
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">Không tìm thấy công thức phù hợp</h3>
              <p class="text-sm text-gray-500 mb-4">Hãy thử tìm từ khóa khác hoặc bỏ chọn một số tiêu chí bộ lọc.</p>
              <button id="empty-reset-btn" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition cursor-pointer">
                Đặt lại bộ lọc
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${filteredRecipes.map(recipe => renderRecipeCard(recipe)).join('')}
            </div>
          `}

          <!-- Pagination (Screenshot 1) -->
          <div class="flex items-center justify-center gap-2 mt-12 mb-6">
            <button class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50">
              ‹
            </button>
            <button class="w-10 h-10 rounded-lg bg-emerald-600 text-white font-medium flex items-center justify-center shadow-xs">
              1
            </button>
            <button class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center transition cursor-pointer">
              2
            </button>
            <button class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center transition cursor-pointer">
              3
            </button>
            <span class="px-1 text-gray-400">...</span>
            <button class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center transition cursor-pointer">
              8
            </button>
            <button class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer">
              ›
            </button>
          </div>

        </div>

      </div>

    </div>
  `;
}

// Render individual recipe card
function renderRecipeCard(recipe: Recipe): string {
  const isSaved = state.savedRecipes.has(recipe.id);

  return `
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition group flex flex-col">
      
      <!-- Card Image with Badges & Bookmark -->
      <div class="relative aspect-[16/11] overflow-hidden bg-gray-100">
        <img 
          src="${recipe.image}" 
          alt="${recipe.title}" 
          class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
        
        <!-- Category Badge -->
        <div class="absolute bottom-3 left-3">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white shadow-xs">
            ${recipe.badge}
          </span>
        </div>

        <!-- Bookmark button (triggers auth modal for guest) -->
        <button 
          data-recipe-id="${recipe.id}"
          class="btn-bookmark absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm transition cursor-pointer ${isSaved ? 'text-emerald-600 fill-emerald-600' : ''}"
          title="${state.userRole === 'guest' ? 'Đăng nhập để lưu món' : 'Lưu món ăn'}"
        >
          ${icons.bookmark}
        </button>
      </div>

      <!-- Card Body -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            data-recipe-id="${recipe.id}"
            class="recipe-title-link font-bold text-gray-900 text-base hover:text-emerald-600 transition cursor-pointer line-clamp-1 mb-1.5"
          >
            ${recipe.title}
          </h3>
          <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
            ${recipe.description}
          </p>
        </div>

        <!-- Specs Footer -->
        <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-600 font-medium">
          <div class="flex items-center">
            ${icons.flame}
            <span>${recipe.calories} kcal</span>
          </div>
          <div class="flex items-center">
            ${icons.scale}
            <span>${recipe.protein}g Protein</span>
          </div>
          <div class="flex items-center">
            ${icons.clock}
            <span>${recipe.cookTime} phút</span>
          </div>
        </div>

      </div>

    </div>
  `;
}

// Render Recipe Detail Page (Screenshot 2)
function renderRecipeDetail(): string {
  const recipe = RECIPES.find(r => r.id === state.selectedRecipeId) || RECIPES[0];
  const isSaved = state.savedRecipes.has(recipe.id);

  return `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button id="breadcrumb-home" class="hover:text-emerald-600 transition flex items-center cursor-pointer">
          ${icons.arrowLeft} Trang chủ
        </button>
        <span>/</span>
        <button id="breadcrumb-discover" class="hover:text-emerald-600 transition cursor-pointer">Khám phá công thức</button>
        <span>/</span>
        <span class="font-medium text-gray-900">Chi tiết món ăn</span>
      </nav>

      <!-- Hero Header Grid -->
      <div class="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-xs mb-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <!-- Dish Image with Badges -->
          <div class="lg:col-span-6 relative rounded-2xl overflow-hidden shadow-sm aspect-[4/3] bg-gray-100">
            <img 
              src="${recipe.image}" 
              alt="${recipe.title}" 
              class="w-full h-full object-cover"
            />
            <div class="absolute top-4 left-4 flex gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-xs">
                ${recipe.badge}
              </span>
              ${recipe.secondaryBadge ? `
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 shadow-xs">
                  ${recipe.secondaryBadge}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Recipe Overview Info -->
          <div class="lg:col-span-6 flex flex-col justify-center">
            
            <!-- Calories & Difficulty -->
            <div class="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-2">
              ${icons.flame}
              <span>${recipe.calories} kcal • Độ khó: ${recipe.difficulty}</span>
            </div>

            <!-- Title -->
            <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
              ${recipe.title}
            </h1>

            <!-- Description -->
            <p class="text-sm text-gray-600 leading-relaxed mb-5">
              ${recipe.description}
            </p>

            <!-- Rating & Cook Time -->
            <div class="flex items-center gap-4 text-xs text-gray-600 mb-6 font-medium">
              <div class="flex items-center gap-1">
                ${icons.star}
                <span class="font-bold text-gray-900">${recipe.rating}</span>
                <span class="text-gray-400">(${recipe.reviewsCount} đánh giá)</span>
              </div>
              <span class="text-gray-300">•</span>
              <div class="flex items-center gap-1">
                ${icons.clock}
                <span>${recipe.cookTime} phút</span>
              </div>
            </div>

            <!-- Macronutrient Pills -->
            <div class="grid grid-cols-3 gap-3 mb-6">
              <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <div class="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Protein</div>
                <div class="text-base font-bold text-gray-800">${recipe.protein}g</div>
              </div>
              <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <div class="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Carb</div>
                <div class="text-base font-bold text-gray-800">${recipe.carbs || 24}g</div>
              </div>
              <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <div class="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Fat</div>
                <div class="text-base font-bold text-gray-800">${recipe.fat || 12}g</div>
              </div>
            </div>

            <!-- Save Dish Button -->
            <div>
              <button 
                id="btn-detail-save"
                class="w-full sm:w-auto px-6 py-3 border border-gray-200 hover:border-gray-400 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs ${isSaved ? 'text-emerald-600 border-emerald-500' : ''}"
              >
                ${icons.bookmark}
                <span>${isSaved ? 'Đã lưu món ăn' : 'Lưu món'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      <!-- Section: Nguyên liệu cơ bản (2 khẩu phần) -->
      <div class="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-xs mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div class="flex items-center gap-2 font-bold text-lg text-gray-900">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Nguyên liệu cơ bản (2 khẩu phần)</span>
          </div>
          <span class="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Đã chuẩn hóa định lượng chuẩn VEGEAI
          </span>
        </div>

        <!-- 4 Ingredient Cards Grid (Screenshot 2) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${recipe.ingredients.map((item, idx) => `
            <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-white border border-gray-200 font-bold text-sm text-gray-700 flex items-center justify-center shadow-xs shrink-0">
                ${idx + 1}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 truncate">${item.name}</div>
                <div class="text-xs text-gray-500 truncate">${item.amount}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Section: Hướng dẫn nấu & Video (LOCKED BARRIER for Unauthorized User) -->
      ${state.userRole === 'guest' ? `
        <!-- Locked Content Container (Screenshot 2) -->
        <div class="relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs p-8 md:p-12">
          
          <!-- Blurred Background Preview -->
          <div class="filter blur-sm select-none pointer-events-none opacity-40 space-y-6">
            <div class="h-6 bg-gray-200 rounded w-1/3"></div>
            <div class="space-y-4">
              <div class="p-4 border rounded-xl bg-gray-50 flex gap-4">
                <div class="w-8 h-8 rounded-full bg-gray-300"></div>
                <div class="space-y-2 flex-1">
                  <div class="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div class="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div class="p-4 border rounded-xl bg-gray-50 flex gap-4">
                <div class="w-8 h-8 rounded-full bg-gray-300"></div>
                <div class="space-y-2 flex-1">
                  <div class="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div class="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div class="p-4 border rounded-xl bg-gray-50 flex gap-4">
                <div class="w-8 h-8 rounded-full bg-gray-300"></div>
                <div class="space-y-2 flex-1">
                  <div class="h-4 bg-gray-300 rounded w-4/5"></div>
                  <div class="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <div class="aspect-video bg-gray-200 rounded-2xl flex items-center justify-center">
              <div class="w-16 h-16 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <!-- Centered Lock Barrier Modal Card -->
          <div class="absolute inset-0 flex items-center justify-center p-6 bg-white/75 backdrop-blur-[2px]">
            <div class="max-w-md w-full text-center">
              
              <!-- Green Lock Icon Circle -->
              <div class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                ${icons.lock}
              </div>

              <!-- Barrier Title -->
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Đăng nhập để xem công thức chi tiết
              </h3>

              <!-- Barrier Subtitle -->
              <p class="text-sm text-gray-600 leading-relaxed mb-6">
                Mở khóa toàn bộ hướng dẫn nấu ăn từng bước, video hướng dẫn trực quan, đánh giá đầy đủ từ cộng đồng và gợi ý món ăn kèm thông minh.
              </p>

              <!-- Action Buttons -->
              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  id="btn-barrier-login"
                  class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-sm"
                >
                  Đăng nhập ngay
                </button>
                <button 
                  id="btn-barrier-register"
                  class="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition cursor-pointer shadow-xs"
                >
                  Đăng ký tài khoản mới
                </button>
              </div>

            </div>
          </div>

        </div>
      ` : `
        <!-- Unlocked View for Logged-In Members -->
        <div class="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-xs space-y-8">
          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Hướng dẫn nấu ăn từng bước (Đã mở khóa)
            </h3>
            <div class="space-y-4">
              ${(recipe.steps || []).map((step, idx) => `
                <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                  <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    ${idx + 1}
                  </div>
                  <p class="text-sm text-gray-700 leading-relaxed pt-1">${step}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Video Cooking Tutorial -->
          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Video hướng dẫn & Tóm tắt AI
            </h3>
            <div class="aspect-video w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
              <div class="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center cursor-pointer transition">
                <svg class="w-8 h-8 fill-current text-white translate-x-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span class="text-xs text-gray-300 mt-3 font-medium">Video hướng dẫn trực quan: 5 phút nấu nhanh</span>
            </div>
          </div>
        </div>
      `}

    </div>
  `;
}

// Render Blog View (Allowed for Guest as per requirements: "Search and view videos and blogs")
function renderBlogSection(): string {
  return `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Blog Header -->
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Góc Sống Chay & Dinh Dưỡng
        </span>
        <h1 class="text-3xl font-extrabold text-gray-900 mt-3 mb-4">
          Kiến Thức & Công Thức Chay Khoa Học
        </h1>
        <p class="text-sm text-gray-500">
          Khách chưa đăng nhập có thể thoải mái đọc các bài viết nghiên cứu và xem hướng dẫn nấu chay từ các chuyên gia dinh dưỡng VEGEAI.
        </p>
      </div>

      <!-- Articles Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${BLOG_POSTS.map(post => `
          <article class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col">
            <div class="aspect-[16/10] overflow-hidden bg-gray-100">
              <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover hover:scale-105 transition duration-500" />
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span class="font-semibold text-emerald-600">${post.category}</span>
                  <span>${post.readTime}</span>
                </div>
                <h3 class="font-bold text-gray-900 text-base leading-snug hover:text-emerald-600 transition cursor-pointer mb-2">
                  ${post.title}
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-4">
                  ${post.excerpt}
                </p>
              </div>
              <div class="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>${post.author}</span>
                <span>${post.date}</span>
              </div>
            </div>
          </article>
        `).join('')}
      </div>

      <!-- Video cooking section -->
      <div class="mt-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
        <h2 class="text-xl font-bold text-gray-900 mb-2">Video Hướng Dẫn Nấu Ăn Chay Tuyển Chọn</h2>
        <p class="text-sm text-gray-500 mb-6">Dành cho mọi khách truy cập - Học cách làm món chay ngon từng bước.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="rounded-2xl overflow-hidden bg-gray-900 relative aspect-video flex items-center justify-center group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />
            <div class="w-12 h-12 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center shadow-lg relative z-10">
              <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="absolute bottom-3 left-3 text-xs text-white font-medium drop-shadow">Cách làm Đậu Hũ Sốt Cà Chua 20p</span>
          </div>
          <div class="rounded-2xl overflow-hidden bg-gray-900 relative aspect-video flex items-center justify-center group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />
            <div class="w-12 h-12 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center shadow-lg relative z-10">
              <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="absolute bottom-3 left-3 text-xs text-white font-medium drop-shadow">Bún Riêu Chay Nước Dùng Thanh Ngọt</span>
          </div>
          <div class="rounded-2xl overflow-hidden bg-gray-900 relative aspect-video flex items-center justify-center group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />
            <div class="w-12 h-12 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center shadow-lg relative z-10">
              <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="absolute bottom-3 left-3 text-xs text-white font-medium drop-shadow">Salad Đậu Gà Sốt Chanh Dây Low GI</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

// Render Quán Chay Gần Đây
function renderRestaurantsSection(): string {
  return `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-xs mb-8">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Quán Ăn Chay Gần Bạn</h1>
            <p class="text-sm text-gray-500 mt-1">Khám phá các nhà hàng, quán ăn thuần chay chất lượng cao.</p>
          </div>
          ${state.userRole === 'guest' ? `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              ${icons.lock}
              <span>Tính năng định vị GPS & gợi ý cá nhân hóa yêu cầu đăng nhập.</span>
            </div>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div class="border border-gray-100 rounded-2xl p-4 bg-gray-50">
            <h3 class="font-bold text-gray-900">Nhà Hàng Chay Veggie Castle</h3>
            <p class="text-xs text-gray-500 mt-1">Buffet chay phong phú với hơn 30 món mỗi ngày</p>
            <div class="mt-3 text-xs text-emerald-600 font-semibold">★ 4.8 (340 đánh giá) • Cách bạn ~1.2 km</div>
          </div>
          <div class="border border-gray-100 rounded-2xl p-4 bg-gray-50">
            <h3 class="font-bold text-gray-900">Quán Cơm Chay An Lạc</h3>
            <p class="text-xs text-gray-500 mt-1">Cơm phần bình dân, canh rong biển thanh đạm</p>
            <div class="mt-3 text-xs text-emerald-600 font-semibold">★ 4.6 (180 đánh giá) • Cách bạn ~800 m</div>
          </div>
          <div class="border border-gray-100 rounded-2xl p-4 bg-gray-50">
            <h3 class="font-bold text-gray-900">Bếp Chay Loving Hut</h3>
            <p class="text-xs text-gray-500 mt-1">Món ăn thuần chay phong cách Á - Âu đa dạng</p>
            <div class="mt-3 text-xs text-emerald-600 font-semibold">★ 4.9 (410 đánh giá) • Cách bạn ~2.5 km</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render Footer (Screenshot 1 & 2)
function renderFooter(): string {
  return `
    <footer class="bg-white border-t border-gray-100 py-8 text-xs text-gray-500 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <!-- Left: Brand -->
        <div class="flex items-center gap-2 font-semibold text-gray-700">
          <div class="w-5 h-5 text-emerald-600">${icons.leaf}</div>
          <span>VEGEAI Vietnam</span>
        </div>

        <!-- Center: Links -->
        <div class="flex items-center gap-6 text-gray-500 font-medium">
          <a href="#" class="hover:text-emerald-600 transition">Giới thiệu</a>
          <a href="#" class="hover:text-emerald-600 transition">Điều khoản</a>
          <a href="#" class="hover:text-emerald-600 transition">Chính sách bảo mật</a>
          <a href="#" class="hover:text-emerald-600 transition">Liên hệ</a>
        </div>

        <!-- Right: Copyright -->
        <div>
          © 2026 VEGEAI. All rights reserved.
        </div>

      </div>
    </footer>
  `;
}

// Render Auth Modal (Screenshot 3)
function renderAuthModal(): string {
  return `
    <div id="modal-backdrop" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-gray-100">
        
        <!-- Close Button (X) -->
        <button id="modal-close-btn" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition cursor-pointer p-1">
          ${icons.close}
        </button>

        <!-- Center Leaf Icon Badge -->
        <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100 shadow-xs">
          <div class="w-7 h-7">${icons.leaf}</div>
        </div>

        <!-- Modal Heading -->
        <h2 class="text-xl font-bold text-gray-900 text-center mb-2">
          Đăng nhập để tiếp tục khám phá
        </h2>

        <!-- Modal Description -->
        <p class="text-xs text-gray-500 text-center leading-relaxed mb-6 px-2">
          ${state.authModalReason}
        </p>

        <!-- Primary Action: Đăng nhập -->
        <button id="modal-action-login" class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm mb-3">
          ${icons.login}
          <span>Đăng nhập</span>
        </button>

        <!-- Secondary Action: Đăng ký tài khoản mới -->
        <button id="modal-action-register" class="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs mb-6">
          ${icons.user}
          <span>Đăng ký tài khoản mới</span>
        </button>

        <!-- Divider: hoặc tiếp tục với -->
        <div class="relative flex py-1 items-center mb-6">
          <div class="flex-grow border-t border-gray-100"></div>
          <span class="flex-shrink mx-4 text-xs text-gray-400 font-medium">hoặc tiếp tục với</span>
          <div class="flex-grow border-t border-gray-100"></div>
        </div>

        <!-- Social Buttons: Google & Facebook -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button id="btn-social-google" class="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center transition cursor-pointer shadow-xs">
            ${icons.google}
            <span>Google</span>
          </button>
          <button id="btn-social-facebook" class="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center transition cursor-pointer shadow-xs">
            ${icons.facebook}
            <span>Facebook</span>
          </button>
        </div>

        <!-- Dismiss Link: Để sau, tiếp tục xem -->
        <div class="text-center">
          <button id="modal-dismiss-btn" class="text-xs text-gray-400 hover:text-gray-600 underline font-medium transition cursor-pointer">
            Để sau, tiếp tục xem
          </button>
        </div>

      </div>
    </div>
  `;
}

// Render AI Nutrition Chatbot Widget for Guest (Trial Access Requirement)
function renderAiChatbotWidget(): string {
  const remainingQueries = Math.max(0, state.maxGuestQueries - state.guestQueriesUsed);
  const isLocked = state.userRole === 'guest' && remainingQueries <= 0;

  return `
    <div class="fixed bottom-6 right-6 z-40">
      
      <!-- Trigger Button -->
      ${!state.isChatOpen ? `
        <button 
          id="btn-toggle-chat"
          class="flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg transition cursor-pointer transform hover:scale-105"
        >
          <div class="relative">
            ${icons.bot}
            ${state.userRole === 'guest' ? `
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white"></span>
            ` : ''}
          </div>
          <span class="text-sm font-semibold">AI Dinh Dưỡng</span>
          ${state.userRole === 'guest' ? `
            <span class="text-[11px] bg-emerald-700/80 px-2 py-0.5 rounded-full font-medium">
              ${remainingQueries}/3 lượt
            </span>
          ` : ''}
        </button>
      ` : `
        <!-- Opened Chat Window -->
        <div class="w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          
          <!-- Chat Header -->
          <div class="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                ${icons.bot}
              </div>
              <div>
                <h3 class="text-sm font-bold flex items-center gap-1.5">
                  <span>Trợ Lý Dinh Dưỡng VEGEAI</span>
                  ${icons.sparkle}
                </h3>
                <div class="text-[11px] text-gray-300">Hỏi đáp dinh dưỡng & calo chay</div>
              </div>
            </div>
            <button id="btn-close-chat" class="text-gray-400 hover:text-white transition cursor-pointer p-1">
              ${icons.close}
            </button>
          </div>

          <!-- Guest Trial Notice Banner -->
          ${state.userRole === 'guest' ? `
            <div class="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
              <div class="flex items-center gap-1.5">
                <span class="font-bold">⚡ Khách dùng thử:</span>
                <span>Còn <strong class="${remainingQueries <= 1 ? 'text-red-600' : 'text-amber-900'}">${remainingQueries}/${state.maxGuestQueries}</strong> câu hỏi</span>
              </div>
              <button id="btn-chat-signup" class="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer">
                Đăng ký mở khóa
              </button>
            </div>
          ` : `
            <div class="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-xs text-emerald-800 font-medium text-center">
              ✓ Thành viên chính thức: Trò chuyện không giới hạn
            </div>
          `}

          <!-- Chat Messages Body -->
          <div id="chat-messages-container" class="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            ${state.chatMessages.map(msg => `
              <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }">
                  <div>${renderSimpleMarkdown(msg.text)}</div>
                  <div class="text-[10px] mt-1.5 opacity-60 text-right">${msg.timestamp}</div>
                </div>
              </div>
            `).join('')}

            ${isLocked ? `
              <div class="bg-red-50 border border-red-100 rounded-2xl p-4 text-center my-2">
                <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                  ${icons.lock}
                </div>
                <h4 class="font-bold text-red-800 text-xs mb-1">Đã hết lượt dùng thử miễn phí!</h4>
                <p class="text-[11px] text-red-600 mb-3 leading-normal">
                  Bạn đã sử dụng hết 3 câu hỏi dành cho khách. Hãy đăng ký tài khoản để tiếp tục hỏi đáp không giới hạn và nhận thực đơn cá nhân hóa theo chỉ số BMI!
                </p>
                <button id="btn-chat-register-prompt" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs">
                  Đăng ký tài khoản ngay
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Suggested Quick Prompts (if not locked) -->
          ${!isLocked ? `
            <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Gợi ý nguồn đạm chay thay thế thịt">
                🌱 Nguồn đạm chay
              </button>
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Người bệnh Gout có nên ăn đậu hũ không?">
                🩺 Bệnh Gout & Đậu hũ
              </button>
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Gợi ý bữa sáng chay dưới 300 kcal">
                🥗 Sáng dưới 300 kcal
              </button>
            </div>
          ` : ''}

          <!-- Chat Input Area -->
          <div class="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input 
              type="text" 
              id="chat-input"
              placeholder="${isLocked ? 'Vui lòng đăng ký để tiếp tục...' : 'Nhập câu hỏi dinh dưỡng...'}" 
              ${isLocked ? 'disabled' : ''}
              class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button 
              id="btn-send-chat" 
              ${isLocked ? 'disabled' : ''}
              class="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              ${icons.send}
            </button>
          </div>

        </div>
      `}

    </div>
  `;
}

// Event Bindings
function bindEventListeners() {
  // Toggle testing role
  document.getElementById('toggle-role-btn')?.addEventListener('click', () => {
    state.userRole = state.userRole === 'guest' ? 'authorized' : 'guest';
    renderApp();
  });

  // Nav items
  document.getElementById('nav-brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.currentTab = 'discover';
    renderApp();
  });
  document.getElementById('nav-home')?.addEventListener('click', () => {
    state.currentTab = 'discover';
    renderApp();
  });
  document.getElementById('nav-discover')?.addEventListener('click', () => {
    state.currentTab = 'discover';
    renderApp();
  });
  document.getElementById('nav-blog')?.addEventListener('click', () => {
    state.currentTab = 'blog';
    renderApp();
  });
  document.getElementById('nav-restaurants')?.addEventListener('click', () => {
    state.currentTab = 'restaurants';
    renderApp();
  });

  // Breadcrumbs
  document.getElementById('breadcrumb-home')?.addEventListener('click', () => {
    state.currentTab = 'discover';
    renderApp();
  });
  document.getElementById('breadcrumb-discover')?.addEventListener('click', () => {
    state.currentTab = 'discover';
    renderApp();
  });

  // Header Auth Buttons
  document.getElementById('header-login-btn')?.addEventListener('click', () => {
    openAuthModal('Đăng nhập tài khoản VEGEAI để lưu công thức yêu thích, sử dụng AI Quét Tủ Lạnh và nhận thực đơn cá nhân hóa.');
  });
  document.getElementById('header-register-btn')?.addEventListener('click', () => {
    openAuthModal('Tạo tài khoản VEGEAI miễn phí để mở khóa không giới hạn toàn bộ công thức và trợ lý dinh dưỡng AI.');
  });
  document.getElementById('header-logout-btn')?.addEventListener('click', () => {
    state.userRole = 'guest';
    renderApp();
  });

  // AI Fridge Scan Button (Guest trigger)
  document.getElementById('btn-ai-fridge-scan')?.addEventListener('click', () => {
    if (state.userRole === 'guest') {
      openAuthModal('Tính năng AI Quét Tủ Lạnh (Computer Vision) nhận diện nguyên liệu qua ảnh chụp chỉ dành cho thành viên đã đăng ký. Đăng nhập hoặc tạo tài khoản để trải nghiệm!');
    } else {
      alert('📷 [Chế độ Authorized User]: Mở camera / tải ảnh chụp tủ lạnh để AI phân tích nguyên liệu!');
    }
  });

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.searchQuery = (e.target as HTMLInputElement).value;
      // re-render cards only or full app
      renderApp();
      // keep focus
      const updatedInput = document.getElementById('search-input') as HTMLInputElement | null;
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(state.filters.searchQuery.length, state.filters.searchQuery.length);
      }
    });
  }

  // Category Pills
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pill = btn.getAttribute('data-pill');
      if (pill) {
        state.filters.categoryPill = pill;
        renderApp();
      }
    });
  });

  // Filter Checkboxes
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const filterGroup = target.getAttribute('data-filter') as keyof FilterState;
      const val = target.value;

      const arr = state.filters[filterGroup] as string[];
      if (target.checked) {
        if (!arr.includes(val)) arr.push(val);
      } else {
        const idx = arr.indexOf(val);
        if (idx !== -1) arr.splice(idx, 1);
      }
      renderApp();
    });
  });

  // Reset Filters
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    resetFilters();
  });
  document.getElementById('empty-reset-btn')?.addEventListener('click', () => {
    resetFilters();
  });

  // Sort dropdown
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    state.filters.sortBy = (e.target as HTMLSelectElement).value as any;
    renderApp();
  });

  // Recipe Card Title Clicks (open detail)
  document.querySelectorAll('.recipe-title-link').forEach(link => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('data-recipe-id');
      if (id) {
        state.selectedRecipeId = id;
        state.currentTab = 'detail';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderApp();
      }
    });
  });

  // Bookmark button clicks (triggers auth for guest)
  document.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-recipe-id');
      if (state.userRole === 'guest') {
        openAuthModal('Vui lòng đăng nhập để lưu công thức yêu thích vào sổ tay ẩm thực chay của bạn!');
      } else if (id) {
        if (state.savedRecipes.has(id)) {
          state.savedRecipes.delete(id);
        } else {
          state.savedRecipes.add(id);
        }
        renderApp();
      }
    });
  });

  // Detail Page Save Button
  document.getElementById('btn-detail-save')?.addEventListener('click', () => {
    if (state.userRole === 'guest') {
      openAuthModal('Vui lòng đăng nhập để lưu công thức món ăn này và đồng bộ vào kế hoạch thực đơn của bạn.');
    } else {
      if (state.savedRecipes.has(state.selectedRecipeId)) {
        state.savedRecipes.delete(state.selectedRecipeId);
      } else {
        state.savedRecipes.add(state.selectedRecipeId);
      }
      renderApp();
    }
  });

  // Detail Page Locked Content Buttons
  document.getElementById('btn-barrier-login')?.addEventListener('click', () => {
    openAuthModal('Đăng nhập để xem công thức chi tiết, hướng dẫn từng bước và video nấu ăn trực quan.');
  });
  document.getElementById('btn-barrier-register')?.addEventListener('click', () => {
    openAuthModal('Đăng ký tài khoản mới để mở khóa trọn vẹn toàn bộ công thức thuần chay trên VEGEAI.');
  });

  // Auth Modal Buttons
  document.getElementById('modal-close-btn')?.addEventListener('click', closeAuthModal);
  document.getElementById('modal-dismiss-btn')?.addEventListener('click', closeAuthModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeAuthModal();
    }
  });

  // Mock Login / Register inside Modal
  document.getElementById('modal-action-login')?.addEventListener('click', () => {
    state.userRole = 'authorized';
    closeAuthModal();
    renderApp();
  });
  document.getElementById('modal-action-register')?.addEventListener('click', () => {
    state.userRole = 'authorized';
    closeAuthModal();
    renderApp();
  });
  document.getElementById('btn-social-google')?.addEventListener('click', () => {
    state.userRole = 'authorized';
    closeAuthModal();
    renderApp();
  });
  document.getElementById('btn-social-facebook')?.addEventListener('click', () => {
    state.userRole = 'authorized';
    closeAuthModal();
    renderApp();
  });

  // AI Chatbot Widget Events
  document.getElementById('btn-toggle-chat')?.addEventListener('click', () => {
    state.isChatOpen = true;
    renderApp();
    scrollChatToBottom();
  });
  document.getElementById('btn-close-chat')?.addEventListener('click', () => {
    state.isChatOpen = false;
    renderApp();
  });
  document.getElementById('btn-chat-signup')?.addEventListener('click', () => {
    openAuthModal('Đăng ký tài khoản miễn phí để trò chuyện không giới hạn với AI Dinh Dưỡng VEGEAI.');
  });
  document.getElementById('btn-chat-register-prompt')?.addEventListener('click', () => {
    openAuthModal('Đăng ký tài khoản miễn phí để mở khóa chat không giới hạn với AI Dinh Dưỡng VEGEAI.');
  });

  // Quick Prompt Chips
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) {
        handleUserChatMessage(prompt);
      }
    });
  });

  // Send Chat Message
  const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('btn-send-chat');
  if (chatInput && sendBtn) {
    sendBtn.addEventListener('click', () => {
      const val = chatInput.value.trim();
      if (val) {
        handleUserChatMessage(val);
      }
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = chatInput.value.trim();
        if (val) {
          handleUserChatMessage(val);
        }
      }
    });
  }
}

function resetFilters() {
  state.filters.searchQuery = '';
  state.filters.categoryPill = 'Tất cả';
  state.filters.cookTimes = [];
  state.filters.calorieRanges = [];
  state.filters.mealTypes = [];
  state.filters.mainIngredients = [];
  state.filters.sortBy = 'popular';
  renderApp();
}

function openAuthModal(reason?: string) {
  if (reason) state.authModalReason = reason;
  state.isAuthModalOpen = true;
  renderApp();
}

function closeAuthModal() {
  state.isAuthModalOpen = false;
  renderApp();
}

function scrollChatToBottom() {
  setTimeout(() => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, 50);
}

function handleUserChatMessage(userText: string) {
  if (state.userRole === 'guest' && state.guestQueriesUsed >= state.maxGuestQueries) {
    openAuthModal('Bạn đã sử dụng hết 3 câu hỏi dùng thử miễn phí. Hãy đăng ký tài khoản để tiếp tục!');
    return;
  }

  // Add User Message
  state.chatMessages.push({
    id: 'user-' + Date.now(),
    sender: 'user',
    text: userText,
    timestamp: 'Vừa xong'
  });

  if (state.userRole === 'guest') {
    state.guestQueriesUsed += 1;
  }

  // Determine intelligent mock response
  let answer = 'Cảm ơn câu hỏi của bạn! VEGEAI gợi ý bạn nên đa dạng hóa các nguồn ngũ cốc nguyên cám, đậu phụ, hạt dinh dưỡng và rau xanh lá đậm để đảm bảo cân bằng vi chất dinh dưỡng và duy trì năng lượng tích cực.';
  const lower = userText.toLowerCase();
  if (lower.includes('đạm') || lower.includes('protein')) {
    answer = AI_PRESET_ANSWERS['protein'];
  } else if (lower.includes('gout') || lower.includes('axit uric') || lower.includes('uric')) {
    answer = AI_PRESET_ANSWERS['gout'];
  } else if (lower.includes('300') || lower.includes('calo') || lower.includes('sáng')) {
    answer = AI_PRESET_ANSWERS['calo'];
  }

  // Simulate AI delay
  renderApp();
  scrollChatToBottom();

  setTimeout(() => {
    state.chatMessages.push({
      id: 'ai-' + Date.now(),
      sender: 'ai',
      text: answer,
      timestamp: 'Vừa xong'
    });
    renderApp();
    scrollChatToBottom();
  }, 400);
}

// Initial render
renderApp();
