import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { login, verifyLoginOtp, resendLoginOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath: unknown = location.state?.from;
  const rawPath = typeof requestedPath === 'string'
    ? requestedPath
    : (typeof requestedPath === 'object' && requestedPath && 'pathname' in requestedPath)
      ? (requestedPath as { pathname: string }).pathname
      : null;
  const destination = typeof rawPath === 'string' && /^\/(?:blog|questions|videos|admin|meal-plans|nutrition|settings|fridge)(?:\/[A-Za-z0-9-]+)*$/.test(rawPath)
    ? rawPath : null;

  const resolveDestination = (role?: string): string => {
    if (role === 'admin') {
      return (destination && destination.startsWith('/admin')) ? destination : '/admin';
    }
    return (destination && !destination.startsWith('/admin')) ? destination : '/dashboard';
  };

  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);


  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    rememberMe: false
  });
  const [rememberedAccount, setRememberedAccount] = useState<{ username?: string; fullName?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vegeai_remembered_account');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.username || parsed?.email) {
          setRememberedAccount(parsed);
          setFormData(prev => ({
            ...prev,
            emailOrPhone: prev.emailOrPhone || parsed.username || parsed.email || '',
            rememberMe: false
          }));
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  const [otp, setOtp] = useState('');
  const [maskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer countdown for OTP resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGoogleLogin = () => {
    setGeneralError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGeneralError('Google Client ID chưa được cấu hình. Vui lòng thêm VITE_GOOGLE_CLIENT_ID vào file .env');
      return;
    }

    const gAccounts = (window as unknown as { google?: { accounts?: { id?: { initialize: (cfg: unknown) => void; prompt: (cb?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void } } } })?.google?.accounts?.id;

    if (!gAccounts) {
      setGeneralError('Google Identity SDK đang được tải hoặc bị chặn bởi trình duyệt. Vui lòng tải lại trang.');
      return;
    }

    try {
      setIsGoogleSubmitting(true);
      gAccounts.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const res = await loginWithGoogle(response.credential, formData.rememberMe);
            if (res.success && res.data) {
              navigate(resolveDestination(res.data?.role), { replace: true });
            } else {
              setGeneralError(res.error || 'Đăng nhập bằng Google không thành công.');
            }
          } catch (err: unknown) {
            setGeneralError(err instanceof Error ? err.message : 'Đăng nhập bằng Google thất bại.');
          } finally {
            setIsGoogleSubmitting(false);
          }
        },
      });

      gAccounts.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setIsGoogleSubmitting(false);
        }
      });
    } catch (e: unknown) {
      setIsGoogleSubmitting(false);
      setGeneralError('Lỗi khởi tạo Google Auth: ' + (e instanceof Error ? e.message : 'Không xác định'));
    }
  };

  const validateCredentials = (): boolean => {

    const errs: { [key: string]: string } = {};

    if (!formData.emailOrPhone.trim()) {
      errs.emailOrPhone = 'Vui lòng nhập tên đăng nhập hoặc email.';
    }

    if (!formData.password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateCredentials()) return;

    setIsSubmitting(true);
    try {
      const res = await login(formData);
            if (res.success && res.data) {
        if (formData.rememberMe) {
          localStorage.setItem('vegeai_remembered_account', JSON.stringify({
            username: res.data.username,
            fullName: res.data.name || res.data.username,
            email: res.data.emailOrPhone,
          }));
        } else {
          localStorage.removeItem('vegeai_remembered_account');
        }
        navigate(resolveDestination(res.data.role), { replace: true });
      } else {
        setGeneralError(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch {
      setGeneralError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setGeneralError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyLoginOtp(formData.emailOrPhone, cleanOtp, formData.rememberMe);
            if (res.success && res.data) {
        if (formData.rememberMe) {
          localStorage.setItem('vegeai_remembered_account', JSON.stringify({
            username: res.data.username,
            fullName: res.data.name || res.data.username,
            email: res.data.emailOrPhone,
          }));
        } else {
          localStorage.removeItem('vegeai_remembered_account');
        }
        setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate(resolveDestination(res.data?.role), { replace: true });
        }, 800);
      } else {
        setGeneralError(res.error || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.');
      }
    } catch {
      setGeneralError('Không thể xác thực mã OTP. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    setGeneralError('');
    setIsResending(true);
    try {
      const res = await resendLoginOtp(formData.emailOrPhone);
      if (res.success) {
        setCooldown(60);
        setSuccessMessage('Mã OTP mới đã được gửi lại vào email.');
      } else {
        setGeneralError(res.error || 'Chưa thể gửi lại mã OTP. Vui lòng chờ thêm ít phút.');
      }
    } catch {
      setGeneralError('Đã có lỗi xảy ra khi gửi lại OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full">
      {step === 'CREDENTIALS' ? (
        <>
          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Chào mừng bạn trở lại
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Đăng nhập để tiếp tục hành trình dinh dưỡng xanh của bạn.
            </p>
          </div>

          {generalError && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{generalError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {rememberedAccount && (
            <div className="mb-4 p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {rememberedAccount.fullName?.[0]?.toUpperCase() || rememberedAccount.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {rememberedAccount.fullName || rememberedAccount.username}
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                    Tài khoản đã ghi nhớ trên máy này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, emailOrPhone: rememberedAccount.username || rememberedAccount.email || p.emailOrPhone }))}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 cursor-pointer"
              >
                Chọn
              </button>
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <Input
              label="Tên đăng nhập hoặc email"
              placeholder="member@vegeai.com"
              value={formData.emailOrPhone}
              onChange={(e) => {
                setFormData({ ...formData, emailOrPhone: e.target.value });
                if (errors.emailOrPhone) setErrors({ ...errors, emailOrPhone: '' });
              }}
              error={errors.emailOrPhone}
            />

            <Input
              label="Mật khẩu"
              type="password"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              showPasswordToggle
              error={errors.password}
            />

            {/* Row: Ghi nhớ đăng nhập (1 ngày) | Quên mật khẩu? */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-gray-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-emerald-500"
                />
                <span>Ghi nhớ đăng nhập (1 ngày)</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium hover:underline transition"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Nút Đăng nhập */}
            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đăng nhập
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-slate-500">
              <span className="bg-white dark:bg-[#121922] px-3">Hoặc tiếp tục với</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="flex justify-center items-center mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting || isSubmitting}
              title="Đăng nhập nhanh bằng tài khoản Google"
              className="flex items-center justify-center gap-2.5 w-full max-w-[240px] py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-slate-750 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-100 shadow-2xs transition cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{isGoogleSubmitting ? 'Đang kết nối...' : 'Tiếp tục với Google'}</span>
            </button>
          </div>


          {/* Footer link */}
          <div className="text-center text-xs text-gray-500 dark:text-slate-400">
            <span>Chưa có tài khoản? </span>
            <Link
              to="/register"
              className="font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition"
            >
              Đăng ký
            </Link>
          </div>
        </>
      ) : (
        /* Step 2: 2FA OTP Verification */
        <div>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900 shadow-xs">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Xác thực bảo mật 2 bước
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Mã xác thực gồm 6 chữ số đã được gửi tới email <span className="font-semibold text-gray-800 dark:text-slate-200">{maskedEmail || 'của bạn'}</span>.
            </p>
          </div>

          {generalError && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{generalError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 text-center">
                Nhập mã OTP 6 số
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  placeholder="------"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                    if (generalError) setGeneralError('');
                  }}
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3.5 px-4 bg-gray-50 dark:bg-slate-800 border-2 border-emerald-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-950/40 transition text-gray-800 dark:text-white font-bold"
                />
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center mt-2">
                {formData.rememberMe ? '✓ Ghi nhớ phiên trong 24 giờ sau khi xác thực thành công' : 'Phiên đăng nhập tạm thời cho phiên duyệt hiện tại'}
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Xác nhận & Đăng nhập
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('CREDENTIALS');
                  setOtp('');
                  setGeneralError('');
                }}
                className="inline-flex items-center gap-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || isResending}
                className={`inline-flex items-center gap-1.5 font-medium transition cursor-pointer ${
                  cooldown > 0 || isResending
                    ? 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
                    : 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

