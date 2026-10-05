import { icons } from '../icons';

export function renderAuthModal(authModalReason: string): string {
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

        <!-- Modal Heading (Ảnh 3) -->
        <h2 class="text-xl font-bold text-gray-900 text-center mb-2">
          Đăng nhập để tiếp tục khám phá
        </h2>

        <!-- Modal Description (Ảnh 3) -->
        <p class="text-xs text-gray-500 text-center leading-relaxed mb-6 px-2">
          ${authModalReason}
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
