import { Injectable } from '@nestjs/common';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class CustomerContextComponent {
  async render(ctx: PromptContext): Promise<string> {
    if (!ctx.customerName && !ctx.customerPhone) {
      return '[MÜŞTERİ] Henüz bilinmiyor. İlk mesajda adını ve telefonunu öğren.';
    }

    const lines = ['[MÜŞTERİ BİLGİSİ]'];
    if (ctx.customerName) lines.push(`Adı: ${ctx.customerName}`);
    if (ctx.customerPhone) lines.push(`Telefon: ${ctx.customerPhone}`);
    lines.push(`Kanal: ${ctx.channel}`);

    return lines.join('\n');
  }
}
