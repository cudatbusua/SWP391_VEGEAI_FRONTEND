import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  ShoppingBag,
  Check,
  Plus,
  ArrowRight,
  Bookmark,
  Droplets,
  ExternalLink,
  Leaf
} from 'lucide-react';

export const OverviewTab: React.FC = () => {
  const [waterMl, setWaterMl] = useState(1200);
  const [shoppingItems, setShoppingItems] = useState([
    { id: 1, name: 'Đậu lăng đỏ', amount: '200 g', checked: false },
    { id: 2, name: 'Bơ', amount: '1 quả', checked: false },
    { id: 3, name: 'Cà rốt', amount: '2 củ', checked: false },
    { id: 4, name: 'Gạo lứt', amount: '500 g', checked: true }
  ]);
  const [savedRecipes, setSavedRecipes] = useState<Set<number>>(new Set());

  const handleAddWater = () => {
    setWaterMl((prev) => Math.min(3000, prev + 250));
  };

  const toggleShoppingItem = (id: number) => {
    setShoppingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const toggleSaveRecipe = (id: number) => {
    const next = new Set(savedRecipes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedRecipes(next);
  };

  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Greeting Header (Image 1) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Chào Minh, hôm nay mình ăn xanh nhé!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Một ngày đủ chất, nhẹ nhàng — được chuẩn bị riêng cho Nguyễn Hoàng Minh.
          </p>
        </div>

        <div className="flex flex-col sm:items-end">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Vegan • Thuần chay</span>
          </div>
          <span className="text-xs text-gray-400 mt-1">Duy trì cân nặng & sức khỏe</span>
        </div>
      </div>

      {/* Section 1: Dinh dưỡng hôm nay (Image 1) */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Dinh dưỡng hôm nay</h2>
          <button className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer">
            <span>Xem nhật ký</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-center">
          
          {/* Circular Chart: 58% đã nạp */}
          <div className="lg:col-span-3 flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-600 transition-all duration-700"
                  strokeDasharray="58, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-extrabold text-gray-900 leading-none">58%</span>
                <span className="text-[10px] text-gray-400 mt-0.5">đã nạp</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 font-medium">Năng lượng đã nạp</div>
              <div className="text-2xl font-extrabold text-gray-900 leading-tight">1,250 <span className="text-xs font-normal text-gray-500">kcal</span></div>
              <div className="text-[11px] text-gray-400">Mục tiêu 2,150 kcal / ngày</div>
              <div className="text-xs font-semibold text-emerald-600 mt-0.5">Còn 900 kcal cho hôm nay</div>
            </div>
          </div>

          {/* Đạm thực vật */}
          <div className="lg:col-span-2 space-y-1.5">
            <div className="text-xs text-gray-500 font-medium">Đạm thực vật</div>
            <div className="text-xl font-bold text-gray-900">
              72 <span className="text-xs text-gray-400 font-normal">/ 134 g</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: '54%' }} />
            </div>
            <div className="text-[11px] text-gray-400">54% mục tiêu</div>
          </div>

          {/* Tinh bột */}
          <div className="lg:col-span-2 space-y-1.5">
            <div className="text-xs text-gray-500 font-medium">Tinh bột</div>
            <div className="text-xl font-bold text-gray-900">
              154 <span className="text-xs text-gray-400 font-normal">/ 268 g</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '57%' }} />
            </div>
            <div className="text-[11px] text-gray-400">57% mục tiêu</div>
          </div>

          {/* Chất béo */}
          <div className="lg:col-span-2 space-y-1.5">
            <div className="text-xs text-gray-500 font-medium">Chất béo</div>
            <div className="text-xl font-bold text-gray-900">
              41 <span className="text-xs text-gray-400 font-normal">/ 60 g</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-600 h-full rounded-full" style={{ width: '68%' }} />
            </div>
            <div className="text-[11px] text-gray-400">68% mục tiêu</div>
          </div>

          {/* Nước uống */}
          <div className="lg:col-span-3 bg-gray-50 border border-gray-100 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-gray-400 font-medium">Nước uống</div>
                <div className="text-sm font-bold text-gray-900">
                  {(waterMl / 1000).toFixed(1)} <span className="text-xs text-gray-400 font-normal">/ 2 lít</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddWater}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ 250 ml</span>
            </button>
          </div>

        </div>

        {/* Bottom Banner tip */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
          <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Bạn đang đi đúng hướng. Bổ sung đậu lăng vào bữa tối để tăng đạm thực vật và giữ cân bằng dinh dưỡng.
          </span>
        </div>
      </div>

      {/* Main Grid: Left 8 cols / Right 4 cols (Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Bữa ăn của bạn hôm nay */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Bữa ăn của bạn hôm nay</h2>
              <button className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer">
                <span>Kế hoạch tuần</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Meal 1: Bữa sáng */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 pb-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Bữa sáng</span>
                    <span>07:30</span>
                  </div>
                  <div className="aspect-[16/10] overflow-hidden bg-gray-200">
                    <img
                      src="https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80"
                      alt="Yến mạch chuối & chia"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">
                      Yến mạch chuối & chia
                    </h3>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">450 kcal</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Check className="w-3 h-3" /> Đã ăn
                  </span>
                </div>
              </div>

              {/* Meal 2: Bữa trưa */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 pb-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Bữa trưa</span>
                    <span>12:00</span>
                  </div>
                  <div className="aspect-[16/10] overflow-hidden bg-gray-200">
                    <img
                      src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80"
                      alt="Salad bơ quinoa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">
                      Salad bơ quinoa
                    </h3>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">650 kcal</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Check className="w-3 h-3" /> Đã ăn
                  </span>
                </div>
              </div>

              {/* Meal 3: Bữa tối */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 pb-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Bữa tối</span>
                    <span>18:30</span>
                  </div>
                  <div className="aspect-[16/10] overflow-hidden bg-gray-200">
                    <img
                      src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
                      alt="Cơm gạo lứt cuộn rong biển"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">
                      Cơm gạo lứt cuộn rong biển
                    </h3>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">700 kcal</span>
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    Sắp tới
                  </span>
                </div>
              </div>

            </div>

            {/* Bữa phụ footer */}
            <div className="mt-5 p-3.5 bg-gray-50 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <span>Bữa phụ: Sữa đậu nành & trái cây • Đã ăn 150 / 350 kcal</span>
              </div>
              <span className="font-bold text-emerald-800">2,150 kcal / ngày</span>
            </div>
          </div>

          {/* Gợi ý dành riêng cho Minh */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-gray-900">Gợi ý dành riêng cho Minh</h2>
              <Link to="/" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1">
                <span>Khám phá thêm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-6">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thuần chay • Đã lọc Đậu phộng (Lạc), Hải sản chay giả và Nấm mỡ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              {/* Card 1 */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-md transition flex flex-col justify-between">
                <div className="relative aspect-[16/11] bg-gray-100 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
                    alt="Salad bơ quinoa thanh mát"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                  <button
                    onClick={() => toggleSaveRecipe(1)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${savedRecipes.has(1) ? 'text-emerald-600 fill-emerald-600' : ''}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-xs mb-1 line-clamp-1">
                    Salad bơ quinoa thanh mát
                  </h3>
                  <div className="text-[11px] text-gray-400 mb-3">Giàu chất xơ • Dễ thực hiện</div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 pt-2 border-t border-gray-50">
                    <span>220 kcal</span>
                    <span>10 g đạm</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>⏱ 10 phút</span>
                    <span>1 khẩu phần</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-md transition flex flex-col justify-between">
                <div className="relative aspect-[16/11] bg-gray-100 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
                    alt="Cơm gạo lứt cuộn rong biển"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                  <button
                    onClick={() => toggleSaveRecipe(2)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${savedRecipes.has(2) ? 'text-emerald-600 fill-emerald-600' : ''}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-xs mb-1 line-clamp-1">
                    Cơm gạo lứt cuộn rong biển
                  </h3>
                  <div className="text-[11px] text-gray-400 mb-3">No lâu • Không gluten</div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 pt-2 border-t border-gray-50">
                    <span>310 kcal</span>
                    <span>8 g đạm</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>⏱ 25 phút</span>
                    <span>1 khẩu phần</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-md transition flex flex-col justify-between">
                <div className="relative aspect-[16/11] bg-gray-100 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80"
                    alt="Đậu lăng hầm rau củ"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                  <button
                    onClick={() => toggleSaveRecipe(3)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${savedRecipes.has(3) ? 'text-emerald-600 fill-emerald-600' : ''}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-xs mb-1 line-clamp-1">
                    Đậu lăng hầm rau củ
                  </h3>
                  <div className="text-[11px] text-gray-400 mb-3">Giàu đạm • Gợi ý cho bữa tối</div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 pt-2 border-t border-gray-50">
                    <span>380 kcal</span>
                    <span>22 g đạm</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>⏱ 30 phút</span>
                    <span>1 khẩu phần</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Right Column (4 cols) (Image 1) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: AI Bếp Trưởng (Dark green) */}
          <div className="bg-[#03543f] text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-3">
              <Sparkles className="w-4 h-4" />
              <span>AI Bếp Trưởng</span>
            </div>

            <h3 className="text-xl font-extrabold mb-2 leading-snug">
              Tối nay ăn gì? Để AI giúp bạn.
            </h3>

            <p className="text-xs text-emerald-100/90 leading-relaxed mb-6 font-light">
              Gợi ý món thuần chay từ nguyên liệu sẵn có, phù hợp mục tiêu và dị ứng của bạn.
            </p>

            <button
              onClick={() => alert('Đang kết nối AI Bếp Trưởng... Trò chuyện về thực đơn tối nay!')}
              className="w-full py-3 bg-white text-[#03543f] hover:bg-emerald-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <span>Trò chuyện với AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Quét Tủ Lạnh */}
          <div
            onClick={() => alert('Mở máy ảnh: Quét nhận diện thực phẩm trong tủ lạnh!')}
            className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs hover:shadow-md transition cursor-pointer group flex items-start justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition">
                  Quét Tủ Lạnh
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Chụp nguyên liệu, tìm món ngon. Tận dụng những gì bạn đang có.
                </p>
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition shrink-0 ml-2 mt-1" />
          </div>

          {/* Card 3: Danh sách đi chợ */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Danh sách đi chợ</h3>
              <span className="text-xs text-gray-400">
                Cho kế hoạch hôm nay • <strong className="text-emerald-700">{checkedCount} / {shoppingItems.length} đã mua</strong>
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {shoppingItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer select-none text-xs"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}>
                      {item.name}
                    </span>
                  </div>
                  <span className="text-gray-400">{item.amount}</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-gray-400 mb-4 text-center">
              + 4 nguyên liệu khác trong danh sách
            </div>

            <button
              onClick={() => alert('Mở danh sách đi chợ đầy đủ cho cả tuần')}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Xem danh sách đầy đủ</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
