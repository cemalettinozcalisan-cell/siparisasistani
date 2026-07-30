import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly supabase: SupabaseService) {}

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
    ];

    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      try {
        const { data: rows } = await this.supabase.db.from(table).select('*').limit(5000);
        data[table] = rows || [];
      } catch (e) {
        this.logger.warn(`Backup failed for table ${table}: ${e}`);
        data[table] = [];
      }
    }

    const summary: Record<string, number> = {};
    for (const [table, rows] of Object.entries(data)) {
      summary[table] = rows.length;
    }

    const backup = {
      created_at: new Date().toISOString(),
      version: '1.0',
      summary,
      data,
    };

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');
    const stats = fs.statSync(filePath);

    this.logger.log(`Backup completed: ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
    return { path: filePath, size: stats.size, tables: summary };
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
}
