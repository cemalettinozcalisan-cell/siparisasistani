import { Injectable, Logger } from '@nestjs/common';
import { AiProviderFactory } from '../providers/ai-provider.factory';
import { PromptEngineService, PromptContext } from '../prompt-engine/prompt-engine.service';
import { AiParserService } from '../conversation/parser/ai-parser';
import { OrderValidatorService } from '../conversation/validator/validator';
import { AiAuditService } from '../audit/ai-audit.service';
import { OrderEngineService } from '../../order-engine/order-engine.service';
import { ComplaintProcessorService } from '../../complaint-processor/complaint-processor.service';
import { SupabaseService } from '../../common/supabase.client';
import { ChannelHealthService } from '../../channel-health/channel-health.service';

export interface BrainInput {
  tenantId: string;
  channel: 'phone' | 'whatsapp' | 'sms' | 'instagram';
  channelSource?: string;
  phone: string;
  messages: { role: string; content: string }[];
  sessionId?: string;
  language?: string;
}

export interface BrainOutput {
  reply: string;
  confidence: number;
  orderCreated: boolean;
  orderId?: string;
  orderNumber?: string;
  sessionId: string;
  sessionLabel?: string;
  needsHuman: boolean;
  maintenanceMode: boolean;
  afterHours: boolean;
  duplicateWarning?: string;
  providerUsed?: string;
  intent?: string;
  complaintType?: string;
  complaintSeverity?: string;
  escalationLevel?: number;
  escalationReason?: string;
  recommendedAction?: string;
  sendWhatsapp?: boolean;
  whatsappMessage?: string;
  complaintCreated?: boolean;
}

export interface CallSummary {
  success: boolean;
  productCount: number;
  products: string[];
  paymentMethod: string;
  address: string;
  customerName: string;
  durationSeconds: number;
  sentiment: 'HAPPY' | 'NEUTRAL' | 'UNHAPPY' | 'ANGRY';
  sentimentScore: number;
  aiErrors: string[];
  needsHuman: boolean;
  shortSummary: string;
}

@Injectable()
export class AiBrainService {
  private readonly logger = new Logger(AiBrainService.name);

  constructor(
    private readonly aiFactory: AiProviderFactory,
    private readonly promptEngine: PromptEngineService,
    private readonly parser: AiParserService,
    private readonly validator: OrderValidatorService,
    private readonly audit: AiAuditService,
    private readonly orderEngine: OrderEngineService,
    private readonly supabase: SupabaseService,
    private readonly complaintProcessor: ComplaintProcessorService,
    private readonly channelHealth: ChannelHealthService,
  ) {}

