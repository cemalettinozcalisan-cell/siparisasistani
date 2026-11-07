import { Injectable, Logger } from '@nestjs/common';
import { AiOrderInput } from '@siparis/types';
import { AiProviderFactory } from '../providers/ai-provider.factory';
import { PromptEngineService, PromptContext } from '../prompt-engine/prompt-engine.service';
import { AiParserService } from '../conversation/parser/ai-parser';
import { OrderValidatorService } from '../conversation/validator/validator';
import { AiAuditService } from '../audit/ai-audit.service';
import { OrderEngineService } from '../../order-engine/order-engine.service';
import { ComplaintProcessorService } from '../../complaint-processor/complaint-processor.service';
import { SupabaseService } from '../../common/supabase.client';
import { ChannelHealthService } from '../../channel-health/channel-health.service';
import { normalizePayment, parseBirthday } from '../order-normalize';
import { generateSessionLabel, isResetCommand, isTestResetNoMemory } from '../../common/chat-session';

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
  resetHistory?: boolean;
  sessionClosed?: boolean;
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

    // "Yeni sipariş / sıfırla / baştan" komutu: yeni ve temiz bir oturum aç,
    // böylece her siparişin audit/transkripti ayrı olur (panel karışmaz).
    if (isResetCommand(lastMessage)) {
      const skipMemory = isTestResetNoMemory();
      const greetingName = skipMemory ? undefined : await this.getCustomerName(input.tenantId, input.phone);
      const newSessionId = await this.createSession(
        input.tenantId,
        input.channel,
        input.phone,
        input.channelSource,
      );
      if (skipMemory) {
        await this.supabase.db
          .from('conversation_sessions')
          .update({ session_data: { skipMemory: true } })
          .eq('id', newSessionId);
      }
      await this.endSession(sessionId, 'reset');
      // Aynı telefon/kanaldaki DİĞER aktif oturumları da kapat (eski hatırlatma kaynağı kalmasın).
      await this.supabase.db
        .from('conversation_sessions')
        .update({
          status: 'failed',
          end_reason: 'reset',
          ended_at: new Date().toISOString(),
        })
        .eq('tenant_id', input.tenantId)
        .eq('phone', input.phone)
        .eq('channel', input.channel)
        .eq('status', 'active')
        .neq('id', newSessionId);
      this.logger.log(`Session reset by command: ${sessionId} -> ${newSessionId} (skipMemory=${skipMemory})`);
      return {
        reply: greetingName
          ? `Merhaba ${greetingName}, yeni siparişinizi alabilirim. Ne almak istersiniz?`
          : 'Merhaba, yeni siparişinizi alabilirim. Ne almak istersiniz?',
        confidence: 100,
        orderCreated: false,
        sessionId: newSessionId,
        needsHuman: false,
        maintenanceMode: false,
        afterHours: false,
        resetHistory: true,
      };
    }

    // Idempotency: ayni oturumda siparis zaten olustuysa ikinci siparis acma.
    const existingOrderId = await this.getSessionOrderId(sessionId);
    const existingOrderNumber = existingOrderId ? await this.getOrderNumber(existingOrderId) : undefined;

    // Step 4.5: Dekont alındı tespiti — müşteri "ödedim / dekont attım" beyan ederse,
    // bekleyen IBAN siparişi varsa otomatik esnaf bildirimi tetiklenir (AI çağrısı yapılmaz).
    const dekontReply = await this.maybeHandleDekont(input, lastMessage, sessionId);
    if (dekontReply) return dekontReply;

    // Step 5: Prompt
    const tenantName = await this.getTenantName(input.tenantId);
    const skipMemory = await this.getSkipMemory(sessionId);
    const paymentState = existingOrderId
      ? await this.getOrderPaymentState(existingOrderId)
      : { pendingDekont: false, dekontReceived: false };
    const { pendingDekont, dekontReceived } = paymentState;

    const promptCtx: PromptContext = {
      tenantId: input.tenantId,
      tenantName,
      customerPhone: skipMemory ? undefined : input.phone,
      channel: input.channel,
      currentState: this.detectState(input.messages),
      skipMemory,
      pendingDekont,
      dekontReceived,
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();
    const fullPrompt = [systemPrompt, '', outputFormat].join('\n');

    // Step 6: AI Call (failover)
    const provider = this.aiFactory.getProvider(settings?.aiProvider || undefined);
    const effectiveProvider = settings?.aiProvider || 'deepseek';

    // JSON mode + duz metin asistan gecmisi DeepSeek'te bosluk dondurebiliyor.
    // Bu yuzden gecmisi audit'lerdeki YAPISAL parsed_json ile veriyoruz.
    const structuredHistory = await this.getStructuredHistory(sessionId);
    const aiMessages = structuredHistory.length > 0
      ? [
          { role: 'system' as const, content: fullPrompt },
          ...structuredHistory,
          { role: 'user' as const, content: lastMessage },
        ]
      : [
          { role: 'system' as const, content: fullPrompt },
          ...input.messages.map((m) => {
            const role = (m.role === 'customer' || m.role === 'user' ? 'user' : 'assistant') as
              | 'user'
              | 'assistant';
            const content = role === 'assistant' ? JSON.stringify({ reply: m.content }) : m.content;
            return { role, content };
          }),
        ];

    let response;
    let providerUsed = effectiveProvider;
    try {
      const result = await this.aiFactory.completeWithFailover({
        messages: aiMessages, temperature: 0.3,
        model: settings?.aiModel || undefined,
        jsonMode: true,
        maxTokens: 2048,
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

    // IBAN dekontu beklenirken doğum günü/numara söylenmesin (model prompt kuralını atlarsa).
    if (pendingDekont && parsed.reply) {
      parsed.reply = this.stripPendingDekontReply(parsed.reply);
    }
    // Dekont zaten alındıysa "dekontu iletin" tekrarını temizle.
    if (dekontReceived && parsed.reply) {
      parsed.reply = this.stripDekontReceivedReply(parsed.reply);
    }

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
    // Odeme telefon kanaliyla ayni sekilde normalize edilir (KAPIDA_KART, CASH_ON_DELIVERY, IBAN...).
    const normalizedPayment = normalizePayment(parsed.payment);
    // AI bazen optional alanlari `null` dondurur; validator `undefined` bekler. Temizle.
    const rawCustomer = (parsed.customer || {}) as Record<string, unknown>;
    const validatorCustomer = {
      name: String(rawCustomer.name || ''),
      phone: String(rawCustomer.phone || input.phone || ''),
      company_name: rawCustomer.company_name ? String(rawCustomer.company_name) : undefined,
      identity_number: rawCustomer.identity_number ? String(rawCustomer.identity_number) : undefined,
    };

    // Onay es anlamlilari: "evet / tamam / tamamdir / onayliyorum / kabul ediyorum / olur"
    // Bilgiler tamamsa onay sayilir (telefon kanalindaki davranisla ayni).
    const affirmation = /^\s*(evet|tamam|tamamdır|tamamdir|onaylıyorum|onayliyorum|kabul\s+ediyorum|olur|onayla)\b/i.test(
      lastMessage.trim(),
    );
    const hasOrderState = !!(normalizedPayment && parsed.products?.length && parsed.address && validatorCustomer.phone);
    if (affirmation && hasOrderState) parsed.confirmed = true;

    const validation = this.validator.validate({
      customer: validatorCustomer,
      products: parsed.products,
      payment: normalizedPayment || 'cash_on_delivery',
      confirmed: parsed.confirmed,
      confidence: parsed.confidence,
      channel: input.channel,
    });

    // Dogum gunu her turda (varsa) musteriye yazilir (telefon kanalindaki set_birthday ile ayni).
    if (parsed.customer?.birthday) {
      await this.persistBirthday(
        input.tenantId,
        parsed.customer?.phone || input.phone,
        parsed.customer.birthday,
      );
    }

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
    await this.updateSession(sessionId, input.messages, parsed.reply || response.content, effectiveProvider, parsed.confidence);

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

    const sessionClosed =
      parsed.conversationStage === 'GOODBYE' ||
      /(iyi günler|görüşmek üzere|hoşça kal|kendinize iyi bak)/i.test(parsed.reply || '');

    const routingFields = {
      intent: parsed.intent,
      complaintType: parsed.complaintType,
      complaintSeverity: parsed.complaintSeverity,
      escalationLevel: parsed.escalationLevel,
      escalationReason: parsed.escalationReason,
      recommendedAction: parsed.recommendedAction,
      sendWhatsapp: this.detectWhatsappRequest(parsed.reply || ''),
      whatsappMessage: parsed.reply || '',
      sessionClosed,
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
    if (existingOrderId) {
      // Sipariş sonrası not (ör. "kargocu beni arasın", "bugün kargolansın") kalıcı kaydedilsin.
      if (parsed.notes) {
        await this.supabase.db
          .from('orders')
          .update({ customer_note: parsed.notes })
          .eq('id', existingOrderId);
      } else if (
        /aciliyet|bugün kargo|bugun kargo|kargocu|zile basma|aransın|aransin|not\s*(al|düş|dus|ekle)/i.test(lastMessage)
      ) {
        // AI notu JSON'a koymadıysa ama müşteri açıkça not/aciliyet verdiyse kaydet.
        await this.supabase.db
          .from('orders')
          .update({ customer_note: lastMessage })
          .eq('id', existingOrderId);
      }

      // Sipariş sonrası değişiklik: onaylı ve geçerliyse mevcut siparişle farkı kontrol et.
      if (parsed.confirmed && normalizedPayment && validation.valid) {
        try {
          const orderInput = this.parser.toOrderInput(parsed, input.channel);
          orderInput.customer.phone = orderInput.customer.phone || input.phone;
          if (await this.orderDiffers(existingOrderId, orderInput)) {
            const updated = await this.orderEngine.updateOrder(existingOrderId, orderInput, input.tenantId);
            const total = Number(updated.total_price || 0).toLocaleString('tr-TR');
            return {
              reply: `${(parsed.reply || response.content).trim()} Güncel sipariş toplamı: ${total} TL.`,
              confidence: parsed.confidence || 0,
              orderCreated: false,
              orderId: existingOrderId,
              orderNumber: updated.order_number,
              sessionId,
              needsHuman: false,
              maintenanceMode: false,
              afterHours: false,
              duplicateWarning,
              providerUsed,
              ...routingFields,
              complaintCreated,
            };
          }
        } catch (e) {
          this.logger.error(`Order update failed: ${(e as Error).message}`);
        }
      }

      // Numara yalnızca özet mesajında söylenir; burada tekrar eklenmez.
      return {
        reply: parsed.reply || response.content,
        confidence: parsed.confidence || 0,
        orderCreated: false,
        orderId: existingOrderId,
        orderNumber: existingOrderNumber,
        sessionId,
        needsHuman: (parsed.confidence || 0) < 50,
        maintenanceMode: false,
        afterHours: false,
        duplicateWarning,
        providerUsed,
        ...routingFields,
        complaintCreated,
      };
    }

    if (parsed.confirmed && !normalizedPayment) {
      return {
        reply: 'Siparişinizi oluşturmak için ödeme yöntemini netleştirelim: Kapıda nakit mi, kapıda kredi kartı mı, yoksa havale/IBAN mı tercih edersiniz?',
        confidence: parsed.confidence || 0,
        orderCreated: false,
        sessionId,
        needsHuman: (parsed.confidence || 0) < 50,
        maintenanceMode: false,
        afterHours: false,
        duplicateWarning,
        providerUsed,
        ...routingFields,
        complaintCreated,
      };
    }

    if (parsed.confirmed && !validation.valid) {
      this.logger.warn(`Order validation failed: ${validation.errors.join(' | ')}`);
      return {
        reply: 'Siparişinizi oluşturmak için birkaç bilgiyi netleştirmem gerekiyor. Ad soyad, teslimat adresi ve telefon numaranızı teyit edebilir miyiz?',
        confidence: parsed.confidence || 0,
        orderCreated: false,
        sessionId,
        needsHuman: (parsed.confidence || 0) < 50,
        maintenanceMode: false,
        afterHours: false,
        duplicateWarning,
        providerUsed,
        ...routingFields,
        complaintCreated,
      };
    }

    if (validation.valid && parsed.confirmed) {
      try {
        const orderInput = this.parser.toOrderInput(parsed, input.channel);
        orderInput.customer.phone = orderInput.customer.phone || input.phone;
        const order = await this.orderEngine.process(orderInput, input.tenantId);

        await this.endSession(sessionId, 'completed');
        await this.updateSessionOrder(sessionId, order.order_id, order.order_number);

        const customerName = String(parsed.customer?.name || '').trim();
        let reply: string;
        if (normalizedPayment === 'iban') {
          // Havale: numara ve doğum günü dekont onayından SONRA söylenir.
          const iban = await this.getTenantIban(input.tenantId);
          reply = [
            `Siparişiniz alındı${customerName ? ', sayın ' + customerName : ''}.`,
            iban ? `Havale/IBAN: ${iban}.` : '',
            'Dekontu ilettiğinizde siparişinizi onaylayıp kargoya verelim.',
          ]
            .filter(Boolean)
            .join(' ');
        } else {
          // Kapıda: gerçek sipariş no'yu doğum günü sorusundan önce ekle.
          reply = this.attachOrderNumber(parsed.reply || response.content, order.order_number);
        }

        return {
          reply,
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
      // Kendi (şu an işlenen) oturumunu mükerrer sayma
      .neq('id', input.sessionId || '')
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
        session_label: generateSessionLabel(),
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

  private async getSessionOrderId(sessionId: string): Promise<string | undefined> {
    const { data } = await this.supabase.db
      .from('conversation_sessions')
      .select('order_id')
      .eq('id', sessionId)
      .maybeSingle();
    return (data?.order_id as string) || undefined;
  }

  private async getOrderNumber(orderId: string): Promise<string | undefined> {
    const { data } = await this.supabase.db
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .maybeSingle();
    return (data?.order_number as string) || undefined;
  }

  private async getCustomerName(tenantId: string, phone: string): Promise<string | undefined> {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return undefined;
    const { data } = await this.supabase.db
      .from('customers')
      .select('name')
      .eq('tenant_id', tenantId)
      .eq('phone', digits)
      .maybeSingle();
    return (data?.name as string) || undefined;
  }

  private async getSkipMemory(sessionId: string): Promise<boolean> {
    const { data } = await this.supabase.db
      .from('conversation_sessions')
      .select('session_data')
      .eq('id', sessionId)
      .maybeSingle();
    let sessionData = (data as { session_data?: unknown } | null)?.session_data;
    if (typeof sessionData === 'string') {
      try {
        sessionData = JSON.parse(sessionData);
      } catch {
        sessionData = null;
      }
    }
    return Boolean(sessionData && (sessionData as Record<string, unknown>).skipMemory);
  }

  private async getOrderPaymentState(
    orderId: string,
  ): Promise<{ pendingDekont: boolean; dekontReceived: boolean }> {
    const { data } = await this.supabase.db
      .from('orders')
      .select('payment_method, payment_status, status')
      .eq('id', orderId)
      .maybeSingle();
    const order = (data || {}) as Record<string, unknown>;
    const isIban = String(order.payment_method || '') === 'iban';
    const status = String(order.payment_status || '');
    const cancelled = String(order.status || '') === 'cancelled';
    return {
      pendingDekont: isIban && ['awaiting_dekont', 'waiting'].includes(status) && !cancelled,
      dekontReceived: isIban && ['dekont_alindi', 'paid'].includes(status),
    };
  }

  /**
   * AI'ya verilecek konusma gecmisi: audit'lerdeki yapisal parsed_json ile.
   * JSON mode'da duz metin asistan mesajlari bosluk urettigi icin assistant
   * mesajlari JSON string olarak gonderilir.
   */
  private async getStructuredHistory(
    sessionId: string,
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    const { data } = await this.supabase.db
      .from('ai_audit_logs')
      .select('user_message, parsed_json, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(8);

    const rows = (data || []) as { user_message?: string; parsed_json?: unknown }[];
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    for (const row of [...rows].reverse()) {
      const userMessage = String(row.user_message || '').trim();
      if (userMessage) messages.push({ role: 'user', content: userMessage });

      let parsed = row.parsed_json;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      const reply = parsed && typeof parsed === 'object'
        ? String((parsed as Record<string, unknown>).reply || '').trim()
        : '';
      if (reply) messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
    }
    return messages;
  }

  private async orderDiffers(existingOrderId: string, orderInput: AiOrderInput): Promise<boolean> {
    const [{ data: order }, { data: items }] = await Promise.all([
      this.supabase.db.from('orders').select('payment_method').eq('id', existingOrderId).maybeSingle(),
      this.supabase.db
        .from('order_items')
        .select('product_name, quantity, unit, total')
        .eq('order_id', existingOrderId),
    ]);

    type ItemRow = { product_name?: string; quantity?: number; unit?: string; total?: number };
    const normText = (value?: string) => String(value || '').trim().toLocaleLowerCase('tr-TR');
    const itemKey = (item: ItemRow) =>
      `${normText(item.product_name)}|${Number(item.quantity || 0)}|${normText(item.unit)}`;

    const currentItems = (items || []) as ItemRow[];
    // Hediye/0 TL satırlarını karşılaştırmadan çıkar (ör. kampanya kavurma).
    const giftNames = currentItems
      .filter((item) => Number(item.total || 0) === 0)
      .map((item) => normText(item.product_name))
      .filter(Boolean);
    const isGift = (name?: string) => {
      const n = normText(name);
      return giftNames.some((gift) => n === gift || n.includes(gift));
    };

    const currentKey = currentItems
      .filter((item) => Number(item.total || 0) > 0)
      .map(itemKey)
      .sort()
      .join(';');
    const nextKey = (orderInput.products || [])
      .filter((item) => !isGift((item as ItemRow).product_name))
      .map((item) => itemKey(item as ItemRow))
      .sort()
      .join(';');
    if (currentKey !== nextKey) return true;

    const normPayment = (value?: string) => {
      const v = String(value || '').toLowerCase();
      return v === 'cod' || v === 'kapida_nakit' ? 'cash_on_delivery' : v;
    };
    const currentPayment = normPayment((order as { payment_method?: string } | null)?.payment_method);
    if (currentPayment && currentPayment !== normPayment(orderInput.payment)) return true;

    return false;
  }

  private async persistBirthday(tenantId: string, phone: string, birthday?: string): Promise<void> {
    const iso = parseBirthday(birthday);
    const digits = String(phone || '').replace(/\D/g, '');
    if (!iso || !digits) return;
    try {
      await this.supabase.db
        .from('customers')
        .update({ birth_date: iso })
        .eq('tenant_id', tenantId)
        .eq('phone', digits);
    } catch {
      /* yoksay */
    }
  }

  /** Sipariş numarasını, doğum günü sorusundan ÖNCE yanıta yerleştirir. */
  private attachOrderNumber(reply: string, orderNumber: string): string {
    const label = /(sipari[sş]\s*numaran[ıi]z?\s*[:：]?\s*)(#?[A-Za-z0-9-]+)/i;
    if (label.test(reply)) return reply.replace(label, `$1${orderNumber}`);
    const created = /(sipari[sş]iniz\s+olu[sş]turuldu[^.!?]*[.!?]?)/i;
    if (created.test(reply)) {
      return reply.replace(created, (matched) => `${matched} Sipariş numaranız: ${orderNumber}.`);
    }
    return `${reply.trim()} Sipariş numaranız: ${orderNumber}.`;
  }

  private async getTenantIban(tenantId: string): Promise<string | undefined> {
    const { data } = await this.supabase.db
      .from('tenants')
      .select('iban')
      .eq('id', tenantId)
      .maybeSingle();
    return (data?.iban as string) || undefined;
  }

  /** IBAN dekontu beklenirken yanıttan doğum günü/numara ifadelerini çıkarır. */
  private stripPendingDekontReply(reply: string): string {
    let out = String(reply || '')
      .replace(/sipari[şs]iniz\s+olu[şs]turuldu/gi, 'siparişiniz alındı')
      .replace(/[^.!?\n]*do[ğg]um\s*(g[üu]n[üu]|tarih)[^.!?\n]*[.!?]?/gi, '')
      .replace(/[^.!?\n]*sipari[şs]\s*numaran[ıi]z?[^.!?\n]*[.!?]?/gi, '');
    out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return out || 'Dekontu ilettiğinizde siparişinizi onaylayıp kargoya vereceğiz.';
  }

  /** Dekont zaten alındıysa "dekontu iletin/onaylayın" cümlelerini temizler. */
  private stripDekontReceivedReply(reply: string): string {
    let out = String(reply || '')
      .replace(/[^.!?\n]*dekont[^.!?\n]*[.!?]?/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!out) out = 'Teşekkürler, bilgilerinizi kaydettim.';
    return out;
  }

  private async hasKnownBirthday(tenantId: string, phone: string): Promise<boolean> {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return false;
    const { data } = await this.supabase.db
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('phone', this.phoneVariants(digits))
      .not('birth_date', 'is', null)
      .limit(1);
    return !!(data && data.length > 0);
  }

  private phoneVariants(phone: string): string[] {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    const set = new Set<string>([digits]);
    if (digits.startsWith('90') && digits.length > 10) {
      set.add('0' + digits.slice(2));
      set.add(digits.slice(2));
    } else if (digits.startsWith('0') && digits.length >= 11) {
      set.add('9' + digits);
      set.add(digits.slice(1));
    } else if (digits.length === 10) {
      set.add('90' + digits);
      set.add('0' + digits);
    }
    return Array.from(set);
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

    // Görüşme özeti: her tamamlanan görüşmede üret (kanaldan bağımsız; zaten varsa atlar).
    if (endReason === 'completed') {
      this.generateCallSummary(sessionId).catch((err) => {
        this.logger.warn(`Call summary (endSession) failed: ${(err as Error).message}`);
      });
    }
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
    // Yalnızca TAMAMLANMIŞ eylem: "attım / gönderdim / ödedim / havale yaptım".
    // "dekontu atayım / atacağım / göndereceğim" gibi gelecek zaman EŞLEŞMEZ.
    const dekontDone =
      /(att[ıi]m|gönderdim|gönderdik|ilettim|yolladım|ulaşt[ıi]|ödedim|ödeme(yi)?\s*(yapt[ıi]m|gönderdim)|havale(yi)?\s*(yapt[ıi]m|gönderdim)|transfer(i)?\s*(yapt[ıi]m|gönderdim))/i;
    if (!dekontDone.test(lastMessage)) return null;

    // Önce BU oturumun siparişi (yanlış/eski siparişe bulaşmayı önler).
    const sessionOrderId = await this.getSessionOrderId(sessionId);
    let order: { id: string; order_number?: string; customer_name?: string } | null = null;

    if (sessionOrderId) {
      const handled = await this.orderEngine.markDekontReceived(sessionOrderId, 'auto');
      if (!handled) return null; // bu oturumun siparişi uygun değil → telefon yedeğine DÜŞME
      const { data } = await this.supabase.db
        .from('orders')
        .select('order_number, customer_name')
        .eq('id', sessionOrderId)
        .maybeSingle();
      order = {
        id: sessionOrderId,
        order_number: (data as Record<string, unknown> | null)?.order_number as string | undefined,
        customer_name: (data as Record<string, unknown> | null)?.customer_name as string | undefined,
      };
    } else {
      // Yeni oturum (dekont sonradan geldi): telefonla en son bekleyen (son 7 gün).
      order = await this.orderEngine.findAwaitingDekontOrder(input.tenantId, input.phone);
      if (!order) return null;
      const handled = await this.orderEngine.markDekontReceived(order.id, 'auto');
      if (!handled) return null;
    }

    this.logger.log(`Dekont detected in conversation for order ${order.id} (${input.channel})`);
    const name = String(order.customer_name || '').trim();
    const orderNumber = String(order.order_number || '').trim();
    const skipMemory = await this.getSkipMemory(sessionId);
    const knownBirthday = !skipMemory && (await this.hasKnownBirthday(input.tenantId, input.phone));
    const reply = [
      `Siparişiniz oluştu${name ? ', sayın ' + name : ''}.`,
      orderNumber ? `Sipariş numaranız: ${orderNumber}.` : '',
      knownBirthday
        ? ''
        : 'Bu arada doğum gününüzü öğrenebilir miyim? Özel gününüzde size sürpriz indirim yapmak isteriz.',
    ]
      .filter(Boolean)
      .join(' ');

    // Bu tur AI çağrısı yapmadan döndüğü için audit'e elle yazılır; böylece yapısal
    // geçmiş ve panel/replay "Siparişiniz oluştu + no" turunu görür.
    try {
      await this.supabase.db.from('ai_audit_logs').insert({
        tenant_id: input.tenantId,
        session_id: sessionId,
        model: 'system',
        provider: 'system',
        user_message: lastMessage,
        raw_response: JSON.stringify({ intent: 'ORDER', payment: 'IBAN', confirmed: true, reply }),
        parsed_json: { intent: 'ORDER', payment: 'IBAN', confirmed: true, reply },
        confidence: 90,
        latency_ms: 0,
        success: true,
      });
    } catch {
      /* yoksay */
    }

    return {
      reply,
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
        .select('tenant_id, phone, messages, session_data, created_at, ended_at, status, call_recording_url')
        .eq('id', sessionId)
        .single();

      if (!session || !session.messages) return null;

      // Zaten özet üretildiyse tekrar üretme (idempotent)
      const existingData = typeof session.session_data === 'string'
        ? JSON.parse(session.session_data) : (session.session_data || {});
      if (existingData && existingData.summary) return null;

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
