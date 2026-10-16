import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { isStrictEmail, calculatePasswordStrength } from '../../../utils/validation';

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'register' | 'verify' | 'verified'>('register');
  const [otp, setOtp] = useState('');

  // Dynamic password strength bar
  const strength = calculatePasswordStrength(formData.password);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!/^[a-zA-Z0-9_]{4,50}$/.test(formData.username.trim())) {
      errs.username = 'Username phải có 4-50 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới.';
    }

    if (!formData.fullName.trim() || formData.fullName.trim().length > 100 || /\d/.test(formData.fullName)) {
      errs.fullName = 'Vui lòng nhập họ tên không chứa số (tối đa 100 ký tự).';
    }

    if (!formData.emailOrPhone.trim()) {
      errs.emailOrPhone = 'Email không đúng định dạng';
    } else if (!isStrictEmail(formData.emailOrPhone)) {
      errs.emailOrPhone = 'Email không đúng định dạng';
    }

    if (!/^[a-zA-Z0-9_]{4,50}$/.test(formData.username.trim())) {
      errs.username = 'Tên đăng nhập cần 4–50 ký tự, chỉ gồm chữ, số và dấu gạch dưới.';
    }
    if (!formData.fullName.trim() || formData.fullName.trim().length > 100 || /[0-9]/.test(formData.fullName)) {
      errs.fullName = 'Vui lòng nhập họ tên (tối đa 100 ký tự, không chứa số).';
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

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await register(formData);
      if (res.success) {
        const email = formData.emailOrPhone.trim();
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { state: { email } });
      } else {
        // A 409 means this registration did not create another account. If it is
        // already pending verification, use the resend-OTP flow instead.
        setGeneralError(res.error || 'Đăng ký không thành công.');
      }
    } catch {
      setGeneralError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!/^\d{6}$/.test(otp)) {
      setGeneralError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authService.verifyEmail(formData.emailOrPhone, otp);
      if (result.success) {
        setStep('verified');
        setSuccessMessage('Email đã được xác thực. Bạn có thể đăng nhập.');
      } else {
        // Show BE's validation/error message (e.g. wrong/expired OTP) as-is.
        setGeneralError(result.error || 'Không thể xác thực email.');
      }
    } catch {
      setGeneralError('Không thể xác thực email. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setGeneralError('');
    setIsSubmitting(true);
    try {
      const result = await authService.resendOtp(formData.emailOrPhone);
      if (result.success) {
        setSuccessMessage(
          'Backend đã tiếp nhận yêu cầu gửi OTP. Hãy kiểm tra email; nếu SMTP chưa cấu hình, ' +
          'xem console backend tìm dòng [DEV/FALLBACK] Registration OTP.'
        );
      } else {
        setGeneralError(result.error || 'Không thể gửi lại OTP.');
      }
    } catch {
      setGeneralError('Không thể gửi lại OTP. Vui lòng thử lại.');
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input label="Tên đăng nhập" placeholder="nguyen_van_a" autoComplete="username"
          value={formData.username} error={errors.username}
          onChange={e => setFormData({ ...formData, username: e.target.value })} />
        
        {/* Họ tên */}
        <Input
          label="Họ tên"
          placeholder="Nguyễn Văn A"
          value={formData.fullName}
          error={errors.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        />

        {/* BE requires an email address for account creation and OTP delivery. */}
        <div>
          <Input
            label="Email"
            type="email"
            placeholder="nguyen@gmail.com"
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

      </form>}

      {step === 'verify' && (
        <form onSubmit={handleVerifySubmit} className="space-y-3.5">
          <Input
            label="Mã OTP xác thực email (6 chữ số)"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Xác thực email
          </Button>
          <Button type="button" variant="outline" fullWidth disabled={isSubmitting} onClick={handleResendOtp}>
            Gửi lại mã OTP
          </Button>
        </form>
      )}

      {step === 'verified' && (
        <Button type="button" fullWidth onClick={() => navigate('/login')}>
          Đến trang đăng nhập
        </Button>
      )}

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
