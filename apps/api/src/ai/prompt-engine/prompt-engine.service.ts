import { Injectable, Logger } from '@nestjs/common';
import { BusinessInfoComponent } from './components/business-info.component';
import { ProductCatalogComponent } from './components/product-catalog.component';
import { PaymentMethodsComponent } from './components/payment-methods.component';
import { ConversationRulesComponent } from './components/conversation-rules.component';
import { CustomerContextComponent } from './components/customer-context.component';
import { TaskDefinitionComponent } from './components/task-definition.component';
import { SalesCoachComponent } from './components/sales-coach.component';
import { CampaignsService } from '../../campaigns/campaigns.service';
import { AiMemoryService } from '../memory/ai-memory.service';

export interface PromptContext {
  tenantId: string;
  tenantName?: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
  customerBirthday?: string;
  channel: 'phone' | 'whatsapp';
  currentState: string;
  collectedData?: Record<string, unknown>;
}

@Injectable()
export class PromptEngineService {
  private readonly logger = new Logger(PromptEngineService.name);

  constructor(
    private readonly businessInfo: BusinessInfoComponent,
    private readonly productCatalog: ProductCatalogComponent,
    private readonly paymentMethods: PaymentMethodsComponent,
    private readonly rules: ConversationRulesComponent,
    private readonly customerCtx: CustomerContextComponent,
    private readonly taskDef: TaskDefinitionComponent,
    private readonly salesCoach: SalesCoachComponent,
    private readonly memory: AiMemoryService,
    private readonly campaigns: CampaignsService,
  ) {}

  async buildSystemPrompt(ctx: PromptContext): Promise<string> {
    const sections = await Promise.all([
      this.businessInfo.render(ctx),
      this.productCatalog.render(ctx),
      this.paymentMethods.render(ctx),
      this.campaigns.renderCampaignPrompt(ctx.tenantId),
      this.salesCoach.render(ctx),
      this.memory.buildContext(ctx.tenantId, ctx.customerPhone),
      this.rules.render(ctx),
      this.customerCtx.render(ctx),
      this.taskDef.render(ctx),
    ]);

    return sections.filter(Boolean).join('\n\n');
  }

  async buildUserPrompt(ctx: PromptContext, userMessage: string): Promise<string> {
    const sections = [
      `[KULLANICI MESAJI]`,
      userMessage,
      '',
      `[MEVCUT DURUM]`,
      `State: ${ctx.currentState}`,
      ctx.collectedData
        ? `Toplanan veri: ${JSON.stringify(ctx.collectedData, null, 2)}`
        : '',
    ];

    return sections.filter(Boolean).join('\n');
  }

