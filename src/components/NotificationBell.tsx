import { useEffect, useState, useRef, useMemo } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, type UserNotification } from '../services/notificationService';
import { openNotificationStream } from '../services/apiClient';
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

  // Realtime push: refresh the badge as soon as the server stores a notification (no 60s wait).
  useEffect(() => {
    const controller = new AbortController();
    let retry: number | undefined;
    const connect = async (attempt: number) => {
      try {
        await openNotificationStream(payload => {
          const notification = payload as UserNotification;
          sfx.playNotification();
          setUnreadCount(current => current + 1);
          setItems(current => (current.some(item => item.id === notification.id) ? current : [notification, ...current].slice(0, 20)));
        }, controller.signal);
      } catch {
        if (controller.signal.aborted) return;
        retry = window.setTimeout(() => void connect(attempt + 1), Math.min(30_000, 2_000 * (attempt + 1)));
      }
    };
    void connect(0);
    return () => {
      controller.abort();
      if (retry) window.clearTimeout(retry);
    };
  }, []);

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

  // Deduplicate identical spam notifications (e.g. repeated profile updates)
  const displayedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${item.title}::${item.content}::${item.isRead}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-xl p-2 text-gray-500 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>}
      </button>
      {open && <section
        role="dialog"
        aria-label="Thông báo hoạt động"
        className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#121922] shadow-xl dark:shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-4 py-3">
          <div><h2 className="font-bold text-slate-800 dark:text-white">Thông báo</h2><p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} chưa đọc</p></div>
          <button type="button" onClick={() => void markAllRead()} disabled={busy || unreadCount === 0} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-40">
            <CheckCheck size={15} /> Đọc tất cả
          </button>
        </div>
        {error && <p role="alert" className="m-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">{error}</p>}
        {busy && displayedItems.length === 0 && <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-slate-400"><Loader2 size={17} className="animate-spin" />Đang tải...</div>}
        {!busy && displayedItems.length === 0 && !error && <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Chưa có thông báo hoạt động.</p>}
        <div className="max-h-[min(65vh,480px)] overflow-y-auto">
          {displayedItems.map(item => <article key={item.id} className={`border-b border-gray-100 dark:border-slate-800/80 px-4 py-3 last:border-b-0 transition-colors ${item.isRead ? 'bg-white dark:bg-[#121922]' : 'bg-emerald-50/60 dark:bg-emerald-950/30'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-gray-300 dark:bg-slate-700' : 'bg-emerald-600 dark:bg-emerald-400'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600 dark:text-slate-300">{item.content}</p>
                <time dateTime={item.createdAt} className="mt-2 block text-[11px] text-slate-400 dark:text-slate-500">{formatTime(item.createdAt)}</time>
                <div className="mt-2 flex gap-3">
                  <Link to={safeInternalPath(item.redirectUrl)} onClick={() => { void markRead(item); setOpen(false); }} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
                    Mở hoạt động
                  </Link>
                  {!item.isRead && <button type="button" onClick={() => void markRead(item)} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400">
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
