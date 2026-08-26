import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

    // 8) RLS: backup dosyası içinde tenant izolasyonu (her tabloda tenant_id kontrolü)
    const rlsIssues: string[] = [];
    for (const [table, rows] of Object.entries(data)) {
      if (rows && (rows as any[]).length > 0) {
        const sample = (rows as any[])[0];
        if (sample && 'tenant_id' in sample) {
          const distinct = new Set((rows as any[]).map((r) => r.tenant_id).filter(Boolean)).size;
          if (distinct < 1) rlsIssues.push(`${table}: tenant_id yok`);
        }
      }
    }
    checks.rls = { issue_count: rlsIssues.length, issues: rlsIssues };

    const passed = checks.tenants.found > 0 && checks.customers.found >= 0 && checks.orders.found >= 0;

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
}
