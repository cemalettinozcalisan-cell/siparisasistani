import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verimor SMS API istemcisi.
 * Gönderim: GET https://sms.verimor.com.tr/v2/send
 * Bakiye:  GET https://sms.verimor.com.tr/v2/balance
 */
@Injectable()
export class VerimorSmsProvider {
  private readonly logger = new Logger(VerimorSmsProvider.name);
  private readonly base = 'https://sms.verimor.com.tr/v2';
  private readonly username: string;
  private readonly password: string;
  private readonly header: string;

  constructor(config: ConfigService) {
    this.username = config.get<string>('VERIMOR_SMS_USERNAME', '') || process.env.VERIMOR_SMS_USERNAME || '';
    this.password = config.get<string>('VERIMOR_SMS_PASSWORD', '') || process.env.VERIMOR_SMS_PASSWORD || '';
    this.header = config.get<string>('VERIMOR_SMS_HEADER', '') || process.env.VERIMOR_SMS_HEADER || '';
  }

  private normalize(phone: string): string {
    let p = String(phone || '').replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = p.slice(1);
    if (!p.startsWith('90')) p = '90' + p;
    return p;
  }

  async sendSms(phone: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      if (!this.username || !this.password) {
        this.logger.warn('Verimor SMS kimligi tanimli degil (VERIMOR_SMS_USERNAME/PASSWORD)');
        return { success: false };
      }
      const params = new URLSearchParams({
        username: this.username,
        password: this.password,
        msg: message,
        dest: this.normalize(phone),
      });
      if (this.header) params.set('source_addr', this.header);
      const res = await fetch(`${this.base}/send?${params.toString()}`, { method: 'GET' });
      const text = (await res.text()).trim();
      this.logger.log(`Verimor SMS -> ${this.normalize(phone)}: ${res.status} ${text.slice(0, 60)}`);
      if (!res.ok) return { success: false };
      return { success: true, messageId: text };
    } catch (e) {
      this.logger.error(`Verimor sendSms hata: ${(e as Error).message}`);
      return { success: false };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; balance?: number }> {
    try {
      const res = await fetch(`${this.base}/balance?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`);
      const text = (await res.text()).trim();
      if (!res.ok) return { ok: false };
      return { ok: true, balance: Number(text) || 0 };
    } catch {
      return { ok: false };
    }
  }
}
