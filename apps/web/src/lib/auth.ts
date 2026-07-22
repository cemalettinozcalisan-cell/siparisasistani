export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('auth_user');
  return data ? JSON.parse(data) : null;
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Gecersiz email veya sifre');
  const data = await res.json();
  setAuth(data.token, data.user);
  return data;
}

export async function logout() {
  const token = getToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {});
  }
  clearAuth();
  window.location.href = '/login';
}
