import { useEffect, useState } from 'react';
import { Activity, RefreshCw, ShieldAlert, Timer, TriangleAlert } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { adminService } from '../services/adminService';
import { errorMessage } from '../services/apiClient';
import type { AiAuditLogEntry, AiOpsStatus } from '../types/api';

const number = (value: number) => value.toLocaleString('vi-VN');
const time = (value: string) => {
  const normalized = value.replace(/(\.\d{3})\d+(?=Z|[+-]\d{2}:\d{2}$)/, '$1');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleString('vi-VN');
};

export function AdminAiPage() {
  const [status, setStatus] = useState<AiOpsStatus | null>(null);
  const [logs, setLogs] = useState<AiAuditLogEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    Promise.all([adminService.aiStatus(controller.signal), adminService.aiAuditLogs(controller.signal)])
      .then(([nextStatus, nextLogs]) => {
        if (controller.signal.aborted) return;
        setStatus(nextStatus);
        setLogs(nextLogs);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [reload]);

  const summary = status ? [
    { label: 'Lượt gọi AI · 24 giờ', value: number(status.totalAiRequests), icon: Activity },
    { label: 'Tỷ lệ request thành công · 24 giờ', value: status.successRatePercentage == null ? 'Chưa có dữ liệu' : `${status.successRatePercentage}%`, icon: ShieldAlert },
    { label: 'Độ trễ trung bình · 24 giờ', value: status.averageLatencyMs == null ? 'Chưa có dữ liệu' : `${Math.round(status.averageLatencyMs)} ms`, icon: Timer },
    { label: 'Admin đồng thuận · bài đã đánh giá', value: status.moderationAgreementRate == null ? `Chưa có dữ liệu · ${number(status.moderationReviewedCount)} bài` : `${status.moderationAgreementRate}% · ${number(status.moderationReviewedCount)} bài`, icon: TriangleAlert },
  ] : [];

  return <MainLayout><div className="admin-page">
    <header className="admin-page-heading">
      <div><h1>Giám sát AI</h1><p>Tỷ lệ thành công và độ trễ được gộp từ mọi tác vụ trong 24 giờ; trạng thái mô hình dựa trên lượt gọi gần nhất, không phải kiểm tra kết nối trực tiếp. Tỷ lệ đồng thuận AI/Admin tính trên toàn bộ bài đã đánh giá. Không lưu nội dung prompt của người dùng.</p></div>
      <button type="button" className="admin-btn secondary" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={15} /> Làm mới</button>
    </header>
    {error && <div className="admin-inline-state error" role="alert">{error}<button type="button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div>}
    {busy && <p className="admin-inline-state" role="status">Đang tải số liệu AI...</p>}
    {status && <>
      <dl className="admin-stats-grid">{summary.map(({ label, value, icon: Icon }) => <div className="admin-stat" key={label}><div><dt>{label}</dt><dd>{value}</dd></div><span className="admin-stat-icon"><Icon size={20} /></span></div>)}</dl>
      <section className="admin-section">
        <div className="admin-section-heading"><h2>Mô hình được gọi</h2><span>Tình trạng request 24 giờ: {status.systemHealth} · Cập nhật {time(status.generatedAt)}</span></div>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Mô hình</th><th>Nhà cung cấp</th><th>Phiên bản</th><th>Trạng thái gần nhất</th><th>Độ trễ TB</th></tr></thead>
          <tbody>{status.models.map(model => <tr key={model.version}><td>{model.modelName}</td><td>{model.provider}</td><td>{model.version}</td><td>{model.status}</td><td>{model.status === 'NO_DATA' ? 'Chưa có dữ liệu' : `${model.latencyMs} ms`}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading"><h2>Nhật ký gần đây</h2><span>Tối đa 50 sự kiện mới nhất</span></div>
        {!logs.length ? <p className="admin-inline-state">Chưa có lượt gọi AI nào được ghi nhận.</p> :
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Model</th><th>Tác vụ</th><th>Người dùng</th><th>Kết quả</th><th>Độ trễ</th></tr></thead>
            <tbody>{logs.map(log => <tr key={log.logId}><td>{time(log.timestamp)}</td><td>{log.model}</td><td>{log.operation}</td><td>{log.userType}</td>
              <td>{log.outcome ? `${log.status} · ${log.outcome}` : log.status}{log.errorType ? ` · ${log.errorType}` : ''}</td><td>{log.latencyMs} ms</td></tr>)}</tbody>
          </table></div>}
      </section>
    </>}
  </div></MainLayout>;
}
