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
  Check,
  RotateCcw
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
import { WearableGoogleFitTracker } from '../components/WearableGoogleFitTracker';
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
        try {
          localStorage.setItem('vegeai_user_profile', JSON.stringify(data));
        } catch {}
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

  const isAllergicToEgg = selectedAllergies.includes('Trứng (Ovo)');
  const isAllergicToMilk = selectedAllergies.includes('Sữa bò (Lacto)');
  const hasEggMilkConflict =
    (dietaryPreferences === 'OVO_LACTO' && (isAllergicToEgg || isAllergicToMilk)) ||
    (dietaryPreferences === 'OVO' && isAllergicToEgg) ||
    (dietaryPreferences === 'LACTO' && isAllergicToMilk);

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
    if (heightCm !== '' && (Number(heightCm) < 100 || Number(heightCm) > 280)) {
      setProfileError('Chiều cao phải nằm trong khoảng 100–280 cm.');
      return;
    }
    if (weightKg !== '' && (Number(weightKg) < 20 || Number(weightKg) > 350)) {
      setProfileError('Cân nặng phải nằm trong khoảng 20–350 kg.');
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
        dailyCalorieTarget: dailyCalorieTarget === '' ? (defaultScientificCalorie > 0 ? defaultScientificCalorie : undefined) : Number(dailyCalorieTarget)
      };

      const updated = await userService.updateProfile(payload);
      setProfile(updated);
      try {
        localStorage.setItem('vegeai_user_profile', JSON.stringify(updated));
        window.dispatchEvent(new Event('user_profile_updated'));
      } catch {}
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
    return 'Chưa có dữ liệu';
  }, [hNum]);

  // Deterministic BMR & TDEE Calculations
  const hasPhysicalStats = Boolean(hNum > 0 && wNum > 0);
  const bmr = useMemo(() => {
    if (hasPhysicalStats) {
      return calculateBmr(wNum, hNum, age, (gender as any) || 'OTHER');
    }
    return 0;
  }, [hasPhysicalStats, hNum, wNum, age, gender]);

  const tdee = useMemo(() => (bmr > 0 ? calculateTdee(bmr, 1.375) : 0), [bmr]);

  // Smart Default Calorie: if user leaves it blank, auto-assign scientific TDEE / BMR
  const defaultScientificCalorie = useMemo(() => {
    if (tdee > 0) return Math.round(tdee);
    if (bmr > 0) return Math.round(bmr);
    return 1800;
  }, [tdee, bmr]);

  const effectiveCalorieTarget = useMemo(() => {
    if (dailyCalorieTarget !== '' && Number(dailyCalorieTarget) > 0) {
      return Number(dailyCalorieTarget);
    }
    return defaultScientificCalorie;
  }, [dailyCalorieTarget, defaultScientificCalorie]);

  const hasCalorieTarget = Boolean(effectiveCalorieTarget > 0);
  const calorieInput = effectiveCalorieTarget;
  const isUsingDefaultCalorie = dailyCalorieTarget === '' || Number(dailyCalorieTarget) === defaultScientificCalorie;

  const [wearableKcal, setWearableKcal] = useState<number>(() => {
    const k = localStorage.getItem('wearable_kcal');
    return k ? Number(k) : 0;
  });

  // Reactive listener so wearable sync immediately propagates to Zen Rings & Calculations
  useEffect(() => {
    const handleWearableUpdate = () => {
      const stored = localStorage.getItem('wearable_kcal');
      if (stored) {
        setWearableKcal(Number(stored));
      }
    };
    window.addEventListener('wearable_sync_updated', handleWearableUpdate);
    return () => window.removeEventListener('wearable_sync_updated', handleWearableUpdate);
  }, []);

  const calorieOutput = (tdee > 0 || wearableKcal > 0) ? (tdee + wearableKcal) : 0;
  const calorieBalance = (calorieInput > 0 && calorieOutput > 0) ? (calorieInput - calorieOutput) : null;

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

            {/* Grid 2: Physical Biometrics (Height, Weight & Smart Protruding Calorie Slider) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-800 space-y-5">
              
              {/* Row 1: Height & Weight */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Chiều cao (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    placeholder="Ví dụ: 173"
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
                    placeholder="Ví dụ: 88"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Quick Biometrics Summary Chip */}
                <div className="sm:col-span-2 lg:col-span-1 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-slate-700/60 flex items-center justify-around text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">BMI</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {bmi > 0 ? bmi : '—'}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">BMR cơ bản</span>
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                      {bmr > 0 ? `${bmr.toLocaleString('vi-VN')} kcal` : '—'}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">TDEE tiêu chuẩn</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {tdee > 0 ? `${tdee.toLocaleString('vi-VN')} kcal` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Custom Protruding Calorie Slider Hub with 3D Thumb & Presets */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <Flame className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Mục tiêu Calo nạp/ngày (kcal)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isUsingDefaultCalorie
                          ? 'Đang dùng mức Calo mặc định khoa học (Tự động tính từ Chiều cao & Cân nặng)'
                          : 'Đang dùng mức Calo tùy chỉnh cá nhân'}
                      </p>
                    </div>
                  </div>

                  {/* Mode Badge */}
                  <div className="flex items-center gap-2">
                    {isUsingDefaultCalorie ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        🌿 Mặc định TDEE: {defaultScientificCalorie.toLocaleString('vi-VN')} kcal
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        ✏️ Tùy chỉnh: {effectiveCalorieTarget.toLocaleString('vi-VN')} kcal
                      </span>
                    )}

                    {dailyCalorieTarget !== '' && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playTap();
                          setDailyCalorieTarget('');
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Khôi phục về mặc định tự động"
                      >
                        <RotateCcw className="w-3 h-3" /> Mặc định
                      </button>
                    )}
                  </div>
                </div>

                {/* 3D Protruding Slider Control Bar */}
                <div className="pt-2 pb-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playTap();
                        const next = Math.max(1000, effectiveCalorieTarget - 50);
                        setDailyCalorieTarget(next);
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-base flex items-center justify-center transition-transform active:scale-90 cursor-pointer shrink-0 shadow-2xs"
                      title="Giảm 50 kcal"
                    >
                      -
                    </button>

                    {/* The Track with Protruding Floating Thumb */}
                    <div className="relative flex-1 py-3 group">
                      <input
                        type="range"
                        min="1000"
                        max="3500"
                        step="25"
                        value={effectiveCalorieTarget}
                        onChange={e => {
                          setDailyCalorieTarget(Number(e.target.value));
                        }}
                        className="w-full h-3.5 bg-linear-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full appearance-none cursor-pointer focus:outline-none transition-all
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-7
                        [&::-webkit-slider-thumb]:h-7
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-4
                        [&::-webkit-slider-thumb]:border-emerald-600
                        [&::-webkit-slider-thumb]:shadow-[0_4px_14px_rgba(16,185,129,0.55)]
                        [&::-webkit-slider-thumb]:hover:scale-125
                        [&::-webkit-slider-thumb]:active:scale-110
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:cursor-grab
                        [&::-webkit-slider-thumb]:active:cursor-grabbing
                        [&::-moz-range-thumb]:w-7
                        [&::-moz-range-thumb]:h-7
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:border-4
                        [&::-moz-range-thumb]:border-emerald-600
                        [&::-moz-range-thumb]:shadow-[0_4px_14px_rgba(16,185,129,0.55)]
                        [&::-moz-range-thumb]:cursor-grab"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        sfx.playTap();
                        const next = Math.min(3500, effectiveCalorieTarget + 50);
                        setDailyCalorieTarget(next);
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-base flex items-center justify-center transition-transform active:scale-90 cursor-pointer shrink-0 shadow-2xs"
                      title="Tăng 50 kcal"
                    >
                      +
                    </button>

                    {/* Numeric Input Box to allow typing exact numbers */}
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        min="800"
                        max="4000"
                        value={dailyCalorieTarget === '' ? '' : effectiveCalorieTarget}
                        placeholder={String(defaultScientificCalorie)}
                        onChange={e => setDailyCalorieTarget(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-center rounded-xl border border-emerald-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-slate-800 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-emerald-600"
                      />
                      <span className="text-[10px] text-slate-400 block text-center font-bold">kcal/ngày</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1">
                    <span>1.000 kcal (Thấp)</span>
                    <span>1.800 kcal (Chuẩn vừa)</span>
                    <span>2.500 kcal (Vận động)</span>
                    <span>3.500 kcal (VĐV)</span>
                  </div>
                </div>

                {/* Preset Chips (Chọn nhanh kịch bản calo chuẩn y khoa) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                    Kịch bản đề xuất:
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playTap();
                      const val = bmr > 0 ? Math.round(bmr) : 1500;
                      setDailyCalorieTarget(val);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      effectiveCalorieTarget === (bmr > 0 ? Math.round(bmr) : 1500)
                        ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    🌿 Tối thiểu duy trì (BMR: {bmr > 0 ? Math.round(bmr).toLocaleString('vi-VN') : 1500} kcal)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playTap();
                      const val = tdee > 500 ? Math.round(tdee - 500) : 1500;
                      setDailyCalorieTarget(val);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      effectiveCalorieTarget === (tdee > 500 ? Math.round(tdee - 500) : 1500)
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    🔥 Giảm mỡ nhẹ (-500 kcal: {tdee > 500 ? Math.round(tdee - 500).toLocaleString('vi-VN') : 1500} kcal)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playTap();
                      const val = tdee > 0 ? Math.round(tdee) : 2000;
                      setDailyCalorieTarget(val);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      effectiveCalorieTarget === (tdee > 0 ? Math.round(tdee) : 2000)
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    ⚖️ Cân bằng thể trạng (TDEE: {tdee > 0 ? Math.round(tdee).toLocaleString('vi-VN') : 2000} kcal)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playTap();
                      const val = tdee > 0 ? Math.round(tdee + 300) : 2300;
                      setDailyCalorieTarget(val);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      effectiveCalorieTarget === (tdee > 0 ? Math.round(tdee + 300) : 2300)
                        ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    💪 Tăng cơ (+300 kcal: {tdee > 0 ? Math.round(tdee + 300).toLocaleString('vi-VN') : 2300} kcal)
                  </button>
                </div>
              </div>

            </div>

            {/* Grid 3: Dietary Preferences & Allergies */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between max-w-md mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chế độ ăn chay ưu tiên
                  </label>
                  {hasEggMilkConflict && (
                    <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" /> Xung đột dị ứng!
                    </span>
                  )}
                </div>
                <select
                  value={dietaryPreferences}
                  onChange={e => setDietaryPreferences(e.target.value)}
                  className={`w-full max-w-md px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-emerald-600 ${
                    hasEggMilkConflict
                      ? 'border-rose-400 bg-rose-50/30 text-rose-950 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                  }`}
                >
                  <option value="VEGAN">🌱 Thuần chay (Vegan - 100% thực vật, không trứng/sữa)</option>
                  <option value="OVO">🍳 Chay có trứng (Ovo-Vegetarian - Có trứng, KHÔNG sữa/bơ)</option>
                  <option value="LACTO">🥛 Chay có sữa (Lacto-Vegetarian - Có sữa/bơ, KHÔNG trứng)</option>
                  <option value="OVO_LACTO">🍳🥛 Chay có trứng &amp; sữa (Ovo-Lacto Vegetarian)</option>
                  <option value="VEGETARIAN">🥗 Ăn chay thông thường (Vegetarian)</option>
                  <option value="RAW_VEGAN">🥑 Thuần chay thô (Raw Vegan - Tươi sống, không nấu nhiệt)</option>
                  <option value="PESCATARIAN">🐟 Chay có hải sản (Pescatarian - Thực vật &amp; Cá/Tôm)</option>
                  <option value="FLEXITARIAN">🌿 Bán chay / Linh hoạt (Flexitarian)</option>
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
                    const isConflictItem =
                      (dietaryPreferences === 'OVO_LACTO' && (
                        (allergy.includes('Trứng') && isAllergicToEgg) ||
                        (allergy.includes('Sữa bò') && isAllergicToMilk)
                      )) ||
                      (dietaryPreferences === 'OVO' && allergy.includes('Trứng') && isAllergicToEgg) ||
                      (dietaryPreferences === 'LACTO' && allergy.includes('Sữa bò') && isAllergicToMilk);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => handleToggleAllergy(allergy)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isConflictItem
                            ? 'bg-rose-600 text-white border border-rose-700 shadow-xs ring-2 ring-rose-400/50 animate-pulse'
                            : isSelected
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

              {/* MEDICAL SAFETY ALERT BANNER: Hard Constraint Interlock */}
              {hasEggMilkConflict && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/50 text-amber-950 dark:text-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
                      ⚠️
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black uppercase tracking-tight text-amber-950 dark:text-amber-200">
                          Xung đột an toàn thực phẩm &amp; Dị ứng
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-2xs">
                          CẢNH BÁO Y KHOA
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-300 mt-1 leading-relaxed">
                        Chế độ ăn hiện tại (<strong>{dietaryPreferences === 'OVO_LACTO' ? 'Chay có trứng & sữa' : dietaryPreferences === 'OVO' ? 'Chay có trứng' : 'Chay có sữa'}</strong>) xung đột trực tiếp với dị ứng{' '}
                        <strong className="text-rose-600 dark:text-rose-400 underline underline-offset-2">
                          {isAllergicToEgg && isAllergicToMilk
                            ? 'cả Trứng (Ovo) và Sữa bò (Lacto)'
                            : isAllergicToMilk
                            ? 'Sữa bò (Lacto)'
                            : 'Trứng (Ovo)'}
                        </strong> của bạn!
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1.5 flex items-center gap-1.5 font-medium">
                        🛡️ <span><strong>Nguyên tắc cốt lõi của VEGEAI:</strong> Dị ứng là <em>Ràng Buộc Cứng (Hard Constraint)</em>. Hệ thống AI sẽ <strong>tuyệt đối không bao giờ</strong> gợi ý các món có chứa thành phần bạn bị dị ứng.</span>
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Fix Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-300/60 dark:border-amber-800/60 sm:pl-12">
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 mr-1">
                      💡 Khắc phục an toàn 1-chạm:
                    </span>

                    {/* If allergic to milk only and currently in OVO_LACTO: suggest OVO */}
                    {isAllergicToMilk && !isAllergicToEgg && dietaryPreferences === 'OVO_LACTO' && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playSuccess();
                          setDietaryPreferences('OVO');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                      >
                        🍳 Đổi sang "Chay có trứng (Ovo)" (Giữ trứng, bỏ sữa)
                      </button>
                    )}

                    {/* If allergic to egg only and currently in OVO_LACTO: suggest LACTO */}
                    {isAllergicToEgg && !isAllergicToMilk && dietaryPreferences === 'OVO_LACTO' && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playSuccess();
                          setDietaryPreferences('LACTO');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                      >
                        🥛 Đổi sang "Chay có sữa (Lacto)" (Giữ sữa, bỏ trứng)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        sfx.playSuccess();
                        setDietaryPreferences('VEGAN');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      🌱 Chuyển sang "Thuần chay (Vegan)" ngay (An toàn 100%)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sfx.playTap();
                        setSelectedAllergies(prev => prev.filter(a => !a.includes('Trứng') && !a.includes('Sữa bò')));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 hover:bg-amber-50 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Bỏ chọn dị ứng Trứng/Sữa
                    </button>
                  </div>
                </div>
              )}
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
            calories={wearableKcal > 0 ? wearableKcal : 0}
            calorieTarget={calorieInput > 0 ? calorieInput : (tdee > 0 ? tdee : 0)}
            proteinGrams={0}
            proteinTarget={hasPhysicalStats ? Math.round(wNum * 1.1) : (calorieInput > 0 ? Math.round((calorieInput * 0.20) / 4) : 0)}
            fiberGrams={0}
            fiberTarget={hasCalorieTarget ? 35 : 0}
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
                    {calorieInput > 0 ? `${calorieInput.toLocaleString('vi-VN')} kcal/ngày` : '— Chưa thiết lập'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                    Chuyển hóa cơ bản (BMR):
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {bmr > 0 ? `${bmr.toLocaleString('vi-VN')} kcal/ngày` : '— Chưa có dữ liệu'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Tiêu hao tổng thể (TDEE Output):
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {calorieOutput > 0 ? `${calorieOutput.toLocaleString('vi-VN')} kcal/ngày` : '— Chưa có dữ liệu'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Trạng thái calo tịnh:</span>
                {calorieBalance !== null ? (
                  <span className={`font-extrabold ${calorieBalance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                    {calorieBalance === 0
                      ? 'Cân bằng hoàn hảo 0 kcal'
                      : calorieBalance < 0
                      ? `Thâm hụt nhẹ ${Math.abs(calorieBalance)} kcal (Giữ dáng)`
                      : `Thặng dư ${calorieBalance} kcal (Tăng cơ)`}
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">
                    Chưa đủ dữ liệu tính toán
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Tính toán theo phương trình Mifflin-St Jeor &amp; Harris-Benedict chuẩn khoa học.
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

              {calorieInput > 0 ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Tinh bột tốt (Carbs - 55%):</span>
                      <span className="text-emerald-600">~{Math.round((calorieInput * 0.55) / 4)}g</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[55%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Đạm thực vật (Protein - 20%):</span>
                      <span className="text-teal-600">~{Math.round((calorieInput * 0.20) / 4)}g</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full w-[20%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Chất béo lành mạnh (Fats - 25%):</span>
                      <span className="text-amber-600">~{Math.round((calorieInput * 0.25) / 9)}g</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[25%]" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Chất xơ tự nhiên: <strong>28-35g/ngày</strong> từ ngũ cốc nguyên cám &amp; nấm.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-4 text-center py-6">
                  <div className="text-slate-400 dark:text-slate-500 text-3xl font-light">
                    —
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Chưa thiết lập mục tiêu calo nạp vào hàng ngày. Hãy điền mục tiêu calo ở trên để xem phân bổ Carbs, Protein và Fats.
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* 3. OMNI-WEARABLE HEALTH HUB & GOOGLE FIT SYNC */}
        <WearableGoogleFitTracker
          plannedCalorieIntake={calorieInput}
          userBmr={bmr}
          onSyncMetrics={(m) => setWearableKcal(m.calories)}
        />

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
