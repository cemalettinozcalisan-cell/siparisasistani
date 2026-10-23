import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';

/**
 * P64: Ses önizleme — sunucu tarafında kısa bir Gemini Live oturumu açar,
 * verilen sesle sabit bir cümleyi söyletir, sesi (PCM 24k) toplayıp base64 döner.
 * Mikrofon gerekmez; AI Çalışanım kapalı olsa da çalışır.
 */

const PREVIEW_TEXT = 'Merhaba efendim, size nasıl yardımcı olabilirim sizin için her zaman buradayım';

@Injectable()
export class OrderAiVoicePreviewService {
  private readonly logger = new Logger(OrderAiVoicePreviewService.name);

  constructor(private readonly config: ConfigService) {}

  async preview(voice: string): Promise<{ audioBase64: string; mimeType: string } | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;
    const model = this.config.get<string>('REALTIME_MODEL', 'gemini-3.8-live');
    const voiceName = String(voice || '').trim();

    const ai = new GoogleGenAI({ apiKey });
    const chunks: Buffer[] = [];
    let done = false;
    let resolveDone!: () => void;
    const donePromise = new Promise<void>((r) => { resolveDone = r; });
    const finish = () => { if (!done) { done = true; resolveDone(); } };

    let session: any;
    try {
      session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Kısa, doğal, sıcak ve kibar Türkçe konuşan bir asistansın.',
          speechConfig: { languageCode: 'tr-TR', ...(voiceName ? { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } : {}) } as any,
        },
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            const sc = (msg as any).serverContent;
            const parts = sc?.modelTurn?.parts;
            if (parts) for (const p of parts) if (p.inlineData?.data) chunks.push(Buffer.from(p.inlineData.data, 'base64'));
            if (sc?.turnComplete || sc?.generationComplete) finish();
          },
          onerror: (e) => { this.logger.warn(`preview error: ${(e as any)?.message || e}`); finish(); },
          onclose: () => finish(),
        },
      });
    } catch (e) {
      this.logger.warn(`preview connect hata: ${(e as Error).message}`);
      return null;
    }

    try {
      await session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `Şu cümleyi aynen, doğal ve sıcak bir şekilde söyle: "${PREVIEW_TEXT}"` }] }], turnComplete: true });
    } catch { /* yoksay */ }

    await Promise.race([donePromise, new Promise((r) => setTimeout(r, 5000))]);
    try { session.close(); } catch { /* yoksay */ }

    if (!chunks.length) return null;
    return { audioBase64: Buffer.concat(chunks).toString('base64'), mimeType: 'audio/pcm;rate=24000' };
  }
}
