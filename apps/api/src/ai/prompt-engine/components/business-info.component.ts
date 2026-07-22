import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase.client';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class BusinessInfoComponent {
  private readonly logger = new Logger(BusinessInfoComponent.name);
  private cache: Map<string, Record<string, unknown>> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  async render(ctx: PromptContext): Promise<string> {
    const cached = this.cache.get(ctx.tenantId);
    const tenant = cached || await this.loadTenant(ctx.tenantId);

    if (!tenant) return '';

    return [
      `[FİRMA BİLGİSİ]`,
      `Firma: ${tenant['company_name'] || ''}`,
      `Telefon: ${tenant['phone'] || ''}`,
      `Adres: ${tenant['city'] || ''} - ${tenant['address'] || ''}`,
      `Vergi No: ${tenant['tax_number'] || ''}`,
    ].join('\n');
  }

  private async loadTenant(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenants')
      .select('company_name, phone, address, city, tax_number')
      .eq('id', tenantId)
      .single();

    if (data) {
      this.cache.set(tenantId, data);
    }
    return data;
  }
}
