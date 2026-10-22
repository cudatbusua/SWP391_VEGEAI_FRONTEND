import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/authService';
import { isStrictEmail } from '../utils/validation';

export function VerifyEmailPage() {
  const location = useLocation();
  const queryEmail = new URLSearchParams(location.search).get('email') || '';
  const [email, setEmail] = useState<string>(location.state?.email || queryEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Kiểm tra email để lấy mã OTP có hiệu lực trong 3 phút.');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(location.state?.email ? 30 : 0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!isStrictEmail(email) || !/^\d{6}$/.test(otp)) { setError('Vui lòng nhập email hợp lệ và mã OTP gồm 6 chữ số.'); return; }
    setBusy(true);
    const result = await authService.verifyEmail(email, otp);
    setBusy(false);
    if (result.success) { setVerified(true); setMessage('Xác minh thành công. Bạn có thể đăng nhập.'); }
    else setError(result.error || 'Không thể xác minh email.');
  };
  const resend = async () => {
    if (!isStrictEmail(email)) { setError('Vui lòng nhập email hợp lệ.'); return; }
    setBusy(true); setError('');
    const result = await authService.resendOtp(email);
    setBusy(false);
    if (result.success) { setCooldown(30); setMessage('Mã OTP mới đã được gửi về email.'); }
    else setError(result.error || 'Không thể gửi mã OTP.');
  };
  return <AuthLayout bannerImage="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80"
    bannerBadge="VEGEAI" bannerTitle="Bắt đầu hành trình ăn xanh" bannerDescription="Xác minh email để kích hoạt tài khoản của bạn.">
    <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">Xác minh email</h1>
    <p className="text-sm text-gray-600 dark:text-slate-400 mb-5" role="status">{message}</p>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
    {verified ? <Link to="/login"><Button fullWidth>Đăng nhập</Button></Link> : <form onSubmit={submit} className="space-y-4">
      <Input label="Email đăng ký" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <Input label="Mã OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required />
      <Button type="submit" fullWidth isLoading={busy}>Xác minh</Button>
      <Button type="button" variant="outline" fullWidth disabled={busy || cooldown > 0} onClick={resend}>
        {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã OTP'}
      </Button>
      <Link className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 block text-center" to="/login">Quay lại đăng nhập</Link>
    </form>}
  </AuthLayout>;
}
