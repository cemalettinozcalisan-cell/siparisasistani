import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, basename } from 'node:path';
import { AudioFrame } from '@livekit/rtc-node';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import {
  AgentSessionEventTypes,
  AudioByteStream,
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  llm,
  stt,
  voice,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import * as fishaudio from '@livekit/agents-plugin-fishaudio';
import * as silero from '@livekit/agents-plugin-silero';
import { TelephonyBackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const AGENT_SECRET = process.env.AGENT_API_SECRET || '';
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const FISH_API_KEY = process.env.FISH_API_KEY || '';
const FISH_VOICE_ID = process.env.FISH_VOICE_ID || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || '';
const CARTESIA_VOICE_ID = process.env.CARTESIA_VOICE_ID || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc';

// Telaffuz sözlüğü: TTS'in bozuk okuduğu kelimeleri düzeltir (TTS'e giden metne uygulanır).
// Türkçe "C" (/dʒ/) TTS tarafından "K" okunuyor → isimlerde baştaki C'yi J ile deniyoruz.
const NAMES_C = [
  'Cavit', 'Cahit', 'Cavide', 'Cemal', 'Can', 'Canan', 'Cemre', 'Cansu', 'Cem', 'Cenk',
  'Cengiz', 'Cihan', 'Ceyhun', 'Ceyhan', 'Celal', 'Celil', 'Cemil', 'Cevat', 'Cevdet',
  'Cafer', 'Cabir', 'Cüneyt', 'Cüneyd', 'Cihanşah', 'Cihangir', 'Civan', 'Cömert',
  'Coşkun', 'Cengizhan', 'Canalp', 'Caner', 'Canberk', 'Cankut', 'Cantuğ', 'Cankaya',
  'Cevahir', 'Cezmi',
];
const PRONUNCIATION_FIXES: Array<[RegExp, string]> = [
  [/\bhavale\b/gi, 'havâle'],
  ...NAMES_C.map(
    (n) => [new RegExp(`\\b${n}\\b`, 'gi'), n.replace(/^C/i, 'J')] as [RegExp, string],
  ),
];
function fixPronunciationText(text: string): string {
  let out = text;
  for (const [re, rep] of PRONUNCIATION_FIXES) out = out.replace(re, rep);
  return out;
}
// SDK TextTransform imzası: stream gir -> stream çıkar.
function fixPronunciation(input: ReadableStream<string>): ReadableStream<string> {
  const reader = input.getReader();
  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      controller.enqueue(fixPronunciationText(value));
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}

// STT / LLM / TTS modelleri (env ile değiştirilebilir; fallback zinciri için)
const STT_PROVIDER = (process.env.PIPELINE_STT || 'groq').toLowerCase(); // groq | openai | deepgram
const LLM_PROVIDER = (process.env.PIPELINE_LLM || 'deepseek').toLowerCase(); // gemini | deepseek
const LLM_MODEL = process.env.PIPELINE_LLM_MODEL || 'deepseek-chat';
const TTS_PROVIDER = (process.env.PIPELINE_TTS || 'elevenlabs').toLowerCase(); // elevenlabs | openai
const TTS_MODEL = process.env.PIPELINE_TTS_MODEL || '';

const DEFAULT_DID = process.env.ORDER_AI_DID || '902722010640';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

function parseDidMap(raw?: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of String(raw || '').split(',')) {
    const [did, tenant] = pair.split(':').map((s) => s.trim());
    if (did && tenant) map[did.replace(/\D/g, '')] = tenant;
  }
  return map;
}
const DID_TENANT_MAP = parseDidMap(process.env.DID_TENANT_MAP);

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

async function getSipInfo(ctx: JobContext): Promise<{ caller?: string; did?: string }> {
  const out: { caller?: string; did?: string } = {};
  const parse = () => {
    try {
      for (const p of ctx.room.remoteParticipants.values()) {
        const attrs = ((p as any).attributes || {}) as Record<string, string>;
        const id = String((p as any).identity || '');
        // Katılımcı kimliği fallback: "sip_05414266660" → "05414266660"
        const idMatch = id.match(/^sip[_-]?\+?(\d{6,})/i);
        out.caller =
          attrs['sip.phoneNumber'] || attrs['lk.pii.sip.phoneNumber'] || (idMatch ? idMatch[1] : undefined) || out.caller;
        out.did = attrs['sip.trunkPhoneNumber'] || attrs['sip.ruleID'] || out.did;
        if (out.caller) break;
      }
    } catch {
      /* yoksay */
    }
  };
  // SIP katılımcısı/attribute'ları gelene kadar kısa süre bekle (yarış durumu).
  for (let i = 0; i < 15; i++) {
    parse();
    if (out.caller) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tool Gateway (NestJS order-ai) — S2S agent ile aynı
// ---------------------------------------------------------------------------
async function fetchSystemPrompt(
  tenantId: string,
  phone?: string,
): Promise<{
  systemInstruction: string;
  ivr: { menu: string; kvkk: string; noinput: string } | null;
  greeting: string | null;
}> {
  const url = `${API_BASE}/api/order-ai/agent/prompt?tenantId=${encodeURIComponent(tenantId)}&phone=${encodeURIComponent(phone || '')}`;
  const res = await fetch(url, { headers: { 'x-agent-secret': AGENT_SECRET } });
  const json = (await res.json().catch(() => ({}))) as {
    systemInstruction?: string;
    ivr?: { menu: string; kvkk: string; noinput: string } | null;
    greeting?: string | null;
    message?: string;
  };
  if (!res.ok) throw new Error(`prompt alınamadı (${res.status}): ${json.message || ''}`);
  return {
    systemInstruction: String(json.systemInstruction || ''),
    ivr: json.ivr || null,
    greeting: json.greeting ? String(json.greeting) : null,
  };
}

async function runOrderTool(
  tenantId: string,
  sessionId: string,
  action: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/order-ai/agent/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SECRET },
      body: JSON.stringify({ tenantId, sessionId, action, args }),
    });
  } catch {
    return { ok: false, error: 'Kısa bir teknik kesinti oldu; lütfen AYNI işlemi BİR kez daha dene.' };
  }
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (res.status === 429) {
    return { ok: false, error: 'Kısa bir yoğunluk oldu; lütfen az sonra AYNI işlemi BİR kez daha dene. Kullanıcıya teknik hata söyleme.' };
  }
  if (!res.ok && (!json || json.ok !== true)) {
    return { ok: false, error: 'İşlem şu an tamamlanamadı; kısa bir kesinti oldu, lütfen AYNI işlemi BİR kez daha dene.' };
  }
  return json ?? { ok: false, error: 'gecersiz yanit' };
}

