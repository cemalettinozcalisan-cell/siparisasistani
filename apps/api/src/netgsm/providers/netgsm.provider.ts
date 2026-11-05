import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelephonyProvider, CallRequest, CallResponse, DtmfResult, CallStatus } from './telephony-provider.interface';

@Injectable()
export class NetgsmProvider implements TelephonyProvider {
  readonly name = 'netgsm';
  private readonly logger = new Logger(NetgsmProvider.name);
  private apiUrl: string;
  private username: string;
  private password: string;
  private msgHeader: string;

  constructor(config: ConfigService) {
    this.apiUrl = config.get<string>('NETGSM_API_URL', 'https://api.netgsm.com.tr');
    this.username = config.get<string>('NETGSM_USERNAME', '');
    this.password = config.get<string>('NETGSM_PASSWORD', '');
    this.msgHeader = config.get<string>('NETGSM_MSG_HEADER', '');
  }

  async initiateCall(request: CallRequest): Promise<CallResponse> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      msgheader: this.msgHeader,
      number: request.to,
      webhook_url: request.webhookUrl,
      timeout: String(request.timeout || 30),
      max_duration: String(request.maxDuration || 300),
    });

    const response = await fetch(`${this.apiUrl}/voice/call/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await response.text();
    this.logger.log(`NetGSM initiateCall response: ${text}`);

    if (!response.ok) throw new Error(`NetGSM call failed: ${text}`);

    return { callId: text.trim(), status: 'RINGING' };
  }

  async playAudio(callId: string, audioUrl: string): Promise<void> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
      audio_url: audioUrl,
    });

    const response = await fetch(`${this.apiUrl}/voice/call/play`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`NetGSM playAudio failed: ${err}`);
    }
  }

  async hangup(callId: string): Promise<void> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
    });

    await fetch(`${this.apiUrl}/voice/call/hangup`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async collectDTMF(callId: string, options: { maxDigits: number; timeout: number; finishOnKey: string }): Promise<DtmfResult> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
      maxdigits: String(options.maxDigits),
      timeout: String(options.timeout),
      finish_on_key: options.finishOnKey,
    });

    const response = await fetch(`${this.apiUrl}/voice/call/gather`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const text = await response.text();
    return { digits: text.trim(), completed: true };
  }

  async startRecording(callId: string): Promise<string> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
    });

    const response = await fetch(`${this.apiUrl}/voice/call/record/start`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return await response.text();
  }

  async stopRecording(callId: string): Promise<string> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
    });

    const response = await fetch(`${this.apiUrl}/voice/call/record/stop`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return await response.text();
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      call_id: callId,
    });

    const response = await fetch(`${this.apiUrl}/voice/call/status?${params.toString()}`);
    const text = await response.text();

    const statusMap: Record<string, CallStatus> = {
      '0': 'RINGING', '1': 'ANSWERED', '2': 'COMPLETED',
      '3': 'FAILED', '4': 'TIMEOUT',
    };

    return statusMap[text.trim()] || 'FAILED';
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/voice/balance`, {
        headers: { Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}` },
      });
      return { healthy: response.ok, message: response.ok ? 'OK' : `HTTP ${response.status}` };
    } catch (err) {
      return { healthy: false, message: (err as Error).message };
    }
  }

  async sendSms(phone: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    // Giden SMS'ler artık VERİMOR üzerinden gönderilir (NetGSM kaldırıldı).
    // Tüm çağrılar (esnaf/kampanya/bilgi/AI cevap) buradan geçtiği için tek noktadan Verimor'a yönlendirilir.
    const username = process.env.VERIMOR_SMS_USERNAME || this.username;
    const password = process.env.VERIMOR_SMS_PASSWORD || this.password;
    const header = process.env.VERIMOR_SMS_HEADER || this.msgHeader || '';
    let p = String(phone || '').replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = p.slice(1);
    if (!p.startsWith('90')) p = '90' + p;
    try {
      if (!username || !password) {
        this.logger.warn('Verimor SMS kimligi tanimli degil (VERIMOR_SMS_USERNAME/PASSWORD)');
        return { success: false };
      }
      const params = new URLSearchParams({ username, password, msg: message, dest: p });
      if (header) params.set('source_addr', header);
      const response = await fetch(`https://sms.verimor.com.tr/v2/send?${params.toString()}`, { method: 'GET' });
      const text = (await response.text()).trim();
      this.logger.log(`Verimor sendSms -> ${p}: ${response.status} ${text.slice(0, 50)}`);
      if (!response.ok) {
        this.logger.error(`Verimor sendSms failed: ${text}`);
        return { success: false };
      }
      return { success: true, messageId: text };
    } catch (e) {
      this.logger.error(`Verimor sendSms hata: ${(e as Error).message}`);
      return { success: false };
    }
  }
}