  getOutputFormat(): string {
    return [
      'Yanıtını KESİNLİKLE aşağıdaki JSON formatında ver. Başka hiçbir şey yazma. BOŞLUK BIRAKMA, KISALTMA YAPMA.',
      'reply alanına yazacağın metin ŞU KURALLARA UYMAK ZORUNDA:',
      '- Madde işareti (•) kullan, her ürünü ayrı satırda göster',
      '- Toplam tutarı mutlaka söyle: "Güncel fiyatlara göre yaklaşık X TL"',
      '- "Başka eklemek istediğiniz bir ürün var mı?" diye sor',
      '- "Birlikte kontrol edelim mi?" veya "Doğru mudur?" KESİNLİKLE KULLANMA',
      '- "Siparişinizi not aldım" KULLANMA, bunun yerine "Not ettim" veya "Anladım" kullan',
      '- Şehir dışı ise "Siparişiniz kargo ile gönderilecek" ekle',
      '',
      'KARSILAMADA FIRMA ADI KULLAN: "Merhaba [isim] Bey/Hanim, [firma adi]\'na hos geldiniz."',
      '',
      'JSON FORMATI (ZORUNLU - asagidaki alanlarin TAMAMINI dondur):',
      '{',
      '  "intent": "ORDER|COMPLAINT|PRICE_INFO|PRODUCT_INFO|CALLBACK|HUMAN_TRANSFER",',
      '  "reply": "Merhaba Mehmet Bey, Ahmet Ipek Sucuklari\'na hos geldiniz. Hemen not ediyorum:\n• 2 kg Dana Parmak Sucuk\n• 1 kg Pastirma\n\n• Teslimat:\nAnkara / Etimesgut\n\nYaklasik toplam:\n2.980 TL\nKesin tutar tartimdan sonra netlesecektir.\nOdeme yonteminizi ogrenebilir miyim? IBAN havalesi veya kredi karti?\n(Bu asamada kampanya teklif etme. Kampanya sadece odeme bilgisi alindiktan sonra gelir.)",',
      '  "customer": { "name": "Mehmet Yilmaz", "phone": "05321234567", "birthday": "15-05|null", "company_name": "ABC Gida Ltd Sti|null", "identity_number": "1234567890|null" },',
      '  "products": [',
      '    { "product_name": "Dana Parmak Sucuk", "quantity": 2, "unit": "KG" }',
      '  ],',
      '  "address": "Ankara Etimesgut",',
      '  "payment": "UNKNOWN|IBAN|CASH|CARD|PAYTR",',
      '  "payment_status": "MISSING|KNOWN|CONFIRMED",',
      '  "conversation_stage": "GREETING|ORDERING|SUMMARIZING|ASKING_PHONE|ASKING_PAYMENT|CAMPAIGN|FINAL_CONFIRMATION|ORDER_CREATED|GOODBYE",',
      '  "customer_type": "NEW|RETURNING|VIP",',
      '  "conversation_confidence": 96,',
      '  "order_confidence": 82,',
      '  "need_payment": true|false,',
      '  "need_address": true|false,',
      '  "need_phone": true|false,',
      '  "campaign_offered": true|false,',
      '  "campaign_id": "CMP-12|null",',
      '  "total_price": 2980,',
      '  "confirmed": false,',
      '  "reasoning_summary": "customer identified, products matched, address complete, payment missing, campaign applicable",',
      '  "emotion": "HAPPY|NEUTRAL|HESITANT|ANGRY|VERY_ANGRY|SAD",',
      '  "emotion_confidence": 90,',
      '  "customer_sentiment": 0.0,',
      '  "priority": "NORMAL|URGENT|VERY_URGENT|MANAGER",',
      '  "complaint_type": "WRONG_PRODUCT|LATE_DELIVERY|POOR_QUALITY|MISSING_ITEM|BILLING|OTHER|null",',
      '  "complaint_confidence": 97,',
      '  "complaint_severity": "LOW|NORMAL|HIGH|CRITICAL",',
      '  "complaint_status": "OPEN|IN_PROGRESS|RESOLVED|CLOSED",',
      '  "ticket_id": "TK-20260720-00124",',
      '  "assigned_to": null,',
      '  "callback_required": true|false,',
      '  "sla_minutes": 30,',
      '  "escalation_level": 1,',
      '  "escalation_reason": "WRONG_PRODUCT|FOOD_SAFETY|REFUND|LEGAL|THREAT|REPEAT_COMPLAINT|MANAGER_REQUEST|null",',
      '  "can_resolve": false,',
      '  "complaint_count": 0,',
      '  "crm_action": "CREATE_TICKET|NOTIFY_MANAGER|CALL_CUSTOMER|OPEN_RETURN|SCHEDULE_CALLBACK|SEND_WHATSAPP|NONE",',
      '  "recommended_action": "CREATE_ORDER|ASK_PAYMENT|ASK_ADDRESS|TRANSFER_HUMAN|CREATE_COMPLAINT|RESOLVE|CLOSE|END",',
      '  "channel": "VOICE|WHATSAPP|WEB|PANEL",',
      '  "need_human": false,',
      '  "next_action": "continue|confirm|transfer|end"',
      '}',
    ].join('\n');
  }
}
