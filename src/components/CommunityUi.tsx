import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, ExternalLink, Loader2, MessageCircle, Play, RefreshCw, ShieldCheck, Video, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { PageResponse } from '../types/api';
import type { CommunityVideo, Question } from '../types/community';
import { questionStatuses, videoCategories } from '../types/community';
import { videoDuration, videoSource, videoThumbnail } from '../utils/communityVideo';
import { ContentRatingBadge } from './ContentRatingBadge';
import '../styles/interactionEntryPoints.css';
import '../styles/community.css';

export function CommunityGuard({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { isAuthenticated, isLoading, sessionError, retrySession, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <CommunityLoading />;
  if (sessionError && !isAuthenticated) return <CommunityError message={sessionError} retry={retrySession} />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user?.role !== 'admin') return <CommunityError message="Bạn cần quyền admin để truy cập trang này." />;
  return children;
}
export function CommunityLoading() { return <p role="status" className="cm-loading"><Loader2 size={20} className="cm-spin" /> Đang tải...</p>; }
export function CommunityError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="cm-alert error"><p>{message}</p>{retry && <button className="cm-link-button" onClick={retry}><RefreshCw size={15} /> Tải lại</button>}</div>;
}
export function CommunityPagination<T>({ data, change }: { data: PageResponse<T> | null; change: (page: number) => void }) {
  if (!data || data.totalPages < 2) return null;
  return <nav className="cm-pagination" aria-label="Phân trang"><button className="cm-icon" aria-label="Trang trước" title="Trang trước" disabled={data.first} onClick={() => change(data.page - 1)}><ChevronLeft size={19} /></button><span>Trang {data.page + 1} / {data.totalPages}</span><button className="cm-icon" aria-label="Trang sau" title="Trang sau" disabled={data.last} onClick={() => change(data.page + 1)}><ChevronRight size={19} /></button></nav>;
}
export function communityDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}
export function CommunityAdminNav() {
  return <nav className="cm-admin-nav" aria-label="Quản trị nội dung"><Link to="/admin"><ArrowLeft size={15} /> Quản trị</Link><Link to="/admin/questions"><CircleHelp size={16} /> Hỏi đáp</Link><Link to="/admin/videos"><Video size={16} /> Video</Link></nav>;
}
export function QuestionBadge({ question }: { question: Question }) {
  return <span className={'cm-badge ' + question.status.toLowerCase()}>{question.status === 'APPROVED' ? <BadgeCheck size={13} /> : <Clock3 size={13} />}{questionStatuses[question.status]}</span>;
}
export function QuestionArticle({ question, mine = false, detail = false }: { question: Question; mine?: boolean; detail?: boolean }) {
  return <article className="cm-question">
    <div className="cm-question-byline"><span className="cm-avatar">{question.authorName.charAt(0).toUpperCase()}</span><div><strong>{question.authorName}</strong><span>{communityDate(question.createdAt)}</span></div>{mine && <QuestionBadge question={question} />}</div>
    <p className={'cm-question-text ' + (!detail ? 'cm-clamp' : '')}>{question.content}</p>
    {question.answer && <div className="cm-answer"><div className="cm-answer-heading"><ShieldCheck size={16} /><strong>{question.answeredBy || 'Ban biên tập VEGEAI'}</strong><span>Ban biên tập</span></div><p className={!detail ? 'cm-clamp' : ''}>{question.answer}</p><small>{communityDate(question.answeredAt)}</small></div>}
    {mine && question.moderationReason && <div className="cm-alert warning"><strong>Lý do từ chối</strong><p>{question.moderationReason}</p></div>}
    {!detail && <div className="cm-question-footer"><span><MessageCircle size={14} /> {question.answer ? 'Đã trả lời' : 'Chưa có trả lời'}</span><Link to={(mine ? '/questions/mine/' : '/questions/') + question.id}>Xem chi tiết <ArrowRight size={14} /></Link></div>}
  </article>;
}
export function VideoCover({ video }: { video: Pick<CommunityVideo, 'videoUrl' | 'thumbnailUrl' | 'title' | 'durationSeconds'> }) {
  return <div className="cm-video-cover"><img src={videoThumbnail(video.videoUrl, video.thumbnailUrl)} alt={video.title} loading="lazy" onError={event => { if (!event.currentTarget.src.endsWith('/images/vietnamese-vegan-table.png')) event.currentTarget.src = '/images/vietnamese-vegan-table.png'; }} /><span className="cm-play-mark"><Play size={22} fill="currentColor" /></span>{!!video.durationSeconds && <span className="cm-duration">{videoDuration(video.durationSeconds)}</span>}</div>;
}
export function VideoCard({ video, extra }: { video: CommunityVideo; extra?: ReactNode }) {
  return <article className="cm-video-card"><Link to={'/videos/' + video.id}><VideoCover video={video} /></Link><div className="cm-video-card-meta"><span>{videoCategories[video.category || ''] || video.category || 'Bếp chay'}</span><time>{communityDate(video.createdAt)}</time></div><h2><Link to={'/videos/' + video.id}>{video.title}</Link></h2>{video.description && <p>{video.description}</p>}<ContentRatingBadge type="VIDEO" id={video.id} /><Link className="cm-video-engagement" to={'/videos/' + video.id + '#interactions'}><MessageCircle size={15} /><span>Bình luận & đánh giá</span><ArrowRight size={15} /></Link>{extra}</article>;
}
export function VideoPlayer({ video }: { video: CommunityVideo }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = videoSource(video.videoUrl);
  useEffect(() => { setPlaying(false); setFailed(false); }, [video.videoUrl]);
  if (!source) return <CommunityError message="Đường dẫn video không hợp lệ." />;
  return <div className="cm-player-wrap"><div className="cm-player">
    {source.kind === 'external' ? <a href={source.src} target="_blank" rel="noreferrer" className="cm-player-preview"><VideoCover video={video} /><span className="cm-player-caption">Xem video gốc <ExternalLink size={16} /></span></a>
      : !playing ? <button className="cm-player-preview" onClick={() => setPlaying(true)} aria-label={'Phát video: ' + video.title}><VideoCover video={video} /></button>
        : source.kind === 'embed' ? <iframe src={source.src} title={video.title} onError={() => setFailed(true)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          : <video src={source.src} controls autoPlay playsInline onError={() => setFailed(true)} poster={videoThumbnail(video.videoUrl, video.thumbnailUrl)}><a href={source.src}>Xem video gốc</a></video>}
  </div>{failed && <CommunityError message="Chưa tải được video. Bạn có thể mở đường dẫn gốc bên dưới." />}<a href={video.videoUrl} target="_blank" rel="noreferrer" className="cm-original-link">Mở video gốc <ExternalLink size={13} /></a></div>;
}
export function CommunityConfirm({ open, title, children, busy, disabled, destructive, onCancel, onConfirm }: {
  open: boolean; title: string; children: ReactNode; busy?: boolean; disabled?: boolean; destructive?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const labelId = useId();
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open && ref.current?.open) ref.current.close(); }, [open]);
  return <dialog ref={ref} className="cm-dialog" aria-labelledby={labelId} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="cm-dialog-heading"><h2 id={labelId}>{title}</h2><button type="button" className="cm-icon" title="Đóng" aria-label="Đóng" disabled={busy} onClick={onCancel}><X size={19} /></button></div>
    <div className="cm-dialog-body">{children}</div><div className="cm-actions"><button type="button" className="cm-button secondary" disabled={busy} onClick={onCancel}>Hủy</button><button type="button" className={'cm-button ' + (destructive ? 'danger' : '')} disabled={busy || disabled} onClick={onConfirm}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Check size={16} />} Xác nhận</button></div>
  </dialog>;
}
