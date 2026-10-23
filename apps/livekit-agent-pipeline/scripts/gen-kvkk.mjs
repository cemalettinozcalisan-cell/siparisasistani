/**
 * KVKK anonsu (ayrı ses) için ham PCM (s16le, 24000 Hz, mono) üretir.
 * Kullanım: node scripts/gen-kvkk.mjs
 * Sağlayıcı: ElevenLabs (kurumsal kadın ses).
 * Not: ElevenLabs kredisi gerekir. Üretilen dosya: assets/kvkk.pcm
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const key = process.env.ELEVENLABS_API_KEY || '';
// Kurumsal kadın ses: Alice (Clear, Engaging Educator). İstersen değiştir.
const voice = process.env.KVKK_ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
const model = process.env.KVKK_ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
const text =
  process.env.KVKK_FULL_TEXT ||
  'Kişisel Verileri Koruma Kanunu kapsamında, sizlere daha iyi hizmet verebilmek adına görüşmelerimiz kaydedilmektedir. Kanun kapsamındaki aydınlatma metnine web sitemizden ulaşabilirsiniz.';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'kvkk.pcm');

const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text,
    model_id: model,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  }),
});
console.log('status', r.status, r.headers.get('content-type'));
if (!r.ok) {
  console.log((await r.text()).slice(0, 400));
  process.exit(1);
}
const buf = Buffer.from(await r.arrayBuffer());
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes (~' + (buf.length / 2 / 24000).toFixed(1) + 's)');
