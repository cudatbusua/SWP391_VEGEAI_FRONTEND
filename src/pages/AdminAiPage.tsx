import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban, Bot, ChevronLeft, ChevronRight, CircleCheck, Copy, Download, Expand, FileJson, Info, Lock, LockOpen, PlayCircle,
  RefreshCw, Search, ServerCog, ShieldCheck, Shrink, Timer, TrendingDown, TrendingUp, UserCog,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { aiMonitoringService } from '../services/aiMonitoringService';
import { errorMessage } from '../services/apiClient';
import type { PageResponse } from '../types/api';
import type {
  AiAuditEntry, AiEvent, AiEventFilters, AiEventLevel, AiMonitoringOverview, AiTimeRange, SystemLogEntry, SystemLogFilters,
} from '../types/aiMonitoring';
import {
  AI_VERDICTS, AUDIT_ACTIONS, HEALTH_LABEL, LEVEL_LABEL, MATRIX_OPERATIONS, OPERATIONS, SLA_MS, USER_TYPES,
  callerName, clock, downloadCsv, errorLabel, fmt, highlightJson, levelOf, ms, operationLabel, percent, sha256, shortId,
  summarize,
} from '../features/aiMonitoring/aiMonitoringFormat';
import '../styles/adminAiMonitor.css';

type Tab = 'system' | 'ai' | 'audit';
const REFRESH_MS = 10_000;
const PAGE_SIZES = [10, 25, 50, 100];
const MAX_EXPORT_PAGES = 20;
const today = new Date().toLocaleDateString('vi-VN');
const RANGES: { value: AiTimeRange; label: string }[] = [
  { value: 'TODAY', label: `Hôm nay (${today})` },
  { value: 'LAST_24_HOURS', label: '24 giờ qua' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
  { value: 'LAST_30_DAYS', label: '30 ngày qua' },
];
const LEVELS: { value: AiEventLevel | ''; label: string }[] = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FLAGGED', label: 'Cảnh báo · AI gắn cờ' },
  { value: 'FAILED', label: 'Lỗi' },
];
const SYSTEM_LEVELS = ['', 'INFO', 'WARN', 'ERROR'];

function Pager({ page, onPage }: { page: PageResponse<unknown>; onPage: (page: number) => void }) {
  return <div className="admin-pagination">
    <button type="button" aria-label="Trang trước" disabled={page.first} onClick={() => onPage(page.page - 1)}><ChevronLeft size={14} /></button>
    <span>Trang {fmt(page.totalPages ? page.page + 1 : 0)} / {fmt(page.totalPages)}</span>
    <button type="button" aria-label="Trang sau" disabled={page.last} onClick={() => onPage(page.page + 1)}><ChevronRight size={14} /></button>
  </div>;
}

