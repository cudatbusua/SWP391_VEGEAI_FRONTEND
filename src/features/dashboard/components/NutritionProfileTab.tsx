import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Save,
  Plus,
  X,
  User,
  Activity,
  Salad,
  AlertTriangle
} from 'lucide-react';

export const NutritionProfileTab: React.FC = () => {
  // Form profile state
  const [profile, setProfile] = useState({
    fullName: 'Nguyễn Hoàng Minh',
    email: 'minh.nguyen@vegeai.vn',
    gender: 'Nam',
    age: 28,
    height: 175,
    weight: 68,
    activityLevel: 'Vận động vừa (3-5 buổi/tuần)',
    goal: 'Duy trì cân nặng & Sức khỏe',
    dietStyle: 'Vegan (Thuần chay - Không sữa, không trứng)',
    allergies: ['Đậu phộng (Lạc)', 'Hải sản chay giả', 'Nấm mỡ']
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dynamic BMI Calculation
  const heightM = profile.height / 100;
  const bmi = (profile.weight / (heightM * heightM)).toFixed(1);

  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergy.trim()) return;
    if (!profile.allergies.includes(newAllergy.trim())) {
      setProfile({
        ...profile,
        allergies: [...profile.allergies, newAllergy.trim()]
      });
    }
    setNewAllergy('');
  };

  const handleRemoveAllergy = (tag: string) => {
    setProfile({
      ...profile,
      allergies: profile.allergies.filter((t) => t !== tag)
    });
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Title & Onboarding status (Image 2) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase mb-1 block">
            HỒ SƠ DINH DƯỠNG & SỨC KHỎE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Trang Cá Nhân & AI Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các chỉ số sinh học, chế độ ăn chay và mục tiêu calo cá nhân hóa của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
            ✓
          </div>
          <div className="text-xs">
            <div className="text-[10px] text-emerald-700 font-medium">Trạng thái Onboarding</div>
            <div className="font-bold text-emerald-900">Đã hoàn thành ✓</div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Hồ sơ dinh dưỡng đã được cập nhật thành công! AI đã tính toán lại chỉ số TDEE cho bạn.</span>
        </div>
      )}

      {/* Main Grid: Left 8 cols / Right 4 cols (Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Input Fields */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Box 1: Thông Tin Cơ Bản */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Thông Tin Cơ Bản</span>
              </div>
              <span className="text-xs text-gray-400">Cập nhật gần đây: Hôm nay</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Giới tính</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tuổi</label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chiều cao (cm)</label>
                <input
                  type="number"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cân nặng (kg)</label>
                <input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Box 2: Vận Động & Mục Tiêu */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Vận Động & Mục Tiêu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mức độ vận động</label>
                <select
                  value={profile.activityLevel}
                  onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Ít vận động (Ngồi nhiều)">Ít vận động (Ngồi nhiều)</option>
                  <option value="Vận động nhẹ (1-3 buổi/tuần)">Vận động nhẹ (1-3 buổi/tuần)</option>
                  <option value="Vận động vừa (3-5 buổi/tuần)">Vận động vừa (3-5 buổi/tuần)</option>
                  <option value="Vận động nhiều (6-7 buổi/tuần)">Vận động nhiều (6-7 buổi/tuần)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mục tiêu dinh dưỡng</label>
                <select
                  value={profile.goal}
                  onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Giảm mỡ, giảm cân lành mạnh">Giảm mỡ, giảm cân lành mạnh</option>
                  <option value="Duy trì cân nặng & Sức khỏe">Duy trì cân nặng & Sức khỏe</option>
                  <option value="Tăng cơ nạc thuần thực vật">Tăng cơ nạc thuần thực vật</option>
                </select>
              </div>
            </div>
          </div>

          {/* Box 3: Loại Hình Ăn Chay Hiện Tại */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-4">
              <Salad className="w-4 h-4 text-emerald-600" />
              <span>Loại Hình Ăn Chay Hiện Tại</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phong cách thực hành</label>
              <select
                value={profile.dietStyle}
                onChange={(e) => setProfile({ ...profile, dietStyle: e.target.value })}
                className="w-full py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Vegan (Thuần chay - Không sữa, không trứng)">Vegan (Thuần chay - Không sữa, không trứng)</option>
                <option value="Lacto-Ovo Vegetarian (Ăn chay có trứng và sữa)">Lacto-Ovo Vegetarian (Ăn chay có trứng và sữa)</option>
                <option value="Flexitarian (Ăn chay bán phần / Linh hoạt)">Flexitarian (Ăn chay bán phần / Linh hoạt)</option>
              </select>
              <p className="text-xs text-gray-400 mt-2">
                AI Bếp Trưởng sẽ tự động lọc toàn bộ công thức và gợi ý món ăn theo đúng tiêu chí này.
              </p>
            </div>
          </div>

          {/* Box 4: Dị Ứng & Thực Phẩm Tránh */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Dị Ứng & Thực Phẩm Tránh</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Thêm các nguyên liệu bạn bị dị ứng để hệ thống cảnh báo đỏ khi quét tủ lạnh hoặc đề xuất thực đơn.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800"
                >
                  <span>{allergy}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(allergy)}
                    className="hover:text-red-500 cursor-pointer transition p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add tag input */}
            <form onSubmit={handleAddAllergy} className="flex gap-2">
              <input
                type="text"
                placeholder="Thêm dị ứng mới (ví dụ: Đậu nành, Hành tỏi...)"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                className="flex-1 py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#005f3e] hover:bg-[#004e33] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </form>
          </div>

          {/* Save Button */}
          <div>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-[#005f3e] hover:bg-[#004e33] text-white font-bold text-sm rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>

        </div>

        {/* Right Column (4 cols): AI Summary Cards (Image 2) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Tổng Kết Chỉ Số AI (Dark green) */}
          <div className="bg-[#005f3e] text-white rounded-3xl p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-5">
              <Sparkles className="w-4 h-4" />
              <span>Tổng Kết Chỉ Số AI</span>
            </div>

            {/* Sub-box: BMI */}
            <div className="bg-white/10 rounded-2xl p-4 mb-4 backdrop-blur-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-semibold">Chỉ số BMI</div>
                <div className="text-2xl font-black mt-0.5">{bmi}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#00875a] text-white">
                Bình thường
              </span>
            </div>

            {/* Sub-box: TDEE */}
            <div className="bg-white/10 rounded-2xl p-4 mb-6 backdrop-blur-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-semibold">Calo đề xuất (TDEE)</div>
                <div className="text-2xl font-black mt-0.5">2,150</div>
              </div>
              <span className="text-xs text-emerald-200 font-medium">kcal / ngày</span>
            </div>

            {/* Sub-box: Macro */}
            <div className="space-y-3.5 pt-2 border-t border-white/15">
              <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                Phân bổ Macro lý tưởng
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-100">Protein (Đạm thực vật)</span>
                  <span className="font-bold">25% (134g)</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-300 h-full rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-100">Carbs (Tinh bột phức hợp)</span>
                  <span className="font-bold">50% (268g)</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-300 h-full rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-100">Chất béo (Healthy Fats)</span>
                  <span className="font-bold">25% (60g)</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-300 h-full rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>

          </div>

          {/* Card 2: Gợi ý từ AI Chef (White) */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 mb-1">Gợi ý từ AI Chef</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-light">
                Dựa trên mục tiêu <strong className="font-semibold text-gray-800">Duy trì cân nặng</strong> và chế độ <strong className="font-semibold text-gray-800">Vegan</strong>, bạn nên bổ sung thêm các loại hạt gai dầu và đậu lăng để đảm bảo đủ axit amin thiết yếu.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
