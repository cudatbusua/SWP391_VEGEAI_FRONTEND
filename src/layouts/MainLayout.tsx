import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans">
      
      {/* Top Testing Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
              !isAuthenticated ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium">Chế độ kiểm thử:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-semibold ${
              !isAuthenticated
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {!isAuthenticated
              ? 'Unauthorized User (Khách vãng lai)'
              : 'Authorized User (Đã đăng nhập)'}
          </span>
          <span className="hidden md:inline text-amber-700">
            | Trải nghiệm luồng Đăng nhập, Đăng ký và Quên mật khẩu.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => switchRole(isAuthenticated ? 'guest' : 'user')}
            className="px-2.5 py-1 text-xs rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium transition cursor-pointer shadow-2xs"
          >
            {!isAuthenticated
              ? 'Chuyển sang Authorized User (Thử nghiệm)'
              : 'Chuyển về Guest (Khách)'}
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-slate-800 font-bold text-xl tracking-tight">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <span>VEGEAI</span>
            </Link>

            {/* Nav Menu */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className={`hover:text-emerald-600 transition ${
                    isCurrent('/dashboard') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''
                  }`}
                >
                  Trang Chủ
                </Link>
              )}
              <Link
                to="/"
                className={`hover:text-emerald-600 transition ${
                  isCurrent('/') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''
                }`}
              >
                Khám Phá Công Thức
              </Link>
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => alert('Mở tính năng Quét Tủ Lạnh (Computer Vision nhận diện nguyên liệu)')}
                    className="hover:text-emerald-600 transition cursor-pointer"
                  >
                    Quét Tủ Lạnh
                  </button>
                  <button
                    onClick={() => alert('Mở Trợ lý AI Bếp Trưởng: Gợi ý thực đơn')}
                    className="hover:text-emerald-600 transition cursor-pointer"
                  >
                    AI Bếp Trưởng
                  </button>
                  <button
                    onClick={() => alert('Mở Kế Hoạch Tuần: Thực đơn 7 ngày cá nhân hóa')}
                    className="hover:text-emerald-600 transition cursor-pointer"
                  >
                    Kế Hoạch Tuần
                  </button>
                </>
              )}
              <Link
                to="/blog"
                className={`hover:text-emerald-600 transition ${
                  isCurrent('/blog') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''
                }`}
              >
                Blog
              </Link>
              <Link
                to="/restaurants"
                className={`hover:text-emerald-600 transition ${
                  isCurrent('/restaurants') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''
                }`}
              >
                Quán Chay Gần Đây
              </Link>
            </nav>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <button
                  onClick={() => alert('Thông báo: AI đã gợi ý thực đơn bữa tối cho bạn!')}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </button>

                {/* Avatar with direct link to Dashboard */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-50 transition cursor-pointer"
                  title="Xem Dashboard & Hồ sơ dinh dưỡng"
                >
                  <div className="w-9 h-9 rounded-full bg-[#005f3e] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {user?.name?.charAt(0) || 'M'}
                  </div>
                  <span className="text-xs font-bold text-gray-800 hidden sm:inline">
                    {user?.name || 'Nguyễn Hoàng Minh'}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  className="text-xs text-red-500 hover:underline cursor-pointer ml-1 font-medium"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-xs text-gray-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span>VEGEAI Vietnam</span>
          </div>

          <div className="flex items-center gap-6 text-gray-500 font-medium">
            <a href="#" className="hover:text-emerald-600 transition">Giới thiệu</a>
            <a href="#" className="hover:text-emerald-600 transition">Điều khoản</a>
            <a href="#" className="hover:text-emerald-600 transition">Chính sách bảo mật</a>
            <a href="#" className="hover:text-emerald-600 transition">Liên hệ</a>
          </div>

          <div>
            © 2026 VEGEAI. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};
