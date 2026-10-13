import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Search, Activity } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/adminService';
import { errorMessage } from '../services/apiClient';
import type { AccountStatus, AdminDashboardStats, AdminUserRole, AiAuditLogEntry, AiOpsStatus, UserProfile } from '../types/api';

const statusLabels: Record<AccountStatus, string> = { ACTIVE: 'Hoạt động', PENDING_VERIFICATION: 'Chờ xác minh', LOCKED: 'Bị khóa', DISABLED: 'Vô hiệu hóa' };

export function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ai, setAi] = useState<AiOpsStatus | null>(null);
  const [logs, setLogs] = useState<AiAuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AdminUserRole | ''>('');
  const [status, setStatus] = useState<AccountStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextStats, page, nextAi, nextLogs] = await Promise.all([
        adminService.stats(),
        adminService.users({ search, role, status }),
        adminService.aiStatus(),
        adminService.aiAuditLogs(),
      ]);
      setStats(nextStats); setUsers(page.items); setAi(nextAi); setLogs(nextLogs);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isAuthenticated && user?.role === 'admin') void load(); }, [isAuthenticated, user?.role]);

  const mutate = async (action: () => Promise<unknown>, done: string) => {
    setError(''); setMessage('');
    try { await action(); setMessage(done); await load(); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  if (isLoading) return <MainLayout><p className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <MainLayout><div className="max-w-3xl mx-auto p-8"><p className="rounded-2xl bg-amber-50 p-4 text-amber-900">Bạn cần quyền ADMIN để truy cập trang này.</p></div></MainLayout>;

  return <MainLayout><div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><p className="text-xs font-bold text-emerald-700 uppercase">Super Admin Control Center</p><h1 className="text-3xl font-extrabold flex items-center gap-2"><ShieldCheck className="text-emerald-600" />Quản trị hệ thống</h1></div>
      <Button variant="outline" onClick={load}>Làm mới</Button>
    </div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {loading ? <p className="text-sm text-gray-500">Đang tải dữ liệu admin...</p> : <>
      {stats && <div className="grid sm:grid-cols-4 gap-3">{[
        ['Tổng user', stats.totalUsers], ['Active', stats.activeUsers], ['Locked', stats.lockedUsers], ['User mới tuần này', stats.newUsersThisWeek],
      ].map(([label, value]) => <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>}
      <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Input label="Tìm user" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
          <div><label className="block text-xs font-semibold mb-1.5">Role</label><select className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" value={role} onChange={e => setRole(e.target.value as AdminUserRole | '')}><option value="">Tất cả</option><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div>
          <div><label className="block text-xs font-semibold mb-1.5">Trạng thái</label><select className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" value={status} onChange={e => setStatus(e.target.value as AccountStatus | '')}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <Button type="button" onClick={load}>Lọc</Button>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500"><th className="py-3">Người dùng</th><th>Email</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{users.map(item => <tr key={item.userId} className="border-t border-gray-100">
            <td className="py-3 font-semibold">{item.fullName || item.username}</td><td>{item.email}</td><td>{item.role}</td><td>{statusLabels[item.status as AccountStatus] || item.status}</td>
            <td className="py-2"><div className="flex flex-wrap gap-2">
              <Button variant="outline" type="button" onClick={() => mutate(() => adminService.updateStatus(item.userId, item.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE', 'Updated from admin UI'), 'Đã cập nhật trạng thái.')}>{item.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</Button>
              <Button variant="secondary" type="button" onClick={() => mutate(() => adminService.updateRole(item.userId, item.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'), 'Đã cập nhật vai trò.')}>{item.role === 'ADMIN' ? 'Hạ MEMBER' : 'Nâng ADMIN'}</Button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4"><h2 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" />AI Ops</h2>{ai && <>
          <div className="grid grid-cols-3 gap-3 text-sm"><div><p className="text-gray-500">Health</p><p className="font-bold">{ai.systemHealth}</p></div><div><p className="text-gray-500">Latency</p><p className="font-bold">{ai.averageLatencyMs}ms</p></div><div><p className="text-gray-500">Requests</p><p className="font-bold">{ai.totalAiRequests}</p></div></div>
          <div className="space-y-2">{ai.models.map(model => <div key={model.modelName} className="rounded-2xl bg-gray-50 p-3 text-sm"><p className="font-semibold">{model.modelName}</p><p className="text-gray-500">{model.provider} · {model.status} · {model.latencyMs}ms · {model.rateLimitQuota}</p></div>)}</div>
        </>}</div>
        <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-3"><h2 className="font-bold">AI Audit Logs</h2>{logs.slice(0, 6).map(log => <div key={log.logId} className="rounded-2xl border border-gray-100 p-3 text-sm"><p className="font-semibold">{log.operation} · {log.model}</p><p className="text-gray-500">{log.status} · {log.latencyMs}ms · {log.userType}</p><p>{log.promptSummary}</p></div>)}</div>
      </section>
    </>}
  </div></MainLayout>;
}
