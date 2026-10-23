import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import {
  AgentSessionEventTypes,
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  llm,
  voice,
} from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { Behavior } from '@google/genai';
import { TelephonyBackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const AGENT_SECRET = process.env.AGENT_API_SECRET || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
const REALTIME_MODEL = process.env.ORDER_AI_REALTIME_MODEL || 'gemini-3.8-live';
const VOICE = process.env.ORDER_AI_VOICE || 'Aoede';
const DEFAULT_DID = process.env.ORDER_AI_DID || '902722010640';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

/** "902722010640:<tenant>" veya "2722010640:<tenant>,..." formatını parse eder. */
function parseDidMap(raw?: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of String(raw || '').split(',')) {
    const [did, tenant] = pair.split(':').map((s) => s.trim());
    if (did && tenant) map[did.replace(/\D/g, '')] = tenant;
  }
  return map;
}
const DID_TENANT_MAP = parseDidMap(process.env.DID_TENANT_MAP);

/** Aranan numarayı (DID) tenantId'ye çevirir. Varyantları (90/0 önekleri) dener. */
function resolveTenantId(did: string): string {
  const digits = String(did || '').replace(/\D/g, '');
  const candidates = new Set<string>([
    digits,
    digits.replace(/^90/, ''),
    digits.replace(/^0/, ''),
    '90' + digits.replace(/^0/, ''),
  ]);
  for (const c of candidates) if (c && DID_TENANT_MAP[c]) return DID_TENANT_MAP[c];
  return DEFAULT_TENANT;
}

/** SIP katılımcısından arayan numara + aranan numara (DID) bilgisini okur. */
function getSipInfo(ctx: JobContext): { caller?: string; did?: string } {
  const out: { caller?: string; did?: string } = {};
  try {
    for (const p of ctx.room.remoteParticipants.values()) {
      const attrs = ((p as any).attributes || {}) as Record<string, string>;
      out.caller = attrs['sip.phoneNumber'] || attrs['lk.pii.sip.phoneNumber'] || out.caller;
      out.did = attrs['sip.trunkPhoneNumber'] || attrs['sip.ruleID'] || out.did;
      if (out.caller) break;
    }
  } catch {
    /* yoksay */
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tool Gateway (NestJS order-ai)
// ---------------------------------------------------------------------------
async function fetchSystemPrompt(tenantId: string, phone?: string): Promise<string> {
  const url = `${API_BASE}/api/order-ai/agent/prompt?tenantId=${encodeURIComponent(tenantId)}&phone=${encodeURIComponent(phone || '')}`;
  const res = await fetch(url, { headers: { 'x-agent-secret': AGENT_SECRET } });
  const json = (await res.json().catch(() => ({}))) as { systemInstruction?: string; message?: string };
  if (!res.ok) throw new Error(`prompt alınamadı (${res.status}): ${json.message || ''}`);
  return String(json.systemInstruction || '');
}

async function runOrderTool(
  tenantId: string,
  sessionId: string,
  action: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/order-ai/agent/tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SECRET },
    body: JSON.stringify({ tenantId, sessionId, action, args }),
  });
  return res.json().catch(() => ({ ok: false, error: 'gecersiz yanit' }));
}

/** Toparlanma (watchdog) için güncel sipariş taslağını API'den çeker. */
async function fetchDraft(tenantId: string, sessionId: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${API_BASE}/api/order-ai/agent/draft?tenantId=${encodeURIComponent(tenantId)}&sessionId=${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, { headers: { 'x-agent-secret': AGENT_SECRET } });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as { draft?: Record<string, unknown> };
    return json.draft || null;
  } catch {
    return null;
  }
}

/** Taslağı modele verilecek kısa bir özete çevirir. */
function summarizeDraft(draft: Record<string, unknown> | null): string {
  if (!draft) return '(taslak okunamadı)';
  const c = (draft.customer || {}) as Record<string, unknown>;
  const products = Array.isArray(draft.products) ? (draft.products as Array<Record<string, unknown>>) : [];
  const parts: string[] = [];
  if (c.name) parts.push(`müşteri: ${c.name}`);
  if (c.phone) parts.push(`telefon: ${c.phone}`);
  if (products.length) parts.push('ürünler: ' + products.map((p) => `${p.quantity} ${p.unit} ${p.product_name}`).join(', '));
  if (c.address || c.city) parts.push(`adres: ${[c.address, c.city].filter(Boolean).join(', ')}`);
  if (draft.payment) parts.push(`ödeme: ${draft.payment}`);
  if (draft.confirmed) parts.push('DURUM: sipariş onaylandı');
  return parts.length ? parts.join(' | ') : '(henüz bilgi yok)';
}

