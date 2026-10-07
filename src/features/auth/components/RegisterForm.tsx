import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { isValidEmailOrPhone, calculatePasswordStrength } from '../../../utils/validation';

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic password strength bar
  const strength = calculatePasswordStrength(formData.password);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!formData.emailOrPhone.trim()) {
      errs.emailOrPhone = 'Email không đúng định dạng';
    } else if (!isValidEmailOrPhone(formData.emailOrPhone)) {
      errs.emailOrPhone = 'Email không đúng định dạng';
    }

    if (!formData.password) {
      errs.password = 'Mật khẩu quá yếu, cần tối thiểu 8 ký tự gồm chữ và số';
    } else if (
      formData.password.length < 8 ||
      !/[A-Za-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      errs.password = 'Mật khẩu quá yếu, cần tối thiểu 8 ký tự gồm chữ và số';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Mật khẩu nhập lại không khớp';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Mật khẩu nhập lại không khớp';
    }

    if (!formData.agreeTerms) {
      errs.agreeTerms = 'Vui lòng đồng ý với điều khoản sử dụng';
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
      const res = await register(formData);
      if (res.success) {
        setSuccessMessage('Tạo tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/dashboard?tab=profile');
        }, 1000);
      } else {
        setGeneralError(res.error || 'Đăng ký không thành công.');
      }
    } catch {
      setGeneralError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      
      {/* Top Badge & Header (Image 1 & 2) */}
      <div className="mb-6">
        <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase mb-1.5 block">
          Đăng ký tài khoản
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          Bắt đầu hành trình sống xanh
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed">
          Tạo tài khoản để lưu trữ thực đơn AI và công thức yêu thích.
        </p>
      </div>

      {generalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{generalError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        
        {/* Họ tên */}
        <Input
          label="Họ tên"
          placeholder="Nguyễn Văn A"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        />

        {/* Email hoặc Số điện thoại (Image 1 & 2) */}
        <div>
          <Input
            label="Email hoặc Số điện thoại"
            placeholder="nguyen@gmail.com hoặc 090..."
            value={formData.emailOrPhone}
            onChange={(e) => {
              setFormData({ ...formData, emailOrPhone: e.target.value });
              if (errors.emailOrPhone) setErrors({ ...errors, emailOrPhone: '' });
            }}
            error={errors.emailOrPhone}
          />
        </div>

        {/* Mật khẩu & Password Strength Indicator (Image 1 & 2) */}
        <div>
          <Input
            label="Mật khẩu"
            type="password"
            placeholder="Ít nhất 8 ký tự"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            showPasswordToggle
            error={errors.password}
          />

          {/* 4-bar Password Strength Indicator (Image 1) */}
          {formData.password && (
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-all duration-300 ${
                      step <= strength.score ? strength.color : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Độ mạnh: <strong className="text-gray-600">{strength.label}</strong></span>
                <span>Tối thiểu 8 ký tự (chữ & số)</span>
              </div>
            </div>
          )}
        </div>

        {/* Nhập lại mật khẩu (Image 1 & 2) */}
        <div>
          <Input
            label="Nhập lại mật khẩu"
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
            }}
            showPasswordToggle
            error={errors.confirmPassword}
          />
        </div>

        {/* Checkbox điều khoản (Image 1 & 2) */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(e) => {
                setFormData({ ...formData, agreeTerms: e.target.checked });
                if (errors.agreeTerms) setErrors({ ...errors, agreeTerms: '' });
              }}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 shrink-0"
            />
            <span className="leading-normal">
              Tôi đồng ý với{' '}
              <a href="#" className="text-emerald-700 font-semibold hover:underline">
                Điều khoản sử dụng
              </a>{' '}
              và{' '}
              <a href="#" className="text-emerald-700 font-semibold hover:underline">
                Chính sách bảo mật
              </a>{' '}
              của VEGEAI.
            </span>
          </label>

          {errors.agreeTerms && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.agreeTerms}</span>
            </p>
          )}
        </div>

        {/* Nút Đăng ký (Image 1 & 2) */}
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
          >
            Đăng ký
          </Button>
        </div>

      </form>

      {/* Footer link: Đã có tài khoản? Đăng nhập (Image 1 & 2) */}
      <div className="text-center text-xs text-gray-500 mt-6">
        <span>Đã có tài khoản? </span>
        <Link
          to="/login"
          className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition"
        >
          Đăng nhập
        </Link>
      </div>

    </div>
  );
};
