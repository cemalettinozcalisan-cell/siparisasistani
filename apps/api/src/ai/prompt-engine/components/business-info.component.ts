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

    const lines = [
      `[FİRMA BİLGİSİ]`,
      `Firma: ${tenant['company_name'] || ''}`,
      `Telefon: ${tenant['phone'] || ''}`,
      `Adres: ${tenant['city'] || ''} - ${tenant['address'] || ''}`,
      `Vergi No: ${tenant['tax_number'] || ''}`,
    ];

    const certs = tenant['certificates'] as unknown;
    if (Array.isArray(certs) && certs.length > 0) {
      lines.push(`Sertifikalar: ${certs.join(', ')}`);
      lines.push('KURAL: Yalnızca yukarıda listelenen sertifikaları söyleyebilirsin. Bunların dışında Helal/Kosher/ISO/BRCGS vb. HİÇBİR sertifika iddiasında bulunma.');
    }

    return lines.join('\n');
  }

  private async loadTenant(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenants')
      .select('company_name, phone, address, city, tax_number, certificates')
      .eq('id', tenantId)
      .single();

    if (data) {
      this.cache.set(tenantId, data);
    }
    return data;
  }
}
