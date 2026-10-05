import { icons } from '../icons';

export function renderFooter(): string {
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
