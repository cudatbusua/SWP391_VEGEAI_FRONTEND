import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, FilePenLine, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, ShieldMinus, ShieldPlus, UnlockKeyhole, Users, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { CommunityConfirm } from '../components/CommunityUi';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { adminService } from '../services/adminService';
import { blogService } from '../services/blogService';
import { communityService } from '../services/communityService';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import { videoThumbnail } from '../utils/communityVideo';
import type { AccountStatus, AdminUserRole, UserProfile } from '../types/api';

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: 'Hoạt động', PENDING_VERIFICATION: 'Chờ xác minh', LOCKED: 'Bị khóa', DISABLED: 'Vô hiệu hóa',
};
const number = (value: number | undefined) => value === undefined ? '--' : value.toLocaleString('vi-VN');
type Change = { user: UserProfile; kind: 'status' | 'role'; nextStatus?: AccountStatus; nextRole?: AdminUserRole };

export function AdminPage({ accountsOnly = false }: { accountsOnly?: boolean }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowed = isAuthenticated && user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState<AdminUserRole | ''>('');
  const [status, setStatus] = useState<AccountStatus | ''>('');
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<Change | null>(null);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const stats = useCommunityQuery('admin-stats:' + user?.id, signal => adminService.stats(signal), allowed);
  const accounts = useCommunityQuery(JSON.stringify(['admin-accounts', user?.id, accountsOnly, keyword, role, status, page]),
    signal => adminService.users({ page, size: accountsOnly ? 10 : 5, search: keyword, role, status }, signal), allowed);
  const content = useCommunityQuery('admin-overview:' + user?.id, async signal => {
    const [recipes, videos, blog, questions] = await Promise.all([
      recipeService.filter({ page: 0, size: 1 }, signal),
      communityService.adminVideos({ status: 'PUBLISHED', page: 0 }, signal),
      blogService.queue('PENDING_REVIEW', '', 0, signal),
      communityService.questionQueue('PENDING', '', 0, signal),
    ]);
    return { recipes, videos, blog, questions };
  }, allowed && !accountsOnly);
  const reload = () => { stats.refresh(); accounts.refresh(); if (!accountsOnly) content.refresh(); };
  const confirm = async () => {
    if (!pending || mutating) return;
    setMutating(true); setError(''); setMessage('');
    try {
      if (pending.kind === 'status' && pending.nextStatus) {
        await adminService.updateStatus(pending.user.userId, pending.nextStatus, 'Updated from admin workspace');
      } else if (pending.nextRole) {
        await adminService.updateRole(pending.user.userId, pending.nextRole);
      }
      setPending(null); setMessage('Đã cập nhật tài khoản.'); stats.refresh(); accounts.refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setMutating(false); }
  };
  if (isLoading) return <MainLayout><p className="admin-inline-state" role="status">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowed) return <MainLayout><p role="alert" className="p-8">Bạn cần quyền admin để truy cập trang này.</p></MainLayout>;

  const counts = stats.data;
  const overview = content.data;
  const total = counts?.totalUsers ?? 0;
  const rate = total ? Math.round((counts?.activeUsers ?? 0) / total * 100) : 0;
  const bars = [
    { label: 'Hoạt động', value: counts?.activeUsers ?? 0, color: '#0ba475' },
    { label: 'Chờ xác minh', value: counts?.pendingUsers ?? 0, color: '#d9aa45' },
    { label: 'Bị khóa', value: counts?.lockedUsers ?? 0, color: '#cc7a84' },
    { label: 'Vô hiệu hóa', value: counts?.disabledUsers ?? 0, color: '#9aa9a1' },
  ];
  const awaiting = overview ? overview.blog.totalElements + overview.questions.totalElements : undefined;
  const feedback = (text: string, retry: () => void) => <div className="admin-inline-state error" role="alert">{text}<button type="button" onClick={retry}>Thử lại</button></div>;
  const metrics = accountsOnly ? [
    { label: 'Tổng tài khoản', value: counts?.totalUsers, icon: Users, tone: '' },
    { label: 'Đang hoạt động', value: counts?.activeUsers, icon: Check, tone: 'cyan' },
    { label: 'Chờ xác minh', value: counts?.pendingUsers, icon: ShieldCheck, tone: 'amber' },
    { label: 'Bị khóa', value: counts?.lockedUsers, icon: LockKeyhole, tone: 'rose' },
  ] : [
    { label: 'Tổng tài khoản', value: counts?.totalUsers, icon: Users, tone: '' },
    { label: 'Công thức công khai', value: overview?.recipes.totalElements, icon: BookOpen, tone: 'cyan' },
    { label: 'Video công khai', value: overview?.videos.totalElements, icon: Video, tone: 'amber' },
    { label: 'Nội dung chờ duyệt', value: awaiting, icon: ShieldCheck, tone: 'rose' },
  ];

  const userTable = <section className="admin-section" aria-label="Quản lý tài khoản">
    <div className="admin-section-heading"><h2>{accountsOnly ? 'Danh sách tài khoản' : 'Tài khoản mới nhất'}</h2>{!accountsOnly && <Link to="/admin/users">Xem tất cả <ArrowRight size={13} /></Link>}</div>
    <form className="admin-user-filters" onSubmit={event => { event.preventDefault(); setKeyword(search.trim()); setPage(0); }}>
      <label className="admin-search-field"><Search size={15} /><input aria-label="Tìm tài khoản" placeholder="Tìm tên hoặc email..." value={search} maxLength={150} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label="Vai trò tài khoản" value={role} onChange={event => { setRole(event.target.value as AdminUserRole | ''); setPage(0); }}><option value="">Mọi vai trò</option><option value="MEMBER">Thành viên</option><option value="ADMIN">Quản trị viên</option></select>
      <select aria-label="Trạng thái tài khoản" value={status} onChange={event => { setStatus(event.target.value as AccountStatus | ''); setPage(0); }}><option value="">Mọi trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button type="submit" className="admin-btn secondary"><Search size={13} />Lọc</button>
    </form>
    {accounts.busy ? <p className="admin-inline-state" role="status">Đang tải tài khoản...</p> : accounts.error ? feedback(accounts.error, accounts.refresh) :
      !accounts.data?.items.length ? <p className="admin-inline-state">Không có tài khoản phù hợp.</p> :
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Người dùng</th>{accountsOnly && <th>Email</th>}<th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {accounts.data.items.map(item => {
          const isSelf = item.userId === user.id;
          const canStatus = !isSelf && item.role !== 'ADMIN';
          return <tr key={item.userId}><td><div className="admin-table-person"><span className="admin-table-avatar">{(item.fullName || item.username).charAt(0).toUpperCase()}</span><span className="admin-table-name">{item.fullName || item.username}<small>{isSelf ? 'Tài khoản của bạn' : '@' + item.username}</small></span></div></td>
            {accountsOnly && <td>{item.email}</td>}<td><span className={'admin-role' + (item.role === 'ADMIN' ? ' is-admin' : '')}>{item.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}</span></td>
            <td><span className={'admin-status ' + item.status.toLowerCase()}>{statusLabels[item.status as AccountStatus] || item.status}</span></td>
            <td><div className="admin-table-actions">
              <button type="button" title={!canStatus ? 'Không thể khóa tài khoản quản trị viên' : item.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} aria-label={(item.status === 'ACTIVE' ? 'Khóa ' : 'Mở khóa ') + item.username} disabled={!canStatus || mutating} className={item.status === 'ACTIVE' ? 'is-lock' : ''} onClick={() => { setError(''); setPending({ user: item, kind: 'status', nextStatus: item.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' }); }}>{item.status === 'ACTIVE' ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}</button>
              <button type="button" title={isSelf ? 'Không thể tự đổi vai trò' : item.role === 'ADMIN' ? 'Chuyển thành thành viên' : 'Cấp quyền quản trị viên'} aria-label={'Đổi vai trò ' + item.username} disabled={isSelf || mutating} onClick={() => { setError(''); setPending({ user: item, kind: 'role', nextRole: item.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' }); }}>{item.role === 'ADMIN' ? <ShieldMinus size={14} /> : <ShieldPlus size={14} />}</button>
            </div></td></tr>;
        })}
      </tbody></table></div>}
    {accounts.data && !accounts.busy && !accounts.error && <div className="admin-table-foot"><span>{number(accounts.data.totalElements)} tài khoản{keyword ? ' phù hợp' : ''}</span><nav className="admin-pagination" aria-label="Phân trang tài khoản"><button type="button" title="Trang tài khoản trước" aria-label="Trang tài khoản trước" disabled={accounts.data.first || page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button><span>{accounts.data.totalPages ? page + 1 : 0} / {accounts.data.totalPages}</span><button type="button" title="Trang tài khoản sau" aria-label="Trang tài khoản sau" disabled={accounts.data.last || accounts.data.totalPages <= page + 1} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button></nav></div>}
  </section>;

  return <MainLayout><div className="admin-dashboard">
    <header className="admin-page-heading"><div><h1>{accountsOnly ? 'Quản lý tài khoản' : 'Quản trị hệ thống'}</h1><p>{accountsOnly ? 'Thành viên, quyền truy cập và trạng thái tài khoản.' : 'Tổng quan cộng đồng và nội dung VEGEAI.'}</p></div><div className="admin-heading-actions"><span className="admin-updated">Dữ liệu từ hệ thống</span><button type="button" className="admin-btn secondary" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu" disabled={stats.busy || accounts.busy || (!accountsOnly && content.busy)} onClick={reload}><RefreshCw size={15} /><span>Làm mới</span></button></div></header>
    {message && <p role="status" className="admin-feedback">{message}</p>}{error && !pending && <p role="alert" className="admin-feedback error">{error}</p>}
    {stats.error && feedback(stats.error, stats.refresh)}
    {!accountsOnly && content.error && feedback(content.error, content.refresh)}
    <dl className="admin-stats-grid">{metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className={'admin-stat ' + tone}><div><dt>{label}</dt><dd>{number(value)}</dd></div><span className="admin-stat-icon"><Icon size={23} strokeWidth={1.6} /></span></div>)}</dl>
    {!accountsOnly && <div className="admin-overview-grid">
      <section className="admin-section"><div className="admin-section-heading"><h2>Phân bố tài khoản</h2><span>Theo trạng thái hiện tại</span></div>
        {stats.busy ? <p className="admin-inline-state" role="status">Đang tải thống kê...</p> : counts ? <div className="admin-account-chart"><div className="admin-chart-key"><span><i style={{background:'#0ba475'}} />Đang hoạt động</span><span><i style={{background:'#d9aa45'}} />Cần theo dõi</span></div>
          {bars.map(bar => <div key={bar.label} className="admin-bar-row"><span>{bar.label}</span><div className="admin-bar-track" role="meter" aria-label={bar.label} aria-valuenow={bar.value} aria-valuemin={0} aria-valuemax={Math.max(total, 1)}><div style={{width:(total ? Math.min(100, bar.value / total * 100) : 0) + '%',background:bar.color}} /></div><strong>{number(bar.value)}</strong></div>)}
          <dl className="admin-chart-summary"><div><dt>Thành viên</dt><dd>{number(counts.memberCount)}</dd></div><div><dt>Quản trị viên</dt><dd>{number(counts.adminCount)}</dd></div><div><dt>Tỷ lệ hoạt động</dt><dd>{rate}<small>%</small></dd></div></dl>
        </div> : <p className="admin-inline-state">Chưa tải được thống kê tài khoản.</p>}
      </section>
      <section className="admin-queue" aria-label="Hàng chờ kiểm duyệt"><div className="admin-queue-head"><div><h2>Hàng chờ kiểm duyệt 2 lớp</h2><p>AI Kiểm duyệt (Lớp 1) → Admin Duyệt (Lớp 2)</p><div className="admin-queue-total">{number(awaiting)}<small>nội dung chờ duyệt</small></div></div><ShieldCheck size={32} strokeWidth={1.4} /></div>
        <div className="admin-queue-links"><Link to="/admin/blog"><FilePenLine size={17} />Bài đăng Cộng đồng<strong>{number(overview?.blog.totalElements)}</strong><ChevronRight size={14} /></Link><Link to="/admin/questions"><CircleHelp size={17} />Cần hỗ trợ<strong>{number(overview?.questions.totalElements)}</strong><ChevronRight size={14} /></Link></div>
        <div className="admin-queue-foot"><ShieldCheck size={13} />AI kiểm duyệt trước · Admin duyệt công khai</div>
      </section>
    </div>}
    {accountsOnly ? userTable : <div className="admin-lower-grid">{userTable}<section className="admin-section"><div className="admin-section-heading"><h2>Video Bếp Chay Cộng đồng</h2><Link to="/admin/videos">Quản lý <ArrowRight size={13} /></Link></div>
      {content.busy ? <p className="admin-inline-state" role="status">Đang tải video...</p> : content.error ? <p className="admin-inline-state">Chưa tải được video.</p> : !overview?.videos.items.length ? <p className="admin-inline-state">Chưa có video công khai.</p> :
        <div className="admin-videos-list">{overview.videos.items.slice(0, 3).map(video => <Link className="admin-video-item" key={video.id} to={'/admin/videos/' + video.id + '/edit'}><img className="admin-video-image" src={videoThumbnail(video.videoUrl, video.thumbnailUrl)} alt={video.title} loading="lazy" onError={event => { if (!event.currentTarget.src.endsWith('/images/vietnamese-vegan-table.png')) event.currentTarget.src = '/images/vietnamese-vegan-table.png'; }} /><div><h3>{video.title}</h3><p>{video.createdBy} · Công khai</p></div></Link>)}</div>}
    </section></div>}
    {!accountsOnly && <nav aria-label="Tạo nội dung" className="admin-quick-actions"><Link to="/admin/recipes"><Plus size={14} />Công thức mới</Link><Link to="/blog/write"><FilePenLine size={14} />Đăng bài Cộng đồng</Link><Link to="/admin/videos/new"><Video size={14} />Thêm Video Bếp Chay</Link><Link to="/restaurants"><Plus size={14} />Thêm Quán / Điện Máy Xanh lên Map</Link></nav>}
    <CommunityConfirm open={!!pending} title={pending?.kind === 'role' ? 'Thay đổi vai trò tài khoản?' : pending?.nextStatus === 'LOCKED' ? 'Khóa tài khoản này?' : 'Mở lại tài khoản?'} busy={mutating} destructive={pending?.nextStatus === 'LOCKED'} onCancel={() => { setPending(null); setError(''); }} onConfirm={confirm}>
      <p>{pending?.kind === 'role' ? pending.nextRole === 'ADMIN' ? 'Tài khoản sẽ được cấp quyền quản lý nội dung và tài khoản trên hệ thống.' : 'Tài khoản sẽ trở về quyền thành viên và không còn truy cập khu quản trị.' : pending?.nextStatus === 'LOCKED' ? 'Người dùng sẽ không thể sử dụng các chức năng cần đăng nhập cho đến khi được mở khóa.' : 'Tài khoản sẽ được chuyển sang trạng thái hoạt động.'}</p>
      {pending && <div className="admin-modal-summary"><strong>{pending.user.fullName || pending.user.username}</strong><div>{pending.user.email}</div></div>}
      {error && <p role="alert" className="admin-feedback error">{error}</p>}
    </CommunityConfirm>
  </div></MainLayout>;
}
