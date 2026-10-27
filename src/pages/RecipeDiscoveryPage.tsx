import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Camera, Clock, ChevronLeft, ChevronRight, RefreshCw, SlidersHorizontal, X, Leaf, ArrowUpRight, CheckCheck, Soup, Zap, Play, MessageCircle, BookOpen } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { RecipeCard } from '../components/RecipeCard';
import '../styles/discovery.css';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { PageResponse } from '../types/api';
import type { RecipeSummary, RecipeTag } from '../types/recipe';

const groups: Record<string, string> = { dietaryType: 'Trường phái', cookingMethod: 'Cách chế biến', dishCategory: 'Loại món', nutritionGoal: 'Dinh dưỡng', occasion: 'Hoàn cảnh', dietaryRestriction: 'Kiêng / dị ứng' };

export function RecipeDiscoveryPage() {
  const { isAuthenticated } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tags, setTags] = useState<Record<string, RecipeTag[]>>({});
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [mode, setMode] = useState<'AND' | 'OR'>('AND');
  const [time, setTime] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState('newest:desc');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<RecipeSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tagError, setTagError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setTagError('');
    recipeService.tags(controller.signal).then(setTags).catch(reason => { if (!controller.signal.aborted) setTagError(errorMessage(reason)); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      const [sortBy, sortDirection] = sort.split(':');
      recipeService.filter({ keyword: keyword.trim() || undefined, includeTagCodes: included, excludeTagCodes: excluded,
        inclusionMode: mode, maxCookTime: time ? Number(time) : undefined, maxCalories: calories ? Number(calories) : undefined,
        minProtein: protein ? Number(protein) : undefined, difficulty: difficulty || undefined, sortBy, sortDirection, page, size: 12,
      }, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); })
        .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, included, excluded, mode, time, calories, protein, difficulty, sort, page, reload]);
  const toggle = (code: string, exclusion: boolean) => {
    const setter = exclusion ? setExcluded : setIncluded;
    setter(previous => previous.includes(code) ? previous.filter(value => value !== code) : [...previous, code]); setPage(0);
  };
  const reset = () => { setKeyword(''); setIncluded([]); setExcluded([]); setMode('AND'); setTime(''); setCalories(''); setProtein(''); setDifficulty(''); setSort('newest:desc'); setPage(0); };
  const activeCount = included.length + excluded.length + [time, calories, protein, difficulty].filter(Boolean).length;
  const availableTags = Object.values(tags).flat();
  const quickFilters = [
    { name: 'Tất cả', code: '', icon: <Leaf size={16} /> },
    { name: 'Giàu đạm', code: 'HIGH_PROTEIN', icon: <Zap size={16} /> },
    { name: 'Nấu nhanh', code: 'QUICK_15', icon: <Clock size={16} /> },
    { name: 'Thuần chay', code: 'VEGAN', icon: <Leaf size={16} /> },
    { name: 'Món canh', code: 'SOUP', icon: <Soup size={16} /> },
  ].filter(item => !item.code || availableTags.some(tag => tag.code === item.code));
  return <MainLayout><div className="discovery-page">
    <section className="discovery-cover">
      <img src="/images/vietnamese-vegan-table.png" alt="Mâm cơm chay Việt Nam với đậu phụ, nấm, gỏi cuốn và rau xanh" fetchPriority="high" />
      <div className="discovery-cover-shade" />
      <div className="discovery-cover-content"><span className="discovery-eyebrow"><Leaf size={17} /> BẾP XANH MỖI NGÀY</span><h1>VEGEAI</h1><p>Món chay ngon, bữa ăn lành.<br />Cảm hứng từ căn bếp Việt của bạn.</p><div className="discovery-hero-actions"><a href="#cong-thuc" className="discovery-scan">Khám phá công thức <ArrowUpRight size={18} /></a>{isAuthenticated && <Link to="/fridge-scan" className="discovery-hero-secondary"><Camera size={18} /> Quét nguyên liệu</Link>}</div></div>
    </section>
    <div className="discovery-shell">
      <div className="discovery-toolbar" id="cong-thuc">
        <label className="discovery-search"><Search size={20} /><input aria-label="Tìm công thức" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(0); }} placeholder="Hôm nay bạn muốn nấu món gì?" />{keyword && <button title="Xóa tìm kiếm" aria-label="Xóa tìm kiếm" onClick={() => { setKeyword(''); setPage(0); }}><X size={16} /></button>}</label>
        {isAuthenticated && <Link to="/ai-chef" className="discovery-chef"><Zap size={17} /> Hỏi AI Bếp Trưởng <ArrowUpRight size={16} /></Link>}
      </div>
      <div className="discovery-quick-filters">{quickFilters.map(item => <button key={item.name} className={(!item.code ? !included.length : included.includes(item.code)) ? 'is-active' : ''} onClick={() => { if (!item.code) setIncluded([]); else setIncluded(previous => previous.includes(item.code) ? previous.filter(value => value !== item.code) : [...previous, item.code]); setPage(0); }}>{item.icon}{item.name}</button>)}</div>
      <div className="discovery-grid">
        <button onClick={() => setFiltersOpen(value => !value)} aria-expanded={filtersOpen} aria-controls="recipe-filters" className="discovery-filter-toggle"><SlidersHorizontal size={17} />{filtersOpen ? 'Ẩn bộ lọc' : 'Bộ lọc'}{activeCount > 0 && <span>{activeCount}</span>}</button>
        <aside id="recipe-filters" className={'discovery-filters ' + (filtersOpen ? 'is-open' : '')}>
          <div className="discovery-filter-heading"><h2><SlidersHorizontal size={16} /> Bộ lọc</h2><button onClick={reset}>Đặt lại</button></div>
          <label className="discovery-field">Kết hợp thẻ<select value={mode} onChange={event => { setMode(event.target.value as 'AND' | 'OR'); setPage(0); }}><option value="AND">Tất cả thẻ đã chọn</option><option value="OR">Bất kỳ thẻ đã chọn</option></select></label>
          {tagError && <p role="alert" className="discovery-error">{tagError}</p>}
          {Object.entries(tags).map(([group, values]) => values?.length ? <details key={group} open={group === 'dietaryType'} className="discovery-filter-group"><summary>{groups[group] || group}<span>{values.length}</span></summary><div>{values.map(tag => <label key={tag.code} className="discovery-checkbox"><input type="checkbox" checked={included.includes(tag.code)} onChange={() => toggle(tag.code, false)} /><span>{tag.name}</span></label>)}</div></details> : null)}
          <details className="discovery-filter-group"><summary>Thời gian & dinh dưỡng</summary><div className="discovery-numeric"><label className="discovery-field">Thời gian tối đa (phút)<input type="number" min="1" value={time} onChange={event => { setTime(event.target.value); setPage(0); }} placeholder="Không giới hạn" /></label><label className="discovery-field">Calo tối đa<input type="number" min="1" value={calories} onChange={event => { setCalories(event.target.value); setPage(0); }} placeholder="Không giới hạn" /></label><label className="discovery-field">Đạm tối thiểu (g)<input type="number" min="0" value={protein} onChange={event => { setProtein(event.target.value); setPage(0); }} placeholder="Không giới hạn" /></label><label className="discovery-field">Độ khó<select value={difficulty} onChange={event => { setDifficulty(event.target.value); setPage(0); }}><option value="">Tất cả</option><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select></label></div></details>
          <details className="discovery-filter-group"><summary>Loại trừ thẻ</summary><div>{availableTags.map(tag => <label key={tag.code} className="discovery-checkbox"><input type="checkbox" aria-label={'Loại trừ ' + tag.name} checked={excluded.includes(tag.code)} onChange={() => toggle(tag.code, true)} /><span>{tag.name}</span></label>)}</div></details>
          <div className="discovery-sidebar-note"><CheckCheck size={18} /><div><strong>Nấu ngon, ăn lành</strong><p>Kiểm tra thành phần để chọn món phù hợp với chế độ ăn của bạn.</p></div></div>
        </aside>
        <section className="discovery-results" aria-busy={loading}>
          <div className="discovery-results-heading"><div><span className="discovery-section-label">CẢM HỨNG CHO BỮA ĂN</span><h2>{keyword ? 'Kết quả tìm kiếm' : 'Món ngon đáng thử'}<span>{data?.totalElements ?? 0}</span></h2></div><select aria-label="Sắp xếp công thức" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="newest:desc">Mới nhất</option><option value="calories:asc">Calo thấp nhất</option><option value="cookTime:asc">Nấu nhanh nhất</option><option value="protein:desc">Đạm cao nhất</option></select></div>
          {(included.length > 0 || excluded.length > 0) && <div className="discovery-active-tags">{[...included.map(code => ({ code, exclusion: false })), ...excluded.map(code => ({ code, exclusion: true }))].map(item => <button key={(item.exclusion ? 'exclude-' : '') + item.code} onClick={() => toggle(item.code, item.exclusion)}>{item.exclusion ? 'Loại trừ: ' : ''}{availableTags.find(tag => tag.code === item.code)?.name || item.code}<X size={13} /></button>)}</div>}
          {loading && !data && <div className="recipe-grid" role="status" aria-label="Đang tải công thức">{[0, 1, 2].map(value => <div className="recipe-skeleton" key={value}><div /><span /><span /></div>)}</div>}
          {error && <div role="alert" className="discovery-empty"><RefreshCw size={28} /><h3>Chưa thể tải món ăn</h3><p>{error}</p><button onClick={() => setReload(value => value + 1)}>Thử lại</button></div>}
          {!loading && !error && !data?.items.length && <div role="status" className="discovery-empty"><Soup size={36} /><h3>Chưa có món phù hợp</h3><p>Thử đổi từ khóa hoặc giảm bớt bộ lọc.</p><button onClick={reset}>Đặt lại bộ lọc</button></div>}
          {!error && <div className={'recipe-grid ' + (loading && data ? 'is-loading' : '')}>{data?.items.map(recipe => <RecipeCard key={recipe.recipeId} recipe={recipe} />)}</div>}
          {data && data.totalPages > 1 && <nav aria-label="Phân trang công thức" className="discovery-pagination"><button title="Trang trước" aria-label="Trang trước" disabled={loading || data.first} onClick={() => setPage(value => value - 1)}><ChevronLeft size={20} /></button><span>Trang {data.page + 1} / {data.totalPages}</span><button title="Trang sau" aria-label="Trang sau" disabled={loading || data.last} onClick={() => setPage(value => value + 1)}><ChevronRight size={20} /></button></nav>}
      <section className="discovery-journal" aria-labelledby="discovery-journal-title"><div className="discovery-journal-heading"><span className="discovery-section-label">CHUYỆN TỪ CĂN BẾP</span><h2 id="discovery-journal-title">Thêm cảm hứng, thêm vị ngon</h2><p>Cùng nấu, cùng chia sẻ một lối sống xanh.</p></div><div className="discovery-journal-grid">
        {isAuthenticated && <Link to="/videos"><div className="discovery-journal-photo"><img src="/images/tofu-tomato.png" alt="Đậu phụ sốt cà chua với rau thơm" loading="lazy" /><span><Play size={19} /></span></div><div><small>VIDEO BẾP CHAY</small><h3>Vào bếp cùng nhau <ArrowUpRight size={19} /></h3><p>Xem video, tìm cảm hứng cho bữa ăn tiếp theo.</p></div></Link>}
        <Link to="/blog"><div className="discovery-journal-photo"><img src="/images/vegan-tofu-meal.png" alt="Bữa ăn thực vật với đậu phụ và rau củ" loading="lazy" /><span><BookOpen size={19} /></span></div><div><small>BLOG CỘNG ĐỒNG</small><h3>Chuyện bếp, chuyện xanh <ArrowUpRight size={19} /></h3><p>Đọc những chia sẻ và kể câu chuyện của bạn.</p></div></Link>
        <Link to="/questions"><div className="discovery-journal-photo"><img src="/images/fresh-vegetables.png" alt="Rau củ tươi nhiều màu sắc" loading="lazy" /><span><MessageCircle size={19} /></span></div><div><small>HỎI & ĐÁP</small><h3>Bạn hỏi, bếp trả lời <ArrowUpRight size={19} /></h3><p>Gửi thắc mắc về nấu ăn và dinh dưỡng thực vật.</p></div></Link>
      </div></section>
        </section>
      </div>
    </div>
  </div></MainLayout>;
}