function PageSize({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return <label className="aim-page-size">Dòng mỗi trang
    <select value={value} onChange={event => onChange(Number(event.target.value))}>{PAGE_SIZES.map(size => <option key={size}>{size}</option>)}</select>
  </label>;
}

/** Debounces free-text search so typing does not fire a request per keystroke. */
function useDebounced(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function AdminAiPage() {
  const [tab, setTab] = useState<Tab>('ai');
  const [streaming, setStreaming] = useState(true);
  const [tick, setTick] = useState(0);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [exporting, setExporting] = useState(false);

  const [overview, setOverview] = useState<AiMonitoringOverview | null>(null);
  const [overviewError, setOverviewError] = useState('');

  const [filters, setFilters] = useState<Omit<AiEventFilters, 'search'>>({ range: 'TODAY', operation: '', level: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const search = useDebounced(searchDraft);
  const eventFilters = useMemo<AiEventFilters>(() => ({ ...filters, search }), [filters, search]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [events, setEvents] = useState<PageResponse<AiEvent> | null>(null);
  const [eventsError, setEventsError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'response' | 'request'>('response');
  const [expanded, setExpanded] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'lock' | 'replay' | null>(null);

  const [auditPage, setAuditPage] = useState(0);
  const [auditSize, setAuditSize] = useState(25);
  const [audit, setAudit] = useState<PageResponse<AiAuditEntry> | null>(null);
  const [auditError, setAuditError] = useState('');

  const [systemLevel, setSystemLevel] = useState('');
  const [systemSearchDraft, setSystemSearchDraft] = useState('');
  const systemSearch = useDebounced(systemSearchDraft);
  const systemFilters = useMemo<SystemLogFilters>(() => ({ level: systemLevel, search: systemSearch }), [systemLevel, systemSearch]);
  const [systemPage, setSystemPage] = useState(0);
  const [systemSize, setSystemSize] = useState(25);
  const [systemLogs, setSystemLogs] = useState<PageResponse<SystemLogEntry> | null>(null);
  const [systemError, setSystemError] = useState('');

  const refresh = () => setTick(value => value + 1);
  const flash = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(current => current?.text === text ? null : current), 4000);
  };

  useEffect(() => {
    if (!streaming) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [streaming]);

  useEffect(() => { setPage(0); }, [eventFilters]);
  useEffect(() => { setSystemPage(0); }, [systemFilters]);

  useEffect(() => {
    const controller = new AbortController();
    aiMonitoringService.overview(controller.signal)
      .then(next => { setOverview(next); setOverviewError(''); })
      .catch(reason => { if (!controller.signal.aborted) setOverviewError(errorMessage(reason)); });
    return () => controller.abort();
  }, [tick]);

  useEffect(() => {
    if (tab !== 'ai') return;
    const controller = new AbortController();
    aiMonitoringService.events(eventFilters, page, size, controller.signal)
      .then(next => { setEvents(next); setEventsError(''); })
      .catch(reason => { if (!controller.signal.aborted) setEventsError(errorMessage(reason)); });
    return () => controller.abort();
  }, [tab, eventFilters, page, size, tick]);

  useEffect(() => {
    if (tab !== 'audit') return;
    const controller = new AbortController();
    aiMonitoringService.audit(auditPage, auditSize, controller.signal)
      .then(next => { setAudit(next); setAuditError(''); })
      .catch(reason => { if (!controller.signal.aborted) setAuditError(errorMessage(reason)); });
    return () => controller.abort();
  }, [tab, auditPage, auditSize, tick]);

  useEffect(() => {
    if (tab !== 'system') return;
    const controller = new AbortController();
    aiMonitoringService.systemLogs(systemFilters, systemPage, systemSize, controller.signal)
      .then(next => { setSystemLogs(next); setSystemError(''); })
      .catch(reason => { if (!controller.signal.aborted) setSystemError(errorMessage(reason)); });
    return () => controller.abort();
  }, [tab, systemFilters, systemPage, systemSize, tick]);

  const items = useMemo(() => events?.items ?? [], [events]);
  const selected = items.find(event => event.requestId === selectedId) ?? items[0] ?? null;
  const responseJson = useMemo(() => {
    if (!selected) return '';
    const level = levelOf(selected);
    return JSON.stringify({
      request_id: shortId(selected.requestId).slice(1),
      model_version: selected.model,
      inference_engine: 'Google Gemini API · generateContent',
      status: selected.status,
      ...(selected.operation === 'CONTENT_MODERATION' && selected.status === 'SUCCESS' ? {
        moderation_verdict: {
          action: level === 'FLAGGED' ? 'FLAG_FOR_ADMIN_REVIEW' : 'PASS_TO_ADMIN_QUEUE',
          outcome: selected.outcome,
          final_decision: 'ADMIN',
        },
      } : {}),
      ...(selected.errorType ? { error_type: selected.errorType } : {}),
      usage: {
        prompt_tokens: selected.promptTokens ?? null,
        response_tokens: selected.responseTokens ?? null,
        total_tokens: selected.totalTokens ?? null,
      },
      execution_meta: {
        latency_ms: selected.latencyMs,
        recorded_at: selected.timestamp,
        caller_type: selected.userType ?? null,
        locked_for_investigation: selected.locked,
      },
    }, null, 2);
  }, [selected]);

  const requestJson = useMemo(() => selected ? JSON.stringify({
    endpoint: `POST /v1beta/models/${selected.model}:generateContent`,
    service: selected.operation,
    caller: { type: selected.userType ?? null, user_id: selected.userId ?? null, name: selected.userName ?? null },
    received_at: selected.timestamp,
    prompt_tokens: selected.promptTokens ?? null,
    content: '[không lưu — VEGEAI không ghi lại câu hỏi, ảnh hay phản hồi của AI để bảo vệ người dùng]',
  }, null, 2) : '', [selected]);

  useEffect(() => {
    let active = true;
    setHash(null);
    if (selected) sha256(requestJson + responseJson).then(value => { if (active) setHash(value); });
    return () => { active = false; };
  }, [selected, requestJson, responseJson]);

  const toggleLock = async () => {
    if (!selected) return;
    setBusyAction('lock');
    try {
      const result = await aiMonitoringService.toggleLock(selected.requestId);
      flash(result.locked ? `Đã khóa ${shortId(selected.requestId)} để điều tra.` : `Đã mở khóa ${shortId(selected.requestId)}.`);
      refresh();
    } catch (reason) { flash(errorMessage(reason), 'error'); }
    finally { setBusyAction(null); }
  };

  const replay = async () => {
    if (!selected) return;
    setBusyAction('replay');
    try {
      const result = await aiMonitoringService.replay(selected.requestId);
      flash(`Replay ${result.status === 'SUCCESS' ? 'thành công' : 'thất bại'} · ${fmt(result.latencyMs)} ms · ${result.message ?? ''}`,
        result.status === 'SUCCESS' ? 'ok' : 'error');
      refresh();
    } catch (reason) { flash(errorMessage(reason), 'error'); }
    finally { setBusyAction(null); }
  };

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); flash(`Đã sao chép ${label}.`); }
    catch { flash('Trình duyệt không cho phép sao chép.', 'error'); }
  };

  /** Pages through a list endpoint for export; capped so a large log never freezes the tab. */
  async function collect<T>(load: (page: number) => Promise<PageResponse<T>>) {
    const rows: T[] = [];
    for (let index = 0; index < MAX_EXPORT_PAGES; index++) {
      const next = await load(index);
      rows.push(...next.items);
      if (next.last) break;
    }
    return rows;
  }

  const exportCsv = async () => {
    setExporting(true);
    try {
      if (tab === 'ai') {
        const rows = await aiMonitoringService.exportEvents(eventFilters);
        downloadCsv('vegeai-ai-log', ['Thời gian', 'Request ID', 'Dịch vụ', 'Model', 'Người dùng', 'Loại người dùng', 'Trạng thái', 'Kết quả kiểm duyệt', 'Mã lỗi', 'Độ trễ (ms)', 'Token', 'Đã khóa'],
          rows.map(event => [clock(event.timestamp, true), event.requestId, operationLabel(event.operation), event.model, callerName(event),
            USER_TYPES[event.userType ?? ''] ?? event.userType, LEVEL_LABEL[levelOf(event)], event.outcome, event.errorType, event.latencyMs,
            event.totalTokens, event.locked ? 'Có' : 'Không']));
        flash(`Đã xuất ${fmt(rows.length)} sự kiện AI.`);
      } else if (tab === 'audit') {
        const rows = await collect(index => aiMonitoringService.audit(index, 100));
        downloadCsv('vegeai-admin-audit', ['Thời gian', 'Quản trị viên', 'Hành động', 'Đối tượng', 'AI đánh giá', 'Khớp với AI', 'Chi tiết'],
          rows.map(entry => [clock(entry.timestamp), entry.adminName, AUDIT_ACTIONS[entry.action] ?? entry.action,
            entry.targetLabel ?? entry.targetId, AI_VERDICTS[entry.aiVerdict ?? ''] ?? entry.aiVerdict,
            entry.aiAgreedWithAdmin == null ? '' : entry.aiAgreedWithAdmin ? 'Khớp' : 'Không khớp', entry.detail]));
        flash(`Đã xuất ${fmt(rows.length)} hành động quản trị.`);
      } else {
        const rows = await collect(index => aiMonitoringService.systemLogs(systemFilters, index, 100));
        downloadCsv('vegeai-system-log', ['Thời gian', 'Mức', 'Nguồn', 'Luồng', 'Nội dung', 'Lỗi'],
          rows.map(entry => [clock(entry.timestamp, true), entry.level, entry.loggerName, entry.thread, entry.message, entry.error]));
        flash(`Đã xuất ${fmt(rows.length)} dòng log hệ thống.`);
      }
    } catch (reason) { flash(errorMessage(reason), 'error'); }
    finally { setExporting(false); }
  };

  const openEvent = (requestId: string) => {
    setTab('ai');
    setFilters({ range: 'LAST_30_DAYS', operation: '', level: '' });
    setSearchDraft(shortId(requestId));
    setSelectedId(requestId);
  };

  const trend = overview?.requestTrendPercentage;
  const p95 = overview?.p95LatencyMs;
  const kpis = overview ? [
    {
      label: 'AI Throughput 24h', value: fmt(overview.totalRequests), icon: Bot, tone: 'green',
      sub: trend == null ? <>Chưa có dữ liệu hôm qua để so sánh</>
        : <>{trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{trend >= 0 ? '+' : ''}{fmt(trend, 1)}% so với hôm qua</>,
    },
    {
      label: 'Độ trễ trung bình (P95)', value: ms(p95), icon: Timer, tone: 'slate',
      sub: <><Info size={13} />{p95 == null ? 'Chưa có dữ liệu' : p95 <= SLA_MS ? `Ổn định dưới SLA ${SLA_MS / 1000}s` : `Vượt SLA ${SLA_MS / 1000}s`} · TB {ms(overview.averageLatencyMs)}</>,
    },
    {
      label: 'Tỷ lệ gắn cờ tự động', value: percent(overview.flaggedRatePercentage), icon: Ban, tone: 'rose',
      sub: <><Ban size={13} />{fmt(overview.moderationFlagged)} / {fmt(overview.moderationChecks)} bài vi phạm cần xem xét</>,
    },
    {
      label: 'Tỷ lệ thành công (Success)', value: percent(overview.successRatePercentage), icon: CircleCheck, tone: 'mint',
      sub: <><CircleCheck size={13} />{fmt(overview.failedRequests)} sự cố gián đoạn · {fmt(overview.totalTokens)} token</>,
    },
  ] : [];

  const matrix = overview ? MATRIX_OPERATIONS.map(operation => overview.services.find(service => service.operation === operation)
    ?? { operation, health: 'NO_DATA' as const, totalRequests: 0, failedRequests: 0 }) : [];
  const core = overview?.coreStatus ?? 'NO_DATA';

  return <MainLayout><div className="admin-page aim-page">
    <header className="aim-hero">
      <div>
        <div className="aim-chips">
          <span className="aim-chip">TELEMETRY &amp; AUDIT</span>
          <button type="button" className={'aim-live' + (streaming ? ' on' : '')} aria-pressed={streaming} onClick={() => setStreaming(value => !value)}
            title={streaming ? 'Tạm dừng cập nhật tự động' : 'Bật cập nhật tự động mỗi 10 giây'}>
            <span className="aim-dot" />{streaming ? 'Streaming Realtime' : 'Đã tạm dừng'}
          </button>
        </div>
        <h1>Nhật Ký Hệ Thống &amp; Giám Sát AI</h1>
        <p>Theo dõi các sự kiện vận hành, truy vết tác vụ kiểm duyệt nội dung và đo lường hiệu năng mô hình trí tuệ nhân tạo.
          {overview && <> Khách vãng lai đã dùng AI <strong>{fmt(overview.guestRequestsToday)}</strong> lần hôm nay · Cập nhật {clock(overview.generatedAt)}.</>}</p>
      </div>
      <div className="aim-hero-side">
        <span className={`aim-core ${core}`} title="Theo kết quả lượt gọi AI gần nhất"><span className="aim-dot" />AI Core: {core === 'LIVE' ? 'Live' : core === 'DEGRADED' ? 'Lỗi' : 'Chưa có dữ liệu'}</span>
        <div className="aim-hero-actions">
          <button type="button" className="admin-btn secondary" disabled={exporting} onClick={exportCsv}><Download size={15} /> {exporting ? 'Đang xuất...' : 'Xuất báo cáo (CSV/Excel)'}</button>
          <button type="button" className="admin-btn" onClick={refresh}><RefreshCw size={15} /> Làm mới dữ liệu</button>
        </div>
      </div>
    </header>
    {notice && <p className={`aim-notice ${notice.tone}`} role="status">{notice.text}</p>}
    {overviewError && <div className="admin-inline-state error" role="alert">{overviewError}<button type="button" onClick={refresh}>Thử lại</button></div>}

    {overview ? <dl className="aim-kpis">{kpis.map(({ label, value, icon: Icon, tone, sub }) =>
      <div className={`aim-kpi ${tone}`} key={label}>
        <div><dt>{label}</dt><dd>{value}</dd><p>{sub}</p></div>
        <span className="aim-kpi-icon"><Icon size={20} /></span>
      </div>)}</dl>
      : !overviewError && <p className="admin-inline-state" role="status">Đang tải số liệu AI...</p>}

    <div className="aim-tabs" role="tablist" aria-label="Loại nhật ký">
      <button type="button" role="tab" aria-selected={tab === 'system'} className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}>
        <ServerCog size={15} /> System Log (Hệ thống){overview && <span className="aim-count">{fmt(overview.systemLogCount)}</span>}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'ai'} className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>
        <Bot size={15} /> AI Log (Quét ảnh, Chat, Kiểm duyệt){overview && <span className="aim-count live">Live {fmt(overview.totalRequests)}</span>}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'audit'} className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
        <UserCog size={15} /> Audit Log (Hành động Quản trị viên){overview && <span className="aim-count">{fmt(overview.auditEntryCount)}</span>}
      </button>
    </div>

    {tab === 'ai' && <>
      <div className="aim-filters">
        <label><span>Khoảng thời gian</span>
          <select value={filters.range} onChange={event => setFilters(current => ({ ...current, range: event.target.value as AiTimeRange }))}>
            {RANGES.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}
          </select></label>
        <label><span>Mô hình / Dịch vụ</span>
          <select value={filters.operation} onChange={event => setFilters(current => ({ ...current, operation: event.target.value }))}>
            <option value="">Tất cả dịch vụ</option>
            {Object.entries(OPERATIONS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        <label><span>Mức cảnh báo (Level)</span>
          <select value={filters.level} onChange={event => setFilters(current => ({ ...current, level: event.target.value as AiEventLevel | '' }))}>
            {LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select></label>
        <label className="aim-search"><span>Tìm kiếm từ khóa / Request ID</span>
          <span className="admin-search-field"><Search size={15} /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Nhập #REQ ID, tên người dùng, từ khóa..." /></span></label>
      </div>

      <div className={'aim-workspace' + (expanded ? ' expanded' : '')}>
        <section className="admin-section aim-stream">
          <div className="admin-section-heading"><h2>Luồng sự kiện AI Realtime <span className="aim-dot" /></h2>
            <span>{events ? `Hiển thị ${fmt(items.length)} / ${fmt(events.totalElements)} logs gần nhất` : ''}</span></div>
          {eventsError && <div className="admin-inline-state error" role="alert">{eventsError}<button type="button" onClick={refresh}>Thử lại</button></div>}
          {!events && !eventsError && <p className="admin-inline-state" role="status">Đang tải nhật ký AI...</p>}
          {events && !items.length && <p className="admin-inline-state">Không có sự kiện AI nào khớp bộ lọc.</p>}
          {!!items.length && <div className="admin-table-scroll"><table className="admin-table aim-table">
            <thead><tr><th>Thời gian</th><th>Dịch vụ</th><th>Request ID</th><th>Người dùng</th><th>Tóm tắt sự kiện</th><th>Độ trễ</th><th>Trạng thái</th></tr></thead>
            <tbody>{items.map(event => {
              const level = levelOf(event);
              const active = selected?.requestId === event.requestId;
              const name = callerName(event);
              return <tr key={event.requestId} className={active ? 'selected' : ''} tabIndex={0} aria-selected={active}
                onClick={() => setSelectedId(event.requestId)}
                onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); setSelectedId(event.requestId); } }}>
                <td className="aim-mono">{clock(event.timestamp, true)}</td>
                <td><span className={`aim-service ${OPERATIONS[event.operation]?.tone ?? 'slate'}`}>{operationLabel(event.operation)}</span></td>
                <td className="aim-mono aim-req">{event.locked && <Lock size={11} aria-label="Đã khóa" />}{shortId(event.requestId)}</td>
                <td><span className="aim-user"><span className={`aim-avatar ${event.userName ? 'MEMBER' : event.userType ?? ''}`}>{name.charAt(0)}</span>
                  <span className={event.userName ? '' : 'aim-muted'}>{name}</span></span></td>
                <td className={'aim-summary ' + level.toLowerCase()} title={summarize(event)}>{summarize(event)}</td>
                <td className="aim-mono">{fmt(event.latencyMs)}ms</td>
                <td><span className={`aim-badge ${level.toLowerCase()}`}>{LEVEL_LABEL[level]}</span></td>
              </tr>;
            })}</tbody>
          </table></div>}
          {events && <div className="admin-table-foot">
            <PageSize value={size} onChange={next => { setSize(next); setPage(0); }} />
            <Pager page={events} onPage={setPage} />
          </div>}
        </section>

        <aside className="admin-section aim-inspector" aria-label="Payload Inspector">
          <div className="aim-inspector-head">
            <h2><FileJson size={16} /> Payload Inspector {selected && <span className="aim-req-chip">{shortId(selected.requestId)}</span>}</h2>
            <div className="aim-inspector-tools">
              {selected && <button type="button" className="admin-icon-button" title="Sao chép Request ID" aria-label="Sao chép Request ID" onClick={() => copy(selected.requestId, 'Request ID')}><Copy size={15} /></button>}
              <button type="button" className="admin-icon-button" title={expanded ? 'Thu nhỏ' : 'Mở rộng'} aria-label={expanded ? 'Thu nhỏ khung' : 'Mở rộng khung'} onClick={() => setExpanded(value => !value)}>{expanded ? <Shrink size={15} /> : <Expand size={15} />}</button>
            </div>
          </div>
          {!selected ? <p className="admin-inline-state">Chọn một sự kiện để xem chi tiết.</p> : <>
            <dl className="aim-tiles">
              <div><dt>Độ trễ</dt><dd className={selected.latencyMs > SLA_MS ? 'failed' : 'success'}>{fmt(selected.latencyMs)} ms</dd></div>
              <div><dt>Kết quả</dt><dd className={levelOf(selected) === 'SUCCESS' ? 'success' : 'failed'}
                title={selected.errorType ? errorLabel(selected.errorType) : undefined}>{LEVEL_LABEL[levelOf(selected)]}</dd></div>
              <div><dt>Token Usage</dt><dd>{selected.totalTokens == null ? '—' : `${fmt(selected.totalTokens)} tok`}</dd></div>
            </dl>
            <div className="aim-inspector-tabs" role="tablist" aria-label="Dữ liệu request">
              <button type="button" role="tab" aria-selected={inspectorTab === 'response'} className={inspectorTab === 'response' ? 'active' : ''} onClick={() => setInspectorTab('response')}>AI Inference Response <span className="aim-dot" /></button>
              <button type="button" role="tab" aria-selected={inspectorTab === 'request'} className={inspectorTab === 'request' ? 'active' : ''} onClick={() => setInspectorTab('request')}>Raw Request Payload</button>
            </div>
            <pre className="aim-json">{highlightJson(inspectorTab === 'response' ? responseJson : requestJson)}</pre>
            <div className="aim-inspector-foot">
              <button type="button" className="aim-hash" title={hash ? `sha256:${hash} · bấm để sao chép` : 'Đang tính hash'} disabled={!hash} onClick={() => hash && copy(`sha256:${hash}`, 'hash')}>
                Hash: <span className="aim-mono">{hash ? `sha256:${hash.slice(0, 6)}…${hash.slice(-4)}` : '…'}</span>
              </button>
              <div className="aim-inspector-actions">
                <button type="button" className="admin-btn secondary" disabled={busyAction !== null} onClick={replay}
                  title="Gửi prompt kiểm tra cố định tới cùng model để xác nhận dịch vụ AI hoạt động"><PlayCircle size={14} /> {busyAction === 'replay' ? 'Đang chạy...' : 'Chạy lại kiểm thử (Replay)'}</button>
                <button type="button" className="admin-btn" disabled={busyAction !== null} onClick={toggleLock}>
                  {selected.locked ? <LockOpen size={14} /> : <Lock size={14} />} {busyAction === 'lock' ? 'Đang xử lý...' : selected.locked ? 'Mở khóa Request' : 'Khóa Request này'}</button>
              </div>
            </div>
          </>}
        </aside>
      </div>
    </>}

    {tab === 'audit' && <section className="admin-section">
      <div className="admin-section-heading"><h2>Hành động của quản trị viên</h2><span>Quyết định duyệt bài và thao tác trên trang giám sát AI</span></div>
      {auditError && <div className="admin-inline-state error" role="alert">{auditError}<button type="button" onClick={refresh}>Thử lại</button></div>}
      {!audit && !auditError && <p className="admin-inline-state" role="status">Đang tải nhật ký quản trị viên...</p>}
      {audit && !audit.items.length && <p className="admin-inline-state">Chưa có hành động quản trị nào được ghi nhận.</p>}
      {audit && !!audit.items.length && <div className="admin-table-scroll"><table className="admin-table aim-table aim-static">
        <thead><tr><th>Thời gian</th><th>Quản trị viên</th><th>Hành động</th><th>Đối tượng</th><th>AI đánh giá</th><th>So với AI</th><th>Chi tiết</th></tr></thead>
        <tbody>{audit.items.map(entry => <tr key={entry.id}>
          <td className="aim-mono">{clock(entry.timestamp)}</td>
          <td><span className="aim-user"><span className="aim-avatar MEMBER">{(entry.adminName ?? '?').charAt(0)}</span>{entry.adminName ?? '—'}</span></td>
          <td><span className={`aim-badge ${entry.action.endsWith('REJECTED') || entry.action === 'AI_EVENT_LOCKED' ? 'failed' : entry.action.endsWith('PUBLISHED') ? 'success' : 'muted'}`}>{AUDIT_ACTIONS[entry.action] ?? entry.action}</span></td>
          <td className="aim-summary">{entry.targetType === 'BLOG_POST'
            ? <Link to={`/admin/blog/${entry.targetId}`}>{entry.targetLabel ?? entry.targetId}</Link>
            : <button type="button" className="aim-link aim-mono" onClick={() => openEvent(entry.targetId)}>{shortId(entry.targetId)}</button>}</td>
          <td>{AI_VERDICTS[entry.aiVerdict ?? ''] ?? '—'}</td>
          <td>{entry.aiAgreedWithAdmin == null ? '—' : <span className={`aim-badge ${entry.aiAgreedWithAdmin ? 'success' : 'flagged'}`}>{entry.aiAgreedWithAdmin ? 'Khớp' : 'Không khớp'}</span>}</td>
          <td className="aim-summary" title={entry.detail ?? ''}>{entry.detail ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>}
      {audit && <div className="admin-table-foot"><PageSize value={auditSize} onChange={next => { setAuditSize(next); setAuditPage(0); }} /><Pager page={audit} onPage={setAuditPage} /></div>}
    </section>}

    {tab === 'system' && <>
      <div className="aim-filters aim-filters-system">
        <label><span>Mức log (Level)</span>
          <select value={systemLevel} onChange={event => setSystemLevel(event.target.value)}>
            {SYSTEM_LEVELS.map(level => <option key={level} value={level}>{level || 'Tất cả mức độ'}</option>)}
          </select></label>
        <label className="aim-search"><span>Tìm kiếm nội dung / nguồn</span>
          <span className="admin-search-field"><Search size={15} /><input value={systemSearchDraft} onChange={event => setSystemSearchDraft(event.target.value)} placeholder="Nhập từ khóa, tên class hoặc lỗi..." /></span></label>
      </div>
      <section className="admin-section">
        <div className="admin-section-heading"><h2>Log máy chủ</h2><span>Lưu trong bộ nhớ kể từ {clock(overview?.systemLogSince)} · tối đa 2.000 dòng gần nhất</span></div>
        {systemError && <div className="admin-inline-state error" role="alert">{systemError}<button type="button" onClick={refresh}>Thử lại</button></div>}
        {!systemLogs && !systemError && <p className="admin-inline-state" role="status">Đang tải log hệ thống...</p>}
        {systemLogs && !systemLogs.items.length && <p className="admin-inline-state">Không có dòng log nào khớp bộ lọc.</p>}
        {systemLogs && !!systemLogs.items.length && <div className="admin-table-scroll"><table className="admin-table aim-table aim-static">
          <thead><tr><th>Thời gian</th><th>Mức</th><th>Nguồn</th><th>Nội dung</th><th>Luồng</th></tr></thead>
          <tbody>{systemLogs.items.map(entry => <tr key={entry.id}>
            <td className="aim-mono">{clock(entry.timestamp, true)}</td>
            <td><span className={`aim-badge ${entry.level === 'ERROR' ? 'failed' : entry.level === 'WARN' ? 'flagged' : 'muted'}`}>{entry.level}</span></td>
            <td className="aim-mono" title={entry.loggerName}>{entry.logger}</td>
            <td className={'aim-log-message' + (entry.level === 'ERROR' ? ' failed' : '')}>{entry.message}{entry.error && <small>{entry.error}</small>}</td>
            <td className="aim-mono aim-muted">{entry.thread}</td>
          </tr>)}</tbody>
        </table></div>}
        {systemLogs && <div className="admin-table-foot"><PageSize value={systemSize} onChange={next => { setSystemSize(next); setSystemPage(0); }} /><Pager page={systemLogs} onPage={setSystemPage} /></div>}
      </section>
    </>}

    {overview && <section className="admin-section aim-health">
      <div className="aim-health-head">
        <div><h2>Tình trạng các phân hệ AI (Health Matrix)</h2>
          <p>Tỷ lệ thành công, độ trễ trung bình và model của từng phân hệ trong 24 giờ, lấy từ nhật ký lượt gọi Gemini.</p></div>
        <ul className="aim-legend"><li className="HEALTHY">Hoạt động tốt</li><li className="WARNING">Tải cao</li><li className="DOWN">Sự cố</li></ul>
      </div>
      <div className="aim-health-grid">{matrix.map(service => {
        const rate = service.successRatePercentage ?? 0;
        return <article key={service.operation} className={`aim-service-card ${service.health}`}>
          <header><h3><span className="aim-health-dot" />{OPERATIONS[service.operation]?.matrix ?? service.operation}</h3>
            <span className="aim-health-badge">{service.health === 'NO_DATA' ? HEALTH_LABEL.NO_DATA : `${fmt(service.successRatePercentage, 2)}% Up`}</span></header>
          <div className="aim-bar-label"><span>Tỷ lệ thành công · {fmt(service.totalRequests)} lượt / 24h</span><span>{percent(service.successRatePercentage)}</span></div>
          <div className={'aim-bar' + (service.health === 'WARNING' || service.health === 'DOWN' ? ' hot' : '')}><span style={{ width: `${rate}%` }} /></div>
          <footer><span>Latency: {ms(service.averageLatencyMs)}{service.failedRequests ? ` · ${fmt(service.failedRequests)} lỗi` : ''}</span>
            <span>Model: {service.model ?? '—'} · gần nhất {clock(service.lastCalledAt)}</span></footer>
        </article>;
      })}</div>
    </section>}
    <p className="aim-footnote"><ShieldCheck size={13} /> Mọi số liệu trên trang lấy từ nhật ký thật. Nội dung câu hỏi, ảnh và phản hồi của AI không được lưu để bảo vệ người dùng.</p>
  </div></MainLayout>;
}
