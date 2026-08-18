import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { MetaWhatsappProvider } from '../messages/providers/meta-whatsapp.provider';
import { ConfigService } from '@nestjs/config';

export interface WhatsappTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: { key: string; label: string }[];
  status: string;
  meta_template_id?: string;
  meta_status?: string;
  rejection_reason?: string;
}

/**
 * WhatsApp pazarlama şablon yöneticisi.
 * Meta onaylı jenerik şablonlar ({{1}}..{{4}} değişkenli) — esnaf her kampanyada
 * Meta'ya yeni şablon göndermek zorunda kalmaz; değişkenler gönderimde doldurulur.
 */
@Injectable()
export class WhatsappTemplatesService {
  private readonly logger = new Logger(WhatsappTemplatesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly whatsappProvider: MetaWhatsappProvider,
  ) {}

  async list(tenantId: string): Promise<WhatsappTemplate[]> {
    const { data } = await this.supabase.db
      .from('whatsapp_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return (data || []) as WhatsappTemplate[];
  }

  async create(tenantId: string, input: { name: string; category?: string; language?: string; body: string; variables?: { key: string; label: string }[] }): Promise<WhatsappTemplate> {
    const { data, error } = await this.supabase.db
      .from('whatsapp_templates')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        category: input.category || 'MARKETING',
        language: input.language || 'tr',
        body: input.body,
        variables: input.variables || [],
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw new Error(`Şablon oluşturulamadı: ${error.message}`);
    return data as WhatsappTemplate;
  }

  async update(tenantId: string, id: string, input: Partial<{ name: string; category: string; body: string; variables: { key: string; label: string }[] }>): Promise<WhatsappTemplate> {
    const { data, error } = await this.supabase.db
      .from('whatsapp_templates')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Şablon güncellenemedi: ${error.message}`);
    return data as WhatsappTemplate;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.supabase.db.from('whatsapp_templates').delete().eq('tenant_id', tenantId).eq('id', id);
  }

  /**
   * Şablonu Meta'ya onaya gönderir. Meta API yapılandırılmamışsa şablon 'draft'
   * olarak kalır ve durum mesajı döner (dormant).
   */
  async submitToMeta(tenantId: string, id: string): Promise<{ templateId: string; status: string; message: string }> {
    const template = (await this.list(tenantId)).find((t) => t.id === id);
    if (!template) throw new Error('Şablon bulunamadı');
    if (template.status === 'approved') return { templateId: template.id, status: 'approved', message: 'Şablon zaten onaylı' };

    const creds = await this.whatsappProvider.getCredentials(tenantId);
    if (!creds || !creds.wabaId) {
      this.logger.warn(`Meta API yapılandırılmamış — şablon ${template.id} onaya gönderilemedi (draft kaldı)`);
      return {
        templateId: template.id,
        status: template.status,
        message: `Meta WhatsApp API anahtarı tanımlı değil. Şablon draft durumda bekliyor; anahtar girildiğinde "Meta'ya Gönder" tekrar kullanılabilir.`,
      };
    }

    const graphUrl = this.config.get<string>('WHATSAPP_GRAPH_URL', 'https://graph.facebook.com/v19.0');
    try {
      const response = await fetch(`${graphUrl}/${creds.wabaId}/message_templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.sanitizeName(template.name),
          language: template.language,
          category: template.category || 'MARKETING',
          components: [{ type: 'BODY', text: template.body }],
        }),
      });

      const json = (await response.json().catch(() => ({}))) as { id?: string; error?: { message?: string }; message?: string };
      if (!response.ok) {
        await this.supabase.db.from('whatsapp_templates').update({
          status: 'draft',
          rejection_reason: json.error?.message || json.message || `HTTP ${response.status}`,
        }).eq('id', id);
        return { templateId: id, status: 'draft', message: json.error?.message || 'Meta reddetti' };
      }

      await this.supabase.db.from('whatsapp_templates').update({
        status: 'pending_review',
        meta_template_id: String(json.id || ''),
        meta_status: 'PENDING',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      return { templateId: id, status: 'pending_review', message: 'Meta onayı bekleniyor' };
    } catch (err) {
      this.logger.error(`Şablon Meta'ya gönderilemedi: ${(err as Error).message}`);
      return { templateId: id, status: 'draft', message: (err as Error).message };
    }
  }

  /** Meta onay durumunu şablonların mevcut durumundan hesaplar (poll). */
  async approvalStatus(tenantId: string): Promise<Record<string, string>> {
    const templates = await this.list(tenantId);
    const result: Record<string, string> = {};
    for (const t of templates) {
      result[t.id] = t.status;
    }
    return result;
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 60);
  }
}
