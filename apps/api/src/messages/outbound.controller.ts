import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { OutboundChannelFactory } from './outbound.factory';
import { OutboundService } from './outbound.service';
import { OutboundChannelName } from './outbound-channel.interface';

@Controller('outbound')
export class OutboundController {
  constructor(
    private readonly factory: OutboundChannelFactory,
    private readonly service: OutboundService,
  ) {}

  @Get('channels')
  async channels(@Query('tenantId') tenantId: string) {
    const names = this.factory.listChannels();
    const result: Record<string, { configured: boolean }> = {};
    for (const name of names) {
      result[name] = { configured: await this.factory.isConfigured(name, tenantId) };
    }
    return result;
  }

  @Get('health')
  async health(@Query('tenantId') tenantId: string) {
    return this.factory.healthCheckAll(tenantId);
  }

  @Post('send')
  async send(@Body() body: { tenantId: string; channel: OutboundChannelName; to?: string; body: string }) {
    return this.service.send({
      tenantId: body.tenantId,
      channel: body.channel,
      to: body.to,
      body: body.body,
    });
  }
}
