import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { AiEmployeeService } from './ai-employee.service';
import { AiEmployeeConversationService } from './ai-employee-conversation.service';

/**
 * Realtime ses oturumu (Gemini Live proxy).
 * Tarayici -> /api/ai-employee/realtime (WS) -> Gemini 3.8 Live.
 * Anahtar sunucuda kalir; arac cagrilari ve onay (Anayasa 9) backend'de yurutulur.
 *
 * Istemci -> sunucu: { type:'audio', data:<b64 pcm16k> } | { type:'text', text } | { type:'ping' }
 * Sunucu -> istemci: { type:'setup', model } | { type:'audio', data:<b64 pcm24k> } | { type:'text', text }
 *                    | { type:'user_text', text } | { type:'interrupted' } | { type:'sleep' } | { type:'error', message }
 */

const BUSINESS_TOOL: any = {
  name: 'business_tool',
description:
    'Isletme islemleri. READ (bilgi, aninda): REPORT (period ZORUNLU: bugun->today, bu hafta->weekly, gecen hafta->last_week, bu ay->monthly, en cok satan->top_products; metric: tutar icin amount, "kac kg/kilo" icin weight), REPORT_COMPARE {period: weekly|monthly} (bu hafta/ay vs gecen hafta/ay karsilastirma), PRODUCT_LIST, CUSTOMER_LIST, CUSTOMER_DETAIL (tek musteri: {customer}; coklu isimde telefonlariyla listeler), CUSTOMER_ORDERS {customer}, CUSTOMER_CARGO {customer}, CUSTOMER_COMPLAINTS {customer}, CARGO_STATUS (tum kargolar durum gruplariyla), COMPLAINTS_LIST (talep/sikayet), ORDER_LIST {scope: active|recent|today|all} (siparis listesi; aktif/bekleyen icin scope=active, bugun icin scope=today), ORDER_DETAIL {order_number}, SUBSCRIPTION_STATUS, DAILY_BRIEFING, RECENT_CONVERSATIONS. ' +
    'WRITE (islem, ONAY SART): CREATE_PRODUCT {name, price, unit}, UPDATE_PRODUCT_PRICE {product, price}, DELETE_PRODUCT {product}, CREATE_CUSTOMER {name, surname, phone, address}, SET_CUSTOMER_PRICE {customer, product, price}, CANCEL_ORDER/DELETE_ORDER/CREATE_SHIPPING {order_number}, SEND_MESSAGE {customer, message}, CREATE_CAMPAIGN {title, message}, SEND_CAMPAIGN {channel, message}, UPGRADE_SUBSCRIPTION {plan_code}. ' +
    'ONEMLI: Kampanya/urun/musteri ekleme isteginde gerekli bilgiler toplaninca business_tool cagrisini MUTLAKA yap; araci cagirmadan sonuc uydurma ("sistem hatasi" deme). Kullanici onaylayinca AYNI komutu AYNI parametrelerle confirm=true ile hemen tekrar cagir. CUSTOMER_DETAIL/CUSTOMER_ORDERS/CUSTOMER_CARGO/CUSTOMER_COMPLAINTS/CONVERSATION_SUMMARY icin "customer" alanini MUTLAKA doldur (kullanicinin soyledigi ad veya telefon). ' +
    'SLEEP: kullanici kapanma/sessize gecme ifadesi soylerse cagir. ' +
    'Yazma isleminde once confirm=false cagir (preview doner), kullanici acikca onaylarsa confirm=true ile AYNI komut ve TUM parametreleri eksiksiz gondererek tekrar cagir. Eksik alanlari cagirmadan once kullaniciya sor.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      params: { type: 'object', description: 'Komut parametreleri (ornegin CREATE_PRODUCT icin {name, price, unit})' },
      confirm: { type: 'boolean', description: 'Yazma islemi kullanici tarafindan onaylandiysa true' },
    },
    required: ['command', 'params'],
  },
};

