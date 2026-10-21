import type { ReactNode } from 'react';
import type { AiEvent, AiEventLevel, AiServiceHealth } from '../../types/aiMonitoring';

export const OPERATIONS: Record<string, { label: string; matrix: string; tone: string; success: string }> = {
  CONTENT_MODERATION: { label: 'AI Kiểm Duyệt Blog', matrix: 'AI Kiểm Duyệt Bài Blog', tone: 'green', success: 'Quét bài viết cộng đồng, không phát hiện vi phạm' },
  FRIDGE_SCAN: { label: 'AI Tủ Lạnh', matrix: 'Vision OCR & Tủ Lạnh', tone: 'amber', success: 'Nhận diện nguyên liệu từ ảnh tủ lạnh' },
  MEAL_PLAN_RANKING: { label: 'AI Thực Đơn', matrix: 'AI Lập Thực Đơn', tone: 'violet', success: 'Xếp hạng món cho kế hoạch thực đơn tuần' },
  NUTRITION_CHAT: { label: 'AI Bếp Trưởng', matrix: 'AI Bếp Trưởng (Chat)', tone: 'rose', success: 'Tư vấn món chay và dinh dưỡng cho người dùng' },
  REPLAY_TEST: { label: 'Replay Test', matrix: 'Kiểm thử Replay', tone: 'slate', success: 'Kiểm thử kết nối model (Replay)' },
};
export const MATRIX_OPERATIONS = ['CONTENT_MODERATION', 'FRIDGE_SCAN', 'NUTRITION_CHAT', 'MEAL_PLAN_RANKING'];
export const USER_TYPES: Record<string, string> = { GUEST: 'Khách vãng lai', MEMBER: 'Thành viên', SYSTEM: 'Hệ thống' };
export const LEVEL_LABEL: Record<AiEventLevel, string> = { SUCCESS: 'Thành công', FLAGGED: 'Gắn cờ', FAILED: 'Lỗi' };
export const HEALTH_LABEL: Record<AiServiceHealth, string> = { HEALTHY: 'Hoạt động tốt', WARNING: 'Tải cao', DOWN: 'Sự cố', NO_DATA: 'Chưa có dữ liệu' };
export const AUDIT_ACTIONS: Record<string, string> = {
  BLOG_PUBLISHED: 'Duyệt đăng bài viết',
  BLOG_REJECTED: 'Từ chối bài viết',
  BLOG_ARCHIVED: 'Lưu trữ bài viết',
  BLOG_PENDING_REVIEW: 'Chuyển về chờ duyệt',
  AI_EVENT_LOCKED: 'Khóa request AI',
  AI_EVENT_UNLOCKED: 'Mở khóa request AI',
  AI_REPLAY_TEST: 'Chạy kiểm thử Replay',
};
export const AI_VERDICTS: Record<string, string> = { SAFE: 'An toàn', FLAGGED: 'Gắn cờ', CHECKING: 'Đang kiểm tra', UNAVAILABLE: 'Không khả dụng', NOT_CHECKED: 'Chưa kiểm tra' };
/** Latency target shown on the P95 card. */
export const SLA_MS = 5000;

export const fmt = (value: number | null | undefined, digits = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('vi-VN', { maximumFractionDigits: digits }) : '—';
export const percent = (value: number | null | undefined, digits = 2) => value == null ? '—' : `${fmt(value, digits)}%`;
export const ms = (value: number | null | undefined) => value == null ? '—' : `${fmt(Math.round(value))} ms`;
export const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(date.getTime()) ? null : date;
};
/** "14:28:12.450" today, full date otherwise. */
export const clock = (value?: string | null, withMillis = false) => {
  const date = toDate(value);
  if (!date) return '—';
  const time = date.toLocaleTimeString('vi-VN', { hour12: false }) + (withMillis ? `.${String(date.getMilliseconds()).padStart(3, '0')}` : '');
  return date.toDateString() === new Date().toDateString() ? time : `${date.toLocaleDateString('vi-VN')} ${time}`;
};
export const operationLabel = (operation: string) => OPERATIONS[operation]?.label ?? operation;
export const shortId = (id: string) => `#REQ-${id.slice(0, 8).toUpperCase()}`;
export const levelOf = (event: AiEvent): AiEventLevel => event.status !== 'SUCCESS' ? 'FAILED' : event.outcome === 'FLAGGED' ? 'FLAGGED' : 'SUCCESS';

export function callerName(event: AiEvent) {
  if (event.userName) return event.userName;
  if (event.userType === 'GUEST') return 'Khách vãng lai';
  if (event.operation === 'CONTENT_MODERATION') return 'Kiểm duyệt tự động';
  return USER_TYPES[event.userType ?? ''] ?? '—';
}

export function errorLabel(errorType?: string | null) {
  if (!errorType) return 'lỗi không xác định';
  if (errorType === 'AI_NOT_CONFIGURED') return 'chưa cấu hình API key';
  const http = /^HTTP_(\d{3})$/.exec(errorType);
  if (!http) return errorType;
  const code = Number(http[1]);
  if (code === 429) return 'vượt hạn mức gọi API (429)';
  if (code === 401 || code === 403) return `lỗi xác thực API key (${code})`;
  if (code >= 500) return `máy chủ AI lỗi (${code})`;
  return `HTTP ${code}`;
}

/** Built from metadata only; request and response content is intentionally never stored. */
export function summarize(event: AiEvent) {
  const tokens = event.totalTokens ? ` · ${fmt(event.totalTokens)} token` : '';
  if (event.status !== 'SUCCESS') return `Gọi Gemini thất bại: ${errorLabel(event.errorType)}`;
  if (event.operation === 'CONTENT_MODERATION' && event.outcome === 'FLAGGED') return `Phát hiện nội dung cần xem xét, chờ Admin duyệt${tokens}`;
  return `${OPERATIONS[event.operation]?.success ?? `${operationLabel(event.operation)} thành công`}${tokens}`;
}

// ── JSON viewer, hashing and CSV ───────────────────────────────────────────────

export function highlightJson(json: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const token = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g;
  let last = 0;
  for (let match = token.exec(json); match; match = token.exec(json)) {
    if (match.index > last) parts.push(json.slice(last, match.index));
    const kind = match[2] ? 'key' : match[1] ? 'string' : match[3] ? 'literal' : 'number';
    parts.push(<span key={match.index} className={`aim-json-${kind}`}>{match[1] ?? match[0]}</span>);
    if (match[2]) parts.push(match[2]);
    last = token.lastIndex;
  }
  parts.push(json.slice(last));
  return parts;
}

export async function sha256(text: string) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function downloadCsv(fileStem: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileStem}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
