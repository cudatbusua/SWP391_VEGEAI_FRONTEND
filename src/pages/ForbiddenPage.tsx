import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut, ArrowLeft } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';

/**
 * 403 Forbidden Access Page:
 * Rendered when a user tries to access a protected URL without appropriate permissions.
 */
export const ForbiddenPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const attemptedPath = (location.state as { attemptedPath?: string })?.attemptedPath || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-stone-200 dark:border-slate-700 p-8 text-center transition-all">
          <div className="w-16 h-16 mx-auto mb-5 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
            <ShieldAlert size={36} />
          </div>

          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-full mb-3 border border-red-200/50 dark:border-red-900/50">
            Mã lỗi 403 • Truy cập bị từ chối
          </span>

          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
            Không Có Quyền Truy Cập
          </h1>

          <p className="text-stone-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
            {attemptedPath ? (
              <>
                Bạn đang cố gắng truy cập đường dẫn <code className="px-1.5 py-0.5 bg-stone-100 dark:bg-slate-700 rounded text-red-600 dark:text-red-400 font-mono text-xs">{attemptedPath}</code> nhưng tài khoản hiện tại không có quyền hạn này.
              </>
            ) : (
              'Bạn không được cấp thẩm quyền để truy cập vào tài nguyên hoặc giao diện quản trị này.'
            )}
          </p>

          <div className="bg-stone-50 dark:bg-slate-900/40 rounded-xl p-4 mb-6 text-left border border-stone-200/80 dark:border-slate-700 text-xs text-stone-600 dark:text-slate-400 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 dark:text-slate-400 font-medium">Tài khoản:</span>
              <span className="font-semibold text-stone-800 dark:text-slate-200">
                {isAuthenticated ? (user?.name || user?.username || 'Đã đăng nhập') : 'Khách vãng lai'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 dark:text-slate-400 font-medium">Vai trò hiện tại:</span>
              <span className="font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400">
                {user?.role || 'GUEST'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-stone-200/60 dark:border-slate-700/60 pt-2">
              <span className="text-stone-500 dark:text-slate-400 font-medium">Yêu cầu bảo mật:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">Chỉ Quản trị viên (ADMIN)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-600 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 font-medium text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Quay lại
            </button>

            <Link
              to={user?.role === 'admin' ? '/admin' : '/dashboard'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <Home size={16} />
              Về bảng điều khiển
            </Link>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium text-sm transition-colors"
              >
                <LogOut size={16} />
                Đổi tài khoản
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