@Injectable()
export class RealtimeGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger(RealtimeGateway.name);
  private wss: WebSocketServer | null = null;
  private geminiSessions = new WeakMap<WebSocket, any>();
  private cancelledTools = new WeakMap<WebSocket, Set<string>>();
  private socketCtx = new WeakMap<WebSocket, { tid: string; role: string }>();
  private lastUserText = new WeakMap<WebSocket, string>();
  private recentUserText = new WeakMap<WebSocket, string[]>();
  private toolCallLoop = new WeakMap<WebSocket, { key: string; count: number }>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly aiEmployee: AiEmployeeService,
    private readonly conversation: AiEmployeeConversationService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get('REALTIME_ENABLED') !== 'true') return;
    try {
      const server = this.adapterHost.httpAdapter.getHttpServer();
      this.wss = new WebSocketServer({ server, path: '/api/ai-employee/realtime' });
      this.wss.on('connection', (socket, req) => { void this.handleConnection(socket, req); });
      this.logger.log('Realtime WS hazir: /api/ai-employee/realtime');
    } catch (e) {
      this.logger.warn(`Realtime WS baslatilamadi: ${(e as Error).message}`);
    }
  }

  private safeSend(socket: WebSocket, obj: unknown) {
    try {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(obj));
    } catch {
      /* kapali socket */
    }
  }

  private async handleConnection(socket: WebSocket, req: any) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const tid = url.searchParams.get('tid') || '';
      const token = url.searchParams.get('token') || '';
      const session = token ? this.auth.validateToken(token) : null;
      if (!session || !tid || session.tenantId !== tid) {
        this.safeSend(socket, { type: 'error', message: 'Yetkisiz baglanti' });
        socket.close();
        return;
      }
      const role = session.role || 'staff';
      const cfg = await this.aiEmployee.get(tid);
      if (!cfg.enabled) {
        this.safeSend(socket, { type: 'error', message: 'AI Calisanim kapali' });
        socket.close();
        return;
      }

      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      if (!apiKey) throw new Error('GEMINI_API_KEY tanimli degil');
      const model = this.config.get<string>('REALTIME_MODEL', 'gemini-3.8-live');
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = await this.conversation.buildRealtimeSystem(tid, cfg);
      this.logger.log(`[rt] connect tid=${tid} role=${role} model=${model}`);

      const gemini = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          tools: [{ functionDeclarations: [BUSINESS_TOOL] }],
          speechConfig: { languageCode: 'tr-TR' } as any,
          // Teşhis: giriş/çıkış transkriptlerini al (kullanıcı ne dedi / model ne dedi)
          inputAudioTranscription: { languageCodes: ['tr-TR'] } as any,
          outputAudioTranscription: {} as any,
          // Uzun oturum dayanıklılığı: bağlam sıkıştırma + oturum devam ettirme
          sessionResumption: {} as any,
          contextWindowCompression: { slidingWindow: {} } as any,
        },
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            this.forwardToBrowser(socket, msg);
          },
          onerror: (e) => {
            this.logger.warn(`[rt] gemini error: ${(e as any)?.message || e}`);
            this.safeSend(socket, { type: 'error', message: (e as any)?.message || 'Gemini hatasi' });
          },
          onclose: () => {
            this.logger.log('[rt] gemini session closed');
            try { socket.close(); } catch {}
          },
        },
      });
      this.geminiSessions.set(socket, gemini);
      this.cancelledTools.set(socket, new Set<string>());
      this.socketCtx.set(socket, { tid, role });

      this.safeSend(socket, { type: 'setup', model });
      socket.on('message', (raw) => { void this.onClientMessage(socket, raw, role); });
      socket.on('error', (err: Error) => {
        this.logger.warn(`[rt] ws error: ${err?.message || err}`);
      });
      socket.on('close', (code: number, reason: Buffer) => {
        this.logger.log(`[rt] ws close code=${code} reason=${reason?.toString?.() || ''}`);
        gemini.close();
        this.geminiSessions.delete(socket);
      });
    } catch (e) {
      this.logger.warn(`Realtime baglanti hatasi: ${(e as Error).message}`);
      this.safeSend(socket, { type: 'error', message: (e as Error).message });
      socket.close();
    }
  }

  private async onClientMessage(socket: WebSocket, raw: any, role: string) {
    const gemini = this.geminiSessions.get(socket);
    if (!gemini) return;
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try {
      if (msg.type === 'audio' && msg.data) {
        await (gemini as any).sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
      } else if (msg.type === 'text' && msg.text) {
        await (gemini as any).sendClientContent({ turns: [{ role: 'user', parts: [{ text: String(msg.text) }] }], turnComplete: true });
      } else if (msg.type === 'turn_complete') {
        // Kullanıcı konuşmaya başladı → modelin bekleyen turu finalize edip dinlemesi
        await (gemini as any).sendClientContent({ turnComplete: true });
      } else if (msg.type === 'ping') {
        this.safeSend(socket, { type: 'pong', t: msg.t });
      } else if (msg.type === 'gap') {
        this.logger.log(`[rt] AUDIO-GAP ${Number(msg.ms) || 0}ms`);
      } else if (msg.type === 'diag') {
        this.logger.log(`[rt] diag buffered=${Number(msg.buffered) || 0}B dropped=${Number(msg.dropped) || 0} rtt=${Number(msg.rtt) || 0}ms`);
      }
    } catch (e) {
      this.safeSend(socket, { type: 'error', message: (e as Error).message });
    }
  }

  private forwardToBrowser(socket: WebSocket, msg: LiveServerMessage) {
    // Kullanıcı araya girdi → Gemini ilgili tool çağrılarını iptal etti; sonuçlarını modele gönderme (stale koruması)
    const canc = (msg as any).toolCallCancellation?.ids;
    if (Array.isArray(canc) && canc.length) {
      const set = this.cancelledTools.get(socket);
      if (set) canc.forEach((id: string) => set.add(String(id)));
    }

    const calls = this.extractFunctionCalls(msg);
    if (calls.length) {
      const gemini = this.geminiSessions.get(socket);
      if (gemini) {
        void Promise.all(
          calls.map((fc) => this.handleToolCall(socket, fc).catch(() => ({ output: 'HATA: islem basarisiz' }))),
        )
          .then((responses) => {
            const set = this.cancelledTools.get(socket);
            const kept = responses.map((r, i) => ({ r, fc: calls[i] })).filter((x) => !(set && set.has(x.fc.id)));
            kept.forEach((x) => this.logger.log(`[toolResult] cmd=${String((x.fc.args as any)?.command || x.fc.name)} id=${x.fc.id} -> ${JSON.stringify(x.r).slice(0, 170)}`));
            if (!kept.length) return Promise.resolve();
            try {
              return Promise.resolve(
                (gemini as any).sendToolResponse({
                  functionResponses: kept.map((x) => ({ id: x.fc.id, name: x.fc.name, response: x.r })),
                }),
              ).catch(() => {});
            } catch { return Promise.resolve(); }
          })
          .catch(() => {});
      }
      return;
    }

    const parts = (msg as any).serverContent?.modelTurn?.parts;
    if (parts) {
      for (const p of parts) {
        if (p.inlineData?.data) {
          this.safeSend(socket, { type: 'audio', data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'audio/pcm' });
        }
        if (p.text) {
          this.safeSend(socket, { type: 'text', text: p.text });
        }
      }
    }
    const sc = (msg as any).serverContent;
    if (sc?.interrupted) {
      this.logger.log('[rt] INTERRUPTED (model kesildi)');
      this.safeSend(socket, { type: 'interrupted' });
    }
    if (sc?.turnComplete) { this.logger.log('[rt] turnComplete'); this.toolCallLoop.delete(socket); this.safeSend(socket, { type: 'turn_end' }); }
    if (sc?.generationComplete) this.logger.log('[rt] generationComplete');
    if (sc?.waitingForInput) this.logger.log('[rt] waitingForInput');
    // Giriş transkripti: serverContent.inputTranscription.text (top-level inputAudioTranscription = CONFIG, mesajda gelmez)
    const userTx = sc?.inputTranscription?.text;
    if (userTx) {
      const t = String(userTx);
      this.logger.log(`[rt] USER: ${t.slice(0, 160)}`);
      this.lastUserText.set(socket, t);
      const arr = this.recentUserText.get(socket) || [];
      arr.push(t);
      while (arr.length > 6) arr.shift();
      this.recentUserText.set(socket, arr);
      this.safeSend(socket, { type: 'user_text', text: t });
    }
    const modelTx = sc?.outputTranscription?.text;
    if (modelTx) {
      this.safeSend(socket, { type: 'text', text: String(modelTx) });
    }
    // Sunucu yakında kapatacak → logla + istemciye bildir
    const goAway = (msg as any).goAway;
    if (goAway) {
      this.logger.warn(`[rt] goAway timeLeft=${goAway.timeLeft || '?'}`);
      this.safeSend(socket, { type: 'goaway', timeLeft: goAway.timeLeft });
    }
    const usage = (msg as any).usageMetadata;
    if (usage) this.logger.log(`[rt] usage totalToken=${usage.totalTokenCount ?? '?'}`);
  }

  private extractFunctionCalls(msg: LiveServerMessage): { id: string; name: string; args: Record<string, unknown> }[] {
    const m = msg as any;
    const calls = m.toolCall?.functionCalls;
    if (Array.isArray(calls) && calls.length) {
      return calls.map((fc: any) => ({ id: String(fc.id || ''), name: String(fc.name || ''), args: fc.args || {} }));
    }
    const parts = m.serverContent?.modelTurn?.parts;
    if (parts) {
      const out: { id: string; name: string; args: Record<string, unknown> }[] = [];
      for (const p of parts) {
        if (p.functionCall) out.push({ id: String(p.functionCall.id || ''), name: String(p.functionCall.name || ''), args: p.functionCall.args || {} });
      }
      return out;
    }
    return [];
  }

  private async handleToolCall(
    socket: WebSocket,
    fc: { id: string; name: string; args: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    try {
      // tid/role, bağlantı anında saklanan context'ten gelir (upgradeReq ws v8'de yok)
      const ctx = this.socketCtx.get(socket);
      const tid = ctx?.tid || '';
      const role = ctx?.role || 'staff';
      const command = String(fc.args?.command || '');
      const params = (fc.args?.params || {}) as Record<string, unknown>;
      const rawConfirm = fc.args?.confirm;
      const confirm = rawConfirm === true || String(rawConfirm).toLowerCase() === 'true';
      this.logger.log(`toolCall id=${fc.id} name=${fc.name} cmd=${command} confirm=${confirm} params=${JSON.stringify(params).slice(0, 220)}`);

      // P24: aynı komut+parametre arka arkaya 3+ kez gelirse modeli durdur (döngü koruması)
      const loopKey = `${command}|${JSON.stringify(params)}`;
      const prev = this.toolCallLoop.get(socket);
      const count = prev && prev.key === loopKey ? prev.count + 1 : 1;
      this.toolCallLoop.set(socket, { key: loopKey, count });
      if (count >= 3) {
        this.logger.warn(`[rt] TOOL-LOOP ${command} x${count} — durduruldu`);
        return { output: `DONGU UYARISI: "${command}" ayni parametrelerle ${count}. kez cagrildi. Ayni araci tekrar cagirma. Kullaniciya eksik bilgiyi (ornegin musteri adi veya siparis numarasi) sor ve cevabini bekle.` };
      }

      if (command === 'SLEEP' || command === 'END_SESSION') {
        this.safeSend(socket, { type: 'sleep' });
        return { output: 'Gorusme kapatiliyor.' };
      }

      const out = await this.conversation.runTool(tid, role, command, params, confirm, this.lastUserText.get(socket) || '', this.recentUserText.get(socket) || []);
      if (out.error) return { output: `HATA: ${out.error}` };
      if (out.pending) {
        return { output: `ONAY GEREKIYOR - henuz hicbir islem yapilmadi. Onizleme: ${out.preview || 'Islem hazir'}. Kullaniciya onizlemeyi oku ve onayini sor. Kullanici "evet/onayliyorum" derse business_tool'u confirm=true ile AYNI komut ve AYNI parametrelerle hemen tekrar cagir.` };
      }
      return { output: out.result || 'Islem tamam.' };
    } catch (e) {
      return { output: `HATA: ${(e as Error).message}` };
    }
  }
}