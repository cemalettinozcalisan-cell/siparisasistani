import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase.client';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class PaymentMethodsComponent {
  constructor(private readonly supabase: SupabaseService) {}

  async render(ctx: PromptContext): Promise<string> {
    const { data: settings } = await this.supabase.db
      .from('settings')
      .select('payment_paytr, payment_iyzico, payment_website, website_url')
      .eq('tenant_id', ctx.tenantId)
      .single();

    const { data: tenant } = await this.supabase.db
      .from('tenants')
      .select('iban')
      .eq('id', ctx.tenantId)
      .single();

    // Check cargo COD setting
    const { data: cargoSettings } = await this.supabase.db
      .from('tenant_settings')
      .select('cargo_cod_enabled, cargo_cod_fee')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    const methods: string[] = [];

    if (tenant?.iban) {
      methods.push(`- IBAN (Havale/EFT): ${tenant.iban}`);
    }
    if (settings?.payment_website) {
      methods.push(`- Web Sitesi (Kredi Kartı): ${settings.website_url || ''}`);
    }
    if (settings?.payment_paytr) {
      methods.push('- Kredi Kartı (PayTR)');
    }
    if (settings?.payment_iyzico) {
      methods.push('- Kredi Kartı (Iyzico)');
    }
    if (cargoSettings?.cargo_cod_enabled) {
      const codFee = Number(cargoSettings.cargo_cod_fee) || 0;
      methods.push(`- Kapıda Ödeme (Nakit/Kredi Kartı)${codFee > 0 ? `: +${codFee} TL hizmet bedeli` : ''}`);
    }

    if (methods.length === 0) return '';

    const hasCOD = !!cargoSettings?.cargo_cod_enabled;
    return ['[ÖDEME YÖNTEMLERİ — SADECE BUNLAR MEVCUTTUR]',
      ...methods,
      '',
      hasCOD
        ? 'Kapıda ödeme mevcuttur, müşteri isterse teklif et.'
        : 'Kapıda ödeme YOKTUR. Müşteri "kapıda" veya "nakit" derse: "Maalesef kapıda ödeme seçeneğimiz yok. IBAN veya kredi kartı kullanabilirsiniz." de.',
    ].join('\n');
  }
}
