import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SimulatorService, Persona, SimResult } from './simulator.service';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly svc: SimulatorService) {}

  @Get('personas')
  getPersonas(): Persona[] {
    return this.svc.getPersonas();
  }

  @Post('run/:tenantId')
  async run(@Param('tenantId') tenantId: string, @Body() body: { personaId: string }): Promise<SimResult> {
    const personas = this.svc.getPersonas();
    const persona = personas.find(p => p.id === body.personaId) || personas[0];
    return this.svc.runSingle(persona, tenantId);
  }

  @Post('run-all/:tenantId')
  async runAll(@Param('tenantId') tenantId: string): Promise<SimResult[]> {
    return this.svc.runAll(tenantId);
  }
}
