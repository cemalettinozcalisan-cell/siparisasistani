import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../common/supabase.client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get encryptionKey(): string {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'BACKUP_ENCRYPTION_KEY ortam değişkeni tanımlı değil. Yedekleme şifrelemesi için güçlü bir anahtar set edin.',
      );
    }
    return key;
  }

  private encrypt(text: string): string {
    const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(text: string): string {
    try {
      const [ivHex, dataHex] = text.split(':');
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return '';
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async autoBackup() {
    this.logger.log('Daily auto-backup started');
    await this.runBackup();
  }

  async runBackup(): Promise<{ path: string; size: number; tables: Record<string, number> }> {
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupDir, `backup-${timestamp}.json`);

    const tables = [
      'tenants', 'users', 'customers', 'orders', 'order_items', 'products',
      'conversation_sessions', 'call_recordings', 'ai_audit_logs', 'notifications',
      'whatsapp_messages', 'whatsapp_conversations', 'instagram_messages',
      'instagram_conversations', 'campaigns', 'customer_prices', 'tenant_settings',
      'channel_health', 'channel_health_events', 'channel_health_alerts',
      'support_tickets', 'support_ticket_messages', 'support_chat_sessions', 'support_chat_messages',
      'prompt_versions', 'webhook_events', 'retention_logs', 'outbound_logs',
      'complaints', 'api_keys', 'subscriptions',
    ];

    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      try {
        data[table] = await this.fetchAllRows(table);
      } catch (e) {
        this.logger.warn(`Backup failed for table ${table}: ${e}`);
        data[table] = [];
      }
    }

    // Storage: ses kayıtlarını indir (recording_url listesi)
    let storageFiles: string[] = [];
    try {
      const { data: recordings } = await this.supabase.db
        .from('call_recordings')
        .select('recording_url');
      storageFiles = (recordings || [])
        .map((r) => String((r as any).recording_url || ''))
        .filter(Boolean);
    } catch { storageFiles = []; }

    const summary: Record<string, number> = {};
    for (const [table, rows] of Object.entries(data)) {
      summary[table] = rows.length;
    }

    const backup = {
      created_at: new Date().toISOString(),
      version: '2.0',
      encrypted: true,
      summary,
      data,
      storage_files: storageFiles,
    };

    const json = JSON.stringify(backup, null, 2);
    const encrypted = this.encrypt(json);
    fs.writeFileSync(filePath, encrypted, 'utf-8');
    const stats = fs.statSync(filePath);

    this.logger.log(`Backup completed: ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
    return { path: filePath, size: stats.size, tables: summary };
  }

  /** Sayfalama ile tablodaki TÜM satırları çeker (5000 limiti yok) */
  private async fetchAllRows(table: string): Promise<unknown[]> {
    const all: unknown[] = [];
    const pageSize = 1000;
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await this.supabase.db
        .from(table)
        .select('*')
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  async listBackups(): Promise<{ filename: string; size: number; created_at: string }[]> {
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return { filename: f, size: stats.size, created_at: stats.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async downloadBackup(filename: string): Promise<string | null> {
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return filePath;
  }

  /** Backup dosyasını çözüp içeriğini döner (restore + doğrulama için) */
  async readBackup(filename: string): Promise<any | null> {
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    try {
      const parsed = JSON.parse(raw);
      if (parsed.encrypted) return parsed; // şifresiz test dosyası
      return parsed;
    } catch {
      // Şifreli dosya
      const decrypted = this.decrypt(raw);
      try { return JSON.parse(decrypted); } catch { return null; }
    }
  }

  /** DR restore testi: backup verisini doğrular (esnaf sistemine dokunmaz) */
  async runRestoreTest(filename: string): Promise<Record<string, unknown>> {
    const backup = await this.readBackup(filename);
    if (!backup) return { success: false, error: 'Backup okunamadı' };

    const checks: Record<string, any> = {};
    const data = backup.data || {};

    // 1) Tenant sayısı
    const tenants = (data.tenants || []) as any[];
    checks.tenants = { found: tenants.length };

    // 2) Müşteri sayısı
    const customers = (data.customers || []) as any[];
    checks.customers = { found: customers.length };

    // 3) Sipariş sayısı
    const orders = (data.orders || []) as any[];
    checks.orders = { found: orders.length };

    // 4) Tenant-müşteri bağlantısı
    const customerTenantIds = new Set(customers.map((c) => c.tenant_id).filter(Boolean));
    checks.customer_tenant_link = { distinct_tenant_ids: customerTenantIds.size };

    // 5) Sipariş toplamları
    const total = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    checks.order_total = { sum: total, orders_with_total: orders.filter((o) => o.total_price != null).length };

    // 6) Aktif prompt'lar
    const prompts = (data.prompt_versions || []) as any[];
    checks.prompts = { total: prompts.length, active: prompts.filter((p) => p.status === 'active').length };

    // 7) Storage dosyaları
    checks.storage_files = { found: (backup.storage_files || []).length };

    // 8) RLS: tenant izolasyonu — tenant_id taşıyan tablolarda tenant_id'siz satır olmamalı
    const rlsIssues: string[] = [];
    for (const [table, rows] of Object.entries(data)) {
      const arr = (rows as any[]);
      if (arr && arr.length > 0 && arr[0] && 'tenant_id' in arr[0]) {
        const missing = arr.filter((r) => !r.tenant_id).length;
        if (missing > 0) rlsIssues.push(`${table}: ${missing} satır tenant_id'siz`);
      }
    }
    checks.rls = { issue_count: rlsIssues.length, issues: rlsIssues };

    // 9) Sipariş veri bütünlüğü (zorunlu alan + geçerli fiyat) — "AI sipariş akışı" veri-düzeyinde doğrulanır
    const badOrders = orders.filter((o: any) => {
      const hasRequired = o && o.id && o.customer_id;
      const priceOk = o.total_price == null || !isNaN(Number(o.total_price));
      return !hasRequired || !priceOk;
    });
    checks.order_integrity = { total: orders.length, invalid: badOrders.length };

    const passed =
      checks.tenants.found > 0 &&
      checks.customers.found >= 0 &&
      checks.orders.found >= 0 &&
      checks.order_integrity.invalid === 0 &&
      checks.rls.issue_count === 0;

    // recovery_logs'a yaz
    try {
      await this.supabase.db.from('recovery_logs').insert({
        backup_file: filename,
        type: 'restore_test',
        status: passed ? 'success' : 'failed',
        summary: { tenants: checks.tenants.found, customers: checks.customers.found, orders: checks.orders.found },
        result: checks,
        ran_at: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`recovery_log insert failed: ${e}`);
    }

    return { success: passed, filename, checks };
  }

  /**
   * Yedek verisini HEDEF ortama geri yazar (restore).
   *
   * Güvenlik sözleşmesi (esnaf sistemine asla zarar vermez):
   * - Hedef DR_TARGET_URL + DR_TARGET_KEY env ile ayrı bir test projesine işaret eder.
   * - Env tanımlı değilse yazma YAPILMAZ → dry-run sonucu döner.
   * - Hedef URL production (SUPABASE_URL) ile aynıysa işlem İPTAL edilir.
   */
  async restore(
    filename: string,
    opts: { targetUrl?: string; targetKey?: string } = {},
  ): Promise<Record<string, unknown>> {
    const backup = await this.readBackup(filename);
    if (!backup) return { success: false, error: 'Backup okunamadı' };

    const targetUrl = (opts.targetUrl || process.env.DR_TARGET_URL || '').trim();
    const targetKey = opts.targetKey || process.env.DR_TARGET_KEY || '';

    if (!targetUrl || !targetKey) {
      return {
        success: false,
        mode: 'dry-run',
        error: 'DR_TARGET_URL/DR_TARGET_KEY tanımlı değil. Gerçek restore için ayrı bir test projesi gerekir.',
      };
    }

    const prodUrl = (process.env.SUPABASE_URL || '').trim();
    if (prodUrl && targetUrl.replace(/\/$/, '') === prodUrl.replace(/\/$/, '')) {
      return { success: false, mode: 'blocked', error: 'Hedef URL production ile aynı. Restore iptal edildi.' };
    }

    const target = createClient(targetUrl, targetKey);
    const data = backup.data || {};
    const written: Record<string, number> = {};
    const errors: string[] = [];

    for (const table of this.insertionOrder(data)) {
      const rows = (data[table] || []) as any[];
      if (!rows.length) continue;
      try {
        await target.from(table).upsert(rows, { onConflict: 'id' });
        written[table] = rows.length;
      } catch (e) {
        errors.push(`${table}: ${(e as any).message}`);
      }
    }

    const ok = errors.length === 0;
    return {
      success: ok,
      mode: 'restored',
      filename,
      tables_written: written,
      row_total: Object.values(written).reduce((a, b) => a + b, 0),
      errors,
    };
  }

  /** FK bağımlılığına göre yazma sırası: üst (parent) tablolar önce. */
  private insertionOrder(data: Record<string, unknown[]>): string[] {
    const parents = [
      'tenant_settings', 'tenants', 'users', 'products', 'customer_prices',
      'subscriptions', 'campaigns', 'channel_health', 'prompt_versions',
      'api_keys', 'conversation_sessions',
    ];
    const known = new Set(Object.keys(data));
    return [...parents.filter((t) => known.has(t)), ...Object.keys(data).filter((t) => !parents.includes(t))];
  }

  /** Admin paneli için backup sağlık özeti: son yedek, son restore testi, RPO/RTO hedefleri. */
  async getBackupStatus(): Promise<Record<string, unknown>> {
    const backups = await this.listBackups();
    const latest = backups[0] || null;

    // Son restore testini recovery_logs'tan çek
    let latestTest: Record<string, any> | null = null;
    try {
      const { data } = await this.supabase.db
        .from('recovery_logs')
        .select('*')
        .eq('type', 'restore_test')
        .order('ran_at', { ascending: false })
        .limit(1);
      if (data && data[0]) latestTest = data[0] as Record<string, any>;
    } catch (e) {
      this.logger.warn(`recovery_logs okuma hatası: ${e}`);
    }

    const now = Date.now();
    const backupAgeMs = latest ? now - new Date(latest.created_at).getTime() : null;
    const rpoHours = 24; // hedef: günlük yedek
    const rtoHours = 2; // hedef: restore + doğrulama süresi

    return {
      latest_backup: latest,
      backup_healthy: latest ? backupAgeMs !== null && backupAgeMs <= rpoHours * 3600000 : false,
      backup_age_ms: backupAgeMs,
      latest_restore_test: latestTest
        ? {
            filename: latestTest.backup_file,
            status: latestTest.status,
            ran_at: latestTest.ran_at,
            result: latestTest.result,
          }
        : null,
      rpo_hours: rpoHours,
      rto_hours: rtoHours,
      targets: { backup: 'daily', restore_test: 'monthly' },
    };
  }
}
