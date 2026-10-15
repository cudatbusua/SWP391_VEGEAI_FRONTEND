import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../styles/navigation.css';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, logout, sessionError, retrySession } = useAuth();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => setMobileMenu(false), [location.pathname]);
  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError('');
    const result = await logout();
    if (!result.success) setLogoutError(result.error || 'Không thể đăng xuất.');
    setLoggingOut(false);
  };

  const isCurrent = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
  const navItems = [
    ...(isAuthenticated ? [['/dashboard', 'Trang chủ']] : []),
    ['/', 'Khám phá'], ['/ai-chef', 'AI Bếp Trưởng'], ['/fridge-scan', 'Quét Tủ Lạnh'],
    ...(isAuthenticated ? [['/fridge', 'Kho Tủ']] : []),
    ['/nutrition', 'Dinh dưỡng'], ['/blog', 'Blog'], ['/videos', 'Video'], ['/questions', 'Hỏi đáp'], ['/restaurants', 'Quán chay gần đây'],
    ...(user?.role === 'admin' ? [['/admin', 'Admin']] : []),
  ];

  return (
    <div className="vegeai-layout min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans">
      
      {sessionError && <div role="alert" className="bg-amber-50 p-3 text-sm text-center text-amber-900">
        {sessionError} <button onClick={retrySession} className="underline ml-2">Thử lại</button>
      </div>}
      {logoutError && <div role="alert" className="bg-red-50 p-3 text-sm text-center text-red-700">{logoutError}</div>}

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-1.5 lg:gap-8">
            <button type="button" className="sm:hidden p-1 text-gray-600" title={mobileMenu ? 'Đóng menu' : 'Mở menu'} aria-label={mobileMenu ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileMenu} aria-controls="main-mobile-navigation" onClick={() => setMobileMenu(value => !value)}>{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-slate-800 font-bold text-lg sm:text-xl tracking-tight">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <span>VEGEAI</span>
            </Link>

            {/* Nav Menu */}
            <nav className="hidden">
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
                    onClick={() => alert('Mở Kế Hoạch Tuần: Thực đơn 7 ngày cá nhân hóa')}
                    className="hover:text-emerald-600 transition cursor-pointer"
                  >
                    Kế Hoạch Tuần
                  </button>
                </>
              )}
              <Link to="/fridge-scan" className={`hover:text-emerald-600 transition ${isCurrent('/fridge-scan') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''}`}>Quét Tủ Lạnh</Link>
              {isAuthenticated && <Link to="/fridge" className={`hover:text-emerald-600 transition ${isCurrent('/fridge') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''}`}>Kho Tủ Lạnh</Link>}
              <Link to="/ai-chef" className={`hover:text-emerald-600 transition ${isCurrent('/ai-chef') ? 'text-emerald-600 font-bold' : ''}`}>AI Bếp Trưởng</Link>
              <Link to="/nutrition" className={`hover:text-emerald-600 transition ${isCurrent('/nutrition') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''}`}>Dinh Dưỡng</Link>
              {user?.role === 'admin' && <Link to="/admin" className={`hover:text-emerald-600 transition ${isCurrent('/admin') ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1' : ''}`}>Admin</Link>}
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
          <div className="flex items-center gap-2 sm:gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-2 sm:px-5 py-2 text-xs sm:text-sm whitespace-nowrap font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-2 sm:px-5 py-2 text-xs sm:text-sm whitespace-nowrap font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
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
                  <span className="text-xs font-bold text-gray-800 hidden sm:block max-w-[160px] truncate" title={user?.name}>
                    {user?.name || 'Nguyễn Hoàng Minh'}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-xs whitespace-nowrap text-red-500 hover:underline cursor-pointer ml-1 font-medium"
                >
                  {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </button>
              </div>
            )}
          </div>

        </div>
        <nav aria-label="Điều hướng chính" className={`site-navigation ${mobileMenu ? 'is-collapsed' : ''}`}>
          {navItems.map(([path, label]) => <Link key={path} to={path} aria-current={isCurrent(path) ? 'page' : undefined} className={`shrink-0 hover:text-emerald-700 ${isCurrent(path) ? 'text-emerald-700 font-bold' : ''}`}>{label}</Link>)}
        </nav>
        {mobileMenu && <nav id="main-mobile-navigation" aria-label="Điều hướng mở rộng" className="site-mobile-navigation sm:hidden grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-4 border-t border-gray-100 text-gray-600">{navItems.map(([path, label]) => <Link key={path} to={path} onClick={() => setMobileMenu(false)} aria-current={isCurrent(path) ? 'page' : undefined} className={`py-2 ${isCurrent(path) ? 'text-emerald-700 font-bold' : ''}`}>{label}</Link>)}</nav>}
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

          <div className="flex flex-wrap justify-center items-center gap-4 text-gray-500 font-medium">
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
