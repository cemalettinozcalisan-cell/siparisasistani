import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

@Controller('whatsapp-templates')
export class WhatsappTemplatesController {
  constructor(private readonly service: WhatsappTemplatesService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: { name: string; category?: string; language?: string; body: string; variables?: { key: string; label: string }[] }) {
    return this.service.create(tenantId, body);
  }

  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Partial<{ name: string; category: string; body: string; variables: { key: string; label: string }[] }>) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':tenantId/:id/submit')
  async submit(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.submitToMeta(tenantId, id);
  }

  @Delete(':tenantId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    await this.service.remove(tenantId, id);
    return { success: true };
  }
}
