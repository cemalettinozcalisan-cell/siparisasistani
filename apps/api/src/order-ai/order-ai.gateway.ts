import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service';
import { SupabaseService } from '../common/supabase.client';
import { OrderAiToolsService } from './order-ai-tools.service';

/**
 * F1: Sipariş AI — Gemini Live realtime (İZOLE).
 * Tarayıcı -> /api/order-ai/realtime (WS) -> Gemini Live.
 * Mevcut ai-employee realtime.gateway'ine DOKUNMAZ; bağımsız yol + araç seti.
 *
 * İstemci -> sunucu: { type:'audio', data:<b64 pcm16k> } | { type:'text', text } | { type:'ping' }
 * Sunucu -> istemci: { type:'setup' } | { type:'audio', data } | { type:'text', text }
 *                    | { type:'user_text', text } | { type:'interrupted' } | { type:'order', ... } | { type:'error', message }
 */

const ORDER_TOOL: any = {
  name: 'order_action',
  description:
    'Musteri siparis islemleri. Siparis alirken SIRAYLA cagir: ' +
    'set_customer {name, phone} (musteri adi/telefonu), ' +
    'add_item {product_name, quantity, unit} (her urun icin; unit: KG|ADET|KOLI|TEPSI), ' +
    'set_address {address, city} (teslimat adresi), ' +
    'set_payment {payment} (iban|website|paytr|iyzico|cash_on_delivery|kapida_kart), ' +
    'set_invoice {company_name, tax_number} (fatura icin firma adi/vergi no), ' +
    'confirm_order {} (musteri ACIKCA onaylayinca), ' +
    'send_payment_info {} (havale/IBAN ve siparis bilgisini WhatsApp ile gonder; IBAN i tek tek OKUMA). ' +
    'Ayrica: escalate {} (insana devret), sleep {} (görusmeyi kapat). ' +
    'Kullanici onaylamadan confirm_order CAGIRMA. Bilgi eksikse once sor.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'set_customer|add_item|set_address|set_payment|set_invoice|confirm_order|send_payment_info|escalate|sleep' },
      args: { type: 'object', description: 'Araç parametreleri' },
    },
    required: ['action'],
  },
};

