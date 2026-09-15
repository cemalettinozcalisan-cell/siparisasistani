#!/usr/bin/env node
/**
 * Şifre göçü (CRITICAL auth fix):
 * - scrypt$... zaten yeni formatta → dokunma
 * - 64-hex sha256 (legacy) → dokunma (ilk login'de kademeli göç, şifre bilinmediği için)
 * - düz metin → AYNI şifre korunarak scrypt'e çevrilir (düz metin sızıntısı kapanır, kullanıcı kilitlenmez)
 *
 * Şifreler asla konsola yazılmaz. Çalıştır: node scripts/migrate-passwords.mjs
 */
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

(async () => {
  const { data: users, error } = await sb.from('users').select('id,email,password');
  if (error) throw new Error('select hatası: ' + error.message);

  let scrypt = 0, legacySha = 0, plaintext = 0, empty = 0;
  const upgraded = [];

  for (const u of users || []) {
    const pwd = u.password || '';
    if (pwd.startsWith('scrypt$')) { scrypt++; continue; }
    if (/^[0-9a-f]{64}$/.test(pwd)) { legacySha++; continue; }
    if (!pwd) { empty++; continue; }

    // düz metin → scrypt (aynı şifre, kilitlenme yok)
    const newHash = hashPassword(pwd);
    const { error: upErr } = await sb.from('users').update({ password: newHash }).eq('id', u.id);
    if (upErr) { console.error('  GÜNCELLEME HATASI', u.email, upErr.message); continue; }
    plaintext++;
    upgraded.push(u.email);
  }

  console.log('Göç özeti:');
  console.log('  zaten scrypt  :', scrypt);
  console.log('  legacy sha256 :', legacySha, '(ilk login\'de otomatik scrypt\'e döner)');
  console.log('  DÜZ METİN→scrypt:', plaintext, upgraded.length ? '→ ' + upgraded.join(', ') : '');
  console.log('  boş şifre     :', empty);

  const { data: after } = await sb.from('users').select('email,password');
  const remainingPlain = (after || []).filter((r) => r.password && !/^scrypt\$/.test(r.password) && !/^[0-9a-f]{64}$/.test(r.password));
  console.log('Son durum — düz metin kalan:', remainingPlain.length, remainingPlain.map((r) => r.email).join(', '));
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });