import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, CircleHelp, KeyRound, LayoutDashboard, LogOut } from 'lucide-react';
import type { User } from '../types/auth';

interface UserMenuProps {
  user: User | null;
  loggingOut: boolean;
  onLogout: () => void;
}

const menuItems = [
  { to: '/dashboard?tab=profile', label: 'Dashboard & Hồ sơ dinh dưỡng', icon: LayoutDashboard },
  { to: '/support', label: 'Cần hỗ trợ & Giải đáp', icon: CircleHelp },
  { to: '/change-password', label: 'Đổi mật khẩu', icon: KeyRound },
];

export function UserMenu({ user, loggingOut, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full bg-[#005f3e] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
          {user?.name?.charAt(0) || 'M'}
        </div>
        <span className="text-xs font-bold text-gray-800 hidden sm:block max-w-[160px] truncate" title={user?.name}>
          {user?.name || 'Nguyễn Hoàng Minh'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id="user-menu" role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-lg z-50">
          <div className="px-4 pb-2 mb-1 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
            {user?.emailOrPhone && <p className="text-xs text-gray-500 truncate">{user.emailOrPhone}</p>}
          </div>
          {menuItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800">
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      )}
    </div>
  );
}
