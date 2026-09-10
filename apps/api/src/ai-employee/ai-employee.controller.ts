import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { AiEmployeeService, AiEmployeeConfig } from './ai-employee.service';
import { VoiceNotificationService } from './voice-notification.service';
import { AiEmployeeConversationService } from './ai-employee-conversation.service';

@UseGuards(TenantGuard)
@Controller('ai-employee')
export class AiEmployeeController {
  constructor(
    private readonly service: AiEmployeeService,
    private readonly voice: VoiceNotificationService,
    private readonly conversation: AiEmployeeConversationService,
  ) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async get(@Param('tenantId') tenantId: string): Promise<AiEmployeeConfig> {
    return this.service.get(tenantId);
  }

  @Roles('owner', 'manager')
  @Put(':tenantId')
  async update(@Param('tenantId') tenantId: string, @Body() body: Partial<AiEmployeeConfig>): Promise<AiEmployeeConfig> {
    return this.service.update(tenantId, body);
  }

  @Roles('owner', 'manager')
  @Get(':tenantId/voice/pending')
  async pending(@Param('tenantId') tenantId: string) {
    return this.voice.getPending(tenantId);
  }

  @Roles('owner', 'manager')
  @Post(':tenantId/voice/ack')
  async ack(@Param('tenantId') tenantId: string, @Body() body: { id: string }) {
    if (body?.id) await this.voice.acknowledge(tenantId, body.id);
    return { ok: true };
  }

  @Roles('owner', 'manager')
  @Post(':tenantId/voice/speak')
  async speak(@Param('tenantId') tenantId: string, @Body() body: { text: string }) {
    const audioUrl = await this.voice.speak(tenantId, String(body?.text || ''));
    return { audioUrl };
  }

  @Roles('owner', 'manager')
  @Post(':tenantId/voice/test')
  async test(@Param('tenantId') tenantId: string) {
    const cfg = await this.service.get(tenantId);
    const sal = cfg.salutation === 'ozel' ? (cfg.custom_salutation || 'Patron') : cfg.salutation === 'usta' ? 'Ustam' : cfg.salutation === 'bey' ? 'Beyefendi' : cfg.salutation === 'hanim' ? 'Hanımefendi' : cfg.salutation === 'abi' ? 'Abi' : cfg.salutation === 'kardesim' ? 'Kardeşim' : 'Patron';
    const audioUrl = await this.voice.speak(tenantId, `${sal}, merhaba. Ben ${cfg.name}. Siparişleriniz ve işletme işlemleriniz konusunda size yardımcı olmak için hazırım.`);
    return { audioUrl };
  }

  @Roles('owner', 'manager')
  @Post(':tenantId/conversation')
  async converse(@Param('tenantId') tenantId: string, @Body() body: { text: string }) {
    return this.conversation.converse(tenantId, String(body?.text || '').trim());
  }
}