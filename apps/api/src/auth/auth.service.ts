import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private sessions = new Map<string, { userId: string; tenantId: string; role: string; name: string; email: string }>();

  constructor(private readonly supabase: SupabaseService) {}

  async login(email: string, password: string) {
    const { data: user } = await this.supabase.db
      .from('users')
      .select('id, tenant_id, name, email, role, active')
      .eq('email', email)
      .maybeSingle();

    if (!user || !user.active) {
      throw new UnauthorizedException('Gecersiz email veya sifre');
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const { data: userWithPwd } = await this.supabase.db
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('password', hash)
      .maybeSingle();

    if (!userWithPwd) {
      throw new UnauthorizedException('Gecersiz email veya sifre');
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
  }

  async me(token: string) {
    const session = this.sessions.get(token);
    if (!session) throw new UnauthorizedException('Gecersiz token');
    return session;
  }

  logout(token: string) {
    this.sessions.delete(token);
    return { success: true };
  }
}
