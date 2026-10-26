import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Palette, Settings, ShieldCheck } from 'lucide-react';

const links = [
  { tab: 'security', label: 'Bảo mật & Đăng nhập', desc: 'Đổi mật khẩu, mã OTP, quản lý tài khoản', icon: ShieldCheck },
  { tab: 'preferences', label: 'Giao diện & Hệ thống', desc: 'Chế độ Sáng / Tối, bản đồ định vị', icon: Palette },
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const currentTab = location.pathname === '/settings' ? new URLSearchParams(location.search).get('tab') : null;
  const onSettings = links.some(link => link.tab === currentTab);

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
        title="Cài đặt"
        aria-label="Cài đặt"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="settings-menu"
        className={`w-10 h-10 flex items-center justify-center rounded-full border transition cursor-pointer shadow-2xs ${
          open || onSettings
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
            : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#121922] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <Settings className={`w-4 h-4 transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>

      {open && (
        <div
          id="settings-menu"
          role="menu"
          className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200/90 dark:border-[#212c3b] bg-white dark:bg-[#121922] py-2.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <p className="px-4 pt-1 pb-2 mb-1.5 border-b border-slate-100 dark:border-[#212c3b] text-sm font-extrabold text-slate-900 dark:text-white">
            Cài đặt
          </p>
          {links.map(({ tab, label, desc, icon: Icon }) => (
            <Link
              key={tab}
              to={`/settings?tab=${tab}`}
              role="menuitem"
              aria-current={currentTab === tab ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-medium transition hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-400 ${
                currentTab === tab ? 'bg-emerald-50/80 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="block font-semibold">{label}</span>
                <span className="block text-[11px] text-slate-400">{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
