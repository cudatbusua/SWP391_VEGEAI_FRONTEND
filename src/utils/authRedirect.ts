/**
 * Redirect helpers shared by the login form and the guest-only route boundary.
 *
 * Only same-origin, known application paths are accepted, which keeps `?from=` / route state
 * from becoming an open redirect (for example `//evil.test` or `https://evil.test`).
 */
const ALLOWED_RETURN_PATH =
  /^\/(?:blog|questions|videos|admin|meal-plans|nutrition|settings|fridge|fridge-scan|smart-market|restaurants|ai-chef|dashboard|explore|recipe)(?:\/[A-Za-z0-9-]+)*$/;

export function safeReturnPath(value: unknown): string | null {
  if (!value) return null;
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null && 'pathname' in value
        ? (value as { pathname?: unknown }).pathname
        : null;
  if (typeof raw !== 'string') return null;
  const candidate = raw;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
  return ALLOWED_RETURN_PATH.test(candidate) ? candidate : null;
}

/** Where to send the user right after a successful login. */
export function loginDestination(role: string | undefined, from: unknown): string {
  const target = safeReturnPath(from);
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  if (normalizedRole === 'admin') return target && target.startsWith('/admin') ? target : '/admin';
  return target && !target.startsWith('/admin') ? target : '/dashboard';
}
