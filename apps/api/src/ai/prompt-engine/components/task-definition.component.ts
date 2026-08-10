import { Injectable } from '@nestjs/common';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class TaskDefinitionComponent {
  async render(ctx: PromptContext): Promise<string> {
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
      '9. GOODBYE aşamasında ayrıca: "Fatura için şirket adı veya vergi numarası gerekli mi?" diye sor. Müşteri şirket adı veya vergi/TC numarası verirse customer.company_name ve customer.identity_number alanlarına ekle. Vermezse ısrar etme.',
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
      tasks.push('', '[ŞU ANKİ ADIM] Veda - Doğum günü ve fatura bilgilerini sor, konuşmayı bitir.');
    }

    return tasks.join('\n');
  }
}
