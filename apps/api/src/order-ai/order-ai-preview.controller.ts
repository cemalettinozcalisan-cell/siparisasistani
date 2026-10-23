import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderAiVoicePreviewService } from './order-ai-voice-preview.service';

/**
 * P64: Ses önizleme ucu (Sipariş AI + AI Çalışanım test butonları için).
 * POST /api/order-ai/:tenantId/voice-preview { voice } → { ok, audioBase64, mimeType }
 */
@UseGuards(TenantGuard)
@Controller('order-ai')
export class OrderAiPreviewController {
  constructor(private readonly preview: OrderAiVoicePreviewService) {}

  @Roles('owner', 'manager')
  @Post(':tenantId/voice-preview')
  async voicePreview(@Param('tenantId') _tenantId: string, @Body() body: { voice?: string }) {
    const out = await this.preview.preview(String(body?.voice ?? ''));
    if (!out) return { ok: false };
    return { ok: true, ...out };
  }
}
