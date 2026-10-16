import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { userService } from '../../../services/userService';
import { ApiError, errorMessage } from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import { calculatePasswordStrength } from '../../../utils/validation';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

// Backend error codes (ErrorCode.java) → Vietnamese messages.
const errorByCode: Record<number, [Field, string]> = {
  1304: ['currentPassword', 'Mật khẩu hiện tại không đúng.'],
  1305: ['newPassword', 'Mật khẩu mới phải khác mật khẩu hiện tại.'],
  1303: ['confirmPassword', 'Mật khẩu nhập lại không khớp.'],
};

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState<Record<Field, string>>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const strength = calculatePasswordStrength(form.newPassword);

  const update = (field: Field, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Partial<Record<Field, string>> = {};
    if (!form.currentPassword) errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    const p = form.newPassword;
    if (p.length < 8 || p.length > 100 || !/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
      errs.newPassword = 'Mật khẩu mới cần 8–100 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
    } else if (p === form.currentPassword) {
      errs.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    }
    if (!form.confirmPassword || form.confirmPassword !== p) errs.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(''); setMessage('');
    if (!validate()) return;
    setBusy(true);
    try {
      await userService.changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      // Backend revokes every refresh token, including this device's, so sign in again.
      setMessage('Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới...');
      window.setTimeout(async () => { await logout(); navigate('/login', { replace: true }); }, 1200);
    } catch (error) {
      const mapped = error instanceof ApiError && error.code ? errorByCode[error.code] : undefined;
      if (mapped) setErrors({ [mapped[0]]: mapped[1] });
      else setFormError(errorMessage(error));
      setBusy(false);
    }
  };

  return <section className="max-w-xl space-y-6">
    <header>
      <span className="text-xs font-bold text-emerald-700">BẢO MẬT TÀI KHOẢN</span>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2"><KeyRound size={26} />Đổi mật khẩu</h1>
      <p className="text-sm text-gray-500 mt-2">Sau khi đổi, mọi phiên đăng nhập trên các thiết bị khác sẽ bị đăng xuất.</p>
    </header>
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={form.currentPassword}
        onChange={e => update('currentPassword', e.target.value)} error={errors.currentPassword} showPasswordToggle />
      <div>
        <Input label="Mật khẩu mới" type="password" autoComplete="new-password" value={form.newPassword}
          onChange={e => update('newPassword', e.target.value)} error={errors.newPassword} showPasswordToggle />
        {form.newPassword && <div className="mt-2">
          <div className="flex gap-1">{[1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />)}</div>
          <p className="text-xs text-gray-500 mt-1">Độ mạnh: {strength.label}</p>
        </div>}
      </div>
      <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" value={form.confirmPassword}
        onChange={e => update('confirmPassword', e.target.value)} error={errors.confirmPassword} showPasswordToggle />
      <Button type="submit" isLoading={busy} disabled={busy}>Đổi mật khẩu</Button>
    </form>
  </section>;
}
