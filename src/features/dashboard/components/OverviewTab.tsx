import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, ChefHat, Droplets, Plus, Minus, RotateCcw, ShoppingBag, X, Snowflake, Flame, Wheat, Activity, Leaf, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { recipeService } from '../../../services/recipeService';
import { nutritionService } from '../../../services/nutritionService';
import { fridgeService } from '../../../services/fridgeService';
import { ApiError, errorMessage } from '../../../services/apiClient';
import { RecipeCard } from '../../../components/RecipeCard';
import type { RecipeSummary } from '../../../types/recipe';
import type { FridgeSummary, NutritionProfile } from '../../../types/api';
import '../../../styles/discovery.css';
import '../../../styles/dashboard.css';

type ShoppingItem = { id: string; name: string; checked: boolean };
function readLocal<T>(key: string, fallback: T, validate: (value: unknown) => boolean): T {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return validate(value) ? value : fallback; }
  catch { return fallback; }
}

export function OverviewTab() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nutrition, setNutrition] = useState<NutritionProfile | null>(null);
  const [fridge, setFridge] = useState<FridgeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const waterKey = 'vegeai:water:' + user?.id + ':' + day;
  const shoppingKey = 'vegeai:shopping:' + user?.id;
  const [waterMl, setWaterMl] = useState(() => readLocal(waterKey, 0, value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5000));
  const [shopping, setShopping] = useState<ShoppingItem[]>(() => readLocal(shoppingKey, [], value => Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.checked === 'boolean')));
  const [itemName, setItemName] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setErrors([]);
    Promise.allSettled([
      nutritionService.getProfile(controller.signal),
      fridgeService.summary(),
      recipeService.filter({ page: 0, size: 3, sortBy: 'protein', sortDirection: 'desc' }, controller.signal),
    ]).then(([profileResult, fridgeResult, recipeResult]) => {
      if (controller.signal.aborted) return;
      const nextErrors: string[] = [];
      if (profileResult.status === 'fulfilled') setNutrition(profileResult.value);
      else if (!(profileResult.reason instanceof ApiError && profileResult.reason.status === 404)) nextErrors.push(errorMessage(profileResult.reason));
      if (fridgeResult.status === 'fulfilled') setFridge(fridgeResult.value);
      else nextErrors.push(errorMessage(fridgeResult.reason));
      if (recipeResult.status === 'fulfilled') setRecipes(recipeResult.value.items);
      else nextErrors.push(errorMessage(recipeResult.reason));
      setErrors(nextErrors); setLoading(false);
    });
    return () => controller.abort();
  }, [user?.id, attempt]);
  useEffect(() => { localStorage.setItem(waterKey, JSON.stringify(waterMl)); }, [waterKey, waterMl]);
  useEffect(() => { localStorage.setItem(shoppingKey, JSON.stringify(shopping)); }, [shoppingKey, shopping]);
  const targets = nutrition?.targets;
  const stats = [
    { label: 'Năng lượng', value: targets?.dailyCaloriesTarget, unit: 'kcal', icon: <Flame size={18} />, color: 'energy' },
    { label: 'Chất đạm', value: targets?.proteinTargetG, unit: 'g', icon: <Activity size={18} />, color: 'protein' },
    { label: 'Tinh bột', value: targets?.carbsTargetG, unit: 'g', icon: <Wheat size={18} />, color: 'carbs' },
    { label: 'Chất xơ', value: targets?.fiberTargetG, unit: 'g', icon: <Leaf size={18} />, color: 'fiber' },
  ];
  const addShoppingItem = (event: React.FormEvent) => {
    event.preventDefault(); if (!itemName.trim()) return;
    setShopping(previous => [...previous, { id: crypto.randomUUID(), name: itemName.trim(), checked: false }]); setItemName('');
  };
  return <div className="dashboard-overview">
    <div className="dashboard-greeting"><div><span className="dashboard-eyebrow"><Leaf size={15} /> CĂN BẾP CỦA BẠN</span><h1>Chào {user?.name || 'bạn'}!</h1><p>Hôm nay, mình ăn xanh nhé.</p></div><Link to="/ai-chef" className="dashboard-assistant"><ChefHat size={19} /> Hỏi AI Bếp Trưởng <ArrowUpRight size={17} /></Link></div>
    {errors.length > 0 && <div role="alert" className="dashboard-error">{[...new Set(errors)].map(message => <p key={message}>{message}</p>)}<button onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} /> Thử lại</button></div>}
    <section className="dashboard-targets"><div className="dashboard-section-heading"><h2>Mục tiêu mỗi ngày</h2><Link to="/nutrition">Điều chỉnh <ArrowUpRight size={15} /></Link></div>
      <div className="dashboard-stats">{stats.map(stat => <div key={stat.label} className={'dashboard-stat ' + stat.color}><div>{stat.icon}<span>{stat.label}</span></div><p>{loading ? '--' : stat.value != null ? Math.round(stat.value).toLocaleString('vi-VN') : '--'}<span>{stat.unit}</span></p><div className="dashboard-stat-line" /></div>)}</div>
      {!loading && !nutrition && <p className="dashboard-setup">Bạn chưa thiết lập mục tiêu dinh dưỡng. <Link to="/nutrition">Tạo hồ sơ <ArrowUpRight size={13} /></Link></p>}
    </section>
    <div className="dashboard-columns">
      <div className="dashboard-main">
        <section><div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">MÓN NGON TỪ THỰC VẬT</span><h2>Cảm hứng cho bữa ăn</h2></div><Link to="/">Khám phá thêm <ArrowUpRight size={15} /></Link></div>
          <div className="dashboard-food-banner"><img src="/images/vietnamese-vegan-table.png" alt="Bữa cơm chay với gỏi cuốn, đậu phụ và rau xanh" /><div><span>BẾP XANH VIỆT NAM</span><h3>Bữa chay trọn vị.</h3><Link to="/">Chọn món cho hôm nay <ArrowUpRight size={16} /></Link></div></div>
          {loading && <p role="status" className="dashboard-muted">Đang tìm món ngon...</p>}
          <div className="recipe-grid dashboard-recipe-grid">{recipes.map(recipe => <RecipeCard key={recipe.recipeId} recipe={recipe} />)}</div>
          {!loading && !recipes.length && <p className="dashboard-muted">Chưa có công thức. <Link to="/">Khám phá món chay</Link></p>}
        </section>
        <section className="dashboard-fridge"><div className="dashboard-section-heading"><h2><Snowflake size={18} /> Tủ lạnh của bạn</h2><Link to="/fridge">Mở tủ lạnh <ArrowUpRight size={15} /></Link></div><div className="dashboard-fridge-data"><div><strong>{fridge?.totalActiveItems ?? '--'}</strong><span>Nguyên liệu đang có</span></div><div><strong className="text-emerald-700">{fridge?.freshCount ?? '--'}</strong><span>Còn tươi</span></div><div><strong className="text-amber-700">{fridge?.expiringSoonCount ?? '--'}</strong><span>Nên dùng sớm</span></div></div>{fridge?.urgentWarnings?.slice(0, 2).map(warning => <p className="dashboard-warning" key={warning}>{warning}</p>)}</section>
      </div>
      <aside className="dashboard-side">
        <Link to="/fridge-scan" className="dashboard-scan-link"><img src="/images/fresh-vegetables.png" alt="Rau củ tươi để quét nguyên liệu tủ lạnh" /><div><span><Camera size={16} /> AI QUÉT TỦ LẠNH</span><h3>Bạn có gì trong bếp?</h3><p>Chọn ảnh nguyên liệu</p><ArrowUpRight size={20} /></div></Link>
        <section className="dashboard-water"><div className="dashboard-section-heading"><h2><Droplets size={18} /> Nước hôm nay</h2><button title="Đặt lại lượng nước" aria-label="Đặt lại lượng nước" onClick={() => setWaterMl(0)}><RotateCcw size={15} /></button></div><p className="dashboard-water-total">{(waterMl / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}<span>lít đã uống</span></p><div className="dashboard-water-track"><div style={{ width: Math.min(100, waterMl / 2000 * 100) + '%' }} /></div><div className="dashboard-water-controls"><span>250 ml / lần</span><div><button title="Bớt 250 ml" aria-label="Bớt 250 ml" disabled={!waterMl} onClick={() => setWaterMl(value => Math.max(0, value - 250))}><Minus size={17} /></button><button title="Thêm 250 ml" aria-label="Thêm 250 ml" disabled={waterMl >= 5000} onClick={() => setWaterMl(value => Math.min(5000, value + 250))}><Plus size={17} /></button></div></div></section>
        <section className="dashboard-shopping"><div className="dashboard-section-heading"><h2><ShoppingBag size={17} /> Ghi chú đi chợ</h2><span>{shopping.filter(item => item.checked).length}/{shopping.length}</span></div><form onSubmit={addShoppingItem}><input aria-label="Nguyên liệu cần mua" maxLength={100} value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Thêm nguyên liệu..." /><button type="submit" title="Thêm vào danh sách" aria-label="Thêm vào danh sách" disabled={!itemName.trim()}><Plus size={17} /></button></form><ul>{shopping.map(item => <li key={item.id}><label><input type="checkbox" checked={item.checked} onChange={() => setShopping(previous => previous.map(value => value.id === item.id ? { ...value, checked: !value.checked } : value))} /><span className={item.checked ? 'is-done' : ''}>{item.name}</span></label><button title="Bỏ nguyên liệu" aria-label={'Bỏ ' + item.name} onClick={() => setShopping(previous => previous.filter(value => value.id !== item.id))}><X size={14} /></button></li>)}</ul>{!shopping.length && <p>Danh sách đang trống.</p>}</section>
      </aside>
    </div>
  </div>;
}
