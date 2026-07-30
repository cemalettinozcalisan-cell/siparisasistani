import { Injectable } from '@nestjs/common';

@Injectable()
export class PrintFormatService {
  generateThermal(order: Record<string, unknown>, items: Record<string, unknown>[]) {
    const source = String(order.source || 'PHONE');
    const sourceMap: Record<string, string> = {
      PHONE: '📞 TELEFON AI', WHATSAPP: '💬 WHATSAPP', INSTAGRAM: '📸 INSTAGRAM',
      WEBSITE: '🌐 WEB SİTESİ', MANUAL: '🏪 MANUEL', WHOLESALE: '📦 TOPLAN',
    };
    const lines: string[] = [
      '════════════════════════════',
      '  SİPARİŞASİSTANI',
      '════════════════════════════',
      '',
      `${sourceMap[source] || source}`,
      '',
      `Sipariş ID: #${order.order_number}`,
      `Tarih: ${new Date(order.created_at as string).toLocaleString('tr-TR')}`,
      '',
      '─── MÜŞTERİ ───',
      `Adı: ${order.customer_name || '-'}`,
      `Tel: ${order.customer_phone || '-'}`,
      `Adres: ${order.customer_address || '-'}`,
      '',
      '─── ÜRÜNLER ───',
    ];

    let total = 0;
    for (const item of items) {
      const name = String(item.product_name || '');
      const qty = Number(item.quantity || 0);
      const unit = String(item.unit || '');
      const price = Number(item.unit_price || 0);
      const itemTotal = qty * price;
      total += itemTotal;
      lines.push(`${qty} ${unit} ${name} ${itemTotal.toLocaleString('tr-TR')} TL`);
    }

    lines.push('', `Toplam: ${total.toLocaleString('tr-TR')} TL`);

    const note = String(order.customer_note || order.notes || '');
    if (note) {
      lines.push('', `📝 Not: ${note}`);
    }

    lines.push('', '════════════════════════════');
    return lines.join('\n');
  }

  generateA4(order: Record<string, unknown>, items: Record<string, unknown>[]) {
    const source = String(order.source || 'PHONE');
    const sourceMap: Record<string, string> = {
      PHONE: '📞 TELEFON AI', WHATSAPP: '💬 WHATSAPP', INSTAGRAM: '📸 INSTAGRAM',
      WEBSITE: '🌐 WEB SİTESİ', MANUAL: '🏪 MANUEL', WHOLESALE: '📦 TOPLAN',
    };
    const rows = items.map((item) =>
      `<tr><td>${item.product_name}</td><td>${item.quantity} ${item.unit}</td><td>${Number(item.unit_price || 0).toLocaleString('tr-TR')} TL</td><td>${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString('tr-TR')} TL</td></tr>`
    ).join('');
    const total = items.reduce((s, item) => s + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    const note = String(order.customer_note || order.notes || '');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sipariş #${order.order_number}</title>
<style>
  body{font-family:Arial,sans-serif;margin:30px;color:#333}
  h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:8px;font-size:20px}
  .source{display:inline-block;background:#f3f4f6;padding:4px 12px;border-radius:6px;font-size:12px;margin:8px 0}
  .info{background:#f9fafb;padding:12px;border-radius:8px;margin:12px 0;font-size:13px;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
  th{background:#1a56db;color:#fff;padding:8px 10px;text-align:left}
  td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
  .total{font-size:16px;font-weight:bold;text-align:right;margin-top:12px;padding-top:8px;border-top:2px solid #1a56db}
  .note{background:#fef3c7;padding:8px 12px;border-radius:6px;margin-top:12px;font-size:12px}
  .footer{margin-top:30px;font-size:11px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}
</style></head><body>
<h1>📄 Sipariş Fişi</h1>
<div class="source">${sourceMap[source] || source}</div>
<div class="info">
  <strong>Sipariş ID:</strong> #${order.order_number}<br>
  <strong>Tarih:</strong> ${new Date(order.created_at as string).toLocaleString('tr-TR')}<br><br>
  <strong>Müşteri:</strong> ${order.customer_name || '-'}<br>
  <strong>Telefon:</strong> ${order.customer_phone || '-'}<br>
  <strong>Adres:</strong> ${order.customer_address || '-'}
</div>
<table><thead><tr><th>Ürün</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th></tr></thead><tbody>${rows}</tbody></table>
<div class="total">Toplam: ${total.toLocaleString('tr-TR')} TL</div>
${note ? `<div class="note">📝 Müşteri Notu: ${note}</div>` : ''}
<div class="footer">SiparişAsistanı - AI Ticaret İşletim Sistemi</div>
</body></html>`;
  }
}
