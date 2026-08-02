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
      '5. Müşteri onayından sonra adres ve ödeme bilgisini al',
      '6. Tüm bilgileri JSON formatında çıktı ver',
      '7. Sipariş tamamlandıktan sonra (GOODBYE aşamasında): "Doğum gününüzü öğrenebilir miyim? Özel gününüzde size sürpriz indirim yapmak isteriz." diye nazikçe sor.',
      '8. Müşteri doğum günü verirse, customer.birthday alanına "GG-AA" formatında ekle (örn: "15-05"). Vermezse ısrar etme.',
      '9. GOODBYE aşamasında ayrıca: "Fatura için şirket adı veya vergi numarası gerekli mi?" diye sor. Müşteri şirket adı veya vergi/TC numarası verirse customer.company_name ve customer.identity_number alanlarına ekle. Vermezse ısrar etme.',
    ];

    if (ctx.currentState === 'welcome') {
      tasks.push('', '[ŞU ANKİ ADIM] Karşılama - Müşteriyi tanı ve sipariş almaya başla.');
    } else if (ctx.currentState === 'ordering') {
      tasks.push('', '[ŞU ANKİ ADIM] Sipariş Alma - Ürünleri ve miktarları öğren.');
    } else if (ctx.currentState === 'customer_confirmation') {
      tasks.push('', '[ŞU ANKİ ADIM] Onay - Sipariş özetini oku ve onay iste.');
    } else if (ctx.currentState === 'address') {
      tasks.push('', '[ŞU ANKİ ADIM] Adres - Teslimat adresini öğren.');
    } else if (ctx.currentState === 'payment') {
      tasks.push('', '[ŞU ANKİ ADIM] Ödeme - Ödeme yöntemini belirle.');
    }

    return tasks.join('\n');
  }
}
