import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportChatService } from './support-chat.service';

@Controller('support')
export class SupportController {
  constructor(
    private readonly service: SupportService,
    private readonly chat: SupportChatService,
  ) {}

  /** Chat: sohbet geçmişi (oturumlar) */
  @Get(':tenantId/chat/sessions')
  async chatSessions(@Param('tenantId') tenantId: string) {
    return this.chat.listSessions(tenantId);
  }

  /** Chat: bir oturumun mesajları */
  @Get(':tenantId/chat/sessions/:sessionId')
  async chatMessages(@Param('tenantId') tenantId: string, @Param('sessionId') sessionId: string) {
    return this.chat.getSessionMessages(sessionId);
  }

  /** Chat: yeni mesaj gönder (oturum yoksa oluşturur) */
  @Post(':tenantId/chat')
  async chatMessage(@Param('tenantId') tenantId: string, @Body() body: { sessionId?: string; message: string }) {
    return this.chat.handleMessage(tenantId, body.sessionId, body.message);
  }

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('status') status?: string) {
    return this.service.list(tenantId, status);
  }

  @Get(':tenantId/:id')
  async get(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.get(tenantId, id);
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: { subject: string; category?: string; description?: string; priority?: string }) {
    return this.service.create(tenantId, body);
  }

  @Post(':tenantId/:id/messages')
  async addMessage(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { sender?: string; message: string },
  ) {
    return this.service.addMessage(tenantId, id, body);
  }

  @Post(':tenantId/:id/diagnose')
  async diagnose(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.runAIDiagnosis(tenantId, id);
  }

  @Patch(':tenantId/:id/status')
  async updateStatus(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(tenantId, id, body.status);
  }
}
