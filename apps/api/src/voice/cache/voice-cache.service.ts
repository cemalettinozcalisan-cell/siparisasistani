import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class VoiceCacheService {
  private readonly logger = new Logger(VoiceCacheService.name);
  private memoryCache: Map<string, { buffer: Buffer; expiresAt: number }> = new Map();
  private ttlMs = 60 * 60 * 1000; // 1 saat

  constructor(private readonly supabase: SupabaseService) {}

  hashKey(text: string, persona?: string): string {
    return createHash('md5').update(`${text}|${persona || ''}`).digest('hex');
  }

  async get(hashKey: string): Promise<Buffer | null> {
    const memCached = this.memoryCache.get(hashKey);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.buffer;
    }
    this.memoryCache.delete(hashKey);
    return null;
  }

  async set(hashKey: string, buffer: Buffer, tenantId?: string, persona?: string): Promise<void> {
    this.memoryCache.set(hashKey, { buffer, expiresAt: Date.now() + this.ttlMs });

    if (tenantId) {
      try {
        const { data: existing } = await this.supabase.db
          .from('voice_cache')
          .select('id, used_count')
          .eq('hash_key', hashKey)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (existing) {
          await this.supabase.db
            .from('voice_cache')
            .update({ used_count: (existing.used_count || 0) + 1, last_used_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } catch (err) {
        this.logger.debug(`Voice cache persist skipped: ${(err as Error).message}`);
      }
    }
  }

  async storeFile(
    hashKey: string, buffer: Buffer, tenantId: string,
    text: string, persona: string, provider: string, durationMs: number,
  ): Promise<string> {
    const fileName = `voice/${tenantId}/${hashKey}.mp3`;
    const { data: upload } = await this.supabase.db.storage
      .from('voice-cache')
      .upload(fileName, buffer, { contentType: 'audio/mpeg', upsert: true });

    const fileUrl = upload?.path
      ? `${process.env.SUPABASE_URL}/storage/v1/object/public/voice-cache/${upload.path}`
      : '';

    await this.supabase.db.from('voice_cache').upsert({
      tenant_id: tenantId,
      hash_key: hashKey,
      text,
      voice_persona: persona,
      provider,
      duration_ms: durationMs,
      file_url: fileUrl,
      file_size: buffer.length,
      used_count: 1,
    }, { onConflict: 'tenant_id,hash_key,voice_persona' });

    return fileUrl;
  }
}
