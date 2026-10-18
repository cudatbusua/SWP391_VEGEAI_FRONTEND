import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../styles/navigation.css';
import { AdminLayout } from './AdminLayout';
import { UserMenu } from '../components/UserMenu';
import { NotificationBell } from '../components/NotificationBell';

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

  const isAdmin = user?.role === 'admin';
  const home = isAdmin ? '/admin' : isAuthenticated ? '/dashboard' : '/';
  const isCurrent = (path: string) => location.pathname === path || (path !== '/' && path !== '/admin' && location.pathname.startsWith(path + '/')) || (isAdmin && path === '/admin/blog' && location.pathname.startsWith('/blog/'));
  const navItems: [string, string][] = isAdmin ? [
    ['/admin', 'Tổng quan & tài khoản'], ['/admin/recipes', 'Công thức & dinh dưỡng'],
    ['/admin/blog', 'Blog'], ['/admin/videos', 'Video'], ['/admin/questions', 'Hỏi đáp'],
  ] : isAuthenticated ? [
    ['/dashboard', 'Trang chủ'], ['/','Khám phá'], ['/nutrition', 'Dinh dưỡng'],
    ['/ai-chef', 'AI bếp trưởng'], ['/meal-plans', 'Thực đơn'], ['/blog', 'Blog'],
    ['/videos', 'Video'], ['/questions', 'Hỏi đáp'], ['/fridge-scan', 'Quét tủ lạnh'],
    ['/fridge', 'Kho lạnh'], ['/restaurants', 'Quán chay gần đây'],
  ] : [
    ['/','Khám phá'], ['/blog', 'Blog'], ['/questions', 'Hỏi đáp'],
    ['/restaurants', 'Quán chay gần đây'],
  ];

  if (isAdmin) return <AdminLayout>{children}</AdminLayout>;

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
            <Link to={home} className="flex items-center gap-2 text-slate-800 font-bold text-lg sm:text-xl tracking-normal">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <span>VEGEAI</span>
            </Link>

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
                <NotificationBell />

                {/* Avatar dropdown includes dashboard, profile, password, and logout actions. */}
                <UserMenu user={user} loggingOut={loggingOut} onLogout={handleLogout} />
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
