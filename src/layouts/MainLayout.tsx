import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import vegeaiLogo from '../assets/vegeai-logo.jpg';
import { useDemoState } from '../hooks/useDemoState';
import { DEMO_NOTIFICATIONS } from '../data/demoWorkspaceData';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isPreviewSession,
    isLoading,
    logout,
    startPreviewSession,
    endPreviewSession
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useDemoState('notifications', DEMO_NOTIFICATIONS);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const isCurrent = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    } else {
      setLogoutError(result.error || 'Đăng xuất chưa hoàn tất trên máy chủ.');
    }
  };

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
          <span className="font-medium">Trạng thái giao diện:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-semibold ${
              isPreviewSession
                ? 'bg-violet-100 text-violet-800'
                : isAuthenticated
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isPreviewSession
              ? 'FE DEMO — không xác thực với BE'
              : isAuthenticated
                ? 'Đã đăng nhập bằng BE'
                : 'Khách — chưa đăng nhập'}
          </span>
          <span className="hidden md:inline text-amber-700">
            {isPreviewSession
              ? '| Chỉ kiểm tra giao diện; API cần đăng nhập BE sẽ không hoạt động.'
              : '| Đăng nhập và đăng ký sẽ xác thực trực tiếp với backend.'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {import.meta.env.DEV && !isLoading && (!isAuthenticated || isPreviewSession) && (
            <>
              <button
                type="button"
                onClick={() => {
                  startPreviewSession('user');
                  navigate('/dashboard');
                }}
                className="px-2.5 py-1 text-xs rounded bg-white border border-violet-300 hover:bg-violet-50 text-violet-900 font-medium transition cursor-pointer shadow-2xs"
              >
                Demo khách hàng
              </button>
              <button
                type="button"
                onClick={() => {
                  startPreviewSession('admin');
                  navigate('/admin');
                }}
                className="px-2.5 py-1 text-xs rounded bg-violet-700 border border-violet-700 hover:bg-violet-800 text-white font-semibold transition cursor-pointer shadow-2xs"
              >
                Demo Admin
              </button>
            </>
          )}
          {import.meta.env.DEV && isPreviewSession && (
            <button
              type="button"
              onClick={() => {
                endPreviewSession();
                navigate('/login');
              }}
              className="px-2.5 py-1 text-xs rounded bg-white border border-violet-300 hover:bg-violet-50 text-violet-900 font-medium transition cursor-pointer shadow-2xs"
            >
              Thoát FE demo
            </button>
          )}
          {logoutError && <span className="text-red-700">{logoutError}</span>}
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-slate-800 font-bold text-xl tracking-tight">
              {/* Keep the supplied mascot visible in the shared navigation on every screen. */}
              <div className="w-10 h-10 rounded-full bg-white overflow-hidden border border-emerald-100 shadow-sm">
                <img src={vegeaiLogo} alt="VEGEAI" className="w-full h-full object-cover" />
              </div>
              <span>VEGEAI</span>
            </Link>

            {/* Nav Menu */}
            <nav className="hidden 2xl:flex items-center gap-4 text-sm font-medium text-gray-600">
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
                  <Link to="/ai-assistant" className="hover:text-emerald-600 transition">
                    Nguyên liệu
                  </Link>
                  <Link to="/ai-assistant" className="hover:text-emerald-600 transition">
                    AI Bếp Trưởng
                  </Link>
                  <Link to="/meal-plan" className="hover:text-emerald-600 transition">
                    Kế Hoạch Tuần
                  </Link>
                  <Link to="/grocery-list" className="hover:text-emerald-600 transition">
                    Đi Chợ
                  </Link>
                  <Link to="/onboarding" className="hover:text-emerald-600 transition">
                    Hồ sơ
                  </Link>
                  <Link to="/saved-recipes" className="hover:text-emerald-600 transition">
                    Món đã lưu
                  </Link>
                  <Link to="/reviews" className="hover:text-emerald-600 transition">
                    Đánh giá
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="hover:text-emerald-600 transition">
                      Quản trị
                    </Link>
                  )}
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
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 2xl:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
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
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Mở thông báo, ${unreadCount} thông báo chưa đọc`}
                    aria-expanded={notificationOpen}
                    onClick={() => setNotificationOpen((open) => !open)}
                    className="relative rounded-xl p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
                  </button>
                  {notificationOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-[min(90vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-100 p-4">
                        <h2 className="font-bold text-slate-900">Thông báo mới</h2>
                        <button type="button" onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))} className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCheck className="h-4 w-4" />Đánh dấu đã đọc</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.slice(0, 3).map((notification) => (
                          <button key={notification.id} type="button" onClick={() => { setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, unread: false } : item)); setNotificationOpen(false); navigate(notification.href); }} className={`flex w-full gap-3 border-b border-slate-50 p-4 text-left hover:bg-emerald-50 ${notification.unread ? 'bg-emerald-50/50' : ''}`}>
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.unread ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                            <span><span className="block text-sm font-semibold text-slate-900">{notification.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{notification.description}</span><span className="mt-1 block text-[10px] text-slate-400">{notification.time}</span></span>
                          </button>
                        ))}
                      </div>
                      <Link to="/notifications" onClick={() => setNotificationOpen(false)} className="block p-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Xem tất cả thông báo</Link>
                    </div>
                  )}
                </div>

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
                  onClick={handleLogout}
                  className="text-xs text-red-500 hover:underline cursor-pointer ml-1 font-medium"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

        </div>
        {/* Keep all primary destinations reachable on narrow screens as well as desktop. */}
        {mobileMenuOpen && (
          <nav className="grid gap-1 border-t border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 2xl:hidden">
            {[
              ['Khám phá công thức', '/'],
              ['Trợ lý AI', '/ai-assistant'],
              ['Kế hoạch tuần', '/meal-plan'],
              ['Danh sách đi chợ', '/grocery-list'],
              ['Hồ sơ dinh dưỡng', '/onboarding'],
              ['Công thức đã lưu', '/saved-recipes'],
              ['Đánh giá', '/reviews'],
              ['Thông báo', '/notifications'],
              ['Blog', '/blog'],
              ['Quán chay gần đây', '/restaurants'],
              ...(user?.role === 'admin' ? [['Quản trị', '/admin']] : [])
            ].map(([label, path]) => (
              <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800">
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-xs text-gray-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <img src={vegeaiLogo} alt="" className="h-7 w-7 rounded-full object-cover" />
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
