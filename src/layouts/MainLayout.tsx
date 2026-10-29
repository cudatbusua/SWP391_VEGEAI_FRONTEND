import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../store/ThemeContext';
import '../styles/navigation.css';
import { AdminLayout } from './AdminLayout';
import { UserMenu } from '../components/UserMenu';
import { NotificationBell } from '../components/NotificationBell';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, logout, sessionError, retrySession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => setMobileMenu(false), [location.pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    const result = await logout();
    if (!result.success) setLogoutError(result.error || 'Không thể đăng xuất.');
    setLoggingOut(false);
  };

  const isAdmin = user?.role === 'admin';
  const pathname = location.pathname;

  // Active group detection
  const isDashboardActive = pathname === '/' || pathname === '/dashboard';
  const isDiscoverActive =
    pathname === '/explore' ||
    pathname.startsWith('/recipe') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/questions') ||
    pathname === '/restaurants';
  const isNutritionActive =
    (pathname === '/settings' && (location.search.includes('tab=calendar') || location.search.includes('tab=profile')));
  const isAiChefActive = pathname === '/ai-chef' || pathname === '/fridge-scan';
  const isPantryActive = pathname === '/fridge' || pathname === '/smart-market';

  const memberNavItems: { key: string; label: string; path: string; isActive: boolean }[] = [
    { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', isActive: isDashboardActive },
    { key: 'discover', label: 'Khám phá', path: '/explore', isActive: isDiscoverActive },
    { key: 'ai-chef', label: 'AI Bếp trưởng', path: '/ai-chef', isActive: isAiChefActive },
    { key: 'pantry', label: 'Kho nguyên liệu & Đi chợ', path: '/fridge', isActive: isPantryActive },
    { key: 'calendar', label: 'Lịch biểu & Thực đơn', path: '/settings?tab=calendar', isActive: isNutritionActive },
    { key: 'profile', label: 'Hồ sơ & Thể trạng', path: '/settings?tab=profile', isActive: pathname === '/settings' && location.search.includes('tab=profile') },
  ];

  const guestNavItems: { label: string; path: string; isActive: boolean }[] = [
    { label: 'Khám phá', path: '/explore', isActive: pathname === '/explore' || pathname.startsWith('/recipe') },
    { label: 'Blog', path: '/blog', isActive: pathname.startsWith('/blog') },
    { label: 'Hỏi đáp', path: '/questions', isActive: pathname.startsWith('/questions') },
    { label: 'Quán chay gần đây', path: '/restaurants', isActive: pathname === '/restaurants' },
  ];

  if (isAdmin) return <AdminLayout>{children}</AdminLayout>;

  return (
    <div className="vegeai-layout min-h-screen flex flex-col bg-[#fbfbf9] dark:bg-[#0b1118] text-[#19211d] dark:text-[#f1f5f9] font-sans transition-colors duration-200">
      {sessionError && (
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950/50 p-3 text-sm text-center text-amber-900 dark:text-amber-200 border-b border-amber-200 dark:border-amber-900"
        >
          {sessionError}{' '}
          <button onClick={retrySession} className="underline ml-2 font-bold cursor-pointer">
            Thử lại
          </button>
        </div>
      )}
      {logoutError && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/50 p-3 text-sm text-center text-rose-700 dark:text-rose-200 border-b border-rose-200 dark:border-rose-900"
        >
          {logoutError}
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="bg-white/95 dark:bg-[#121922]/95 backdrop-blur-md border-b border-[#e6e5de] dark:border-[#212c3b] sticky top-0 z-40 shadow-2xs transition-colors duration-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3 lg:gap-8">
            <button
              type="button"
              className="sm:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title={mobileMenu ? 'Đóng menu' : 'Mở menu'}
              aria-label={mobileMenu ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(value => !value)}
            >
              {mobileMenu ? <X size={21} /> : <Menu size={21} />}
            </button>
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center gap-2.5"
              aria-label="VEGEAI - Trang chủ"
            >
              <img src="/vegeai-logo.png" alt="VEGEAI" className="h-10 w-10 object-contain sm:h-11 sm:w-11" />
              <div className="hidden sm:block">
                <span className="text-lg font-black tracking-tight text-emerald-800 dark:text-emerald-400">
                  VEGE<span className="text-slate-900 dark:text-white">AI</span>
                </span>
                <span className="block text-[9.5px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                  Dinh dưỡng xanh thông minh
                </span>
              </div>
            </Link>
          </div>

          {/* Right Actions: Theme Toggle + Auth / Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Direct Theme Toggle Pill */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-xs font-semibold">Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline text-xs font-semibold">Tối</span>
                </>
              )}
            </button>

            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell />
                <UserMenu user={user} loggingOut={loggingOut} onLogout={handleLogout} />
              </div>
            )}
          </div>
        </div>

        {/* Primary Desktop Nav Strip (5 Core Groups) */}
        <nav
          aria-label="Điều hướng chính"
          className={`site-navigation max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#e6e5de] dark:border-[#212c3b] ${
            mobileMenu ? 'is-collapsed' : ''
          }`}
        >
          {isAuthenticated
            ? memberNavItems.map(item => (
                <Link
                  key={item.key}
                  to={item.path}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={`shrink-0 py-3 text-xs sm:text-sm transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                    item.isActive
                      ? 'text-emerald-800 dark:text-emerald-400 font-extrabold border-b-2 border-emerald-700 dark:border-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 font-semibold'
                  }`}
                >
                  {item.label}
                </Link>
              ))
            : guestNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={`shrink-0 py-3 text-xs sm:text-sm transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                    item.isActive
                      ? 'text-emerald-800 dark:text-emerald-400 font-extrabold border-b-2 border-emerald-700 dark:border-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 font-semibold'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
        </nav>

        {/* Sub-Navigation Strip (Contextual secondary tabs per functional group) */}
        {isAuthenticated && (
          <>
            {isDiscoverActive && (
              <div className="bg-[#f5f4ef] dark:bg-[#161f2b] border-t border-[#e6e5de] dark:border-[#212c3b] py-1.5 px-4 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-1 shrink-0">
                    Khám phá:
                  </span>
                  <Link
                    to="/explore"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/explore' || pathname.startsWith('/recipe')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Công thức món chay
                  </Link>
                  <Link
                    to="/blog"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname.startsWith('/blog')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Blog cộng đồng
                  </Link>
                  <Link
                    to="/videos"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname.startsWith('/videos')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Video nấu ăn
                  </Link>
                  <Link
                    to="/questions"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname.startsWith('/questions')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Hỏi đáp chuyên gia
                  </Link>
                </div>
              </div>
            )}

            {isNutritionActive && (
              <div className="bg-[#f5f4ef] dark:bg-[#161f2b] border-t border-[#e6e5de] dark:border-[#212c3b] py-1.5 px-4 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-1 shrink-0">
                    Lịch biểu & Dinh dưỡng:
                  </span>
                  <Link
                    to="/settings?tab=calendar"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/settings' && location.search.includes('tab=calendar')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Lịch ăn 30 ngày & Bữa ăn
                  </Link>
                  <Link
                    to="/settings?tab=profile"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/settings' && location.search.includes('tab=profile')
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Hồ sơ BMI & Vòng sức khỏe
                  </Link>
                </div>
              </div>
            )}


            {isAiChefActive && (
              <div className="bg-[#f5f4ef] dark:bg-[#161f2b] border-t border-[#e6e5de] dark:border-[#212c3b] py-1.5 px-4 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-1 shrink-0">
                    AI Bếp trưởng:
                  </span>
                  <Link
                    to="/ai-chef"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/ai-chef'
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Trò chuyện cùng AI Bếp Trưởng
                  </Link>
                  <Link
                    to="/fridge-scan"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/fridge-scan'
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Quét ảnh & Nhận diện tủ lạnh
                  </Link>
                </div>
              </div>
            )}

            {isPantryActive && (
              <div className="bg-[#f5f4ef] dark:bg-[#161f2b] border-t border-[#e6e5de] dark:border-[#212c3b] py-1.5 px-4 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-1 shrink-0">
                    Kho nguyên liệu:
                  </span>
                  <Link
                    to="/fridge"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/fridge'
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Tủ lạnh & Hạn sử dụng
                  </Link>
                  <Link
                    to="/smart-market"
                    className={`px-3 py-1 rounded-lg transition shrink-0 ${
                      pathname === '/smart-market'
                        ? 'bg-white dark:bg-[#121922] text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Danh sách đi chợ & Bản đồ quán chay
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <nav
            id="main-mobile-navigation"
            aria-label="Điều hướng di động"
            className="site-mobile-navigation sm:hidden grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-4 border-t border-[#e6e5de] dark:border-[#212c3b] text-slate-600 dark:text-slate-400 bg-white dark:bg-[#121922]"
          >
            {(isAuthenticated ? memberNavItems : guestNavItems).map(item => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileMenu(false)}
                className={`py-2 text-xs font-bold ${
                  item.isActive ? 'text-emerald-800 dark:text-emerald-400' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#121922] border-t border-[#e6e5de] dark:border-[#212c3b] py-8 text-xs text-slate-500 dark:text-slate-400 mt-16 transition-colors duration-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-300">
              © 2026 VEGEAI. Hệ sinh thái Dinh dưỡng & Ẩm thực Chay thông minh.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sức khoẻ của bạn - Cảm hứng từ thiên nhiên.</p>
          </div>
          <div className="flex items-center gap-5 text-xs font-medium">
            {isAuthenticated ? <>
            <Link to="/settings?tab=calendar" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Dinh dưỡng & Thực đơn
            </Link>
            <Link to="/fridge" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Kho nguyên liệu
            </Link>
            <Link to="/smart-market" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Đi chợ & Bản đồ
            </Link>
            <Link to="/ai-chef" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              AI Bếp trưởng
            </Link>
            </> : <Link to="/restaurants" className="hover:text-emerald-700 dark:hover:text-emerald-400">Quán chay gần đây</Link>}
            <Link to="/blog" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Cộng đồng
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
