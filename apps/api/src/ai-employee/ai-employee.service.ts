import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

export interface AiEmployeeConfig {
  tenant_id: string;
  name: string;
  gender: string;
  voice: string | null;
  tone: string;
  salutation: string;
  custom_salutation: string | null;
  wake_word: string;
  enabled: boolean;
  notification_preferences: Record<string, boolean>;
  daily_realtime_budget_min: number;
  monthly_realtime_budget_min: number | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULTS: Partial<AiEmployeeConfig> = {
  name: 'Bilge',
  gender: 'female',
  voice: null,
  tone: 'samimi',
  salutation: 'patron',
  custom_salutation: null,
  wake_word: 'bilge',
  enabled: true,
  daily_realtime_budget_min: 20,
  monthly_realtime_budget_min: null,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

@Injectable()
export class AiEmployeeService {
  private readonly logger = new Logger(AiEmployeeService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async get(tenantId: string): Promise<AiEmployeeConfig> {
    const { data, error } = await this.supabase.db
      .from('tenant_ai_employee')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Kayıt yoksa varsayılanlarla oluştur
      return this.createDefault(tenantId);
    }
    return data as AiEmployeeConfig;
  }

  async update(tenantId: string, body: Partial<AiEmployeeConfig>): Promise<AiEmployeeConfig> {
    // Güvenlik: tenant_id asla gövdeden alınmaz; güncellemeden çıkarılır
    const { tenant_id, ...safe } = body as Record<string, unknown>;
    void tenant_id;

    const { data, error } = await this.supabase.db
      .from('tenant_ai_employee')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('AI Çalışanım kaydı bulunamadı');
    return data as AiEmployeeConfig;
  }

  private async createDefault(tenantId: string): Promise<AiEmployeeConfig> {
    const { data, error } = await this.supabase.db
      .from('tenant_ai_employee')
      .insert({ tenant_id: tenantId, ...DEFAULTS })
      .select()
      .single();
    if (error) throw error;
    return data as AiEmployeeConfig;
  }
}