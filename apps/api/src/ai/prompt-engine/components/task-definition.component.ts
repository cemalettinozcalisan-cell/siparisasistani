import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase.client';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class TaskDefinitionComponent {
  constructor(private readonly supabase: SupabaseService) {}

  async render(ctx: PromptContext): Promise<string> {
    const invoice = await this.getInvoiceSettings(ctx.tenantId);
    const behavior = String((invoice as any)?.invoice_ai_behavior || 'end');
    const limit = Number((invoice as any)?.invoice_limit) || 12000;
    const remoteAuto = (invoice as any)?.invoice_remote_auto;
    const enabled = (invoice as any)?.invoice_enabled;

    const invoiceRule = this.getInvoiceTask(behavior, enabled, limit, remoteAuto);

    const tasks: string[] = [
      '[GÖREV TANIMI]',
      'Sen bir sipariş asistanısın. Görevin:',
      '',
      '1. Müşterinin siparişini al',
      '2. Ürün kataloğundaki ürünlerle eşleştir',
      '3. Her ürünü tek tek onaylat',
      '4. Toplam sipariş özetini oku',
      '5. Özetten sonra sırasıyla: adres (ZORUNLU), telefon (bilinmiyorsa ZORUNLU), ödeme yöntemini al',
      '6. Tüm bilgileri JSON formatında çıktı ver',
      '7. Sipariş tamamlandıktan sonra (GOODBYE aşamasında): "Doğum gününüzü öğrenebilir miyim? Özel gününüzde size sürpriz indirim yapmak isteriz." diye nazikçe sor.',
      '8. Müşteri doğum günü verirse, customer.birthday alanına "GG-AA" formatında ekle (örn: "15-05"). Vermezse ısrar etme.',
      `9. ${invoiceRule}`,
      '',
      'MODERASYON: Müşteri küfür/hakaret/öfke kullanırsa sakin kal, asla karşılık verme, tartışmaya girme. Sorunu çözmeye odaklan; çözülemezse yetkiliye aktar. Müşteriyi 3 kez anlayamazsan farklı uslupla yeniden dene, sonra WhatsApp kanalına davet et (WhatsApp ise), çözülmezse yetkiliye aktar.',
    ];

    if (ctx.currentState === 'GREETING') {
      tasks.push('', '[ŞU ANKİ ADIM] Karşılama - Müşteriyi tanı ve sipariş almaya başla.');
    } else if (ctx.currentState === 'ISIM') {
      tasks.push('', '[ŞU ANKİ ADIM] İsim - Müşterinin ad soyad bilgisini öğren.');
    } else if (ctx.currentState === 'ORDERING') {
      tasks.push('', '[ŞU ANKİ ADIM] Sipariş Alma - Ürünleri ve miktarları öğren.');
    } else if (ctx.currentState === 'SUMMARIZING') {
      tasks.push('', '[ŞU ANKİ ADIM] Özet & Onay - Sipariş özetini oku ve onay iste.');
    } else if (ctx.currentState === 'ASKING_ADDRESS') {
      tasks.push('', '[ŞU ANKİ ADIM] Adres - Teslimat adresini (şehir, ilçe, mahalle/sokak) öğren.');
    } else if (ctx.currentState === 'ASKING_PHONE') {
      tasks.push('', '[ŞU ANKİ ADIM] Telefon - Müşterinin telefon numarasını öğren.');
    } else if (ctx.currentState === 'ASKING_PAYMENT') {
      tasks.push('', '[ŞU ANKİ ADIM] Ödeme - Ödeme yöntemini belirle.');
    } else if (ctx.currentState === 'CAMPAIGN') {
      tasks.push('', '[ŞU ANKİ ADIM] Kampanya - Özel kampanya veya teklif sun.');
    } else if (ctx.currentState === 'FINAL_CONFIRMATION') {
      tasks.push('', '[ŞU ANKİ ADIM] Son Onay - Tüm bilgileri topla ve siparişi tamamla.');
    } else if (ctx.currentState === 'ORDER_CREATED' || ctx.currentState === 'GOODBYE') {
      tasks.push('', '[ŞU ANKİ ADIM] Veda - Doğum günü sor, fatura davranışına göre fatura bilgisi iste (never ise sorma), konuşmayı bitir.');
    }

    return tasks.join('\n');
  }

  private getInvoiceTask(behavior: string, enabled: unknown, limit: number, remoteAuto: unknown): string {
    if (!enabled) return 'Fatura modülü pasif — fatura bilgisi (TCKN/VKN/firma) HİÇ sorma.';
    switch (behavior) {
      case 'never':
        return 'Fatura modülü aktif ama AI fatura bilgisi HİÇ sormaz. Müşteri isterse "Fatura işlemlerini yetkili arkadaşımız yürütecek" der.';
      case 'always':
        return 'Sipariş başında (isim alındıktan sonra) fatura için şirket adı veya vergi numarası iste, sonra siparişe geç.';
      case 'required_only':
        return `SADECE gerekirse fatura sor: sipariş tutarı ${limit} TL limitini aşıyorsa veya uzaktan satışta otomatik e-arşiv ${remoteAuto ? 'aktifse' : 'pasifse (bu koşul yok)'}. Aksi halde sorma; müşteri verirse kaydet (Nihai Tüketici kabul et).`;
      case 'end':
      default:
        return 'Sipariş sonunda (veda aşamasında) bir kez "Fatura için şirket adı veya vergi numarası gerekli mi?" diye sor. Vermezse ısrar etme.';
    }
  }

  private async getInvoiceSettings(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('invoice_enabled, invoice_ai_behavior, invoice_limit, invoice_remote_auto')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return data;
  }
}
