import { Injectable } from '@nestjs/common';

@Injectable()
export class TextNormalizer {
  normalize(text: string): string {
    let result = text;

    result = this.removeUnwanted(result);
    result = this.normalizeNumbers(result);
    result = this.normalizeAbbreviations(result);
    result = this.normalizeCurrency(result);
    result = this.normalizePunctuation(result);
    result = this.trimExcess(result);

    return result;
  }

  private removeUnwanted(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[{}\[\]]/g, '')
      .replace(/["""''"]/g, '')
      .replace(/[🎉✅❌⚠️🔴🟢🟡🔵🟣📦💰📞💬👤📍📋📊⚙️🤖🧪📝🔔🎙📈🚀]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\*+/g, '')
      .replace(/#+/g, '');
  }

  private normalizeNumbers(text: string): string {
    return text
      .replace(/(\d{1,3})\.(\d{3})/g, '$1,$2')
      .replace(/(\d),(\d{3})/g, '$1.$2')
      .replace(/(\d+)\.(\d+)/g, (_, int, dec) => {
        const nums: Record<string, string> = {
          '0': 'sıfır', '1': 'bir', '2': 'iki', '3': 'üç', '4': 'dört',
          '5': 'beş', '6': 'altı', '7': 'yedi', '8': 'sekiz', '9': 'dokuz',
        };
        const intStr = parseInt(int).toLocaleString('tr-TR');
        const decStr = dec.split('').map((d: string) => nums[d] || d).join(' ');
        return `${intStr} virgül ${decStr}`;
      });
  }

  private normalizeAbbreviations(text: string): string {
    const map: Record<string, string> = {
      'TL': 'Türk Lirası',
      'IBAN': 'I BAN',
      'SMS': 'es em es',
      'KG': 'kilogram',
      'GR': 'gram',
      'LT': 'litre',
      'ML': 'mililitre',
      'CM': 'santimetre',
      'KM': 'kilometre',
      'STT': 'es te te',
      'TTS': 'te te es',
      'AI': 'A I',
      'ID': 'I D',
      'URL': 'U R L',
      'API': 'A P İ',
      'KVKK': 'K V K K',
      'PayTR': 'Pay T R',
      'NO': 'numara',
      'TEL': 'telefon',
      'GSM': 'G S M',
    };

    let result = text;
    for (const [abbr, full] of Object.entries(map)) {
      result = result.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    }
    return result;
  }

  private normalizeCurrency(text: string): string {
    return text
      .replace(/(\d+[.,]?\d*)\s?₺/g, '$1 Türk Lirası')
      .replace(/(\d+[.,]?\d*)\s?\$/g, '$1 dolar')
      .replace(/(\d+[.,]?\d*)\s?€/g, '$1 euro')
      .replace(/(\d+)%/g, (_, num) => `${num} yüzde`);
  }

  private normalizePunctuation(text: string): string {
    return text
      .replace(/\.{3,}/g, '... ')
      .replace(/\?{2,}/g, '?')
      .replace(/!{2,}/g, '!')
      .replace(/---/g, '... ')
      .replace(/--/g, '... ')
      .replace(/['']/g, "'");
  }

  private trimExcess(text: string): string {
    return text
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
}