async function reportSessionEnd(tenantId: string, sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/order-ai/agent/session-end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SECRET },
      body: JSON.stringify({ tenantId, sessionId }),
    });
  } catch { /* yoksay */ }
}

// Görüşmenin gerçek transkripti (job başına; worker job izolasyonu ile ayrık).
let agentTranscript: Array<{ role: 'user' | 'assistant'; text: string; at: number }> = [];

// Aynı rol + aynı metin çok kısa sürede tekrar gelirse (TTS/ASR çift olayı) bir kez yaz.
function pushTranscript(role: 'user' | 'assistant', text: string): void {
  const t = String(text || '').trim();
  if (!t) return;
  const now = Date.now();
  const last = agentTranscript[agentTranscript.length - 1];
  if (last && last.role === role && last.text === t && now - (last.at || 0) <= 2500) return;
  agentTranscript.push({ role, text: t, at: now });
}

async function reportTranscript(tenantId: string, sessionId: string): Promise<void> {
  try {
    if (!agentTranscript.length) return;
    await fetch(`${API_BASE}/api/order-ai/agent/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SECRET },
      body: JSON.stringify({ tenantId, sessionId, messages: agentTranscript }),
    });
  } catch { /* yoksay */ } finally {
    agentTranscript = [];
  }
}

// Görüşme ses kaydını kalıcı dizine kopyalar + API'ye bildirir (esnaf panelden dinler).
async function saveRecording(tenantId: string, sessionId: string, caller: string, sessionDir: string): Promise<void> {
  try {
    const src = join(sessionDir, 'audio.ogg');
    if (!existsSync(src)) return;
    const dir = 'C:\\SiparisAsistani\\apps\\api\\backups\\recordings';
    mkdirSync(dir, { recursive: true });
    const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dest = join(dir, `${safe}.ogg`);
    copyFileSync(src, dest);
    await fetch(`${API_BASE}/api/order-ai/agent/recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SECRET },
      body: JSON.stringify({ tenantId, sessionId, phone: caller, file: basename(dest) }),
    });
  } catch { /* yoksay */ }
}

