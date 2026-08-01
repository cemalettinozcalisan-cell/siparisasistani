const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

export function getTenantId(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  try {
    return localStorage.getItem('active_tenant_id') || DEFAULT_TENANT;
  } catch {
    return DEFAULT_TENANT;
  }
}

export function setTenantId(id: string) {
  try { localStorage.setItem('active_tenant_id', id); } catch {}
}

export function getUserRole(): string {
  if (typeof window === 'undefined') return 'owner';
  try { return JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'; } catch { return 'owner'; }
}

export interface Tenant {
  id: string;
  company_name: string;
  domain?: string;
  phone?: string;
  city?: string;
  status: string;
}
