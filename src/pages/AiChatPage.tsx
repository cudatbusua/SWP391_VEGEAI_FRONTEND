import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, ChefHat, Leaf, Plus, ScanLine, Sparkles, Soup, Timer, Utensils, Loader2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { aiService } from '../services/aiService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { AiChatResponse } from '../types/api';

const suggestions = [
  { icon: Soup, title: 'Nấu từ nguyên liệu có sẵn', text: 'Tôi có đậu phụ, nấm và cà chua. Gợi ý món chay cho bữa tối.' },
  { icon: Timer, title: 'Một bữa ngon trong 20 phút', text: 'Gợi ý một bữa chay dễ nấu trong 20 phút, kèm nguyên liệu và các bước thực hiện.' },
  { icon: Leaf, title: 'Đổi vị cho ngày hôm nay', text: 'Gợi ý 3 món chay Việt Nam để đổi vị, ưu tiên nguyên liệu dễ mua.' },
];
function Chat() {
  const location = useLocation();
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState(() => {
    const ingredients: unknown = location.state?.ingredients;
    const names = Array.isArray(ingredients) ? ingredients.filter((name): name is string => typeof name === 'string' && !!name.trim()).slice(0, 20).map(name => name.slice(0, 60)) : [];
    return names.length ? `Tôi có ${names.join(', ')}. Gợi ý món chay phù hợp, kèm định lượng và các bước nấu.` : '';
  });
  const [lastResponse, setLastResponse] = useState<AiChatResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true); setError('');
    const message = input.trim();
    setMessages(previous => [...previous, { sender: 'user', text: message }]); setInput('');
    try {
      const history = messages.slice(-10).map(item => ({ role: item.sender === 'user' ? 'user' as const : 'model' as const, text: item.text.slice(0, 4000) }));
      const response = await aiService.chat(message, lastResponse?.sessionId, history);
      setMessages(previous => [...previous, { sender: 'ai', text: response.reply }]); setLastResponse(response);
    } catch (reason) {
      setError(errorMessage(reason)); setInput(message); setMessages(previous => previous.slice(0, -1));
    } finally { setBusy(false); }
  };
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <div className="flex items-center justify-between gap-3 mb-6"><div><p className="text-xs font-bold text-emerald-700 mb-1">CĂN BẾP CỦA BẠN</p><h1 className="text-3xl font-bold">AI Bếp Trưởng</h1></div><button title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" disabled={busy} onClick={() => { setMessages([]); setLastResponse(null); setError(''); setInput(''); }} className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Plus size={20} /></button></div>
    <div className="mb-6"><Link to="/meal-plans" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 text-white px-4 py-3 text-sm font-semibold"><ChefHat size={18} /> Lập thực đơn tuần / tháng</Link></div>
    <div className="grid lg:grid-cols-[250px_1fr] gap-8">
      <aside className="hidden lg:block"><img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85" alt="Bữa chay với rau củ tươi" className="w-full aspect-[4/3] object-cover rounded-lg mb-5" /><div className="flex items-center gap-2 font-bold mb-2"><ChefHat size={19} className="text-emerald-700" /> Hôm nay ăn gì?</div><p className="text-sm text-gray-500 leading-6 mb-6">Một chút cảm hứng cho bữa chay, từ những nguyên liệu bạn yêu thích.</p><div className="border-t border-gray-200 pt-5 space-y-4"><Link to="/fridge-scan" className="flex items-center gap-3 text-sm font-medium hover:text-emerald-700"><ScanLine size={18} /> Quét nguyên liệu</Link><Link to="/nutrition" className="flex items-center gap-3 text-sm font-medium hover:text-emerald-700"><Leaf size={18} /> Mục tiêu dinh dưỡng</Link><Link to="/" className="flex items-center gap-3 text-sm font-medium hover:text-emerald-700"><Utensils size={18} /> Khám phá công thức</Link></div></aside>
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0"><div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><ChefHat size={20} /></span><div><p className="text-sm font-bold">Bếp trưởng VEGEAI</p><p className="text-xs text-gray-500">Người bạn đồng hành trong căn bếp</p></div></div>
        <div role="log" aria-live="polite" className="h-[430px] sm:h-[480px] overflow-y-auto p-5 sm:p-8">
          {!messages.length && <div className="max-w-xl mx-auto py-5"><Sparkles size={30} className="text-emerald-600 mb-5" /><h2 className="text-2xl sm:text-3xl font-bold mb-3">Cùng nấu một điều ngon nhé.</h2><p className="text-gray-500 text-sm leading-6 mb-7">Bạn có nguyên liệu gì, muốn ăn món nào, hay chỉ cần một ý tưởng cho bữa tối?</p><div className="space-y-3">{suggestions.map(({ icon: Icon, title, text }) => <button key={title} onClick={() => { setInput(text); field.current?.focus(); }} className="w-full flex items-center gap-3 text-left border-b border-gray-100 py-3 hover:text-emerald-700"><Icon size={20} className="text-emerald-600 shrink-0" /><span className="text-sm font-medium">{title}</span><ArrowUp size={16} className="ml-auto rotate-45 shrink-0" /></button>)}</div></div>}
          <div className="space-y-6">{messages.map((message, index) => <div key={index} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
            {message.sender === 'ai' && <ChefHat size={22} className="text-emerald-700 shrink-0 mt-1" />}<div className={`max-w-[90%] min-w-0 ${message.sender === 'user' ? 'bg-emerald-50 rounded-lg px-4 py-3' : ''}`}><p className="text-xs font-bold mb-2 text-emerald-800">{message.sender === 'user' ? 'Bạn' : 'Bếp trưởng VEGEAI'}</p><p className="text-sm leading-7 whitespace-pre-wrap break-words">{message.text}</p></div>
          </div>)}</div>
          {busy && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 mt-5"><Loader2 size={18} className="animate-spin" /> Bếp trưởng đang chuẩn bị câu trả lời...</p>}<div ref={bottom} />
        </div>
        {!!lastResponse?.recommendedRecipes?.length && <div className="px-5 py-3 border-t border-gray-100"><p className="text-xs font-bold text-emerald-700 mb-2">Món được gợi ý</p><ul className="text-sm space-y-1">{lastResponse.recommendedRecipes.map((recipe, index) => <li key={index}>{recipe}</li>)}</ul></div>}
        <div className="p-4 sm:p-5 border-t border-gray-100">{error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}<form onSubmit={submit} className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 focus-within:border-emerald-600"><textarea ref={field} id="ai-message" aria-label="Câu hỏi cho AI Bếp trưởng" value={input} onChange={event => setInput(event.target.value)} maxLength={2000} rows={2} disabled={busy} required placeholder="Hôm nay bạn muốn nấu gì?" className="w-full resize-none bg-transparent text-sm p-1 outline-none" /><button type="submit" title="Gửi câu hỏi" aria-label="Gửi câu hỏi" disabled={busy || !input.trim()} className="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-700 text-white rounded-lg disabled:opacity-40 hover:bg-emerald-800">{busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}</button></form><div className="flex flex-wrap justify-between gap-2 mt-3 text-xs text-gray-400"><span>{input.length}/2000</span>{lastResponse?.isGuestTrial && <span>Lượt dùng thử còn lại: {lastResponse.remainingGuestQuota ?? '—'} · <Link to="/login" className="text-emerald-700">Đăng nhập</Link></span>}</div></div>
      </section>
    </div>
  </div>;
}
export function AiChatPage() {
  const { user, isLoading } = useAuth();
  return <MainLayout>{isLoading ? <p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p> : <Chat key={user?.id || 'guest'} />}</MainLayout>;
}
