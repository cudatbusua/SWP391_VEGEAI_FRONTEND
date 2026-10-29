import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Palette,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Save,
  Activity,
  RefreshCw,
  ShieldAlert,
  Flame,
  Sparkles,
  Scale,
  Apple,
  Zap,
  Check
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../store/ThemeContext';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { nutritionService } from '../services/nutritionService';
import { MealPlanCalendarPlanner } from '../components/MealPlanCalendarPlanner';
import { SeasonalRegionalMealsView } from '../components/SeasonalRegionalMealsView';
import { sfx } from '../utils/soundEffects';
import { HealthActivityRings } from '../components/HealthActivityRings';
import { dietLabels, calculateBmr, calculateTdee } from '../utils/nutritionProfile';
import type { UserProfile, UpdateUserProfile, NutritionProfile } from '../types/api';
import { errorMessage } from '../services/apiClient';

const ALLERGIES_LIST = [
  'Đậu phộng (Lạc)',
  'Đậu nành (Tương)',
  'Gluten / Lúa mì',
  'Hạt vừng (Mè)',
  'Hạt điều',
  'Hạnh nhân',
  'Trứng (Ovo)',
  'Sữa bò (Lacto)',
  'Nấm hương'
];

export const AccountSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';

  const handleSelectTab = (tab: string) => {
    sfx.playTap();
    setSearchParams({ tab });
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatar, setAvatar] = useState('');
  const [, setNutrition] = useState<NutritionProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Profile Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number | ''>('');
  const [dietaryPreferences, setDietaryPreferences] = useState('VEGETARIAN');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // In-Settings Forgot Password / OTP Reset state
  const [isOtpResetMode, setIsOtpResetMode] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [isSubmittingOtpReset, setIsSubmittingOtpReset] = useState(false);

  // Cart toast
  const [cartAddToast, setCartAddToast] = useState<string | null>(null);

  // Load Profile and Nutrition from backend
  useEffect(() => {
    let mounted = true;
    setIsLoadingProfile(true);

    Promise.allSettled([
      userService.getProfile(),
      nutritionService.getProfile().catch(() => null),
    ]).then(([userRes, nutrRes]) => {
      if (!mounted) return;

      if (userRes.status === 'fulfilled') {
        const data = userRes.value;
        setProfile(data);
        setAvatar(data.avatarUrl || '');
        setFullName(data.fullName || '');
        setPhoneNumber(data.phoneNumber || '');
        setDateOfBirth(data.dateOfBirth || '');
        setGender(data.gender || '');
        setAddress(data.address || '');
        setHeightCm(data.heightCm || '');
        setWeightKg(data.weightKg || '');
        setDailyCalorieTarget(data.dailyCalorieTarget || '');
        setDietaryPreferences(data.dietaryPreferences || 'VEGETARIAN');
        if (data.allergies) {
          const list = data.allergies.split(',').map(s => s.trim()).filter(Boolean);
          setSelectedAllergies(list);
        }
      }

      if (nutrRes.status === 'fulfilled' && nutrRes.value) {
        setNutrition(nutrRes.value);
      }

      setIsLoadingProfile(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleAllergy = (allergy: string) => {
    sfx.playTap();
    setSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!fullName.trim()) {
      setProfileError('Vui lòng nhập họ và tên.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload: UpdateUserProfile = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        dietaryPreferences,
        allergies: selectedAllergies.join(','),
        heightCm: heightCm === '' ? undefined : Number(heightCm),
        weightKg: weightKg === '' ? undefined : Number(weightKg),
        dailyCalorieTarget: dailyCalorieTarget === '' ? undefined : Number(dailyCalorieTarget)
      };

      const updated = await userService.updateProfile(payload);
      setProfile(updated);
      sfx.playSuccess();
      setProfileSuccess('Hồ sơ cá nhân và chỉ số dinh dưỡng đã được cập nhật thành công!');
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err) {
      setProfileError(errorMessage(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await userService.changePassword(currentPassword, newPassword, confirmPassword);
      sfx.playSuccess();
      setPasswordSuccess('Đổi mật khẩu thành công! Toàn bộ phiên cũ trên thiết bị khác đã được thu hồi an toàn.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage('');
    setEmailError('');
    if (!newEmail.trim() || !emailPassword) {
      setEmailError('Vui lòng nhập email mới và mật khẩu hiện tại.');
      return;
    }
    setIsChangingEmail(true);
    try {
      const updated = await userService.changeEmail(newEmail.trim(), emailPassword);
      setProfile(updated);
      setNewEmail('');
      setEmailPassword('');
      setEmailMessage('Đã cập nhật địa chỉ email đăng nhập.');
      sfx.playSuccess();
    } catch (err) {
      setEmailError(errorMessage(err));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSendResetOtp = async () => {
    const targetEmail = profile?.email || user?.emailOrPhone;
    if (!targetEmail) {
      setPasswordError('Không tìm thấy địa chỉ email tài khoản để gửi mã OTP.');
      return;
    }
    setPasswordError('');
    setPasswordSuccess('');
    setIsSendingResetOtp(true);
    try {
      const res = await authService.forgotPassword({ emailOrPhone: targetEmail });
      if (res.success) {
        sfx.playSuccess();
        setOtpSentMessage(`Mã OTP 6 số đã được gửi đến email ${targetEmail}. Vui lòng kiểm tra hộp thư đến.`);
      } else {
        setPasswordError(res.error || 'Không thể gửi mã xác nhận OTP.');
      }
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleResetPasswordViaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const targetEmail = profile?.email || user?.emailOrPhone;
    if (!targetEmail) {
      setPasswordError('Không tìm thấy địa chỉ email tài khoản.');
      return;
    }
    if (!resetOtp.trim()) {
      setPasswordError('Vui lòng nhập mã OTP đã nhận qua email.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmittingOtpReset(true);
    try {
      const res = await authService.resetPassword(targetEmail, resetOtp.trim(), newPassword, confirmPassword);
      if (res.success) {
        sfx.playSuccess();
        setPasswordSuccess('Mật khẩu đã được thiết lập lại thành công! Bạn có thể tiếp tục sử dụng VEGEAI.');
        setIsOtpResetMode(false);
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSentMessage('');
      } else {
        setPasswordError(res.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setIsSubmittingOtpReset(false);
    }
  };

  // Add meal ingredients to shopping list
  const handleAddMealToShoppingList = (mealName: string) => {
    sfx.playTap();
    try {
      const LOCAL_STORAGE_KEY = 'vegeai:smart-market:items-v1';
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      const newItem = {
        id: 'meal-' + Date.now(),
        name: 'Nguyên liệu cho ' + mealName,
        amount: '1 phần nấu',
        category: 'produce',
        categoryLabel: 'Rau củ & Quả tươi',
        mealNote: mealName,
        checked: false
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newItem, ...items]));
      sfx.playSuccess();
      setCartAddToast(`Đã thêm nguyên liệu cho món "${mealName}" vào Danh sách Đi Chợ!`);
      setTimeout(() => setCartAddToast(null), 4000);
    } catch {
      // storage error
    }
  };

  // Deterministic BMI & Health Metrics Calculations
  const age = dateOfBirth ? Math.max(15, new Date().getFullYear() - new Date(dateOfBirth).getFullYear()) : 25;
  const hNum = heightCm === '' ? 0 : Number(heightCm);
  const wNum = weightKg === '' ? 0 : Number(weightKg);

  const bmi = useMemo(() => {
    if (hNum > 0 && wNum > 0) {
      const hM = hNum / 100;
      return Number((wNum / (hM * hM)).toFixed(1));
    }
    return 0;
  }, [hNum, wNum]);

  const bmiCategory = useMemo(() => {
    if (bmi === 0) return { label: 'Chưa có dữ liệu', color: 'text-slate-400', bg: 'bg-slate-100', barPercent: 0 };
    if (bmi < 18.5) return { label: 'Thiếu cân (Dưới chuẩn)', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/60', barPercent: 25 };
    if (bmi <= 24.9) return { label: 'Thể trạng chuẩn / Khỏe mạnh', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60', barPercent: 55 };
    if (bmi <= 29.9) return { label: 'Tiền béo phì / Hơi thừa cân', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60', barPercent: 78 };
    return { label: 'Béo phì (Cần giảm calo)', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/60', barPercent: 95 };
  }, [bmi]);

  const idealWeightRange = useMemo(() => {
    if (hNum > 0) {
      const hM = hNum / 100;
      const min = Math.round(18.5 * hM * hM);
      const max = Math.round(24.9 * hM * hM);
      return `${min} - ${max} kg`;
    }
    return '50 - 65 kg';
  }, [hNum]);

  // Deterministic BMR & TDEE Calculations
  const bmr = useMemo(() => {
    if (hNum > 0 && wNum > 0) {
      return calculateBmr(wNum, hNum, age, (gender as any) || 'OTHER');
    }
    return 1450;
  }, [hNum, wNum, age, gender]);

  const tdee = useMemo(() => calculateTdee(bmr, 1.375), [bmr]);

  // Calorie Input vs Output
  const calorieInput = dailyCalorieTarget === '' ? 1450 : Number(dailyCalorieTarget);
  const calorieOutput = tdee;
  const calorieBalance = calorieInput - calorieOutput;

  if (isLoadingProfile) {
    return (
      <MainLayout>
        <div className="max-w-[1380px] mx-auto px-4 py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Đang tải hồ sơ sức khỏe và dữ liệu calo...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        
        {/* Toast notification */}
        {cartAddToast && (
          <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-700 text-white shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{cartAddToast}</span>
          </div>
        )}

        {/* 1. USER IDENTITY HEADER BANNER: only belongs to the profile view */}
        {currentTab === 'profile' && (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            
            {/* Avatar & Identifiers */}
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="w-24 h-24 overflow-hidden rounded-full bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white flex items-center justify-center font-extrabold text-3xl shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-950/60">
                  {avatar ? <img src={avatar} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : (fullName ? fullName.charAt(0).toUpperCase() : user?.name?.charAt(0) || 'V')}
                </div>
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Đang trực tuyến" />
                <label className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap cursor-pointer text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Đổi avatar
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={async event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { setProfileError('Avatar không được vượt quá 2 MB.'); return; }
                    try { const updated = await userService.updateAvatar(file); setProfile(updated); setAvatar(updated.avatarUrl || ''); setProfileSuccess('Đã cập nhật avatar.'); }
                    catch (reason) { setProfileError(errorMessage(reason)); }
                  }} />
                </label>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {fullName || user?.name || 'Thành viên VEGEAI'}
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {profile?.role === 'ADMIN' ? '🛡️ Quản trị viên' : '🌱 Thành viên chính thức'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Trạng thái: Hoạt động (ACTIVE)
                  </span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  @{profile?.username || user?.username || 'member'} · {profile?.email || user?.emailOrPhone || 'Chưa cập nhật email'}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <Apple className="w-4 h-4 text-emerald-600" />
                    {dietLabels[dietaryPreferences] || 'Ăn chay thông thường'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links / Tabs */}
            {false && <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'profile'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Hồ sơ &amp; Thể trạng
              </button>
              <button
                type="button"
                onClick={() => handleSelectTab('calendar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  false
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Lịch biểu &amp; Thực đơn
              </button>
            </div>}

          </div>
        </section>
        )}

        {/* TAB 1: PROFILE & HEALTH METRICS */}
        {currentTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 2. BASIC INFORMATION & PHYSICAL BIOMETRICS FORM */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <User className="w-5 h-5 text-emerald-600" />
                Thông tin cá nhân & Thể trạng dinh dưỡng
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cập nhật cân nặng, chiều cao và mục tiêu calo để VEGEAI tính toán BMI, BMR và đề xuất thực đơn chuẩn xác.
              </p>
            </div>

            {/* Incomplete warning banner */}
            {(heightCm === '' || weightKg === '' || dailyCalorieTarget === '') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                Cần bổ sung đủ chiều cao & cân nặng
              </span>
            )}
          </div>

          {profileSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Grid 1: Basic Demographics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Giới tính
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-emerald-600"
                >
                  <option value="">Chưa chọn</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="MALE">Nam</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>

            {/* Grid 2: Physical Biometrics (Height, Weight, Target Calories) */}
            <div className="grid sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  placeholder="Ví dụ: 168"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Cân nặng hiện tại (kg)
                </label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  placeholder="Ví dụ: 58"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Mục tiêu Calo nạp/ngày (kcal)
                </label>
                <input
                  type="number"
                  min="800"
                  max="4000"
                  placeholder="Mặc định: 1500"
                  value={dailyCalorieTarget}
                  onChange={e => setDailyCalorieTarget(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Grid 3: Dietary Preferences & Allergies */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chế độ ăn chay ưu tiên
                </label>
                <select
                  value={dietaryPreferences}
                  onChange={e => setDietaryPreferences(e.target.value)}
                  className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-emerald-600"
                >
                  <option value="VEGAN">Thuần chay (Vegan - Hoàn toàn từ thực vật)</option>
                  <option value="VEGETARIAN">Ăn chay thông thường (Vegetarian)</option>
                  <option value="OVO_LACTO">Chay có trứng & sữa (Ovo-Lacto Vegetarian)</option>
                  <option value="FLEXITARIAN">Bán chay / Linh hoạt (Flexitarian)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Dị ứng thực phẩm (Hệ thống AI sẽ tuyệt đối loại trừ các nguyên liệu này):
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES_LIST.map(allergy => {
                    const isSelected = selectedAllergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => handleToggleAllergy(allergy)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{allergy}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu cập nhật hồ sơ & Thể trạng</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </section>

        {/* 3. HEALTH & CALORIE ACTIVITY DASHBOARD */}
        <section id="health-metrics" className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-emerald-600" />
                Vòng tròn Hoạt động & Chỉ số Năng lượng (Input / Output)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Mô hình trực quan chuẩn Apple Health / Fitness: Theo dõi tiến độ calo nạp vào, chuyển hóa cơ bản và cân bằng dinh dưỡng.
              </p>
            </div>
          </div>

          {/* Activity Concentric Rings */}
          <HealthActivityRings
            calories={calorieInput}
            calorieTarget={calorieInput}
            proteinGrams={56}
            fiberGrams={28}
            heightCm={heightCm}
            weightKg={weightKg}
            age={age}
            gender={gender}
            showDetails={true}
          />

          {/* Secondary Metric Cards Grid (BMI, Energy Balance Input/Output, Weight Recommendation) */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Card A: BMI Medical Gauge */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Chỉ số khối cơ thể (BMI)
                </span>
                <span className="text-xs font-bold text-slate-500">WHO / Chuẩn Y Tế</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {bmi > 0 ? bmi : '—'}
                </span>
                <span className="text-xs font-bold text-slate-500">kg/m²</span>
              </div>

              <div className={`p-2.5 rounded-xl text-xs font-extrabold ${bmiCategory.bg} ${bmiCategory.color}`}>
                {bmiCategory.label}
              </div>

              <div className="space-y-1 pt-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-linear-to-r from-sky-500 via-emerald-500 to-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${bmiCategory.barPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>18.5 (Gầy)</span>
                  <span>24.9 (Chuẩn)</span>
                  <span>30.0 (Béo)</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                Khoảng cân nặng lý tưởng của bạn: <strong>{idealWeightRange}</strong>
              </p>
            </div>

            {/* Card B: Energy Balance (Calorie Input vs Output) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Cân bằng Năng lượng (Input / Output)
                </span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Apple className="w-3.5 h-3.5 text-emerald-600" />
                    Năng lượng nạp vào (Input):
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {calorieInput.toLocaleString('vi-VN')} kcal/ngày
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                    Chuyển hóa cơ bản (BMR):
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {bmr.toLocaleString('vi-VN')} kcal/ngày
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Tiêu hao tổng thể (TDEE Output):
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {calorieOutput.toLocaleString('vi-VN')} kcal/ngày
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Trạng thái calo tịnh:</span>
                <span className={`font-extrabold ${calorieBalance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                  {calorieBalance <= 0
                    ? `Thâm hụt nhẹ ${Math.abs(calorieBalance)} kcal (Giữ dáng)`
                    : `Thặng dư ${calorieBalance} kcal (Tăng cơ)`}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Tính toán theo phương trình Harris-Benedict chuẩn khoa học.
              </p>
            </div>

            {/* Card C: Macro Nutrient Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Tỷ lệ dinh dưỡng đa lượng (Macros)
                </span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Tinh bột tốt (Carbs - 55%):</span>
                    <span className="text-emerald-600">~210g</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[55%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Đạm thực vật (Protein - 20%):</span>
                    <span className="text-teal-600">~75g</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full w-[20%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Chất béo lành mạnh (Fats - 25%):</span>
                    <span className="text-amber-600">~42g</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[25%]" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                Chất xơ tự nhiên: <strong>28-35g/ngày</strong> từ ngũ cốc nguyên cám & nấm.
              </p>
            </div>

          </div>
        </section>

                  </div>
        )}

        {/* TAB 2: CALENDAR & 30-DAY MEAL SCHEDULE */}
        {currentTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Summary card connecting health metrics with 30-day calendar */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-base">
                  <Flame className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200">
                    Kế hoạch năng lượng cá nhân: {dailyCalorieTarget ? `${Number(dailyCalorieTarget).toLocaleString('vi-VN')} kcal/ngày` : 'chưa đặt mục tiêu calo'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Chọn một ngày rồi bấm "Lập với AI" để lập thực đơn ngay trên lịch. Chấm xanh: đã lưu · chấm cam: bản nháp AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('profile')}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold hover:bg-emerald-100 transition shadow-2xs shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Cập nhật chỉ số sức khỏe →
              </button>
            </div>

            <MealPlanCalendarPlanner
              dailyCalorieTarget={dailyCalorieTarget === '' ? undefined : Number(dailyCalorieTarget)}
              onAddToShoppingList={handleAddMealToShoppingList}
            />

            <SeasonalRegionalMealsView />
          </div>
        )}

        {/* TAB 3: ACCOUNT SECURITY */}
        {['security', 'settings'].includes(currentTab) && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Box 1: Change Password & Security */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Bảo mật &amp; Đổi mật khẩu
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setIsOtpResetMode(v => !v); setPasswordError(''); setPasswordSuccess(''); }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isOtpResetMode ? 'Đổi bằng mật khẩu cũ' : 'Quên mật khẩu? (Dùng OTP)'}
                  </button>
                </div>

                <form onSubmit={handleChangeEmail} className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Đổi địa chỉ Gmail / email</h3>
                    <p className="mt-1 text-xs text-slate-500">Email hiện tại: <strong>{profile?.email || user?.emailOrPhone}</strong></p>
                  </div>
                  {emailMessage && <p className="text-xs font-semibold text-emerald-700">{emailMessage}</p>}
                  {emailError && <p className="text-xs font-semibold text-rose-700">{emailError}</p>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email mới"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                    />
                    <input
                      type="password"
                      required
                      value={emailPassword}
                      onChange={e => setEmailPassword(e.target.value)}
                      placeholder="Mật khẩu hiện tại"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isChangingEmail} className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs disabled:opacity-50">
                      {isChangingEmail ? 'Đang cập nhật...' : 'Cập nhật email'}
                    </button>
                  </div>
                </form>

                {passwordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {!isOtpResetMode ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mật khẩu hiện tại *
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mật khẩu mới (tối thiểu 8 ký tự) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Xác nhận mật khẩu mới *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-extrabold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordViaOtp} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
                      <p className="font-bold">Đặt lại mật khẩu qua mã OTP Email</p>
                      <p className="mt-0.5 opacity-90">
                        Hệ thống sẽ gửi mã xác thực 6 số đến email đăng ký: <strong>{profile?.email || user?.emailOrPhone}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleSendResetOtp}
                        disabled={isSendingResetOtp}
                        className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-bold transition cursor-pointer"
                      >
                        {isSendingResetOtp ? 'Đang gửi mã...' : 'Nhận mã OTP qua Email'}
                      </button>
                      {otpSentMessage && <p className="mt-2 text-emerald-700 font-semibold">{otpSentMessage}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mã OTP 6 số *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={resetOtp}
                        onChange={e => setResetOtp(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tracking-widest"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mật khẩu mới *</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Xác nhận mật khẩu *</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSubmittingOtpReset}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition shadow-2xs cursor-pointer"
                      >
                        {isSubmittingOtpReset ? 'Đang xác thực...' : 'Xác nhận đổi mật khẩu'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Security info overview */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Trạng thái an toàn tài khoản
                  </h3>
                </div>
                <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Tài khoản</span>
                    <span className="font-bold text-slate-900 dark:text-white">@{profile?.username || user?.username}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Email khôi phục</span>
                    <span className="font-bold text-slate-900 dark:text-white">{profile?.email || user?.emailOrPhone || 'Chưa liên kết'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Phiên bảo mật JWT</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Hoạt động (Đã xác thực)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                    💡 <strong>Lưu ý bảo mật:</strong> Không chia sẻ mật khẩu hoặc mã OTP 6 số với bất kỳ ai để bảo vệ thông tin dinh dưỡng và tài khoản cá nhân.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: PREFERENCES & DISPLAY THEME */}
        {['preferences', 'settings'].includes(currentTab) && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
            {/* Box 2: Appearance & Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-emerald-600" />
                  Giao diện &amp; Tùy chọn hiển thị
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs">
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Chế độ giao diện</h4>
                      <p className="text-xs text-slate-500">Chuyển đổi giữa nền sáng dịu mắt và nền tối bảo vệ mắt</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => { sfx.playTap(); setTheme('light'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        theme === 'light' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sáng
                    </button>
                    <button
                      type="button"
                      onClick={() => { sfx.playTap(); setTheme('dark'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Tối
                    </button>
                  </div>
                </div>

                {/* Safety disclaimers note */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    Quyền riêng tư &amp; Bảo vệ dữ liệu sức khỏe
                  </p>
                  <p className="leading-relaxed text-[11px]">
                    Dữ liệu về cân nặng, chiều cao, dị ứng thực phẩm và chỉ số calo được mã hóa và lưu trữ bảo mật theo tiêu chuẩn phát triển của VEGEAI. Dữ liệu này chỉ phục vụ cho việc cá nhân hóa thực đơn cho riêng bạn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};
