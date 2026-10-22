import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Palette, ShieldCheck, Activity, CalendarDays } from 'lucide-react';
import type { User as AuthUser } from '../types/auth';

interface UserMenuProps {
  user: AuthUser | null;
  loggingOut: boolean;
  onLogout: () => void;
}

export function UserMenu({ user, loggingOut, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#121922] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
      >
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          {user?.name?.charAt(0).toUpperCase() || 'M'}
        </div>
        <span
          className="text-xs font-bold text-slate-800 dark:text-slate-100 hidden sm:block max-w-[150px] truncate"
          title={user?.name}
        >
          {user?.name || 'Thành viên'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id="user-menu"
          role="menu"
          className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200/90 dark:border-[#212c3b] bg-white dark:bg-[#121922] py-2.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User profile card header */}
          <div className="px-4 py-2.5 mb-1.5 border-b border-slate-100 dark:border-[#212c3b]">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                {user?.role === 'admin' ? 'Quản trị' : 'Thành viên'}
              </span>
            </div>
            {user?.emailOrPhone && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.emailOrPhone}</p>
            )}
          </div>

          {/* Links to Settings & Health Tabs */}
          <Link
            to="/settings?tab=profile"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="block font-semibold">Hồ sơ & Chỉ số sức khỏe</span>
              <span className="block text-[11px] text-slate-400">BMI, Calo TDEE, Vòng vận động, Dị ứng</span>
            </div>
          </Link>

          <Link
            to="/settings?tab=calendar"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="block font-semibold">Lịch biểu & Thực đơn</span>
              <span className="block text-[11px] text-slate-400">Theo dõi bữa ăn tuần & tháng cố định</span>
            </div>
          </Link>

          <Link
            to="/settings?tab=security"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="block font-semibold">Bảo mật & Đăng nhập</span>
              <span className="block text-[11px] text-slate-400">Đổi mật khẩu, 2FA OTP, Ghi nhớ 24h</span>
            </div>
          </Link>

          <Link
            to="/settings?tab=preferences"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="block font-semibold">Giao diện & Hệ thống</span>
              <span className="block text-[11px] text-slate-400">Chế độ Sáng / Tối, bản đồ</span>
            </div>
          </Link>

          <div className="my-1.5 border-t border-slate-100 dark:border-[#212c3b]" />

          {/* Logout button */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-2 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