// ---------------------------------------------------------------------------
// Sipariş araçları (tek turda tek araç; her turda yanıt garantili)
// ---------------------------------------------------------------------------
const TOOL_RULE =
  '\n\n[ARAÇ KURALI] Her turda YALNIZCA BİR araç çağır. Araç çağırmadan hemen önce kısa bir dolgu söyle ' +
  '(ör. "hemen not alıyorum efendim"). Aynı turda birden fazla araç çağırma. ' +
  'Araç çağrısından SONRA yalnızca BİR kısa onay söyle ve sıradaki adıma geç; ' +
  'aynı soruyu/bilgiyi TEKRAR SORMA veya TEKRAR ETME.';

function buildOrderTools(tenantId: string, sessionId: string, onToolCall?: () => void) {
  const call = async (action: string, args: Record<string, unknown>): Promise<string> => {
    try {
      onToolCall?.();
      const out = await runOrderTool(tenantId, sessionId, action, args || {});
      console.log(`[livekit-agent] tool ${action} -> ${JSON.stringify(out).slice(0, 220)}`);
      return JSON.stringify(out);
    } catch (e) {
      const msg = (e as Error).message || 'arac hatasi';
      console.error(`[livekit-agent] tool ${action} HATA: ${msg}`);
      return JSON.stringify({ ok: false, error: msg });
    }
  };

  return [
    llm.tool({
      name: 'set_customer',
      description:
        'Müşterinin ad-soyadını ve/veya telefonunu kaydeder. Ad+soyad öğrenilir öğrenilmez çağır. ' +
        'Tek turda yalnızca bu aracı çağır.',
      parameters: z.object({
        name: z.string().optional().describe('Müşterinin adı ve soyadı'),
        phone: z.string().optional().describe('Telefon numarası'),
      }),
      execute: async (args) => call('set_customer', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'add_item',
      description:
        'Siparişe ürün ekler. Müşteri ürün adı ve miktarı söyleyince çağır. ' +
        'product_name katalogdaki TAM ürün adı olmalı. unit: kg|adet|sap|koli|tepsi. Tek turda yalnızca bu aracı çağır.',
      parameters: z.object({
        product_name: z.string().describe('Katalogdaki tam ürün adı'),
        quantity: z.number().describe('Miktar (sayı)'),
        unit: z.string().optional().describe('kg|adet|sap|koli|tepsi'),
      }),
      execute: async (args) => call('add_item', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'set_address',
      description: 'Teslimat adresini (il/ilçe/mahalle/sokak/kapı no) ve ili kaydeder. Tam adres öğrenilince çağır.',
      parameters: z.object({
        address: z.string().describe('Tam açık adres'),
        city: z.string().optional().describe('İl'),
      }),
      execute: async (args) => call('set_address', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'set_payment',
      description:
        'Ödeme yöntemini kaydeder. payment değerlerinden biri: iban | website | paytr | iyzico | cash_on_delivery | kapida_kart.',
      parameters: z.object({
        payment: z.string().describe('iban|website|paytr|iyzico|cash_on_delivery|kapida_kart'),
      }),
      execute: async (args) => call('set_payment', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'set_invoice',
      description: 'Fatura bilgisini (firma adı / vergi no) kaydeder. Fatura modülü pasif; gereksizse çağırma.',
      parameters: z.object({
        company_name: z.string().optional().describe('Firma adı'),
        tax_number: z.string().optional().describe('Vergi no / VKN'),
      }),
      execute: async (args) => call('set_invoice', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'set_birthday',
      description:
        'Müşterinin doğum gününü (gün, ay VE yıl) kaydeder. Müşteri doğum gününü söyleyip tarihi doğal biçimde teyit ettikten SONRA çağır.',
      parameters: z.object({
        day: z.number().describe('Gün (1-31)'),
        month: z.number().describe('Ay (1-12)'),
        year: z.number().describe('Yıl (ör. 1987)'),
      }),
      execute: async (args) => call('set_birthday', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'confirm_order',
      description:
        'Müşteri siparişi AÇIKÇA onaylayınca siparişi oluşturur. Ad+soyad, tam adres ve ödeme bilinmeden ÇAĞIRMA. Parametre almaz.',
      execute: async () => call('confirm_order', {}),
    }),
    llm.tool({
      name: 'update_order',
      description:
        'Sipariş OLUŞTURULDUKTAN sonra müşteri ürün/miktar/ödeme değiştirirse, bu değişikliği mevcut siparişe kaydeder (günceller). Sipariş henüz oluşmadıysa ÇAĞIRMA (onun için confirm_order). Önce ilgili değişikliği add_item/set_payment ile taslağa işle, sonra update_order çağır. Parametre almaz.',
      execute: async () => call('update_order', {}),
    }),
    llm.tool({
      name: 'get_order_status',
      description: 'Müşteri mevcut bir siparişinin durumunu/kargo bilgisini sorarsa çağır. Sipariş numarası verirse order_number; yoksa arayan telefon kullanılır.',
      parameters: z.object({ order_number: z.string().optional().describe('Sipariş numarası (ör. 26-00138)') }),
      execute: async (args) => call('get_order_status', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'send_tracking',
      description: 'Sipariş kargoda ise takip kodunu ve kargo firmasını müşteriye WhatsApp (olmazsa SMS) ile gönderir. Müşteri "takip kodu gelmedi" derse çağır.',
      parameters: z.object({ order_number: z.string().optional().describe('Sipariş numarası') }),
      execute: async (args) => call('send_tracking', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'get_customer_address',
      description: 'Arayan müşterinin sistemde kayıtlı teslimat adresini getirir. Müşteri "kayıtlı adresime gönderin" derse çağır.',
      execute: async () => call('get_customer_address', {}),
    }),
    llm.tool({
      name: 'update_customer',
      description: 'Müşterinin kayıtlı adresini/şehrini/telefonunu günceller ve esnafa bildirir. Müşteri adresinin/numarasının değiştiğini söyleyip teyit ederse çağır.',
      parameters: z.object({
        address: z.string().optional().describe('Yeni adres'),
        city: z.string().optional().describe('Yeni şehir/il'),
        phone: z.string().optional().describe('Yeni telefon numarası'),
      }),
      execute: async (args) => call('update_customer', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'cancel_order',
      description: 'Müşterinin siparişini iptal eder ve esnafa bildirir. Sipariş no/telefon ile bulunup AÇIK onay alındıktan sonra çağır.',
      parameters: z.object({
        order_number: z.string().optional().describe('Sipariş numarası'),
        reason: z.string().optional().describe('İptal sebebi (varsa)'),
      }),
      execute: async (args) => call('cancel_order', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'report_issue',
      description: 'Müşterinin talep/şikayetini kaydeder ve esnafa bildirir (panel+WhatsApp grup+yazıcı+sesli). Müşteri sorun/şikayet/talep belirtirse çağır.',
      parameters: z.object({
        type: z.string().optional().describe('Tür (ör. kargo, ürün, ödeme, diğer)'),
        description: z.string().describe('Müşterinin talep/şikayet metni'),
        severity: z.string().optional().describe('NORMAL|HIGH|CRITICAL'),
      }),
      execute: async (args) => call('report_issue', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'set_note',
      description: 'Müşterinin sipariş notunu kaydeder (ör. "kargocu zile basmasın", "2 gün sonra kargola"). Müşteri siparişle ilgili not bırakmak isterse çağır.',
      parameters: z.object({ note: z.string().describe('Not metni') }),
      execute: async (args) => call('set_note', args as Record<string, unknown>),
    }),
    llm.tool({
      name: 'send_payment_info',
      description: 'Müşteri IBAN/havale bilgisi isterse havale ve sipariş bilgilerini WhatsApp üzerinden gönderir. Parametre almaz.',
      execute: async () => call('send_payment_info', {}),
    }),
    llm.tool({
      name: 'escalate',
      description: 'Görüşmeyi bir insana devreder. Parametre almaz.',
      execute: async () => call('escalate', {}),
    }),
    llm.tool({
      name: 'sleep',
      description: 'Müşteri "kapat/teşekkürler" derse görüşmeyi beklemeye alır. Parametre almaz.',
      execute: async () => call('sleep', {}),
    }),
  ];
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const { caller, did } = getSipInfo(ctx);
    const tenantId = resolveTenantId(did || DEFAULT_DID);
    const sessionId = ctx.room.name || `lk-${Date.now()}`;

    console.log(`[livekit-agent] oturum room=${sessionId} caller=${caller || '?'} did=${did || DEFAULT_DID} tenant=${tenantId}`);

    // Arayan numarayı taslağa tohumla: prompt "telefonu sorma" diyor, ama confirm_order geçerli telefon ister.
    if (caller) {
      try {
        const seeded = await runOrderTool(tenantId, sessionId, 'set_customer', { phone: caller });
        console.log(`[livekit-agent] telefon tohumlandi: ${JSON.stringify(seeded).slice(0, 160)}`);
      } catch (e) {
        console.error(`[livekit-agent] telefon tohumlama hatasi: ${(e as Error).message}`);
      }
    }

    let systemInstruction = '';
    try {
      systemInstruction = await fetchSystemPrompt(tenantId, caller);
    } catch (e) {
      console.error(`[livekit-agent] prompt alınamadı: ${(e as Error).message}`);
      systemInstruction = 'Sen sıcak, kibar bir Türkçe sipariş asistanısın. Müşteriden sipariş al.';
    }
    systemInstruction += TOOL_RULE;

    let lastToolAt = 0;

    const agent = new voice.Agent({
      instructions: systemInstruction,
      tools: buildOrderTools(tenantId, sessionId, () => {
        lastToolAt = Date.now();
      }),
    });

    const model = new google.realtime.RealtimeModel({
      apiKey: GOOGLE_API_KEY,
      model: REALTIME_MODEL,
      voice: VOICE,
      temperature: 0.7,
      instructions: systemInstruction,
      // A1: temiz taban — düşünme AÇIK (araç çağrısı kararları için gerekli olabilir).
      thinkingConfig: { thinkingBudget: 128 },
      // B4: Araç çağrısını modelin bloklayan üretiminden AYIR (NON_BLOCKING). Böylece barge-in/kesinti
      // olsa bile araç yanıtı kaybolmaz (sektörün "araçları audiodan ayır" prensibi).
      toolBehavior: Behavior.NON_BLOCKING,
      // A2: Deney amaçlı konan `realtimeInputConfig` (startOfSpeechSensitivity=LOW + activityHandling=NO_INTERRUPTION)
      // KALDIRILDI — bunlar kullanıcının sesini kaçırıyordu. Turn detection artık varsayılan (server-side).
    });

    const session = new voice.AgentSession({
      llm: model,
      turnHandling: {
        preemptiveGeneration: { enabled: true },
        // Barge-in açık (kullanıcı araya girince ajan susar). Kısa/yanlış tetiklemeyi azaltmak için eşik.
        interruption: { enabled: true, minDuration: 600, minWords: 1 },
      },
    });

    // Watchdog: araç turu kesilirse (fonksiyon yanıtı modele gitmezse) oturum sessiz kalıyordu.
    // Bu durumda güncel sipariş taslağını API'den çekip modele vererek KALDIĞI YERDEN devam ettiriyoruz.
    // (Araç yan etkileri sunucu taslağında olduğu ve add_item idempotent olduğu için güvenli.)
    let agentBusy = false;
    let userSpeaking = false;
    session.on(AgentSessionEventTypes.AgentStateChanged, (ev) => {
      agentBusy = ev.newState === 'speaking' || ev.newState === 'thinking';
      if (ev.newState === 'speaking') lastToolAt = 0;
    });
    session.on(AgentSessionEventTypes.UserStateChanged, (ev) => {
      userSpeaking = ev.newState === 'speaking';
    });

    const recoverFromToolGap = async (): Promise<void> => {
      try {
        const draft = await fetchDraft(tenantId, sessionId);
        const summary = summarizeDraft(draft);
        console.log(`[livekit-agent] watchdog: toparlama -> ${summary}`);
        session.generateReply({
          instructions:
            'Bir sipariş turunda kısa bir kesinti oldu. Aşağıdaki GÜNCEL sipariş taslağına göre KALDIĞIN YERDEN devam et; ' +
            'zaten alınmış bilgileri TEKRAR SORMA. Sıradaki eksik adımı kısa, sıcak bir soruyla sor. ' +
            `Taslak: ${summary}`,
        });
      } catch (e) {
        console.error(`[livekit-agent] watchdog toparlama hatasi: ${(e as Error).message}`);
      }
    };

    const watchdog = setInterval(() => {
      if (lastToolAt && !agentBusy && !userSpeaking && Date.now() - lastToolAt > 2000) {
        lastToolAt = 0;
        void recoverFromToolGap();
      }
    }, 700);
    session.on(AgentSessionEventTypes.Close, () => clearInterval(watchdog));

    // A denemesi: agent-side BVC'yi İZOLE etmek için KAPATIYORUZ (ses algılama sorununun
    // BVC kaynaklı olup olmadığını görmek için). Gürültü temizliği SIP trunk'ta krisp ile sağlanır.
    // İleride gerekirse: inputOptions: { noiseCancellation: TelephonyBackgroundVoiceCancellation() }
    void TelephonyBackgroundVoiceCancellation;
    await session.start({
      agent,
      room: ctx.room,
    });

    await session.generateReply({
      instructions:
        'Telefonu açarken sistem talimatındaki [KARŞILAMA — İLK AÇILIŞ] metnini doğal ve akıcı biçimde, kelimeleri birebir söyle. ' +
        'Sakin ve samimi ol, abartıya kaçma. Karşılamadan SONRA ek soru sorma; sus ve müşteriyi dinle. ' +
        'ÖNEMLİ: Bu karşılamayı YALNIZCA BİR KEZ yap. Müşteri bir şey söylediğinde ASLA tekrar "merhaba", "hoş geldiniz" deme; doğrudan konuya gir.',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    numIdleProcesses: 1,
    // Windows'ta job-process init 10 sn'yi aşabiliyor → "runner initialization timed out" hatasını önle.
    initializeProcessTimeout: 30000,
  }),
);
