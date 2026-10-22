import { useEffect, useState, useRef } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, type UserNotification } from '../services/notificationService';
import { sfx } from '../utils/soundEffects';

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Vừa xong' : new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function safeInternalPath(path?: string): string {
  return path?.startsWith('/') && !path.startsWith('//') ? path : '/';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prevCountRef = useRef(0);

  const refresh = async (includeItems: boolean) => {
    try {
      const count = await notificationService.unreadCount();
      if (count > prevCountRef.current && prevCountRef.current !== 0) {
        sfx.playNotification();
      }
      prevCountRef.current = count;
      setUnreadCount(count);
      if (includeItems) {
        const page = await notificationService.list();
        setItems(page.items);
      }
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải thông báo.');
    }
  };

  useEffect(() => {
    void refresh(false);
    const timer = window.setInterval(() => { void refresh(open); }, 60_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const toggle = async () => {
    const nextOpen = !open;
    sfx.playTap();
    setOpen(nextOpen);
    if (nextOpen) {
      setBusy(true);
      await refresh(true);
      setBusy(false);
    }
  };

  const markRead = async (notification: UserNotification) => {
    if (notification.isRead) return;
    try {
      const updated = await notificationService.markRead(notification.id);
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setUnreadCount(current => Math.max(0, current - 1));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đánh dấu thông báo đã đọc.');
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await notificationService.markAllRead();
      setItems(current => current.map(item => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đánh dấu tất cả thông báo đã đọc.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-xl p-2 text-gray-500 transition hover:bg-gray-50 hover:text-emerald-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>}
      </button>
      {open && <section
        role="dialog"
        aria-label="Thông báo hoạt động"
        className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div><h2 className="font-bold text-slate-800">Thông báo</h2><p className="text-xs text-slate-500">{unreadCount} chưa đọc</p></div>
          <button type="button" onClick={() => void markAllRead()} disabled={busy || unreadCount === 0} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 disabled:opacity-40">
            <CheckCheck size={15} /> Đọc tất cả
          </button>
        </div>
        {error && <p role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        {busy && items.length === 0 && <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Đang tải...</div>}
        {!busy && items.length === 0 && !error && <p className="p-8 text-center text-sm text-slate-500">Chưa có thông báo hoạt động.</p>}
        <div className="max-h-[min(65vh,480px)] overflow-y-auto">
          {items.map(item => <article key={item.id} className={`border-b border-gray-100 px-4 py-3 last:border-b-0 ${item.isRead ? 'bg-white' : 'bg-emerald-50/60'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-gray-300' : 'bg-emerald-600'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{item.content}</p>
                <time dateTime={item.createdAt} className="mt-2 block text-[11px] text-slate-400">{formatTime(item.createdAt)}</time>
                <div className="mt-2 flex gap-3">
                  <Link to={safeInternalPath(item.redirectUrl)} onClick={() => { void markRead(item); setOpen(false); }} className="text-xs font-semibold text-emerald-700">
                    Mở hoạt động
                  </Link>
                  {!item.isRead && <button type="button" onClick={() => void markRead(item)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700">
                    <Check size={13} /> Đánh dấu đã đọc
                  </button>}
                </div>
              </div>
            </div>
          </article>)}
        </div>
      </section>}
    </div>
  );
}
