import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleHelp, FileQuestion, Loader2, MessageCircle, Search, Send, ShieldCheck, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { Question, QuestionStatus } from '../types/community';
import { questionStatuses } from '../types/community';
import { CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, QuestionArticle } from '../components/CommunityUi';

function AskQuestion() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<Question | null>(null);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || user?.role === 'admin' || content.trim().length < 5) return;
    setBusy(true); setError(''); setSent(null);
    try { setSent(await communityService.ask(content)); setContent(''); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  if (user?.role === 'admin') return null;
  return <aside className="cm-compose" id="ask-question"><img src="/images/fresh-vegetables.png" alt="Rau củ tươi trong căn bếp chay" /><div className="cm-compose-body"><span className="cm-eyebrow"><MessageCircle size={14} /> GỬI YÊU CẦU HỖ TRỢ</span><h2>Bạn cần hỗ trợ điều gì?</h2>
    {error && <CommunityError message={error} />}
    {sent && <div role="status" className="cm-alert"><p>Yêu cầu hỗ trợ của bạn đã được gửi và đang chờ phản hồi.</p><Link className="cm-success-link" to={'/questions/mine/' + sent.id}>Xem yêu cầu của tôi <ArrowRight size={15} /></Link></div>}
    {isLoading ? <CommunityLoading /> : isAuthenticated ? <form onSubmit={send} className="cm-form"><label className="cm-field">Nội dung cần hỗ trợ<textarea aria-label="Nội dung câu hỏi" value={content} onChange={event => setContent(event.target.value)} maxLength={5000} minLength={5} required disabled={busy} rows={5} placeholder="Ví dụ: Tôi cần hỗ trợ về thực đơn dinh dưỡng hoặc cách sử dụng tính năng quét tủ lạnh..." /><small>{content.length}/5000</small></label><button className="cm-button full" disabled={busy || content.trim().length < 5}>{busy ? <Loader2 className="cm-spin" size={16} /> : <Send size={16} />} Gửi yêu cầu hỗ trợ</button></form>
      : <Link className="cm-button full" to="/login" state={{ from: '/support' }}><Send size={16} /> Đăng nhập để gửi yêu cầu hỗ trợ</Link>}
    <div className="cm-side-links"><Link to="/blog"><span>Khám phá Cộng đồng & Video Bếp Chay</span><Video size={17} /></Link><Link to="/ai-chef"><span>Hỏi trực tiếp AI Bếp Trưởng Thông Minh</span><ArrowRight size={16} /></Link></div>
  </div></aside>;
}
function QuestionList({ mine }: { mine: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search);
  const [answered, setAnswered] = useState<'' | 'true' | 'false'>('');
  const [status, setStatus] = useState<QuestionStatus | ''>('');
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(JSON.stringify(['questions', mine, mine ? user?.id : '', keyword, answered, status, page]), signal => mine
    ? communityService.myQuestions(status, page, signal)
    : communityService.questions({ keyword, answered: answered === '' ? undefined : answered === 'true', page }, signal));
  return <div className="cm-shell"><header className="cm-heading"><div><span className="cm-eyebrow"><CircleHelp size={15} /> TRUNG TÂM TRỢ GIÚP VEGEAI</span><h1>{mine ? 'Yêu cầu hỗ trợ của tôi' : 'Cần hỗ trợ & Giải đáp'}</h1><p>Giải đáp thắc mắc về dinh dưỡng chay, tài khoản và cách sử dụng hệ thống VEGEAI.</p></div><div className="cm-actions">{isAuthenticated && user?.role !== 'admin' && <Link className="cm-button secondary" to={mine ? '/support' : '/support/mine'}><FileQuestion size={16} />{mine ? 'Tất cả mục Cần hỗ trợ' : 'Yêu cầu của tôi'}</Link>}{user?.role === 'admin' && <Link to="/admin/questions" className="cm-button secondary"><ShieldCheck size={16} /> Quản lý Cần hỗ trợ</Link>}</div></header>
    <div className={'cm-qa-layout' + (user?.role === 'admin' ? ' cm-qa-admin' : '')}><section aria-label={mine ? 'Danh sách yêu cầu của tôi' : 'Danh sách cần hỗ trợ'}><div className="cm-toolbar">{mine ? <select className="cm-select" aria-label="Trạng thái câu hỏi" value={status} onChange={event => { setStatus(event.target.value as QuestionStatus | ''); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(questionStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <><div className="cm-tabs">{[['', 'Tất cả'], ['true', 'Đã phản hồi'], ['false', 'Chờ phản hồi']].map(([value, label]) => <button key={value} aria-pressed={answered === value} onClick={() => { setAnswered(value as typeof answered); setPage(0); }}>{label}</button>)}</div><label className="cm-search"><Search size={17} /><input aria-label="Tìm câu hỏi" placeholder="Tìm nội dung hỗ trợ..." maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label></>}
      {!query.busy && query.data && <span className="cm-count">{query.data.totalElements} mục hỗ trợ</span>}</div>
      {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}
      {!query.busy && !query.error && query.data?.items.length === 0 && <div className="cm-empty"><MessageCircle size={34} /><h2>{search || status || answered ? 'Chưa tìm thấy nội dung phù hợp' : mine ? 'Bạn chưa gửi yêu cầu hỗ trợ nào' : 'Chưa có yêu cầu hỗ trợ công khai'}</h2><p>{mine ? 'Gửi yêu cầu ở khung bên phải để đội ngũ VEGEAI hỗ trợ bạn.' : 'Đội ngũ VEGEAI luôn sẵn sàng giải đáp thắc mắc của bạn.'}</p></div>}
      <div className="cm-question-list">{query.data?.items.map(question => <QuestionArticle key={question.id} question={question} mine={mine} />)}</div><CommunityPagination data={query.data} change={setPage} />
    </section>{user?.role !== 'admin' && <AskQuestion />}</div>
  </div>;
}
export function QuestionsPage({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  return <MainLayout>{mine ? <CommunityGuard>{user?.role === 'admin' ? <Navigate to="/admin/questions" replace /> : <QuestionList mine />}</CommunityGuard> : <QuestionList mine={false} />}</MainLayout>;
}
function QuestionDetail({ mine }: { mine: boolean }) {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const query = useCommunityQuery(JSON.stringify(['question', mine, id, user?.id]), signal => mine ? communityService.myQuestion(id, signal) : communityService.question(id, signal));
  return <div className="cm-shell"><div className="cm-detail-narrow"><Link className="cm-back" to={mine ? '/support/mine' : '/support'}><ArrowLeft size={15} />{mine ? 'Yêu cầu của tôi' : 'Cần hỗ trợ & Giải đáp'}</Link><h1>{mine ? 'Chi tiết yêu cầu hỗ trợ' : 'Chi tiết hỗ trợ & giải đáp'}</h1>{query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.data && <QuestionArticle question={query.data} mine={mine} detail />}</div></div>;
}
export function QuestionDetailPage({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  const { id = '' } = useParams();
  return <MainLayout>{mine ? <CommunityGuard>{user?.role === 'admin' ? <Navigate to={'/admin/questions/' + id} replace /> : <QuestionDetail mine />}</CommunityGuard> : <QuestionDetail mine={false} />}</MainLayout>;
}
