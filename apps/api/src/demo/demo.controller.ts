import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DemoService } from './demo.service';

@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get('scenarios')
  async getScenarios() {
    return this.demo.getScenarios();
  }

  @Post('start')
  async startSession(@Body() body: { sessionId: string; scenarioId: string; tenantId?: string }) {
    const step = this.demo.startSession(body.sessionId, body.scenarioId, body.tenantId || 'demo-tenant-id');
    return { sessionId: body.sessionId, scenarioId: body.scenarioId, step };
  }

  @Post('message')
  async processMessage(@Body() body: { sessionId: string; message: string }) {
    const step = this.demo.processMessage(body.sessionId, body.message);
    return { sessionId: body.sessionId, step };
  }

  @Post('reset/:sessionId')
  async resetSession(@Param('sessionId') sessionId: string) {
    this.demo.resetSession(sessionId);
    return { status: 'ok' };
  }
}
