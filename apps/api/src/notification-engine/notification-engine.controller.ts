import { Controller, Post, Body } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@Controller('notify')
export class NotificationEngineController {
  constructor(private readonly eventBus: EventBusService) {}

  @Post('test')
  async testNotification(@Body() body: { type: string; tenantId: string; payload: Record<string, unknown> }) {
    this.eventBus.emit(SystemEvents[body.type as keyof typeof SystemEvents] || SystemEvents.ORDER_CREATED, body.tenantId, body.payload);
    return { status: 'sent', type: body.type };
  }
}
