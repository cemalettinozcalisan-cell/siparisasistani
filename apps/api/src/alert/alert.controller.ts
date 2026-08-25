import { Controller, Get, Put, Body } from '@nestjs/common';
import { AlertRouterService } from './alert-router.service';

@Controller('alert')
export class AlertController {
  constructor(private readonly service: AlertRouterService) {}

  @Get('settings')
  async settings() {
    return this.service.getSettings();
  }

  @Put('settings')
  async updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body);
  }
}
