import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private sessions = new Map<string, { userId: string; tenantId: string; role: string; name: string; email: string }>();

  constructor(private readonly supabase: SupabaseService) {}

  async login(email: string, password: string) {
    try {
      const { data: user } = await this.supabase.db
        .from('users')
        .select('id, tenant_id, name, email, role, active, password')
        .eq('email', email)
        .maybeSingle();

      if (!user || !user.active) {
        throw new UnauthorizedException('Gecersiz email veya sifre');
      }

      const verified = await this.verifyPassword(password, user.password || '');
      if (!verified) {
        throw new UnauthorizedException('Gecersiz email veya sifre');
      }

      // Legacy şifre (sha256 / düz metin) → scrypt'e kademeli göç (first login'de)
      if (!user.password?.startsWith('scrypt$')) {
        const newHash = await this.hashPassword(password);
        await this.supabase.db.from('users').update({ password: newHash }).eq('id', user.id);
      }

      const token = crypto.randomBytes(32).toString('hex');
      this.sessions.set(token, {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        name: user.name,
        email: user.email,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id,
        },
      };
    } catch {
      // Fallback mock login — yalnızca DEVELOPMENT'da; production'da devre dışı (hardcoded demo kredileri production yolundan kaldırıldı)
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Gecersiz email veya sifre');
      }
      if (email === 'demo@siparisasistani.com' && password === 'demo123') {
        const token = crypto.randomBytes(32).toString('hex');
        const mockUser = { id: 'demo-user-id', tenantId: '00000000-0000-0000-0000-000000000001', role: 'owner', name: 'Demo Kullanici', email: 'demo@siparisasistani.com' };
        this.sessions.set(token, { userId: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role, name: mockUser.name, email: mockUser.email });
        return { token, user: { id: mockUser.id, name: mockUser.name, email: mockUser.email, role: mockUser.role, tenantId: mockUser.tenantId } };
      }
      if (email === 'demo2@siparisasistani.com' && password === 'demo123') {
        const token = crypto.randomBytes(32).toString('hex');
        const mockUser = { id: 'demo2-user-id', tenantId: '00000000-0000-0000-0000-000000000001', role: 'manager', name: 'Yönetici Kullanici', email: 'demo2@siparisasistani.com' };
        this.sessions.set(token, { userId: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role, name: mockUser.name, email: mockUser.email });
        return { token, user: { id: mockUser.id, name: mockUser.name, email: mockUser.email, role: mockUser.role, tenantId: mockUser.tenantId } };
      }
      if (email === 'demo3@siparisasistani.com' && password === 'demo123') {
        const token = crypto.randomBytes(32).toString('hex');
        const mockUser = { id: 'demo3-user-id', tenantId: '00000000-0000-0000-0000-000000000001', role: 'staff', name: 'Personel Kullanici', email: 'demo3@siparisasistani.com' };
        this.sessions.set(token, { userId: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role, name: mockUser.name, email: mockUser.email });
        return { token, user: { id: mockUser.id, name: mockUser.name, email: mockUser.email, role: mockUser.role, tenantId: mockUser.tenantId } };
      }
      throw new UnauthorizedException('Gecersiz email veya sifre');
    }
  }

  async me(token: string) {
    const session = this.sessions.get(token);
    if (!session) throw new UnauthorizedException('Gecersiz token');
    return session;
  }

  validateToken(token: string): { userId: string; tenantId: string; role: string; name: string; email: string } | null {
    return this.sessions.get(token) || null;
  }

  logout(token: string) {
    this.sessions.delete(token);
    return { success: true };
  }

  async changePassword(token: string, oldPassword: string, newPassword: string) {
    const session = this.sessions.get(token);
    if (!session) throw new UnauthorizedException('Gecersiz token');

    const { data: user } = await this.supabase.db
      .from('users')
      .select('id, password')
      .eq('id', session.userId)
      .maybeSingle();

    if (!user || !(await this.verifyPassword(oldPassword, user.password || ''))) {
      // Fallback for demo accounts
      if (session.email === 'demo@siparisasistani.com' && oldPassword === 'demo123') {
        return { success: true, message: 'Sifre demo ortaminda degistirildi' };
      }
      throw new UnauthorizedException('Mevcut sifre yanlis');
    }

    if (newPassword.length < 6) throw new UnauthorizedException('Yeni sifre en az 6 karakter olmali');

    const newHash = await this.hashPassword(newPassword);
    await this.supabase.db.from('users').update({ password: newHash }).eq('id', session.userId);

    return { success: true };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    if (stored.startsWith('scrypt$')) {
      const parts = stored.split('$');
      if (parts.length !== 3) return false;
      const [, salt, hash] = parts;
      try {
        const candidate = crypto.scryptSync(password, salt, 64);
        return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
      } catch {
        return false;
      }
    }
    // Legacy: unsalted sha256 hex → doğrula, ilk login'de scrypt'e göç edilir
    if (/^[0-9a-f]{64}$/.test(stored)) {
      return crypto.createHash('sha256').update(password).digest('hex') === stored;
    }
    // Legacy: düz metin (göç script'i + login upgrade ile scrypt'e çevrilir; geçici güvenlik riski login'de kapanır)
    return password === stored;
  }
}
