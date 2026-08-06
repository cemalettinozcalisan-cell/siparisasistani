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
    const params = new URLSearchParams({
      usercode: this.username,
      password: this.password,
      gsmno: phone.startsWith('+') ? phone.slice(1) : phone,
      message,
      msgheader: this.msgHeader || 'SIPARIS',
      dil: 'TR',
    });

    this.logger.log(`NetGSM sendSms to ${phone}: ${message.substring(0, 50)}...`);

    const response = await fetch(`${this.apiUrl}/sms/send/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await response.text();
    this.logger.log(`NetGSM sendSms response: ${text}`);

    if (!response.ok) {
      this.logger.error(`NetGSM sendSms failed: ${text}`);
      return { success: false };
    }

    return { success: true, messageId: text.trim() };
  }
}
