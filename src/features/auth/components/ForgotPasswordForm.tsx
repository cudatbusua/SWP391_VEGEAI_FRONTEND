import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, RotateCcw, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { authService } from '../../../services/authService';
import { isStrictEmail } from '../../../utils/validation';

export const ForgotPasswordForm: React.FC = () => {
  const [step, setStep] = useState<'request' | 'otp' | 'success'>('request');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }

    if (!isStrictEmail(emailOrPhone)) {
      setError('Email không đúng định dạng.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword({ emailOrPhone });
      if (res.success) {
        // BE intentionally uses the same response whether or not the account exists.
        // Email delivery is asynchronous; a local SMTP failure logs a fallback OTP on BE.
        setInfoMessage(
          'Nếu email tồn tại, backend đã tiếp nhận yêu cầu gửi OTP. Hãy kiểm tra hộp thư; ' +
          'nếu chưa nhận, xem console backend với dòng [DEV/FALLBACK] Forgot Password OTP.'
        );
        setStep('otp');
      } else {
        setError(res.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập mã xác thực OTP hợp lệ.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.resetPassword(emailOrPhone, otp.trim(), newPassword, confirmPassword);
      if (result.success) setStep('success');
      else setError(result.error || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      
      {/* Top Refresh Icon Badge (Image 4) */}
      <div className="mb-6 flex justify-start">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
          <RotateCcw className="w-6 h-6" />
        </div>
      </div>

      {/* Heading & Subtitle (Image 4) */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          {step === 'success' ? 'Đặt lại mật khẩu thành công' : 'Khôi phục mật khẩu'}
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {step === 'request' && 'Nhập email đã đăng ký để nhận mã xác thực.'}
          {step === 'otp' && 'Nhập mã xác thực đã nhận được và thiết lập mật khẩu mới.'}
          {step === 'success' && 'Mật khẩu của bạn đã được cập nhật thành công. Hãy đăng nhập lại!'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && step === 'otp' && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Step 1: Request OTP (Image 4) */}
      {step === 'request' && (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="nguyen@gmail.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={emailOrPhone}
            onChange={(e) => {
              setEmailOrPhone(e.target.value);
              if (error) setError('');
            }}
          />

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Gửi mã xác thực
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Enter OTP & New Password */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-3.5">
          <Input
            label="Mã xác thực OTP (6 chữ số)"
            placeholder="Nhập 6 chữ số"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <Input
            label="Mật khẩu mới"
            type="password"
            placeholder="Tối thiểu 8 ký tự"
            leftIcon={<KeyRound className="w-4 h-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            showPasswordToggle
          />

          <Input
            label="Nhập lại mật khẩu mới"
            type="password"
            placeholder="Xác nhận mật khẩu mới"
            leftIcon={<KeyRound className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            showPasswordToggle
          />

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Cập nhật mật khẩu mới
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Success Screen */}
      {step === 'success' && (
        <div className="space-y-4 text-center py-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <Link to="/login">
            <Button fullWidth>
              Đăng nhập ngay
            </Button>
          </Link>
        </div>
      )}

      {/* Quay lại đăng nhập (Image 4) */}
      <div className="text-center mt-7">
        <Link
          to="/login"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline transition inline-flex items-center gap-1.5"
        >
          <span>← Quay lại đăng nhập</span>
        </Link>
      </div>

      {/* Footer Info (Image 4) */}
      <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
        <span>© 2026 VEGEAI Vietnam</span>
        <div className="flex gap-3">
          <a href="#" className="hover:text-gray-600 transition">Hỗ trợ</a>
          <a href="#" className="hover:text-gray-600 transition">Điều khoản</a>
        </div>
      </div>

    </div>
  );
};
