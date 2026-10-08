import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { isValidEmailOrPhone } from '../../../utils/validation';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!formData.emailOrPhone.trim()) {
      errs.emailOrPhone = 'Vui lòng nhập Email hoặc Số điện thoại.';
    } else if (!isValidEmailOrPhone(formData.emailOrPhone)) {
      errs.emailOrPhone = 'Email hoặc Số điện thoại không đúng định dạng.';
    }

    if (!formData.password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await login(formData);
      if (res.success) {
        setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        setGeneralError(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch {
      setGeneralError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">

      {/* Form Header (Image 3) */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          Chào mừng bạn trở lại
        </h1>
        <p className="text-sm text-gray-500">
          Đăng nhập để tiếp tục hành trình dinh dưỡng xanh của bạn.
        </p>
      </div>

      {generalError && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{generalError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Email hoặc Số điện thoại */}
        <Input
          label="Email hoặc Số điện thoại"
          placeholder="nguyen@gmail.com"
          value={formData.emailOrPhone}
          onChange={(e) => {
            setFormData({ ...formData, emailOrPhone: e.target.value });
            if (errors.emailOrPhone) setErrors({ ...errors, emailOrPhone: '' });
          }}
          error={errors.emailOrPhone}
        />

        {/* Mật khẩu */}
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

        {/* Row: Ghi nhớ đăng nhập | Quên mật khẩu? (Image 3) */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline transition"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Nút Đăng nhập → (Image 3) */}
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

      {/* Divider: HOẶC TIẾP TỤC VỚI (Image 3) */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold text-gray-400">
          <span className="bg-white px-3">Hoặc tiếp tục với</span>
        </div>
      </div>

      {/* Social Buttons: Google & Facebook (Image 3) */}

      {/* Social Buttons: Google */}
      <div className="flex justify-center items-center mb-6">
        <button
          type="button"
          onClick={() => {
            setFormData({
              emailOrPhone: 'google.user@gmail.com',
              password: 'password123',
              rememberMe: true
            });
          }}
          className="flex items-center justify-center gap-2.5
      w-full max-w-[240px] py-3 px-4
      bg-white border border-gray-200
      hover:border-gray-300 hover:bg-gray-50
      rounded-xl text-xs font-semibold
      text-gray-700 shadow-2xs
      transition cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Google</span>
        </button>
      </div>


      {/* Footer link (Image 3) */}
      <div className="text-center text-xs text-gray-500">
        <span>Chưa có tài khoản? </span>
        <Link
          to="/register"
          className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition"
        >
          Đăng ký
        </Link>
      </div>

    </div>
  );
};
