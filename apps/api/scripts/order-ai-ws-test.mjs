/**
 * F1 smoke testi: Order AI realtime WS'e bağlanır, setup bekler, bir metin turu gönderir.
 * Kullanım: node apps/api/scripts/order-ai-ws-test.mjs
 */
import WebSocket from 'ws';

const BASE = process.env.API_BASE || 'http://localhost:3001';
const WS_BASE = process.env.WS_BASE || 'ws://localhost:3001';
const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@siparisasistani.com', password: 'demo123' }),
}).then((r) => r.json());

if (!login?.token) { console.error('login basarisiz', login); process.exit(1); }
console.log('login OK');

const url = `${WS_BASE}/api/order-ai/realtime?tid=${encodeURIComponent(TENANT)}&token=${encodeURIComponent(login.token)}${process.env.VOICE ? '&voice=' + encodeURIComponent(process.env.VOICE) : ''}${process.env.AB ? '&ab=' + encodeURIComponent(process.env.AB) : ''}`;
const ws = new WebSocket(url);
let gotSetup = false; let audio = 0; let text = ''; let userText = ''; let order = null; let errors = [];

const done = (code) => { try { ws.close(); } catch {} setTimeout(() => process.exit(code), 300); };

ws.on('open', () => console.log('WS acildi'));
ws.on('message', (raw) => {
  let m; try { m = JSON.parse(raw.toString()); } catch { return; }
  if (m.type === 'setup') {
    gotSetup = true;
    console.log('SETUP alindi — Gemini Live bagli. voice=' + (m.voice || '?') + '. Metin turu gonderiliyor...');
    ws.send(JSON.stringify({ type: 'text', text: 'Merhaba, 5 kilo sucuk almak istiyorum' }));
  } else if (m.type === 'audio') { audio++; }
  else if (m.type === 'text') { text += m.text || ''; }
  else if (m.type === 'user_text') { userText += m.text || ''; }
  else if (m.type === 'order') { order = m; }
  else if (m.type === 'interrupted') { console.log('(interrupted)'); }
  else if (m.type === 'error') { errors.push(m.message); console.log('HATA:', m.message); }
});
ws.on('error', (e) => { console.log('WS error:', e.message); });

setTimeout(() => {
  console.log('\n== SONUC ==');
  console.log('setup:', gotSetup, '| audio chunk:', audio, '| modelText:', text.slice(0, 120));
  console.log('userText:', userText.slice(0, 120));
  console.log('order:', order ? JSON.stringify(order) : '(henuz yok — normal, onay gerekir)');
  console.log('errors:', errors.length ? errors : 'yok');
  done(gotSetup && !errors.length ? 0 : 2);
}, 18000);