async function fetchDraft(tenantId: string, sessionId: string): Promise<Record<string, unknown> | null> {  try {
    const url = `${API_BASE}/api/order-ai/agent/draft?tenantId=${encodeURIComponent(tenantId)}&sessionId=${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, { headers: { 'x-agent-secret': AGENT_SECRET } });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as { draft?: Record<string, unknown> };
    return json.draft || null;
  } catch {
    return null;
  }
}

function summarizeDraft(draft: Record<string, unknown> | null): string {
  if (!draft) return '(taslak okunamadı)';
  const c = (draft.customer || {}) as Record<string, unknown>;
  const products = Array.isArray(draft.products) ? (draft.products as Array<Record<string, unknown>>) : [];
  const parts: string[] = [];
  if (c.name) parts.push(`müşteri: ${c.name}`);
  if (c.phone) parts.push(`telefon: ${c.phone}`);
  if (products.length) parts.push('ürünler: ' + products.map((p) => `${p.quantity} ${p.unit} ${p.product_name}`).join(', '));
  if (c.address || c.city || c.district) parts.push(`adres: ${[c.address, c.district, c.city].filter(Boolean).join(', ')}`);
  if (draft.payment) parts.push(`ödeme: ${draft.payment}`);
  if (draft.confirmed) parts.push('DURUM: sipariş onaylandı');
  return parts.length ? parts.join(' | ') : '(henüz bilgi yok)';
}

/** Ham PCM (s16le) dosyasını AudioFrame akışına çevirir (fishaudio ile aynı: AudioByteStream). */
function pcmFramesFromFile(filePath: string, sampleRate = 24000, chunkMs = 20): ReadableStream<AudioFrame> {
  const buf = readFileSync(filePath);
  const usable = Math.floor(buf.byteLength / 2) * 2;
  const bytes = buf.subarray(0, usable);
  const spf = Math.max(1, Math.round((sampleRate * chunkMs) / 1000));
  const abs = new AudioByteStream(sampleRate, 1, spf);
  const frames: AudioFrame[] = [];
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    frames.push(...abs.write(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  frames.push(...abs.flush());
  let idx = 0;
  return new ReadableStream<AudioFrame>({
    pull(controller) {
      if (idx >= frames.length) { controller.close(); return; }
      controller.enqueue(frames[idx++]);
    },
  });
}

const TOOL_RULE =
  '\n\n[ARAÇ KURALI] Her turda YALNIZCA BİR araç çağır. Araç çağırmadan hemen önce kısa bir dolgu söyle ' +
  '(ör. "hemen not alıyorum efendim"). Aynı turda birden fazla araç çağırma. ' +
  'Araç çağrısından SONRA yalnızca BİR kısa onay söyle ve sıradaki adıma geç; ' +
  'aynı soruyu/bilgiyi TEKRAR SORMA veya TEKRAR ETME.';

function buildOrderTools(tenantId: string, sessionId: string, onToolCall?: (action: string, result: unknown) => void) {
  const call = async (action: string, args: Record<string, unknown>): Promise<string> => {
    try {
      onToolCall?.(action, null);
      const out = await runOrderTool(tenantId, sessionId, action, args || {});
      console.log(`[pipeline-agent] tool ${action} -> ${JSON.stringify(out).slice(0, 220)}`);
      onToolCall?.(action, out);
      return JSON.stringify(out);
    } catch (e) {
      const msg = (e as Error).message || 'arac hatasi';
      console.error(`[pipeline-agent] tool ${action} HATA: ${msg}`);
      return JSON.stringify({ ok: false, error: msg });
    }
  };

  return [
    llm.tool({
      name: 'set_customer',
      description:
        'Müşterinin ad-soyadını kaydeder. Ad+soyad öğrenilir öğrenilmez çağır. ' +
        'Telefon numarasını ASLA set etme/verme — telefon sistemde bilinir (arayan numara). ' +
        'Tek turda yalnızca bu aracı çağır.',
      parameters: z.object({
        name: z.string().optional().describe('Müşterinin adı ve soyadı'),
      }),
      execute: async (args) => {
        const a = (args || {}) as Record<string, unknown>;
        return call('set_customer', { name: a.name });
      },
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
      description: 'Teslimat adresini (il/ilçe/mahalle/sokak/kapı no) kaydeder. İl, İLÇE ve tam açık adres öğrenilince çağır.',
      parameters: z.object({
        address: z.string().describe('Tam açık adres (mahalle, sokak/cadde, no, kat, daire)'),
        city: z.string().optional().describe('İl (örn. Afyonkarahisar, İstanbul, Ankara)'),
        district: z.string().optional().describe('İlçe (örn. Merkez, Esenler, Etimesgut)'),
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
        district: z.string().optional().describe('Yeni ilçe'),
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
// STT / LLM / TTS (fallback zinciri env ile seçilir)
// ---------------------------------------------------------------------------
function buildStt(): stt.STT {
  if (STT_PROVIDER === 'deepgram') {
    // Deepgram Nova-2 (telefon için ayarlı) — Whisper'ın sessizlikte halüsinasyon sorununu çözer.
    return new deepgram.STT({
      apiKey: DEEPGRAM_API_KEY,
      // nova-2-phonecall TR desteklemiyor → nova-3 (Türkçe destekli, streaming).
      model: 'nova-3',
      language: 'tr',
      smartFormat: true,
      punctuate: true,
      detectLanguage: false,
      // F9/G3: alan terimleri (ürün/adres) — ASR doğruluğunu artırır.
      keyterm: [
        'Kangal sucuk', 'sucuk', 'acılı parmak sucuk', 'dana parmak sucuk', 'kuru sucuk',
        'kuzu sucuk', 'keçi sucuk', 'manda sucuk', 'sucuklu', 'pastırma', 'kaymak', 'lokum',
        'peynir', 'tulum peyniri', 'kavurma', 'haşhaş ezmesi', 'yumurta', 'tereyağı',
        'mahalle', 'sokak', 'cadde', 'bulvar', 'meydan', 'apartmanı', 'apartman', 'sitesi',
        'blok', 'daire', 'kat', 'giriş', 'zemin', 'numara', 'kapı no', 'kapı numarası',
        'ilçe', 'il', 'merkez', 'semt', 'köy',
        'Adana', 'Ankara', 'Antalya', 'Aydın', 'Balıkesir', 'Bursa', 'Denizli', 'Diyarbakır',
        'Erzurum', 'Eskişehir', 'Gaziantep', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir',
        'Kayseri', 'Kocaeli', 'Konya', 'Malatya', 'Manisa', 'Muğla', 'Sakarya', 'Samsun',
        'Şanlıurfa', 'Tekirdağ', 'Trabzon', 'Van', 'Afyonkarahisar', 'Beykoz', 'Çankırı',
        'Dörtyol', 'Erkmen', 'Selçuklu', 'Cumhuriyet', 'Dervişpaşa', 'Dumupınar', 'İstiklal',
        'kargo', 'ücretsiz', 'havale', 'kapıda', 'kredi kartı', 'nakit',
      ],
    });
  }
  if (STT_PROVIDER === 'openai') {
    return new openai.STT({
      apiKey: OPENAI_API_KEY,
      model: 'gpt-4o-mini-transcribe',
      language: 'tr',
      detectLanguage: false,
      useRealtime: false,
    });
  }
  // fallback: Groq Whisper (OpenAI-uyumlu endpoint)
  return new openai.STT({
    apiKey: GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'whisper-large-v3-turbo',
    language: 'tr',
    detectLanguage: false,
    useRealtime: false,
  });
}

function buildLlm(): google.LLM | openai.LLM {
  if (LLM_PROVIDER === 'gemini') {
    return new google.LLM({ apiKey: GOOGLE_API_KEY, model: LLM_MODEL, temperature: 0.7 });
  }
  // default: DeepSeek (OpenAI-uyumlu endpoint)
  return new openai.LLM({ apiKey: DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com', model: LLM_MODEL, temperature: 0.7 });
}

function buildTts(): elevenlabs.TTS | openai.TTS | google.beta.TTS | cartesia.TTS | fishaudio.TTS {
  if (TTS_PROVIDER === 'fishaudio') {
    return new fishaudio.TTS({
      apiKey: FISH_API_KEY,
      model: process.env.FISH_MODEL || 's2.1-pro',
      voiceId: FISH_VOICE_ID || undefined,
      // Ses enerjisi düşük sesleri yükselt (dB). FISH_VOLUME ile canlıda ayarlanabilir.
      volume: Number(process.env.FISH_VOLUME ?? 16),
      // Konuşma hızı (prosody). 1.0 = normal; 1.1 = biraz hızlı. FISH_SPEED ile ayarlanır.
      speed: Number(process.env.FISH_SPEED ?? 1),
      normalizeLoudness: true,
    });
  }
  if (TTS_PROVIDER === 'cartesia') {
    // Cartesia Sonic — Türkçe (language: 'tr') destekli, düşük gecikme, çalışan ses.
    return new cartesia.TTS({
      apiKey: CARTESIA_API_KEY,
      model: 'sonic-3',
      voice: CARTESIA_VOICE_ID,
      language: 'tr',
    });
  }
  if (TTS_PROVIDER === 'google') {
    // Gemini TTS — elimizdeki Google/Gemini anahtarıyla çalışıyor (OpenAI kredisiz, ElevenLabs kısa kesiyordu).
    return new google.beta.TTS({
      apiKey: GOOGLE_API_KEY,
      model: 'gemini-3.8-flash-tts',
      voiceName: 'Aoede',
    });
  }
  if (TTS_PROVIDER === 'openai') {
    return new openai.TTS({ apiKey: OPENAI_API_KEY, model: 'gpt-4o-mini-tts', voice: 'alloy' });
  }
  return new elevenlabs.TTS({
    apiKey: ELEVENLABS_API_KEY,
    voiceId: ELEVENLABS_VOICE_ID,
    model: TTS_MODEL || 'eleven_turbo_v2_5',
    language: 'tr',
  });
}

/** IVR/KVKK için ayrı (kurumsal) ElevenLabs sesi — Alice. */
function buildAliceTts(): elevenlabs.TTS {
  return new elevenlabs.TTS({
    apiKey: ELEVENLABS_API_KEY,
    voiceId: process.env.KVKK_ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2',
    model: process.env.KVKK_ELEVENLABS_MODEL || TTS_MODEL || 'eleven_turbo_v2_5',
    language: 'tr',
  });
}

// ---------------------------------------------------------------------------
// Teşhis: AI'nın söylediği metni (transcription node girdisi) logla.
// ---------------------------------------------------------------------------
class OrderAiPipelineAgent extends voice.Agent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transcriptionNode(text: any, modelSettings: any): Promise<any> {
    const out = await voice.Agent.default.transcriptionNode(this, text, modelSettings);
    if (!out) return out;
    const [log, pass] = out.tee();
    void (async () => {
      let buf = '';
      try {
        for await (const chunk of log) {
          buf += typeof chunk === 'string' ? chunk : ((chunk as { text?: string })?.text ?? '');
        }
      } catch { /* yoksay */ }
      if (buf.trim()) {
        console.log(`[pipeline-agent] AI: ${buf.trim().slice(0, 600)}`);
        pushTranscript('assistant', buf.trim());
      }
    })();
    return pass;
  }
}

// ---------------------------------------------------------------------------
// Agent (pipeline: STT -> LLM -> TTS)
// ---------------------------------------------------------------------------
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const { caller, did } = await getSipInfo(ctx);
    const tenantId = resolveTenantId(did || DEFAULT_DID);
    const sessionId = ctx.room.name || `lk-${Date.now()}`;
    agentTranscript = [];

    console.log(`[pipeline-agent] oturum room=${sessionId} caller=${caller || '?'} did=${did || DEFAULT_DID} tenant=${tenantId} stt=${STT_PROVIDER} llm=${LLM_MODEL} tts=${TTS_PROVIDER}`);

    if (caller) {
      try {
        const seeded = await runOrderTool(tenantId, sessionId, 'set_customer', { phone: caller });
        console.log(`[pipeline-agent] telefon tohumlandi: ${JSON.stringify(seeded).slice(0, 160)}`);
      } catch (e) {
        console.error(`[pipeline-agent] telefon tohumlama hatasi: ${(e as Error).message}`);
      }
    }

    let systemInstruction = '';
    let ivrTexts: { menu: string; kvkk: string; noinput: string } | null = null;
    let greetingText: string | null = null;
    try {
      const pr = await fetchSystemPrompt(tenantId, caller);
      systemInstruction = pr.systemInstruction;
      ivrTexts = pr.ivr;
      greetingText = pr.greeting;
    } catch (e) {
      console.error(`[pipeline-agent] prompt alınamadı: ${(e as Error).message}`);
      systemInstruction = 'Sen sıcak, kibar bir Türkçe sipariş asistanısın. Müşteriden sipariş al.';
    }
    systemInstruction += TOOL_RULE;

    let lastToolAt = 0;
    let birthdayPending = false;
    let birthdayNudged = false;
    const agent = new OrderAiPipelineAgent({
      instructions: systemInstruction,
      tools: buildOrderTools(tenantId, sessionId, (action, result) => {
        lastToolAt = Date.now();
        const r = (result || {}) as { ok?: boolean };
        if (action === 'confirm_order' && r.ok) { birthdayPending = true; birthdayNudged = false; lastToolAt = 0; }
        if (action === 'set_birthday') { birthdayPending = false; }
      }),
    });

    // VAD tuning: sahte tetiklemeyi (sessizlik/gürültü/eko) azalt.
    const vad = await silero.VAD.load({
      activationThreshold: 0.75,
      minSpeechDuration: 500,
      minSilenceDuration: 300,
      prefixPaddingDuration: 500,
    });
    const ttsJessica = buildTts();
    const session = new voice.AgentSession({
      stt: buildStt(),
      llm: buildLlm(),
      tts: ttsJessica,
      vad,
      // TTS'e giden metne uygulanır: telaffuz sözlüğü (havale→havâle vb.) + markdown/emoji filtresi.
      ttsTextTransforms: ['filter_markdown', 'filter_emoji', fixPronunciation],
      turnHandling: {
        preemptiveGeneration: { enabled: true },
        // DENEY: sahte/erken kesintileri azalt — daha uzun konuşma + en az 2 kelime şartı.
        interruption: { enabled: true, minDuration: 800, minWords: 2 },
        // Geç gelen transkripti tolere et ("transcript arrives after turn committed" uyarısı).
        // DENEY: gecikmeyi düşürmek için minDelay 300→200.
        endpointing: { minDelay: 200 },
      },
    });

    // Teşhis: kullanıcı transkriptini (final) logla.
    session.on(AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (ev.isFinal && ev.transcript.trim()) {
        console.log(`[pipeline-agent] KULLANICI: ${ev.transcript.trim().slice(0, 300)}`);
        pushTranscript('user', ev.transcript.trim());
      }
    });

    // Teşhis: gecikme metrikleri (turn-detection / STT / LLM / TTS).
    session.on(AgentSessionEventTypes.MetricsCollected, (ev) => {
      const m = ev.metrics as unknown as Record<string, unknown>;
      const type = String(m?.type || '');
      if (type === 'eou_metrics') {
        console.log(`[pipeline-agent] METRIC EOU: endOfUtterance=${m.endOfUtteranceDelayMs}ms transcription=${m.transcriptionDelayMs}ms`);
      } else if (type === 'llm_metrics') {
        console.log(`[pipeline-agent] METRIC LLM: ttft=${m.ttftMs}ms duration=${m.durationMs}ms`);
      } else if (type === 'tts_metrics') {
        console.log(`[pipeline-agent] METRIC TTS: ttfb=${m.ttfbMs}ms audio=${m.audioDurationMs}ms`);
      } else if (type === 'stt_metrics') {
        console.log(`[pipeline-agent] METRIC STT: audio=${m.audioDurationMs}ms duration=${m.durationMs}ms`);
      }
    });

    let agentBusy = false;
    let userSpeaking = false;
    let silenceSince = 0;
    let silenceStage = 0;
    let ivrDone = false;
    session.on(AgentSessionEventTypes.AgentStateChanged, (ev) => {
      agentBusy = ev.newState === 'speaking' || ev.newState === 'thinking';
      if (ev.newState === 'speaking') lastToolAt = 0;
      if (ev.newState === 'listening') silenceSince = Date.now();
    });
    session.on(AgentSessionEventTypes.UserStateChanged, (ev) => {
      userSpeaking = ev.newState === 'speaking';
      if (userSpeaking) { silenceSince = 0; silenceStage = 0; }
    });

    const recoverFromToolGap = async (): Promise<void> => {
      try {
        const draft = await fetchDraft(tenantId, sessionId);
        const summary = summarizeDraft(draft);
        console.log(`[pipeline-agent] watchdog: toparlama -> ${summary}`);
        session.generateReply({
          instructions:
            'Bir sipariş turunda kısa bir kesinti oldu. SADECE asistan olarak, müşteriye yönelik KISA bir soru/cümle üret; ' +
            'müşterinin cevabını/repliğini YAZMA. Eksik bilgiyi UYDURMA; bilmiyorsan müşteriden iste. ' +
            'Aşağıdaki GÜNCEL taslağa göre KALDIĞIN YERDEN devam et; zaten alınmış bilgileri TEKRAR SORMA. ' +
            `Taslak: ${summary}`,
        });
      } catch (e) {
        console.error(`[pipeline-agent] watchdog toparlama hatasi: ${(e as Error).message}`);
      }
    };

    const nudgeBirthday = (): void => {
      console.log('[pipeline-agent] watchdog: dogum gunu nudge');
      session.generateReply({
        instructions:
        'Müşteri siparişi onayladı ve kısa süre sessiz kaldı. Doğum gününü AYRI bir turda, kısa ve sıcak sor; cümlenin BAŞINA "[Ad] Bey/Hanım, bu arada efendim" ekle: ' +
        '"[Ad] Bey/Hanım, bu arada efendim, doğum gününüzde sizi mutlu edecek küçük bir sürprizimiz var; doğum tarihinizi paylaşırsanız size özel indirimlerimizden faydalanabilirsiniz."',
      });
    };

    const watchdog = setInterval(() => {
      if (lastToolAt && !agentBusy && !userSpeaking && Date.now() - lastToolAt > 10000) {
        lastToolAt = 0;
        void recoverFromToolGap();
      }
      // P3-nudge: onaydan sonra müşteri 0.5 sn sessiz kalırsa doğum gününü sor (tek kez).
      if (birthdayPending && !birthdayNudged && !agentBusy && !userSpeaking && silenceSince && Date.now() - silenceSince > 500) {
        birthdayNudged = true;
        nudgeBirthday();
      }
      // Sessizlik yönetimi (IVR sonrası): 8 sn → nazik uyarı, sonraki 8 sn → nazik kapanış.
      if (ivrDone && !birthdayPending && !agentBusy && !userSpeaking && silenceSince) {
        const idle = Date.now() - silenceSince;
        if (silenceStage === 0 && idle > 8000) {
          silenceStage = 1;
          silenceSince = Date.now();
          session.generateReply({
            instructions:
              'Müşteri bir süredir sessiz. Kısa ve nazik bir dille sesini alamadığını söyle; cümlenin başına "[Ad] Bey/Hanım" ekle: ' +
              '"[Ad] Bey/Hanım, sesinizi alamıyorum, beni duyabiliyor musunuz?"',
          });
        } else if (silenceStage === 1 && idle > 8000) {
          silenceStage = 2;
          session.generateReply({
            instructions:
              'Müşteri hâlâ sessiz. Kısa, nazik ve anlayışlı bir dille konuşmayı bitir: ' +
              '"[Ad] Bey/Hanım, hatlarda bir sorun var galiba, sizi duyamıyorum. İsterseniz daha sonra tekrar arayabilirsiniz. İyi günler dilerim."',
          });
          setTimeout(() => { try { void ctx.room.disconnect(); } catch { /* yoksay */ } }, 7000);
        }
      }
    }, 1000);
    session.on(AgentSessionEventTypes.Close, () => {
      clearInterval(watchdog);
      // Çağrı kapanınca: sipariş onaylanmadıysa/oluşmadıysa kaydet (abandoned/no_confirm).
      void reportSessionEnd(tenantId, sessionId);
      void reportTranscript(tenantId, sessionId);
      void saveRecording(tenantId, sessionId, caller || '', ctx.sessionDirectory);
    });

    await session.start({
      agent,
      room: ctx.room,
      // Görüşme sesini kaydet (RecorderIO → ctx.sessionDirectory/audio.ogg). Esnaf dinleyebilsin.
      record: true,
      // Gelen ses için eko/arka-ses temizliği (SIP/telefon için ayarlı BVC) — kesintileri azaltır.
      // Not: BVC açıkken SIP trunk'ta krisp KAPALI olmalı (iki gelişmiş model üst üste binmesin).
      inputOptions: { noiseCancellation: TelephonyBackgroundVoiceCancellation() },
    });

    // ---- Açılış IVR: gerçek kayıt (menü) → DTMF (1: aydınlatma, 2: sipariş) → karşılama ----
    // TTS için metni sadeleştir (simge/kısaltma).
    const cleanForTts = (s: string): string =>
      String(s || '').replace(/&/g, ' ve ').replace(/%/g, ' yüzde ').replace(/\s+/g, ' ').trim();

    const OPENING_PCM = fileURLToPath(new URL('../assets/opening.pcm', import.meta.url));
    const hasOpeningAudio = existsSync(OPENING_PCM);
    if (!hasOpeningAudio) console.warn('[pipeline-agent] opening.pcm bulunamadi -> menu TTS ile okunacak');

    const ivrEnabled = (process.env.IVR_ENABLED || 'true').toLowerCase() !== 'false';
    // Açılış menüsü gerçek kayıttan (opening.pcm) mı çalınsın? Varsayılan: HAYIR (TTS).
    const openingAudioOn =
      (process.env.IVR_OPENING_AUDIO || 'false').toLowerCase() === 'true' && hasOpeningAudio;
    if (openingAudioOn) console.log('[pipeline-agent] IVR menü: gerçek kayıt (opening.pcm)');
    const ivrTimeout = Number(process.env.IVR_TIMEOUT_MS || 6000) || 6000;
    const menuText = ivrTexts?.menu ||
      'Gastronomi şehri Afyonkarahisar\'dan sevgiler, saygılar. Kişisel Verileri Koruma Kanunu kapsamında, sizlere daha iyi hizmet verebilmek adına görüşmelerimiz kaydedilmektedir. Kanun kapsamında ki Aydınlatma metnini dinlemek için 1\'e, sipariş vermek için 2\'ye basınız.';
    const kvkkText = ivrTexts?.kvkk ||
      'Kişisel verilerinizin işlenmesine ilişkin aydınlatma metni için lütfen web sitemizi ziyaret edin. Sipariş vermek için 2\'ye basınız.';
    const noinputText = ivrTexts?.noinput ||
      'Herhangi bir tuşlama yapmadınız. Aydınlatma metni için 1\'e, sipariş vermek için 2\'ye basınız.';

    // DTMF: kayıt BAŞLAMADAN ÖNCE aktif → müşteri kayıt sırasında bassa da yakalanır.
    const dtmfBox: { v: string | null } = { v: null };
    const onDtmf = (_c: number, digit: string): void => { if (!dtmfBox.v) dtmfBox.v = String(digit); };
    ctx.room.on('dtmfReceived' as never, onDtmf as never);
    const takeDtmf = async (ms: number): Promise<string | null> => {
      const deadline = Date.now() + ms;
      while (!dtmfBox.v && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
      const r = dtmfBox.v;
      dtmfBox.v = null;
      return r;
    };

    const sayTts = async (t: string, clean = false): Promise<void> => {
      try {
        const h = session.say(clean ? cleanForTts(t) : t, { allowInterruptions: false });
        await h.waitForPlayout();
      } catch (e) {
        console.error(`[pipeline-agent] TTS calma hatasi: ${(e as Error).message}`);
      }
    };
    // Menü: gerçek kayıt (opening.pcm) varsa dosyadan çal (kesilemez), yoksa TTS'e düş.
    const playMenu = async (): Promise<void> => {
      try {
        const audio = openingAudioOn ? pcmFramesFromFile(OPENING_PCM, 24000) : undefined;
        const h = session.say(menuText, { audio, allowInterruptions: false });
        await h.waitForPlayout();
      } catch (e) {
        console.error(`[pipeline-agent] IVR menu calma hatasi: ${(e as Error).message}`);
      }
    };

    let proceed = false;
    if (ivrEnabled) {
      await playMenu();
      let choice = await takeDtmf(ivrTimeout);
      if (choice === '1') { await sayTts(kvkkText); await playMenu(); choice = await takeDtmf(ivrTimeout); }
      if (choice === '2') {
        proceed = true;
      } else {
        await sayTts(noinputText);
        choice = await takeDtmf(ivrTimeout);
        if (choice === '1') { await sayTts(kvkkText); await playMenu(); choice = await takeDtmf(ivrTimeout); }
        if (choice === '2') proceed = true;
      }
      if (!proceed) {
        console.log('[pipeline-agent] IVR: tuslama yok -> gorusme kapatiliyor');
        try { ctx.room.off('dtmfReceived' as never, onDtmf as never); } catch { /* yoksay */ }
        try { await ctx.room.disconnect(); } catch { /* yoksay */ }
        return;
      }
    }
    try { ctx.room.off('dtmfReceived' as never, onDtmf as never); } catch { /* yoksay */ }
    ivrDone = true;

    // "2" → sipariş karşılaması: SABİT metin (şablon), klon TTS, KESİLEMEZ (müşteri bekler).
    const greetText = greetingText ||
      'Merhaba efendim ben yapay zeka asistanı Bilge size nasıl yardımcı olabilirim';
    await sayTts(greetText, true);
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
