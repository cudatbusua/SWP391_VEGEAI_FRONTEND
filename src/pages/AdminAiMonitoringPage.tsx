import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Play,
  FileText,
  Clock,
  Sparkles,
  Server,
  Zap,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/adminService';
import type {
  AiMonitoringOverview,
  AiMonitoringEvent,
  AiAuditEntry,
  AiSystemLogEntry,
  TimeRange,
  EventLevel
} from '../types/aiMonitoring';

export function AdminAiMonitoringPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowed = isAuthenticated && user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'audit' | 'logs'>('overview');
  const [overview, setOverview] = useState<AiMonitoringOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Events tab state
  const [events, setEvents] = useState<AiMonitoringEvent[]>([]);
  const [eventsPage] = useState(0);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventRange, setEventRange] = useState<TimeRange>('LAST_24_HOURS');
  const [eventLevel, setEventLevel] = useState<EventLevel | ''>('');
  const [eventSearch, setEventSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Audit tab state
  const [auditEntries, setAuditEntries] = useState<AiAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // System Logs tab state
  const [systemLogs, setSystemLogs] = useState<AiSystemLogEntry[]>([]);
  const [logLevel, setLogLevel] = useState<string>('');
  const [logSearch, setLogSearch] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await adminService.getAiMonitoringOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('[AI-MONITORING] Fetch overview failed:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await adminService.getAiMonitoringEvents({
        range: eventRange,
        level: eventLevel ? eventLevel : undefined,
        search: eventSearch.trim() || undefined,
        page: eventsPage,
        size: 20
      });
      setEvents(res.items || []);
      setEventsTotal(res.totalElements || 0);
    } catch (err: any) {
      console.error('[AI-MONITORING] Fetch events failed:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [eventRange, eventLevel, eventSearch, eventsPage]);

  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await adminService.getAiMonitoringAudit(0, 50);
      setAuditEntries(res.items || []);
    } catch (err: any) {
      console.error('[AI-MONITORING] Fetch audit failed:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  const fetchSystemLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await adminService.getAiMonitoringSystemLogs({
        level: logLevel || undefined,
        search: logSearch.trim() || undefined,
        page: 0,
        size: 50
      });
      setSystemLogs(res.items || []);
    } catch (err: any) {
      console.error('[AI-MONITORING] Fetch logs failed:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logLevel, logSearch]);

  // Initial and Auto-refresh
  useEffect(() => {
    if (allowed) {
      fetchOverview();
      if (activeTab === 'events') fetchEvents();
      if (activeTab === 'audit') fetchAudit();
      if (activeTab === 'logs') fetchSystemLogs();
    }
  }, [allowed, activeTab, fetchOverview, fetchEvents, fetchAudit, fetchSystemLogs]);

  useEffect(() => {
    if (!autoRefresh || !allowed) return;
    const interval = setInterval(() => {
      fetchOverview();
      if (activeTab === 'events') fetchEvents();
      if (activeTab === 'logs') fetchSystemLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, allowed, activeTab, fetchOverview, fetchEvents, fetchSystemLogs]);

  // Handle Event Lock / Unlock
  const handleToggleLock = async (requestId: string) => {
    try {
      const res = await adminService.lockAiMonitoringEvent(requestId, 'Quản trị viên thao tác từ bảng giám sát.');
      setActionMessage({
        type: 'success',
        text: res.locked ? `Đã khóa sự kiện #${requestId.slice(0, 8)} để điều tra.` : `Đã mở khóa sự kiện #${requestId.slice(0, 8)}.`
      });
      fetchEvents();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Không thể thao tác khóa sự kiện.' });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Handle Replay Probe
  const handleReplayProbe = async (requestId: string) => {
    try {
      const res = await adminService.replayAiMonitoringEvent(requestId);
      setActionMessage({
        type: res.status === 'SUCCESS' ? 'success' : 'error',
        text: `Replay Probe: ${res.message} (Độ trễ: ${res.latencyMs}ms, Tokens: ${res.totalTokens || 0})`
      });
      fetchOverview();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Lỗi khi gửi Replay probe.' });
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  if (isLoading) {
    return <MainLayout><div className="p-8 text-center text-xs">Đang kiểm tra quyền quản trị...</div></MainLayout>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowed) return <MainLayout><div className="p-8 text-center text-xs text-rose-600 font-bold">Bạn cần tài khoản Quản trị viên để truy cập tính năng Giám sát AI.</div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              <Link to="/admin" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Quản trị hệ thống
              </Link>
              <span>/</span>
              <span>Giám sát AI & Nhật ký Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <span>Bảng Giám Sát AI & Telemetry Hệ Thống</span>
              {overview?.coreStatus === 'LIVE' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  AI Core: LIVE
                </span>
              ) : overview?.coreStatus === 'DEGRADED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> AI Core: DEGRADED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  AI Core: NO DATA
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Giám sát thời gian thực các mô hình Google Gemini (2.5 Flash, Vision, Moderation), thống kê độ trễ P95, hạn mức token và nhật ký can thiệp của Quản trị viên.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAutoRefresh(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tự động cập nhật (10s): {autoRefresh ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              type="button"
              onClick={() => { fetchOverview(); if (activeTab === 'events') fetchEvents(); if (activeTab === 'logs') fetchSystemLogs(); }}
              disabled={loadingOverview}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Action Message Toast */}
        {actionMessage && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs transition ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-300'
          }`}>
            <span>{actionMessage.text}</span>
            <button type="button" onClick={() => setActionMessage(null)} className="underline cursor-pointer">Đóng</button>
          </div>
        )}

        {/* KPI Metrics Cards (24-Hour Window) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" /> Lượt gọi (24h)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {(overview?.totalRequests ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              {overview?.requestTrendPercentage != null ? `${overview.requestTrendPercentage}% so với 24h trước` : 'Hệ thống ổn định'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tỷ lệ thành công
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
              {overview?.successRatePercentage != null ? `${overview.successRatePercentage}%` : '100%'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {overview?.failedRequests ?? 0} lượt lỗi ghi nhận
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Độ trễ P95
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {overview?.p95LatencyMs != null ? `${Math.round(overview.p95LatencyMs)}ms` : '--'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              TB: {overview?.averageLatencyMs != null ? `${Math.round(overview.averageLatencyMs)}ms` : '--'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-500" /> Tổng Tokens
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {(overview?.totalTokens ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5 block">
              Prompt & Response
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" /> AI Gắn Cờ Vi Phạm
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {overview?.moderationFlagged ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Trên {overview?.moderationChecks ?? 0} bài kiểm duyệt
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-teal-500" /> Khách Hôm Nay
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {overview?.guestRequestsToday ?? 0}
            </div>
            <span className="text-[10px] text-teal-600 font-bold mt-0.5 block">
              Chatbot thử nghiệm
            </span>
          </div>
        </div>

        {/* Per-Service Health Overview */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            Tình Trạng Sức Khỏe Từng Dịch Vụ AI
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { id: 'NUTRITION_CHAT', label: 'Tư Vấn Dinh Dưỡng (Chatbot)' },
              { id: 'FRIDGE_SCAN', label: 'Thị Giác Quét Tủ Lạnh (Vision)' },
              { id: 'MEAL_PLAN_RANKING', label: 'Tối Ưu Thực Đơn Tuần' },
              { id: 'CONTENT_MODERATION', label: 'Kiểm Duyệt Nội Dung Blog' }
            ].map(svcMeta => {
              const svcData = overview?.services.find(s => s.operation === svcMeta.id);
              const health = svcData?.health || 'NO_DATA';

              return (
                <div key={svcMeta.id} className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {svcMeta.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      health === 'HEALTHY'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : health === 'WARNING'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : health === 'DOWN'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {health}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Lượt gọi: <strong className="text-slate-800 dark:text-white">{svcData?.totalRequests ?? 0}</strong></span>
                    <span>Thành công: <strong className="text-emerald-600">{svcData?.successRatePercentage != null ? `${svcData.successRatePercentage}%` : '--'}</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <span>Độ trễ TB: {svcData?.averageLatencyMs != null ? `${Math.round(svcData.averageLatencyMs)}ms` : '--'}</span>
                    <span className="truncate max-w-[120px]">{svcData?.model || 'gemini-3.5-flash-lite'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {[
            { id: 'overview', label: 'Tổng quan Telemetry', icon: Activity },
            { id: 'events', label: `Nhật ký sự kiện AI (${eventsTotal || overview?.totalRequests || 0})`, icon: Sparkles },
            { id: 'audit', label: `Nhật ký can thiệp Admin (${overview?.auditEntryCount || 0})`, icon: ShieldCheck },
            { id: 'logs', label: `Server Logs trực tiếp (${overview?.systemLogCount || 0})`, icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: AI EVENTS LOG */}
        {activeTab === 'events' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tìm theo Request ID, model, caller hoặc mã lỗi..."
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-72 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={fetchEvents}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 inline mr-1" /> Lọc
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={eventRange}
                  onChange={e => setEventRange(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="TODAY">Hôm nay</option>
                  <option value="LAST_24_HOURS">24 giờ qua</option>
                  <option value="LAST_7_DAYS">7 ngày qua</option>
                  <option value="LAST_30_DAYS">30 ngày qua</option>
                </select>

                <select
                  value={eventLevel}
                  onChange={e => setEventLevel(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công (SUCCESS)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                  <option value="FLAGGED">Gắn cờ (FLAGGED)</option>
                </select>
              </div>
            </div>

            {/* Events Table */}
            {loadingEvents ? (
              <div className="p-8 text-center text-xs text-slate-500">Đang tải danh sách sự kiện AI...</div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Chưa có sự kiện AI nào trong khung thời gian này.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Dịch vụ & Model</th>
                      <th className="py-2.5 px-3">Người gọi</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Độ trễ</th>
                      <th className="py-2.5 px-3">Tokens</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {events.map(ev => (
                      <tr key={ev.requestId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          #{ev.requestId.slice(0, 8)}
                          {ev.locked && <Lock className="w-3 h-3 text-amber-500 inline ml-1" />}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(ev.timestamp).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <span>{ev.operation}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">{ev.model}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {ev.userName || (ev.userType === 'GUEST' ? 'Khách vãng lai' : 'Hệ thống')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.status === 'SUCCESS' && ev.outcome !== 'FLAGGED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ev.outcome === 'FLAGGED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {ev.outcome === 'FLAGGED' ? 'FLAGGED' : ev.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {ev.latencyMs}ms
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {ev.totalTokens ? ev.totalTokens.toLocaleString('vi-VN') : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(ev.requestId)}
                            title={ev.locked ? 'Mở khóa' : 'Khóa để điều tra'}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          >
                            {ev.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplayProbe(ev.requestId)}
                            title="Gửi kiểm thử probe"
                            className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Nhật Ký Quyết Định Quản Trị & Can Thiệp AI
            </h3>

            {loadingAudit ? (
              <div className="p-8 text-center text-xs text-slate-500">Đang tải nhật ký kiểm toán...</div>
            ) : auditEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Chưa có hành động can thiệp nào được ghi nhận.</div>
            ) : (
              <div className="space-y-2.5">
                {auditEntries.map(entry => (
                  <div key={entry.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {entry.adminName || 'Quản trị viên'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {entry.action}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(entry.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        {entry.detail || `Thao tác trên đối tượng ${entry.targetType}: ${entry.targetId}`}
                      </p>
                    </div>

                    {entry.aiVerdict && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">AI Gợi Ý:</span>
                        <span className="font-bold text-emerald-600">{entry.aiVerdict}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 p-5 shadow-xs font-mono text-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Lọc server log theo từ khóa..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs w-64 text-white"
                />
                <button
                  type="button"
                  onClick={fetchSystemLogs}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Lọc
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={logLevel}
                  onChange={e => setLogLevel(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-white"
                >
                  <option value="">Tất cả Level</option>
                  <option value="INFO">INFO & cao hơn</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-slate-500">Đang tải system log buffer...</div>
            ) : systemLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Không có dòng log nào phù hợp.</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
                {systemLogs.map(log => (
                  <div key={log.id} className="p-2 rounded bg-slate-900/80 border border-slate-800/60 leading-relaxed">
                    <span className="text-slate-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString('vi-VN')}]</span>
                    <span className={`font-bold mr-2 ${
                      log.level === 'ERROR' ? 'text-rose-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-blue-400 mr-2">[{log.logger}]</span>
                    <span className="text-slate-300">{log.message}</span>
                    {log.error && <div className="text-rose-400 mt-1 pl-4 text-[11px]">{log.error}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </MainLayout>
  );
}
