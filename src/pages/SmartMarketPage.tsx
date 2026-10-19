import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Printer,
  RotateCcw,
  Sparkles,
  Navigation,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
  Truck,
  ArrowRight
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { SmartMarketMap } from '../components/SmartMarketMap';
import {
  INITIAL_SMART_MARKET_ITEMS,
  SMART_MARKET_STORES,
  type SmartMarketItem,
  type SmartMarketStore
} from '../data/smartMarketData';
import '../styles/smart-market.css';

const LOCAL_STORAGE_KEY = 'vegeai:smart-market:items-v1';

function loadInitialItems(): SmartMarketItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore and return fallback
  }
  return INITIAL_SMART_MARKET_ITEMS;
}

export function SmartMarketPage() {
  const [items, setItems] = useState<SmartMarketItem[]>(loadInitialItems);
  const [activeTab, setActiveTab] = useState<'all' | 'unbought' | 'bought'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<SmartMarketStore | null>(SMART_MARKET_STORES[0]);
  const [storeCategoryFilter, setStoreCategoryFilter] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<'produce' | 'protein' | 'grains' | 'spices'>('produce');
  const [newMealNote, setNewMealNote] = useState('');

  // Persist items
  const updateItems = (updater: (prev: SmartMarketItem[]) => SmartMarketItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleToggle = (id: string) => {
    updateItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleDelete = (id: string) => {
    updateItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (window.confirm('Đặt lại danh sách mua sắm 21 bữa theo thực đơn chuẩn tuần này?')) {
      updateItems(() => INITIAL_SMART_MARKET_ITEMS);
    }
  };

  const handleMarkAll = (checked: boolean) => {
    updateItems(prev => prev.map(item => ({ ...item, checked })));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const categoryLabels: Record<string, string> = {
      produce: 'Rau củ & Quả tươi',
      protein: 'Đậu hũ & Các loại đậu, Hạt',
      grains: 'Tinh bột & Mì, Bún khô',
      spices: 'Gia vị bếp chay & Dầu ăn'
    };

    const newItem: SmartMarketItem = {
      id: 'custom-' + Date.now(),
      name: newName.trim(),
      amount: newAmount.trim() || '1 phần',
      category: newCategory,
      categoryLabel: categoryLabels[newCategory],
      mealNote: newMealNote.trim() || 'Món chay tự thêm',
      checked: false
    };

    updateItems(prev => [newItem, ...prev]);
    setNewName('');
    setNewAmount('');
    setNewMealNote('');
    setShowAddForm(false);
  };

  // Calculations
  const totalCount = items.length;
  const boughtCount = items.filter(i => i.checked).length;
  const unboughtCount = totalCount - boughtCount;
  const progressPercent = totalCount > 0 ? Math.round((boughtCount / totalCount) * 100) : 0;

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeTab === 'bought' && !item.checked) return false;
      if (activeTab === 'unbought' && item.checked) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      return true;
    });
  }, [items, activeTab, selectedCategory]);

  // Group by category
  const categories = [
    { key: 'produce', label: 'Rau củ & Quả tươi', desc: 'Nông sản địa phương, ưu tiên hữu cơ & VietGAP' },
    { key: 'protein', label: 'Đậu hũ & Các loại đậu, Hạt', desc: 'Nguồn đạm thực vật chính trong tuần' },
    { key: 'grains', label: 'Tinh bột & Mì, Bún khô', desc: 'Nền tảng năng lượng lành tính cho bữa chính' },
    { key: 'spices', label: 'Gia vị bếp chay & Dầu ăn', desc: 'Linh hồn vị giác đậm đà thuần tự nhiên' }
  ];

  // Filtered stores
  const filteredStores = useMemo(() => {
    if (storeCategoryFilter === 'ALL') return SMART_MARKET_STORES;
    return SMART_MARKET_STORES.filter(s => s.category === storeCategoryFilter);
  }, [storeCategoryFilter]);

  // User location Phú Nhuận
  const userLoc = { lat: 10.7952, lon: 106.6855 };

  return (
    <MainLayout>
      <div className="smart-market-page">
        {/* Hero Section */}
        <div className="smart-market-hero">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mb-3">
              <Link to="/dashboard" className="hover:text-emerald-700 transition">Trang chủ</Link>
              <ChevronRight size={14} />
              <Link to="/meal-plans" className="hover:text-emerald-700 transition">Kế hoạch tuần</Link>
              <ChevronRight size={14} />
              <span className="text-emerald-800 font-semibold">Đi chợ thông minh (Smart Market)</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="smart-market-badge">
                    <Sparkles size={13} /> Tuần 15 · 19/10 - 25/10/2026
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                    <ShieldCheck size={14} /> Đã lọc dị ứng &amp; dinh dưỡng
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Danh Sách Mua Sắm Đi Chợ Thông Minh
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-3xl">
                  Tổng hợp nguyên liệu từ 21 bữa ăn thuần chay trong tuần. Đã tự động cộng dồn định lượng, phân nhóm khoa học theo từng quầy mua sắm và kết nối bản đồ các điểm bán gần bạn trong bán kính 3km.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAddForm(v => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
                >
                  <Plus size={16} /> Thêm nguyên liệu
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 transition shadow-2xs"
                  title="Chia sẻ hoặc In danh sách đi chợ"
                >
                  <Printer size={15} /> Chia sẻ / In
                </button>
                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 transition shadow-2xs"
                  title="Đặt lại về danh sách tuần chuẩn"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Shopping Progress Bar Card */}
            <div className="mt-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-emerald-700" size={19} />
                  <span className="text-sm font-bold text-slate-800">Tiến độ mua sắm trong giỏ:</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {boughtCount} / {totalCount} món
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {progressPercent}% hoàn thành
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Còn {unboughtCount} món cần mua</span>
                  <span>·</span>
                  <button
                    onClick={() => handleMarkAll(boughtCount !== totalCount)}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    {boughtCount === totalCount ? 'Bỏ chọn tất cả' : 'Đánh dấu đã mua tất cả'}
                  </button>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Status / Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'all' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-slate-900'}`}
                  >
                    Tất cả ({totalCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('unbought')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'unbought' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-slate-900'}`}
                  >
                    Chưa mua ({unboughtCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('bought')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'bought' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-slate-900'}`}
                  >
                    Đã mua ({boughtCount})
                  </button>
                </div>

                {/* Filter by Aisle */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Tất cả quầy
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap ${
                        selectedCategory === cat.key
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Add Item Inline Modal/Form */}
          {showAddForm && (
            <div className="mb-6 p-5 bg-white border-2 border-emerald-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus size={16} className="text-emerald-700" /> Thêm nguyên liệu vào danh sách đi chợ
                </h3>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên nguyên liệu</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="VD: Cải thìa, Nấm đông cô..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Số lượng / Định lượng</label>
                  <input
                    type="text"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="VD: 500g, 2 cây, 1 hộp..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quầy hàng</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="produce">Rau củ &amp; Quả tươi</option>
                    <option value="protein">Đậu hũ &amp; Các loại đậu, Hạt</option>
                    <option value="grains">Tinh bột &amp; Mì, Bún khô</option>
                    <option value="spices">Gia vị bếp chay &amp; Dầu ăn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú bữa ăn</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMealNote}
                      onChange={e => setNewMealNote(e.target.value)}
                      placeholder="VD: Canh chua, Bữa tối..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Section 1: Shopping Checklist by Aisle */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                  Quầy Hàng &amp; Định Lượng Chi Tiết
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  Nguyên Liệu Cần Mua Trong Tuần ({filteredItems.length} món)
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categories.map(cat => {
                const catItems = filteredItems.filter(i => i.category === cat.key);
                if (selectedCategory !== 'all' && selectedCategory !== cat.key) return null;
                const totalInCat = items.filter(i => i.category === cat.key).length;
                const doneInCat = items.filter(i => i.category === cat.key && i.checked).length;

                return (
                  <div key={cat.key} className="smart-market-card flex flex-col justify-between">
                    <div>
                      {/* Aisle Header */}
                      <div className="aisle-header">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{cat.label}</h3>
                          <p className="text-[11px] text-slate-500">{cat.desc}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {doneInCat}/{totalInCat} đã xong
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-slate-100">
                        {catItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 italic">
                            Không có nguyên liệu nào ở trạng thái này.
                          </div>
                        ) : (
                          catItems.map(item => (
                            <div
                              key={item.id}
                              className={`market-item-row ${item.checked ? 'is-bought' : ''}`}
                            >
                              <div className="flex items-start gap-3 min-w-0 pr-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggle(item.id)}
                                  className="mt-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
                                  title={item.checked ? 'Đánh dấu chưa mua' : 'Đánh dấu đã mua'}
                                >
                                  {item.checked ? (
                                    <CheckCircle2 size={19} className="text-emerald-600 fill-emerald-50" />
                                  ) : (
                                    <Circle size={19} className="text-slate-300" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="item-name text-xs sm:text-sm font-bold text-slate-800 truncate">
                                      {item.name}
                                    </span>
                                    {item.checked && (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        Đã mua
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    Bữa: {item.mealNote}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {item.amount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className="text-slate-300 hover:text-red-500 p-1 transition cursor-pointer"
                                  title="Xóa nguyên liệu"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Smart Market Map & Store Inventory (Figma Screen 33) */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <span className="smart-market-badge mb-2">
                  <Navigation size={13} /> Đồng bộ thời gian thực
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Bản Đồ Mua Sắm Thông Minh &amp; Điểm Bán Gần Bạn
                </h2>
                <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                  Mua đủ 100% nguyên liệu tươi sạch chỉ trong bán kính 3km. VEGEAI chỉ dẫn đường đến các siêu thị hữu cơ, chợ dân sinh và cửa hàng thực phẩm chay uy tín nhất có sẵn danh mục nguyên liệu tuần này.
                </p>
              </div>

              {/* Store Category Filter */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
                <button
                  onClick={() => setStoreCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${storeCategoryFilter === 'ALL' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Tất cả ({SMART_MARKET_STORES.length})
                </button>
                <button
                  onClick={() => setStoreCategoryFilter('SUPERMARKET')}
                  className={`px-3 py-1.5 rounded-lg transition ${storeCategoryFilter === 'SUPERMARKET' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Siêu thị hữu cơ
                </button>
                <button
                  onClick={() => setStoreCategoryFilter('GROCERY_STORE')}
                  className={`px-3 py-1.5 rounded-lg transition ${storeCategoryFilter === 'GROCERY_STORE' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Nông sản sạch
                </button>
                <button
                  onClick={() => setStoreCategoryFilter('APPLIANCE')}
                  className={`px-3 py-1.5 rounded-lg transition ${storeCategoryFilter === 'APPLIANCE' ? 'bg-white text-cyan-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Điện Máy Xanh
                </button>
              </div>
            </div>

            {/* Split Grid: Store Cards on Left, Interactive Map on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Store Cards (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4 max-h-[640px] overflow-y-auto pr-1">
                {filteredStores.map((store, idx) => {
                  const isSelected = selectedStore?.id === store.id;
                  return (
                    <div
                      key={store.id}
                      onClick={() => setSelectedStore(store)}
                      className={`market-store-card ${isSelected ? 'is-active' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {store.categoryLabel}
                          </span>
                        </div>
                        <span className={`match-pill ${store.badgeType}`}>
                          {store.statusBadge}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{store.address}</p>

                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between gap-2 mb-2">
                        <div className="font-semibold text-slate-700">
                          Dự toán: <span className="text-emerald-700 font-bold">{store.priceEstimate}</span>
                        </div>
                        <div className="text-slate-500 font-medium">
                          {store.distance} ({store.duration})
                        </div>
                      </div>

                      {store.missingNote && (
                        <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg mb-3 border border-amber-100 leading-relaxed">
                          💡 {store.missingNote}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          ★ {store.rating} ({store.reviewsCount} đánh giá)
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          Chỉ đường <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Map View (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="store-map-container shadow-sm">
                  <SmartMarketMap
                    stores={filteredStores}
                    selectedStore={selectedStore}
                    onSelect={store => setSelectedStore(store)}
                    userLocation={userLoc}
                  />
                </div>

                {/* Selected Store Highlights Footer */}
                {selectedStore && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Điểm bán đang chọn:
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{selectedStore.name}</h4>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <Navigation size={14} /> Mở bản đồ tìm đường tối ưu (3km)
                      </a>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {selectedStore.notes}
                    </div>
                    {selectedStore.featuredItems && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500">Món nổi bật tại quầy:</span>
                        {selectedStore.featuredItems.map(item => (
                          <span key={item} className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-medium border border-emerald-100">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Assistance Banner (Screen 33 Footer) */}
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-xl shrink-0">
                  <Truck size={24} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Bạn không tiện ghé trực tiếp?</h3>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                    VEGEAI hỗ trợ gom đủ 16 nguyên liệu tươi sạch từ các cửa hàng uy tín và giao tận nhà trong vòng 45 phút.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Dịch vụ giao hàng xanh VEGEAI Express đang thử nghiệm tại TP.HCM. Cảm ơn bạn!')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap shadow-xs"
              >
                Đặt giao ngay <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
