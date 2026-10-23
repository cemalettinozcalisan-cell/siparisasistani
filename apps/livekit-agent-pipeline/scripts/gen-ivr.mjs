/**
 * Açılış IVR seslerini (ham PCM, 24000 Hz) üretir — ElevenLabs (Alice, kurumsal kadın).
 * Üretir: assets/ivr-menu.pcm (S1), assets/kvkk-aydinlatma.pcm (S2), assets/ivr-noinput.pcm (S3)
 * Kullanım: node scripts/gen-ivr.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const key = process.env.ELEVENLABS_API_KEY || '';
const voice = process.env.KVKK_ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2'; // Alice (kurumsal)
const model = process.env.KVKK_ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const firma = process.env.IVR_FIRMA || 'Demo İşletme';
const kvkkLink = process.env.IVR_KVKK_LINK || 'www.demo.com/kvkk';

const items = [
  {
    file: 'ivr-menu.pcm',
    text:
      `${firma} sucuklarına hoş geldiniz. Sizlere daha iyi hizmet verebilmek adına, görüşmelerimiz 6698 sayılı ` +
      `Kişisel Verilerin Korunması Kanunu kapsamında kayıt altına alınmaktadır. Kişisel verilerinizin işlenmesine ` +
      `ilişkin aydınlatma metnimize ${kvkkLink} adresinden ulaşabilir veya metni dinlemek için 2'yi tuşlayabilirsiniz. ` +
      `Sipariş vermek için 1'i, aydınlatma metnini dinlemek için 2'yi tuşlayınız.`,
  },
  {
    file: 'kvkk-aydinlatma.pcm',
    text:
      'Kişisel Verilerin Korunması Aydınlatma Metni. Veri sorumlusu olarak, kişisel verileriniz 6698 sayılı Kanun ' +
      'kapsamında, siparişinizin oluşturulması ve teslimatı amacıyla işlenmektedir. Verileriniz yasal yükümlülükler ' +
      'dışında üçüncü kişilerle paylaşılmaz. Kanun kapsamındaki haklarınız için bizimle iletişime geçebilirsiniz. ' +
      'Sipariş vermek için 1\'i tuşlayınız.',
  },
  {
    file: 'ivr-noinput.pcm',
    text:
      'Herhangi bir tuşlama yapmadınız. Lütfen sipariş vermek için 1\'i, aydınlatma metnini dinlemek için 2\'yi tuşlayınız.',
  },
];

for (const it of items) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: it.text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!r.ok) { console.log(it.file, 'ERR', r.status, (await r.text()).slice(0, 200)); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, it.file), buf);
  console.log(`${it.file.padEnd(24)} ${buf.length} bytes (~${(buf.length / 2 / 24000).toFixed(1)}s)`);
}
