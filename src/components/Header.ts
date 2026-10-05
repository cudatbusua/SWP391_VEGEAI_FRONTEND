import { icons } from '../icons';

export function renderHeader(
  currentTab: 'discover' | 'detail' | 'blog' | 'restaurants',
  userRole: 'guest' | 'authorized'
): string {
  return `
    <!-- Top Role Demonstration Banner -->
    <div class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-2 h-2 rounded-full ${userRole === 'guest' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}"></span>
        <span class="font-medium">Chế độ kiểm thử:</span>
        <span class="px-2 py-0.5 rounded-full font-semibold ${userRole === 'guest' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
          ${userRole === 'guest' ? 'Unauthorized User (Khách vãng lai)' : 'Authorized User (Thành viên đã đăng nhập)'}
        </span>
        <span class="hidden md:inline text-amber-700">| Quyền hạn khách: Tìm kiếm & xem blog/video, xem thông tin món cơ bản, 3 lượt dùng thử AI Chatbot.</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="toggle-role-btn" class="px-2.5 py-1 text-xs rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium transition cursor-pointer shadow-xs">
          ${userRole === 'guest' ? 'Đổi sang Authorized User (Thử nghiệm)' : 'Đổi về Guest (Unauthorized User)'}
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
            <button id="nav-home" class="hover:text-emerald-600 transition cursor-pointer ${currentTab === 'discover' ? 'text-gray-900 font-semibold' : ''}">Trang Chủ</button>
            <button id="nav-discover" class="hover:text-emerald-600 transition cursor-pointer ${currentTab === 'discover' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Khám Phá Công Thức</button>
            <button id="nav-blog" class="hover:text-emerald-600 transition cursor-pointer ${currentTab === 'blog' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Blog</button>
            <button id="nav-restaurants" class="hover:text-emerald-600 transition cursor-pointer ${currentTab === 'restaurants' ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1' : ''}">Quán Chay Gần Đây</button>
          </nav>
        </div>

        <!-- Auth Actions -->
        <div class="flex items-center gap-3">
          ${userRole === 'guest' ? `
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
  `;
}
