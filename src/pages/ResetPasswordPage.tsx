import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authService } from '../services/authService';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const result = await authService.resetPassword(email, otp, newPassword, confirmPassword);
    setBusy(false);
    if (!result.success) { setError(result.error || 'Không thể đặt lại mật khẩu.'); return; }
    setMessage('Mật khẩu đã được đặt lại. Đang chuyển tới đăng nhập...');
    window.setTimeout(() => navigate('/login'), 900);
  };

  return <AuthLayout
    bannerImage="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80"
    bannerBadge="VEGEAI SECURITY"
    bannerTitle="Bảo vệ tài khoản ăn chay thông minh"
    bannerDescription="Xác thực OTP giúp giữ an toàn cho hồ sơ dinh dưỡng, lịch sử AI và kho tủ lạnh cá nhân của bạn."
  >
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800 p-3 text-sm text-red-700 dark:text-rose-300">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300">{message}</p>}
      <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <Input label="OTP" required minLength={4} maxLength={10} value={otp} onChange={e => setOtp(e.target.value)} />
      <Input label="Mật khẩu mới" type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} showPasswordToggle />
      <Input label="Nhập lại mật khẩu mới" type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} showPasswordToggle />
      <Button type="submit" fullWidth isLoading={busy}>Đặt lại mật khẩu</Button>
      <p className="text-center text-sm text-gray-500 dark:text-slate-400"><Link to="/forgot-password" className="font-semibold text-emerald-700 dark:text-emerald-400">Gửi lại mã OTP</Link></p>
    </form>
  </AuthLayout>;
}
