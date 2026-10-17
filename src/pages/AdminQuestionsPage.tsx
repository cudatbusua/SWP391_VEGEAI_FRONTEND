import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Loader2, Save, Search, Trash2, X } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { Question, QuestionStatus } from '../types/community';
import { questionStatuses } from '../types/community';
import { communityDate, CommunityAdminNav, CommunityConfirm, CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, QuestionArticle, QuestionBadge } from '../components/CommunityUi';

function QuestionQueue() {
  const [status, setStatus] = useState<QuestionStatus | ''>('PENDING');
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(JSON.stringify(['question-queue', status, keyword, page]), signal => communityService.questionQueue(status, keyword, page, signal));
  return <div className="cm-shell"><CommunityAdminNav /><header className="cm-heading"><div><span className="cm-eyebrow"><CircleHelp size={15} /> QUẢN TRỊ HỖ TRỢ NGƯỜI DÙNG</span><h1>Quản lý Cần hỗ trợ & Giải đáp</h1></div><Link className="cm-button secondary" to="/support">Xem trang Cần hỗ trợ <ArrowRight size={16} /></Link></header>
    <div className="cm-toolbar"><select className="cm-select" aria-label="Lọc trạng thái câu hỏi" value={status} onChange={event => { setStatus(event.target.value as QuestionStatus | ''); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(questionStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="cm-search"><Search size={17} /><input aria-label="Tìm câu hỏi quản trị" placeholder="Tìm nội dung câu hỏi..." maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></div>
    {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.data && <><p className="cm-count">{query.data.totalElements} câu hỏi</p>{!query.data.items.length && <div className="cm-empty"><Check size={30} /><h2>Không có câu hỏi trong danh sách này</h2></div>}{query.data.items.map(question => <article className="cm-admin-row" key={question.id}><div><h2>{question.content}</h2><small>{question.authorName} · {communityDate(question.createdAt)} · {question.answer ? 'Đã trả lời' : 'Chưa trả lời'}</small></div><QuestionBadge question={question} /><div className="cm-actions"><Link className="cm-link-button" to={'/admin/questions/' + question.id}>Xem xét <ArrowRight size={15} /></Link></div></article>)}<CommunityPagination data={query.data} change={setPage} /></>}
  </div>;
}
export function AdminQuestionsPage() { return <MainLayout><CommunityGuard admin><QuestionQueue /></CommunityGuard></MainLayout>; }

function ReviewQuestion({ questionId }: { questionId: string }) {
  const navigate = useNavigate();
  const query = useCommunityQuery('admin-question:' + questionId, signal => communityService.adminQuestion(questionId, signal));
  const [post, setPost] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [reason, setReason] = useState('');
  const [modal, setModal] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { if (query.data) { setPost(query.data); setAnswer(query.data.answer || ''); } }, [query.data]);
  const dirty = !!post && answer !== (post.answer || '');
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const saveAnswer = async (event: React.FormEvent) => {
    event.preventDefault(); if (!post || busy || !answer.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try { const updated = await communityService.answer(post.id, answer, post.version); setPost(updated); setAnswer(updated.answer || ''); setMessage('Đã lưu câu trả lời.'); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!post || busy || !modal || (modal === 'reject' && !reason.trim())) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (modal === 'delete') { await communityService.deleteQuestion(post.id, post.version); navigate('/admin/questions', { replace: true }); return; }
      setPost(await communityService.moderate(post.id, modal === 'approve' ? 'APPROVE' : 'REJECT', post.version, reason));
      setMessage(modal === 'approve' ? 'Đã duyệt câu hỏi.' : 'Đã từ chối câu hỏi.'); setModal(null);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <div className="cm-shell"><CommunityAdminNav /><Link className="cm-back" to="/admin/questions"><ArrowLeft size={15} /> Danh sách câu hỏi</Link><header className="cm-heading"><div><span className="cm-eyebrow">BAN BIÊN TẬP VEGEAI</span><h1>Xem xét câu hỏi</h1></div>{post && <QuestionBadge question={post} />}</header>
    {query.busy ? <CommunityLoading /> : query.error ? <CommunityError message={query.error} retry={query.refresh} /> : post && <>
      {error && <CommunityError message={error} retry={query.refresh} />}{message && <p role="status" className="cm-alert">{message}</p>}
      <div className="cm-review-layout"><section className="cm-review-main"><QuestionArticle question={post} mine detail /><form onSubmit={saveAnswer} className="cm-form"><label className="cm-field">Câu trả lời của admin<textarea aria-label="Câu trả lời của admin" rows={9} required maxLength={10000} value={answer} disabled={busy} onChange={event => setAnswer(event.target.value)} /><small>{answer.length}/10000</small></label><div className="cm-actions"><button className="cm-button" disabled={busy || !answer.trim() || !dirty}>{busy ? <Loader2 size={16} className="cm-spin" /> : <Save size={16} />} Lưu câu trả lời</button></div></form></section>
      <aside className="cm-review-tool"><h2>Kiểm duyệt</h2><p>Người gửi: {post.authorName}<br />Ngày gửi: {communityDate(post.createdAt)}</p><button className="cm-button" disabled={busy || post.status === 'APPROVED'} onClick={() => { setModal('approve'); setError(''); }}><Check size={17} /> Duyệt công khai</button><button className="cm-button secondary" disabled={busy || post.status === 'REJECTED'} onClick={() => { setModal('reject'); setReason(''); setError(''); }}><X size={17} /> Từ chối</button><button className="cm-link-button" disabled={busy} style={{ color: '#ad3945' }} onClick={() => { setModal('delete'); setError(''); }}><Trash2 size={15} /> Xóa câu hỏi</button>{post.status === 'APPROVED' && <Link className="cm-success-link" to={'/questions/' + post.id}>Xem câu hỏi công khai <ArrowRight size={15} /></Link>}</aside></div>
      <CommunityConfirm open={!!modal} title={modal === 'delete' ? 'Xóa câu hỏi?' : modal === 'reject' ? 'Từ chối câu hỏi?' : 'Duyệt câu hỏi công khai?'} busy={busy} destructive={modal !== 'approve'} disabled={modal === 'reject' && !reason.trim()} onCancel={() => setModal(null)} onConfirm={confirm}>
        {modal === 'reject' ? <label className="cm-field">Lý do từ chối<textarea aria-label="Lý do từ chối" rows={4} maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} required /></label> : <p>{modal === 'delete' ? 'Câu hỏi và câu trả lời sẽ bị xóa vĩnh viễn.' : 'Câu hỏi và câu trả lời đã lưu sẽ hiển thị công khai.'}</p>}{error && <CommunityError message={error} />}
      </CommunityConfirm>
    </>}
  </div>;
}
export function AdminQuestionDetailPage() { const { id = '' } = useParams(); return <MainLayout><CommunityGuard admin><ReviewQuestion key={id} questionId={id} /></CommunityGuard></MainLayout>; }
