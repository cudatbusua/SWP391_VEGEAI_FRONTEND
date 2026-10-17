import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ChevronRight, CircleHelp, FilePenLine, LayoutDashboard, Leaf, LogOut, MapPin, Menu, PanelLeftClose, Search, ShieldCheck, Users, Video, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../styles/admin.css';

const items = [
  { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard, section: 'workspace' },
  { path: '/admin/users', label: 'Tài khoản', icon: Users, section: 'workspace' },
  { path: '/admin/recipes', label: 'Công thức & dinh dưỡng', icon: BookOpen, section: 'content' },
  { path: '/admin/blog', label: 'Cộng đồng (AI & Admin duyệt)', icon: FilePenLine, section: 'content' },
  { path: '/admin/videos', label: 'Kho Video Bếp Chay', icon: Video, section: 'content' },
  { path: '/restaurants', label: 'Bản đồ Quán & Điện Máy Xanh', icon: MapPin, section: 'content' },
  { path: '/admin/questions', label: 'Cần hỗ trợ', icon: CircleHelp, section: 'content' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, sessionError, retrySession } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 899px)').matches);
  const [search, setSearch] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const active = (path: string) => pathname === path || (path !== '/admin' && pathname.startsWith(path + '/')) || (path === '/admin/blog' && (pathname === '/blog' || pathname.startsWith('/blog/')));
  const current = items.find(item => active(item.path));
  useEffect(() => { setOpen(false); setSearch(''); if (open) menu.current?.focus(); }, [pathname]);
  useEffect(() => {
    const media = matchMedia('(min-width: 900px)');
    const close = () => { setMobile(!media.matches); if (media.matches) setOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menu.current?.focus(); }
      if (event.key !== 'Tab') return;
      const targets = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a,button,input') || []).filter(element => element.offsetParent !== null && !element.hasAttribute('disabled'));
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); };
  }, [open]);
  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setError('');
    try { const result = await logout(); if (!result.success) setError(result.error || 'Không thể đăng xuất.'); }
    catch { setError('Không thể đăng xuất. Vui lòng thử lại.'); }
    finally { setLoggingOut(false); }
  };
  const toggleMenu = () => {
    if (matchMedia('(max-width: 899px)').matches) setOpen(value => !value);
    else setCollapsed(value => !value);
  };
  const normalized = search.trim().toLocaleLowerCase('vi');
  const visible = items.filter(item => item.label.toLocaleLowerCase('vi').includes(normalized));
  return <div className={'admin-app' + (collapsed ? ' admin-is-compact' : '')}>
    <a className="admin-skip" href="#admin-main">Đến nội dung chính</a>
    {open && <button type="button" className="admin-overlay" aria-label="Đóng menu quản trị" onClick={() => { setOpen(false); menu.current?.focus(); }} />}
    <aside ref={sidebar} className={'admin-sidebar' + (open ? ' is-open' : '')} role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label="Menu quản trị" id="admin-sidebar" inert={mobile && !open}>
      <div className="admin-brand-row"><Link to="/admin" className="admin-brand" title="VEGEAI Admin"><span className="admin-brand-mark"><Leaf size={23} /></span><span className="admin-brand-text">VEGEAI<small>ADMIN WORKSPACE</small></span></Link><button type="button" className="admin-sidebar-close" title="Đóng menu" aria-label="Đóng menu" onClick={() => { setOpen(false); menu.current?.focus(); }}><X size={20} /></button></div>
      <label className="admin-menu-search"><Search size={16} /><input aria-label="Tìm mục quản lý" placeholder="Tìm mục quản lý..." value={search} onChange={event => setSearch(event.target.value)} /></label>
      <nav aria-label="Điều hướng quản trị" className="admin-navigation">
        {(['workspace', 'content'] as const).map(section => <div key={section} className="admin-nav-group"><p>{section === 'workspace' ? 'KHÔNG GIAN LÀM VIỆC' : 'QUẢN LÝ NỘI DUNG'}</p>{visible.filter(item => item.section === section).map(({ path, label, icon: Icon }) => <Link key={path} to={path} title={label} aria-label={label} aria-current={active(path) ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{active(path) && <ChevronRight size={14} className="admin-nav-chevron" />}</Link>)}</div>)}
        {visible.length === 0 && <p className="admin-menu-empty">Không tìm thấy mục.</p>}
      </nav>
      <div className="admin-sidebar-bottom"><div className="admin-access-note"><ShieldCheck size={17} /><div>Quản trị viên<span>VEGEAI Management</span></div></div><button type="button" className="admin-signout" title="Đăng xuất" aria-label="Đăng xuất" disabled={loggingOut} onClick={signOut}><LogOut size={18} /><span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span></button></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar"><div className="admin-topbar-start"><button ref={menu} type="button" className="admin-icon-button" title={mobile ? 'Mở menu quản trị' : collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} aria-label="Đóng mở menu quản trị" aria-controls="admin-sidebar" aria-expanded={mobile ? open : !collapsed} onClick={toggleMenu}>{mobile || collapsed ? <Menu size={20} /> : <PanelLeftClose size={20} />}</button><div className="admin-breadcrumb"><span>Quản trị</span><ChevronRight size={14} /><strong>{current?.label || 'Nội dung'}</strong></div></div>
        <div className="admin-topbar-actions"><Link to="/blog/write" className="admin-compose" title="Viết bài Blog"><FilePenLine size={16} /><span>Viết bài</span></Link><Link to="/" className="admin-website" title="Xem website"><span>Xem website</span><ArrowUpRight size={17} /></Link><div className="admin-topbar-divider" /><div className="admin-user"><span className="admin-user-avatar">{user?.name?.charAt(0).toUpperCase() || 'A'}</span><span className="admin-user-info"><strong>{user?.name || 'Admin'}</strong><small>Quản trị viên</small></span></div></div>
      </header>
      {sessionError && <div role="alert" className="admin-global-alert">{sessionError}<button onClick={retrySession}>Thử lại</button></div>}
      {error && <div role="alert" className="admin-global-alert">{error}</div>}
      <main id="admin-main" className="admin-main" tabIndex={-1}>{children}</main>
      <footer className="admin-footer"><span>VEGEAI <span className="admin-footer-dot">/</span> Không gian quản trị</span><span>Ẩm thực xanh, cộng đồng lành mạnh.</span></footer>
    </div>
  </div>;
}
