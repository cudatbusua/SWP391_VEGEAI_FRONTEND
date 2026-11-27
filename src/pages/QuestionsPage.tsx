import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, FileQuestion, Leaf, Loader2, MessageCircle, Search, Send, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { useCommunityMotion } from '../hooks/useCommunityMotion';
import { communityService } from '../services/communityService';
import { errorMessage } from '../services/apiClient';
import type { Question, QuestionStatus } from '../types/community';
import { questionStatuses } from '../types/community';
import { CommunityError, CommunityGuard, CommunityLoading, CommunityPagination, QuestionArticle } from '../components/CommunityUi';
import '../styles/communityMotion.css';

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
  return <aside className="cm-compose" id="ask-question"><img src="/images/fresh-vegetables.png" alt="Rau củ tươi trong căn bếp chay" /><div className="cm-compose-body"><span className="cm-eyebrow"><MessageCircle size={14} /> GÓC CHIA SẺ</span><h2>Bạn đang băn khoăn điều gì?</h2>
    {error && <CommunityError message={error} />}
    {sent && <div role="status" className="cm-alert"><p>Câu hỏi đã được gửi và đang chờ duyệt.</p><Link className="cm-success-link" to={'/questions/mine/' + sent.id}>Xem câu hỏi của tôi <ArrowRight size={15} /></Link></div>}
    {isLoading ? <CommunityLoading /> : isAuthenticated ? <form onSubmit={send} className="cm-form"><label className="cm-field">Nội dung câu hỏi<textarea aria-label="Nội dung câu hỏi" value={content} onChange={event => setContent(event.target.value)} maxLength={5000} minLength={5} required disabled={busy} rows={5} placeholder="Ví dụ: Ngâm và nấu các loại đậu thế nào cho ngon?" /><small>{content.length}/5000</small></label><button className="cm-button full" disabled={busy || content.trim().length < 5}>{busy ? <Loader2 className="cm-spin" size={16} /> : <Send size={16} />} Gửi câu hỏi</button></form>
      : <Link className="cm-button full" to="/login" state={{ from: '/questions' }}><Send size={16} /> Đăng nhập để đặt câu hỏi</Link>}
    <div className="cm-side-links">{isAuthenticated && <Link to="/videos"><span>Vào bếp cùng VEGEAI</span><Video size={17} /></Link>}<Link to="/explore"><span>Tìm cảm hứng cho bữa chay</span><ArrowRight size={16} /></Link></div>
  </div></aside>;
}
const suggestedTopics = ['Đậu hũ', 'Đạm thực vật', 'Bữa ăn chay', 'Nguyên liệu'];

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
  useCommunityMotion('.cm-qa-motion .cm-question-list .cm-question', query.data?.items.map(question => question.id).join('|') || '');
  return (
    <div className="cm-shell cm-qa-motion">
      <header className="cm-heading qa-hero">
        <div className="qa-hero-copy">
          <span className="cm-eyebrow"><CircleHelp size={15} /> CỘNG ĐỒNG VEGEAI</span>
          <h1>{mine ? 'Câu hỏi của bạn, hành trình của bạn.' : user?.role === 'admin' ? 'Lắng nghe cộng đồng. Giải đáp đúng lúc.' : 'Hỏi điều bạn cần. Cùng nhau hiểu hơn.'}</h1>
          <p>{mine ? 'Theo dõi câu hỏi đã gửi và xem phản hồi từ ban biên tập.' : user?.role === 'admin' ? 'Theo dõi thắc mắc về món chay, duyệt nội dung và trả lời cho cộng đồng VEGEAI.' : 'Từ nguyên liệu, cách nấu đến dinh dưỡng chay — cùng chia sẻ kinh nghiệm và tìm câu trả lời đáng tin cậy.'}</p>
          <div className="qa-hero-links">
            <a className="qa-hero-primary" href={mine ? '#qa-feed' : user?.role === 'admin' ? '#qa-feed' : '#ask-question'}>
              {mine || user?.role === 'admin' ? <BookOpen size={17} /> : <Send size={17} />}
              {mine ? 'Xem câu hỏi của tôi' : user?.role === 'admin' ? 'Xem câu hỏi cộng đồng' : 'Đặt câu hỏi'}
              <ArrowRight size={16} />
            </a>
            {!mine && <a className="qa-hero-secondary" href="#qa-feed">Khám phá câu trả lời <ArrowRight size={16} /></a>}
          </div>
          <div className="cm-actions qa-hero-actions">
            {isAuthenticated && user?.role !== 'admin' && <Link className="cm-button secondary" to={mine ? '/questions' : '/questions/mine'}><FileQuestion size={16} />{mine ? 'Hỏi đáp cộng đồng' : 'Câu hỏi của tôi'}</Link>}
            {user?.role === 'admin' && <Link to="/admin/questions" className="cm-button secondary"><ShieldCheck size={16} /> Quản lý hỏi đáp</Link>}
          </div>
        </div>
        <div className="qa-hero-visual" aria-hidden="true">
          <img src="/images/vegan-tofu-meal.png" alt="" />
          <div className="qa-hero-note"><Sparkles size={18} /><span>Mỗi câu hỏi mở ra<br /><strong>một bữa chay tốt hơn.</strong></span></div>
        </div>
      </header>

      <div className="qa-intro" id="qa-feed">
        <div><span className="qa-kicker"><Leaf size={14} /> GÓC CHIA SẺ</span><h2>{mine ? 'Các câu hỏi bạn đã gửi' : 'Câu hỏi từ cộng đồng'}</h2><p>{mine ? 'Xem trạng thái duyệt và câu trả lời cho từng câu hỏi.' : 'Tìm kinh nghiệm thực tế và câu trả lời từ ban biên tập VEGEAI.'}</p></div>
        {!query.busy && query.data && <span className="qa-total">{query.data.totalElements} câu hỏi</span>}
      </div>

      {!mine && <div className="qa-topics" aria-label="Tìm nhanh theo chủ đề"><span>Khám phá nhanh</span>{suggestedTopics.map(topic => <button key={topic} type="button" aria-pressed={search === topic} onClick={() => { setSearch(search === topic ? '' : topic); setPage(0); }}>{topic}<ArrowRight size={13} /></button>)}</div>}

      <div className={'cm-qa-layout' + (user?.role === 'admin' ? ' cm-qa-admin' : '')}>
        <section aria-label={mine ? 'Danh sách câu hỏi của tôi' : 'Câu hỏi cộng đồng'}>
          <div className="cm-toolbar qa-toolbar">
            {mine ? <select className="cm-select" aria-label="Trạng thái câu hỏi" value={status} onChange={event => { setStatus(event.target.value as QuestionStatus | ''); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(questionStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <>
              <div className="cm-tabs">{[['', 'Tất cả'], ['true', 'Đã trả lời'], ['false', 'Chưa trả lời']].map(([value, label]) => <button key={value} aria-pressed={answered === value} onClick={() => { setAnswered(value as typeof answered); setPage(0); }}>{label}</button>)}</div>
              <label className="cm-search"><Search size={17} /><input aria-label="Tìm câu hỏi" placeholder="Tìm câu hỏi, nguyên liệu, dinh dưỡng..." maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
            </>}
          </div>
          {query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}
          {!query.busy && !query.error && query.data?.items.length === 0 && <div className="cm-empty qa-empty"><MessageCircle size={34} /><h2>{search || status || answered ? 'Chưa tìm thấy câu hỏi phù hợp' : mine ? 'Bạn chưa có câu hỏi nào' : 'Cùng mở đầu một cuộc trò chuyện'}</h2><p>{mine ? 'Có điều gì bạn muốn hỏi về căn bếp chay?' : 'Chuyện nấu nướng, nguyên liệu và những bữa ăn xanh.'}</p>{!mine && user?.role !== 'admin' && <a className="qa-empty-action" href="#ask-question">Đặt câu hỏi đầu tiên <ArrowRight size={16} /></a>}</div>}
          <div className="cm-question-list">{query.data?.items.map(question => <QuestionArticle key={question.id} question={question} mine={mine} />)}</div>
          <CommunityPagination data={query.data} change={setPage} />
        </section>
        {user?.role !== 'admin' && <AskQuestion />}
      </div>
    </div>
  );
}
export function QuestionsPage({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  return <MainLayout>{mine ? <CommunityGuard>{user?.role === 'admin' ? <Navigate to="/admin/questions" replace /> : <QuestionList mine />}</CommunityGuard> : <QuestionList mine={false} />}</MainLayout>;
}
function QuestionDetail({ mine }: { mine: boolean }) {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const query = useCommunityQuery(JSON.stringify(['question', mine, id, user?.id]), signal => mine ? communityService.myQuestion(id, signal) : communityService.question(id, signal));
  return <div className="cm-shell"><div className="cm-detail-narrow"><Link className="cm-back" to={mine ? '/questions/mine' : '/questions'}><ArrowLeft size={15} />{mine ? 'Câu hỏi của tôi' : 'Hỏi đáp cộng đồng'}</Link><h1>{mine ? 'Câu hỏi của bạn' : 'Góc hỏi đáp'}</h1>{query.busy && <CommunityLoading />}{query.error && <CommunityError message={query.error} retry={query.refresh} />}{query.data && <QuestionArticle question={query.data} mine={mine} detail />}</div></div>;
}
export function QuestionDetailPage({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  const { id = '' } = useParams();
  return <MainLayout>{mine ? <CommunityGuard>{user?.role === 'admin' ? <Navigate to={'/admin/questions/' + id} replace /> : <QuestionDetail mine />}</CommunityGuard> : <QuestionDetail mine={false} />}</MainLayout>;
}