@Injectable()
export class OrderAiGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrderAiGateway.name);
  private wss: WebSocketServer | null = null;
  private geminiSessions = new WeakMap<WebSocket, any>();
  private socketCtx = new WeakMap<WebSocket, { tid: string; role: string; sessionId: string }>();
  private toolLoop = new WeakMap<WebSocket, { key: string; count: number }>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly promptEngine: PromptEngineService,
    private readonly supabase: SupabaseService,
    private readonly tools: OrderAiToolsService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get('ORDER_AI_REALTIME_ENABLED', 'true') === 'false') return;
    if (!this.config.get<string>('GEMINI_API_KEY')) {
      this.logger.warn('GEMINI_API_KEY yok — Order AI realtime kapali');
      return;
    }
    try {
      const server = this.adapterHost.httpAdapter.getHttpServer();
      // İZOLE yaklaşım: ws v8'de iki WebSocketServer({server,path}) çakışır (ilki eşleşmeyen yolu 400 ile kapatır).
      // Bu yüzden noServer + tek upgrade yönlendiricisi kuruyoruz; diğer yolları (AI Çalışanım) mevcut dinleyicilere devrediyoruz.
      this.wss = new WebSocketServer({ noServer: true });
      const prior = server.listeners('upgrade').slice() as ((req: any, socket: any, head: any) => void)[];
      server.removeAllListeners('upgrade');
      server.on('upgrade', (req: any, socket: any, head: any) => {
        const pathname = String(req.url || '').split('?')[0];
        if (pathname === '/api/order-ai/realtime') {
          this.wss!.handleUpgrade(req, socket, head, (ws) => this.wss!.emit('connection', ws, req));
        } else {
          for (const l of prior) { try { l.call(server, req, socket, head); } catch { /* yoksay */ } }
        }
      });
      this.wss.on('connection', (socket, req) => { void this.handleConnection(socket, req); });
      this.logger.log('Order AI Realtime WS hazir: /api/order-ai/realtime');
    } catch (e) {
      this.logger.warn(`Order AI Realtime WS baslatilamadi: ${(e as Error).message}`);
    }
  }

  private safeSend(socket: WebSocket, obj: unknown) {
    try { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(obj)); } catch { /* kapali */ }
  }

  private async tenantName(tid: string): Promise<string> {
    try {
      const { data } = await this.supabase.db.from('tenants').select('company_name').eq('id', tid).maybeSingle();
      return (data?.company_name as string) || 'İşletme';
    } catch { return 'İşletme'; }
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
      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      if (!apiKey) throw new Error('GEMINI_API_KEY tanimli degil');
      const sessionId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const name = await this.tenantName(tid);
      const callerPhone = url.searchParams.get('phone') || '';
      // A/B teşhis bayrakları (query): ab=tools,voice,prompt,transcription
      const ab = (url.searchParams.get('ab') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const abNoTools = ab.includes('tools');
      const abDefaultVoice = ab.includes('voice');
      const abShortPrompt = ab.includes('prompt');
      const abNoTranscription = ab.includes('transcription');
      const abOutOnly = ab.includes('outonly');
      const abBothTrans = ab.includes('both');
      const abTrunc = ab.includes('trunc');
      // P81: native-audio model denemesi (ab=model) veya ORDER_AI_MODEL env ile kalıcı seçim.
      const abModel = ab.includes('model');
      const NATIVE_AUDIO_MODEL = 'gemini-2.5-flash-native-audio-latest';
      const model = this.config.get<string>('ORDER_AI_MODEL')
        || (abModel ? NATIVE_AUDIO_MODEL : this.config.get<string>('REALTIME_MODEL', 'gemini-3.8-live'));

      let systemInstruction = await this.promptEngine.buildRealtimeOrderPrompt({
        tenantId: tid, tenantName: name, channel: 'phone', currentState: 'ordering', customerPhone: callerPhone,
      });
      if (abShortPrompt) systemInstruction = 'Sen kısa, doğal ve sıcak Türkçe konuşan bir sipariş asistanısın. Müşteriden sipariş al.';
      if (abTrunc) systemInstruction = systemInstruction.slice(0, 4000);

      let tenantVoice = '';
      try {
        const { data } = await this.supabase.db.from('tenant_settings').select('order_ai_voice').eq('tenant_id', tid).maybeSingle();
        tenantVoice = ((data as any)?.order_ai_voice as string) || '';
      } catch { /* kolon yoksa yoksay */ }
      let requestedVoice = (url.searchParams.get('voice') || tenantVoice || this.config.get<string>('ORDER_AI_VOICE', 'Aoede') || 'Aoede').trim();
      if (abDefaultVoice) requestedVoice = '';
      this.logger.log(`[order-ai] connect tid=${tid} role=${role} model=${model} session=${sessionId} phoneKnown=${!!callerPhone} voice=${requestedVoice || 'default'} sysLen=${systemInstruction.length} ab=[${ab.join(',')}] tool=${abNoTools ? 'OFF' : ORDER_TOOL.name} transcription=${abNoTranscription ? 'OFF' : 'ON'}`);

      const ai = new GoogleGenAI({ apiKey });
      const buildConfig = (voiceName: string) => ({
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        ...(abNoTools ? {} : { tools: [{ functionDeclarations: [ORDER_TOOL] }] }),
        speechConfig: { languageCode: 'tr-TR', ...(voiceName ? { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } : {}) } as any,
        // P82: daha doğal/ifadeli konuşma — yalnız native-audio modellerde desteklenir (3.8-live reddediyor)
        ...(model.includes('native-audio') ? { enableAffectiveDialog: true } : {}),
        // Varsayılan: YALNIZCA input transcription (user_text). Uzun talimat + input&output birlikte 1011 veriyor.
        // ab=both → ikisi de; ab=outonly → yalnız output; ab=transcription → hiçbiri.
        ...(abNoTranscription ? {} : {
          ...(abOutOnly ? {} : { inputAudioTranscription: { languageCodes: ['tr-TR'] } as any }),
          ...((abOutOnly || abBothTrans) ? { outputAudioTranscription: {} as any } : {}),
        }),
        sessionResumption: {} as any,
        // contextWindowCompression KALDIRILDI: ses drift'ine yol açabiliyor (kısa sipariş oturumlarında gereksiz)
      });
      const connectWith = (voiceName: string) => ai.live.connect({
        model,
        config: buildConfig(voiceName) as any,
        callbacks: {
          onmessage: (msg: LiveServerMessage) => { try { this.forwardToBrowser(socket, msg); } catch (e) { this.logger.warn(`[order-ai] forward hata: ${(e as Error).message}`); } },
          onerror: (e) => {
            this.logger.warn(`[order-ai] gemini error: ${(e as any)?.message || e}`);
            this.safeSend(socket, { type: 'error', message: (e as any)?.message || 'Gemini hatasi' });
          },
          onclose: (e: any) => { this.logger.log(`[order-ai] gemini session closed code=${e?.code ?? '?'} reason=${e?.reason ?? ''}`); try { socket.close(); } catch {} },
        },
      });
      let usedVoice = requestedVoice;
      let gemini: any;
      try {
        gemini = await connectWith(requestedVoice);
      } catch (e) {
        // Yalnızca geçerli özel bir ses başarısız olursa Aoede'ye düş (A/B varsayılan sesi bozma)
        if (requestedVoice && requestedVoice.toLowerCase() !== 'aoede') {
          this.logger.warn(`[order-ai] ses "${requestedVoice}" başarısız (${(e as Error).message}) — Aoede'ye düşülüyor`);
          usedVoice = 'Aoede';
          gemini = await connectWith('Aoede');
        } else { throw e; }
      }
      this.geminiSessions.set(socket, gemini);
      this.socketCtx.set(socket, { tid, role, sessionId });

      this.safeSend(socket, { type: 'setup', model, voice: usedVoice });
      socket.on('message', (raw) => { void this.onClientMessage(socket, raw); });
      socket.on('error', (err: Error) => this.logger.warn(`[order-ai] ws error: ${err?.message || err}`));
      socket.on('close', (code: number) => {
        this.logger.log(`[order-ai] ws close code=${code}`);
        gemini.close();
        this.geminiSessions.delete(socket);
        try { this.tools.reset(tid, sessionId); } catch { /* yoksay */ }
      });
    } catch (e) {
      this.logger.warn(`Order AI baglanti hatasi: ${(e as Error).message}`);
      this.safeSend(socket, { type: 'error', message: (e as Error).message });
      socket.close();
    }
  }

  private async onClientMessage(socket: WebSocket, raw: any) {
    const gemini = this.geminiSessions.get(socket);
    if (!gemini) return;
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try {
      if (msg.type === 'audio' && msg.data) {
        await (gemini as any).sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
      } else if (msg.type === 'text' && msg.text) {
        await (gemini as any).sendClientContent({ turns: [{ role: 'user', parts: [{ text: String(msg.text) }] }], turnComplete: true });
      } else if (msg.type === 'ping') {
        this.safeSend(socket, { type: 'pong' });
      }
    } catch (e) {
      this.logger.warn(`[order-ai] onClientMessage hata (type=${msg?.type}): ${(e as Error).message}`);
      this.safeSend(socket, { type: 'error', message: (e as Error).message });
    }
  }

  private forwardToBrowser(socket: WebSocket, msg: LiveServerMessage) {
    const m = msg as any;
    // P68a teşhis: ses-dışı / önemli mesajları logla
    try {
      const sc = m.serverContent || {};
      const parts = sc.modelTurn?.parts || [];
      const hasAudio = Array.isArray(parts) && parts.some((p: any) => p.inlineData?.data);
      const interesting = m.toolCall || m.goAway || m.usageMetadata || sc.interrupted || sc.turnComplete || sc.inputTranscription || sc.outputTranscription || sc.generationComplete || (!hasAudio && Object.keys(sc).length > 0);
      if (interesting) {
        this.logger.log(`[order-ai] msg top=[${Object.keys(m).join(',')}] sc=[${Object.keys(sc).join(',')}]${m.toolCall ? ' TOOLCALL=' + (m.toolCall?.functionCalls?.length || 0) : ''}${m.goAway ? ' GOAWAY=' + (m.goAway?.timeLeft || '?') : ''}${m.usageMetadata ? ' tokens=' + (m.usageMetadata?.totalTokenCount ?? '?') : ''}`);
      }
    } catch { /* yoksay */ }

    const calls = this.extractFunctionCalls(m);
    if (calls.length) {
      const gemini = this.geminiSessions.get(socket);
      if (gemini) {
        void Promise.all(calls.map((fc) => this.handleToolCall(socket, fc).catch(() => ({ output: 'HATA: islem basarisiz' }))))
          .then((responses) => {
            try {
              return Promise.resolve((gemini as any).sendToolResponse({
                functionResponses: responses.map((r, i) => ({ id: calls[i].id, name: calls[i].name, response: r })),
              })).catch((e: any) => { this.logger.warn(`[order-ai] sendToolResponse hata: ${e?.message || e}`); });
            } catch (e) { this.logger.warn(`[order-ai] sendToolResponse sync hata: ${(e as Error).message}`); return Promise.resolve(); }
          })
          .catch(() => {});
      }
      return;
    }

    const sc = m.serverContent;
    const parts = sc?.modelTurn?.parts;
    if (parts) {
      for (const p of parts) {
        if (p.inlineData?.data) this.safeSend(socket, { type: 'audio', data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'audio/pcm' });
        if (p.text) { this.logger.log(`[order-ai] AI: ${String(p.text).slice(0, 200)}`); this.safeSend(socket, { type: 'text', text: p.text }); }
      }
    }
    if (sc?.interrupted) this.safeSend(socket, { type: 'interrupted' });
    if (sc?.turnComplete) this.safeSend(socket, { type: 'turn_end' });
    const userTx = sc?.inputTranscription?.text;
    if (userTx) { this.logger.log(`[order-ai] USER: ${String(userTx).slice(0, 160)}`); this.safeSend(socket, { type: 'user_text', text: String(userTx) }); }
    const modelTx = sc?.outputTranscription?.text;
    if (modelTx) this.safeSend(socket, { type: 'text', text: String(modelTx) });
    // Sunucu yakında kapatacak → logla + istemciye bildir
    const goAway = (m as any).goAway;
    if (goAway) {
      this.logger.warn(`[order-ai] goAway timeLeft=${goAway.timeLeft || '?'}`);
      this.safeSend(socket, { type: 'goaway', timeLeft: goAway.timeLeft });
    }
  }

  private extractFunctionCalls(m: any): { id: string; name: string; args: Record<string, unknown> }[] {
    const calls = m.toolCall?.functionCalls;
    if (Array.isArray(calls) && calls.length) return calls.map((fc: any) => ({ id: String(fc.id || ''), name: String(fc.name || ''), args: fc.args || {} }));
    const parts = m.serverContent?.modelTurn?.parts;
    if (parts) {
      const out: { id: string; name: string; args: Record<string, unknown> }[] = [];
      for (const p of parts) if (p.functionCall) out.push({ id: String(p.functionCall.id || ''), name: String(p.functionCall.name || ''), args: p.functionCall.args || {} });
      return out;
    }
    return [];
  }

  private async handleToolCall(socket: WebSocket, fc: { id: string; name: string; args: Record<string, unknown> }): Promise<Record<string, unknown>> {
    try {
      const ctx = this.socketCtx.get(socket);
      const tid = ctx?.tid || '';
      const sessionId = ctx?.sessionId || 'default';
      const action = String(fc.args?.action || fc.args?.command || '');
      const args = (fc.args?.args || fc.args?.params || {}) as Record<string, unknown>;
      this.logger.log(`[order-ai] tool action=${action} args=${JSON.stringify(args).slice(0, 180)}`);
      const out = await this.tools.runTool(tid, sessionId, action, args);

      // P72: sonucu logla
      this.logger.log(`[order-ai] toolResult action=${action} ok=${out.ok} -> ${JSON.stringify(out).slice(0, 220)}`);

      // P73: döngü koruması — aynı araç+aynı hata üst üste
      const resultKey = `${action}|${out.ok ? 'ok' : String(out.error)}`;
      const prev = this.toolLoop.get(socket);
      const count = prev && prev.key === resultKey ? prev.count + 1 : 1;
      this.toolLoop.set(socket, { key: resultKey, count });

      if (!out.ok) {
        if (count >= 3) {
          this.logger.warn(`[order-ai] TOOL-LOOP ${action} x${count} — durduruldu`);
          return { output: `DÖNGÜ: "${action}" aynı hatayı ${count}. kez veriyor (${out.error}). Bu aracı TEKRAR ÇAĞIRMA. Kullanıcıdan eksik bilgiyi iste ve cevabını bekle; eksik bilgi gelince ilgili aracı çağır.` };
        }
        if (count === 2) {
          return { output: `HATA (aynı hata tekrar): ${out.error}. Bu aracı AYNI parametrelerle TEKRAR ÇAĞIRMA. Kullanıcıdan eksik bilgiyi iste, ilgili araçla (set_customer/set_address) kaydet, SONRA tekrar dene.` };
        }
        return { output: `HATA: ${out.error}` };
      }
      if (action === 'confirm_order' && out.result?.orderNumber) {
        this.safeSend(socket, { type: 'order', ...out.result });
        return { output: `Sipariş oluşturuldu: #${out.result.orderNumber}, toplam ${out.result.total} TL. Müşteriye kısa ve net söyle.` };
      }
      return { output: JSON.stringify(out.result || { ok: true }) };
    } catch (e) {
      return { output: `HATA: ${(e as Error).message}` };
    }
  }
}
