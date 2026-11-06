/**
 * Sohbet oturumları için ortak yardımcılar.
 *
 * - generateSessionLabel(): benzersiz ve okunabilir oturum etiketi üretir.
 *   (DB'deki hatalı generate_session_label() trigger'ını atlatmak için açıkça yazılır.)
 * - sessionWindowStart(): aynı konuşmanın sürdürüleceği zaman penceresi (varsayılan 5 dk).
 */

export function generateSessionLabel(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const suffix = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `SESSION-${ymd}-${suffix}`;
}

export function sessionWindowMinutes(): number {
  const raw = Number(process.env.TEXT_SESSION_WINDOW_MINUTES || '5');
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

export function sessionWindowStart(): string {
  return new Date(Date.now() - sessionWindowMinutes() * 60 * 1000).toISOString();
}

const RESET_PATTERN = /^\s*(yeni\s*sipari[sş]|yeni\s*oturum|yeni\s*sohbet|yeni\s*konu[sş]ma|s[ıi]f[ıi]rla|ba[sş]tan|reset)\s*[.!]*\s*$/i;

export function isResetCommand(text: string): boolean {
  return RESET_PATTERN.test(String(text || ''));
}