  async process(input: BrainInput): Promise<BrainOutput> {
    const start = Date.now();
    let sessionId = input.sessionId;
    const lastMessage = input.messages[input.messages.length - 1]?.content || '';

    const settings = await this.getSettings(input.tenantId);

    // Step 1: Maintenance Check
    if (settings?.maintenanceMode) {
      return {
        reply: settings.maintenanceMessage || 'Şu an sipariş hizmetimiz geçici olarak kullanılamamaktadır.',
        confidence: 0, orderCreated: false,
        sessionId: sessionId || 'maintenance',
        needsHuman: false, maintenanceMode: true, afterHours: false,
      };
    }

    // Step 2: Business Hours Check
    if (settings?.businessHoursEnabled && !this.isWithinBusinessHours(settings)) {
      return {
        reply: settings.afterHoursMessage || 'Siparişinizi not alıyorum. Mesai saatleri içinde onaylanacaktır.',
        confidence: 50, orderCreated: false,
        sessionId: sessionId || 'after-hours',
        needsHuman: false, maintenanceMode: false, afterHours: true,
      };
    }

    // Step 3: Duplicate Detection
    const duplicateWarning = await this.checkDuplicate(input);
    if (duplicateWarning) {
      this.logger.warn(`Duplicate detected: ${duplicateWarning}`);
    }

    // Step 4: Session Management
    if (!sessionId) {
      sessionId = await this.createSession(input.tenantId, input.channel, input.phone, input.channelSource);
    }

    // Step 4.5: Dekont alındı tespiti — müşteri "ödedim / dekont attım" beyan ederse,
    // bekleyen IBAN siparişi varsa otomatik esnaf bildirimi tetiklenir (AI çağrısı yapılmaz).
    const dekontReply = await this.maybeHandleDekont(input, lastMessage, sessionId);
    if (dekontReply) return dekontReply;

    // Step 5: Prompt
    const tenantName = await this.getTenantName(input.tenantId);

    const promptCtx: PromptContext = {
      tenantId: input.tenantId,
      tenantName,
      customerPhone: input.phone,
      channel: input.channel,
      currentState: this.detectState(input.messages),
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();
    const fullPrompt = [systemPrompt, '', outputFormat].join('\n');

    // Step 6: AI Call (failover)
    const provider = this.aiFactory.getProvider(settings?.aiProvider || undefined);
    const effectiveProvider = settings?.aiProvider || 'deepseek';

    const aiMessages = [
      { role: 'system' as const, content: fullPrompt },
      ...input.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let response;
    let providerUsed = effectiveProvider;
    try {
      const result = await this.aiFactory.completeWithFailover({
        messages: aiMessages, temperature: 0.3,
        model: settings?.aiModel || undefined,
      });
      response = result.result;
      providerUsed = result.providerUsed;
    } catch (err) {
      this.logger.error(`AI failed: ${(err as Error).message}`);
      await this.audit.log({
        tenantId: input.tenantId, sessionId,
        model: providerUsed, provider: providerUsed,
        systemPrompt: fullPrompt, userMessage: lastMessage,
        success: false, errorMessage: (err as Error).message,
      });
      // Kanal sağlığı: AI cevap üretemedi (en kritik arıza)
      await this.channelHealth.record(input.tenantId, 'ai', false, { error: (err as Error).message, errorCode: 'AI_FAILED' });
      await this.endSession(sessionId, 'error');
      return {
        reply: 'Şu anda teknik bir sorun yaşıyorum. Lütfen kısa süre sonra tekrar arayın.',
        confidence: 0, orderCreated: false, sessionId,
        needsHuman: true, maintenanceMode: false, afterHours: false,
        duplicateWarning, providerUsed,
      };
    }

    const latency = Date.now() - start;

    // Kanal sağlığı: AI başarılı cevap üretti (sessizlik tespiti için son başarı zamanı)
    await this.channelHealth.record(input.tenantId, 'ai', true);

    // Step 7: Parse
    const parsed = this.parser.parseAiResponse(response.content);

    const hasName = !!(parsed.customer?.name);
    const hasAddress = !!parsed.address;
    const hasProducts = !!(parsed.products && parsed.products.length > 0);
    const hasPhone = !!parsed.customer?.phone;
    const hasPayment = !!parsed.payment;

    let computedConfidence = 0;
    if (hasProducts) computedConfidence += 30;
    if (parsed.products && parsed.products.every((p: { quantity?: number }) => p.quantity && p.quantity > 0)) computedConfidence += 20;
    if (hasName) computedConfidence += 15;
    if (hasAddress) computedConfidence += 15;
    if (hasPhone) computedConfidence += 10;
    if (hasPayment) computedConfidence += 10;
    if (parsed.confirmed) computedConfidence += 10;

    const finalConfidence = Math.min(computedConfidence, 100);
    parsed.confidence = finalConfidence;

    // Step 8: Validate (Order Engine'den once!)
    const validation = this.validator.validate({
      customer: parsed.customer,
      products: parsed.products,
      payment: parsed.payment,
      confirmed: parsed.confirmed,
      confidence: parsed.confidence,
      channel: input.channel,
    });

    // Step 9: Audit
    await this.audit.log({
      tenantId: input.tenantId, sessionId,
      model: effectiveProvider, provider: providerUsed,
      systemPrompt: fullPrompt, userMessage: lastMessage,
      rawResponse: response.content,
      parsedJson: parsed as unknown as Record<string, unknown>,
      confidence: parsed.confidence || 0,
      latencyMs: latency,
      tokenPrompt: response.usage?.promptTokens,
      tokenCompletion: response.usage?.completionTokens,
      success: true,
    });

    // Step 10: Session Update
    await this.updateSession(sessionId, input.messages, response.content, effectiveProvider, parsed.confidence);

    // M1 çok dil: algılanan dili oturuma kaydet (sesli kanal dahil sonraki adımlar kullanır)
    if (parsed.language && parsed.language !== 'tr') {
      try {
        await this.supabase.db.from('conversation_sessions')
          .update({ language: parsed.language })
          .eq('id', sessionId);
      } catch (e) {
        this.logger.warn(`Session language update failed: ${(e as Error).message}`);
      }
    }

    const routingFields = {
      intent: parsed.intent,
      complaintType: parsed.complaintType,
      complaintSeverity: parsed.complaintSeverity,
      escalationLevel: parsed.escalationLevel,
      escalationReason: parsed.escalationReason,
      recommendedAction: parsed.recommendedAction,
      sendWhatsapp: this.detectWhatsappRequest(parsed.reply || ''),
      whatsappMessage: parsed.reply || '',
    };

    // Faz 3: Birleşik Şikayet Hattı — şikayet intent'ini tüm kanallarda tek noktadan kaydet
    // (telefon/SMS/Instagram/WhatsApp fark etmez; oturum başına tek kayıt)
    let complaintCreated = false;
    if (parsed.intent === 'COMPLAINT' && !parsed.confirmed) {
      try {
        const complaintResult = await this.complaintProcessor.process({
          tenantId: input.tenantId,
          customer: { name: parsed.customer?.name, phone: input.phone },
          complaintType: parsed.complaintType,
          complaintSeverity: parsed.complaintSeverity,
          complaintConfidence: parsed.complaintConfidence || 0,
          description: `[${input.channel}] Müşteri: "${lastMessage}"`,
          channel: input.channel,
          sessionId,
        });
        complaintCreated = complaintResult.created;
        if (complaintCreated) {
          this.logger.log(`Unified complaint ticket ${complaintResult.ticketNumber} from ${input.channel} session ${sessionId}`);
        }
      } catch (err) {
        this.logger.error(`Unified complaint routing failed: ${(err as Error).message}`);
      }
    }

    // Step 11: Order Engine (only if validated + confirmed)
    // TOPTAN: AI, ürünlerde tanımlı wholesale_price'ı kullanarak müşteri onayıyla
    // normal sipariş gibi kurar (source=WHOLESALE). Esnafa ayrıca sormaz.
    if (validation.valid && parsed.confirmed) {
      try {
        const orderInput = this.parser.toOrderInput(parsed, input.channel);
        orderInput.customer.phone = orderInput.customer.phone || input.phone;
        const order = await this.orderEngine.process(orderInput, input.tenantId);

        await this.endSession(sessionId, 'completed');
        await this.updateSessionOrder(sessionId, order.order_id, order.order_number);

        return {
          reply: parsed.reply || response.content,
          confidence: parsed.confidence || 0,
          orderCreated: true,
          orderId: order.order_id,
          orderNumber: order.order_number,
          sessionId,
          needsHuman: (parsed.confidence || 0) < 50,
          maintenanceMode: false,
          afterHours: false,
          duplicateWarning,
          providerUsed,
          ...routingFields,
          complaintCreated,
        };
      } catch (err) {
        this.logger.error(`Order creation failed: ${(err as Error).message}`);
        return {
          reply: 'Siparişinizi oluştururken bir hata oluştu.',
          confidence: parsed.confidence || 0,
          orderCreated: false, sessionId,
          needsHuman: true, maintenanceMode: false, afterHours: false,
          duplicateWarning, providerUsed,
          ...routingFields,
        };
      }
    }

    const needsHuman = (parsed.confidence || 0) < 50 || this.detectHumanRequest(parsed.reply || '');

    return {
      reply: parsed.reply || response.content,
      confidence: parsed.confidence || 0,
      orderCreated: false, sessionId,
      needsHuman, maintenanceMode: false, afterHours: false,
      duplicateWarning, providerUsed,
      ...routingFields,
      complaintCreated,
    };
  }

  // --- HUMAN OVERRIDE (AI Learning Queue) ---
  async logHumanOverride(params: {
    tenantId: string; sessionId?: string; orderId?: string;
    transcript?: string; aiJson: Record<string, unknown>;
    humanEdit: Record<string, unknown>; confidence?: number; reason: string;
  }) {
    await this.supabase.db.from('ai_learning_queue').insert({
      tenant_id: params.tenantId,
      session_id: params.sessionId || null,
      order_id: params.orderId || null,
      transcript: params.transcript || null,
      ai_json: params.aiJson,
      human_edit: params.humanEdit,
      confidence: params.confidence ?? null,
      reason: params.reason,
      status: 'pending',
    });
  }

  private async checkDuplicate(input: BrainInput): Promise<string | undefined> {
    if (!input.phone || input.messages.length > 2) return undefined;

    const sixtySecAgo = new Date(Date.now() - 60000).toISOString();

    const { data } = await this.supabase.db
      .from('conversation_sessions')
      .select('session_label')
      .eq('tenant_id', input.tenantId)
      .eq('phone', input.phone)
      .gte('created_at', sixtySecAgo)
      .eq('status', 'active')
      .limit(1);

    if (data && data.length > 0) {
      return `Aynı numaradan aktif görüşme var: ${data[0].session_label}`;
    }
    return undefined;
  }

  private isWithinBusinessHours(settings: Record<string, unknown>): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startStr = (settings.businessHoursStart as string) || '08:00';
    const endStr = (settings.businessHoursEnd as string) || '18:30';

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private tenantNameCache: Map<string, string> = new Map();

  private async getTenantName(tenantId: string): Promise<string | undefined> {
    if (this.tenantNameCache.has(tenantId)) return this.tenantNameCache.get(tenantId);

    try {
      const { data } = await this.supabase.db
        .from('tenants')
        .select('company_name')
        .eq('id', tenantId)
        .maybeSingle();
      if (data?.company_name) {
        this.tenantNameCache.set(tenantId, data.company_name);
        return data.company_name;
      }
    } catch {}

    const defaultNames: Record<string, string> = {
      'a0000000-0000-0000-0000-000000000001': 'Ahmet İpek Sucukları',
      'demo-tenant-id': 'Demo İşletme',
    };
    const name = defaultNames[tenantId];
    if (name) this.tenantNameCache.set(tenantId, name);
    return name;
  }

  private async getSettings(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    return data;
  }

  private async createSession(
    tenantId: string, channel: string, phone: string, channelSource?: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.db
      .from('conversation_sessions')
      .insert({
        tenant_id: tenantId, channel,
        channel_source: channelSource || channel,
        phone, status: 'active', language: 'tr',
      })
      .select('id, session_label')
      .single();
    if (error) throw new Error(`Session creation failed: ${error.message}`);
    return data.id;
  }

  private async updateSession(
    sessionId: string, messages: { role: string; content: string }[],
    lastResponse: string, aiModel: string, confidence?: number,
  ) {
    const update: Record<string, unknown> = {
      messages: JSON.stringify([...messages, { role: 'assistant', content: lastResponse }]),
      ai_model: aiModel, duration_seconds: 0,
    };
    if (confidence !== undefined) {
      const { data: current } = await this.supabase.db
        .from('conversation_sessions').select('session_data').eq('id', sessionId).maybeSingle();
      const existing = typeof current?.session_data === 'string'
        ? JSON.parse(current.session_data) : (current?.session_data || {});
      update.session_data = JSON.stringify({ ...existing, confidence });
    }
    await this.supabase.db.from('conversation_sessions').update(update).eq('id', sessionId);
  }

  private async updateSessionOrder(sessionId: string, orderId: string, orderNumber: string) {
    await this.supabase.db
      .from('conversation_sessions')
      .update({ order_id: orderId })
      .eq('id', sessionId);
  }

  private async endSession(sessionId: string, endReason: string) {
    await this.supabase.db
      .from('conversation_sessions')
      .update({
        status: endReason === 'completed' ? 'completed' : 'failed',
        end_reason: endReason,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }

  private detectState(messages: { role: string; content: string }[]): string {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
    if (!lastAssistantMsg) return 'welcome';
    if (/onay|doğru mu|teyit/i.test(lastAssistantMsg)) return 'customer_confirmation';
    if (/adres|teslimat|şehir|ilçe|semt|sokak|cadde|mahalle|neresinde/i.test(lastAssistantMsg)) return 'address';
    if (/ödeme|kart|iban|havale/i.test(lastAssistantMsg)) return 'payment';
    if (/telefon|numara|ulaşabilir/i.test(lastAssistantMsg)) return 'asking_phone';
    return 'ordering';
  }

  private async maybeHandleDekont(input: BrainInput, lastMessage: string, sessionId: string): Promise<BrainOutput | null> {
    if (!/dekont|att[ıi]m|gönderdim|gönderdik|ödedim|havale\s*(yapt|gönder)|transfer\s*(yapt|gönder)/i.test(lastMessage)) {
      return null;
    }

    const order = await this.orderEngine.findAwaitingDekontOrder(input.tenantId, input.phone);
    if (!order) return null;

    const handled = await this.orderEngine.markDekontReceived(order.id, 'auto');
    if (!handled) return null;

    this.logger.log(`Dekont detected in conversation for order ${order.id} (${input.channel})`);
    return {
      reply: 'Dekontunuz alındı, esnafımız onaylayacak. En kısa sürede kargoya veriyoruz.',
      confidence: 90,
      orderCreated: false,
      sessionId,
      needsHuman: false,
      maintenanceMode: false,
      afterHours: false,
    };
  }

  private detectHumanRequest(reply: string): boolean {
    return /yetkili|patron|müdür|insan|aktar/i.test(reply);
  }

  private detectWhatsappRequest(reply: string): boolean {
    return /whatsapp|WhatsApp|belge|fotoğraf|resim|liste|katalog|fiyat listesi|göndereyim/i.test(reply);
  }

  // ---- Faz 1: Görüşme Özeti & Duygu Analizi ----

  async generateCallSummary(sessionId: string): Promise<CallSummary | null> {
    try {
      const { data: session } = await this.supabase.db
        .from('conversation_sessions')
        .select('tenant_id, phone, messages, created_at, ended_at, status, call_recording_url')
        .eq('id', sessionId)
        .single();

      if (!session || !session.messages) return null;

      const messages: { role: string; content: string }[] =
        typeof session.messages === 'string' ? JSON.parse(session.messages) : session.messages;
      if (!Array.isArray(messages) || messages.length === 0) return null;

      const startMs = new Date(session.created_at).getTime();
      const endMs = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const durationSeconds = Math.round((endMs - startMs) / 1000);

      const conversationText = messages
        .map((m) => `${m.role === 'user' ? 'Müşteri' : 'AI'}: ${m.content}`)
        .join('\n');

      const summaryPrompt = [
        'Aşağıdaki telefon görüşmesini analiz et ve JSON formatında özetle.',
        '',
        conversationText,
        '',
        'JSON ÇIKTI (sadece JSON, başka metin yok):',
        '{',
        '  "shortSummary": "1-2 cümlelik Türkçe özet",',
        '  "products": ["ürün1 - miktar", "ürün2 - miktar"],',
        '  "productCount": 2,',
        '  "paymentMethod": "IBAN|KAPIDA_NAKIT|KAPIDA_KART|BELIRSIZ",',
        '  "address": "teslimat adresi veya null",',
        '  "customerName": "müşteri adı veya null",',
        '  "sentiment": "HAPPY|NEUTRAL|UNHAPPY|ANGRY",',
        '  "sentimentScore": 85,',
        '  "aiErrors": ["hata1", "hata2"],',
        '  "needsHuman": false,',
        '  "success": true',
        '}',
      ].join('\n');

      const provider = this.aiFactory.getProvider(undefined);
      const result = await provider.complete({
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.2, maxTokens: 500,
      });

      let parsed: Record<string, unknown>;
      try {
        const cleaned = result.content.replace(/```json\s*|```\s*/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return null;
      }

      const summary: CallSummary = {
        success: !!parsed.success,
        productCount: Number(parsed.productCount) || 0,
        products: Array.isArray(parsed.products) ? parsed.products.map(String) : [],
        paymentMethod: String(parsed.paymentMethod || 'BELIRSIZ'),
        address: String(parsed.address || ''),
        customerName: String(parsed.customerName || ''),
        durationSeconds,
        sentiment: (['HAPPY', 'NEUTRAL', 'UNHAPPY', 'ANGRY'].includes(String(parsed.sentiment))
          ? String(parsed.sentiment) : 'NEUTRAL') as CallSummary['sentiment'],
        sentimentScore: Math.min(100, Math.max(0, Number(parsed.sentimentScore) || 50)),
        aiErrors: Array.isArray(parsed.aiErrors) ? parsed.aiErrors.map(String) : [],
        needsHuman: !!parsed.needsHuman,
        shortSummary: String(parsed.shortSummary || ''),
      };

      const { data: current } = await this.supabase.db
        .from('conversation_sessions').select('session_data').eq('id', sessionId).maybeSingle();
      const existing = typeof current?.session_data === 'string'
        ? JSON.parse(current.session_data) : (current?.session_data || {});

      await this.supabase.db
        .from('conversation_sessions')
        .update({
          session_data: JSON.stringify({
            ...existing,
            summary: summary.shortSummary,
            sentiment: summary.sentiment,
            sentiment_score: summary.sentimentScore,
            products: summary.products,
            payment_method: summary.paymentMethod,
            address: summary.address,
            customer_name: summary.customerName,
            ai_errors: summary.aiErrors,
            duration_seconds: summary.durationSeconds,
            needs_human: summary.needsHuman,
          }),
        })
        .eq('id', sessionId);

      this.logger.log(`Call summary generated for session ${sessionId}: ${summary.shortSummary}`);
      return summary;
    } catch (e) {
      this.logger.error(`Call summary failed for session ${sessionId}: ${(e as Error).message}`);
      return null;
    }
  }
}
