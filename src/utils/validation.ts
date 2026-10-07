export function isValidEmailOrPhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Vietnam phone regex: 10 digits starting with 0
  const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;

  return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
}

export function isStrictEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input.trim());
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  color: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Trống', color: 'bg-gray-200' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 10) score++;

  if (score <= 1) return { score: 1, label: 'Quá yếu', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Yếu', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Khá', color: 'bg-blue-500' };
  return { score: 4, label: 'Mạnh', color: 'bg-emerald-500' };
}
