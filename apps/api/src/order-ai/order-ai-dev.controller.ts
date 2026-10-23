import { Controller, Post, Body, ForbiddenException } from '@nestjs/common';
import { OrderAiToolsService } from './order-ai-tools.service';

/**
 * F0: Geçici test ucu (yalnızca geliştirme). F1'de yerini WS gateway alır.
 * Production'da kapalıdır (NODE_ENV=production → 403).
 */
@Controller('order-ai/dev')
export class OrderAiDevController {
  constructor(private readonly tools: OrderAiToolsService) {}

  private guardDev() {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException('order-ai dev ucu kapalı');
  }

  @Post('tool')
  async tool(@Body() body: { tenantId: string; sessionId?: string; tool: string; args?: Record<string, unknown> }) {
    this.guardDev();
    return this.tools.runTool(body.tenantId, body.sessionId || 'dev', body.tool, body.args || {});
  }

  @Post('reset')
  async reset(@Body() body: { tenantId: string; sessionId?: string }) {
    this.guardDev();
    this.tools.reset(body.tenantId, body.sessionId || 'dev');
    return { ok: true };
  }
}
