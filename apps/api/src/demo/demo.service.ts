import { Injectable, Logger } from '@nestjs/common';
import { DEMO_SCENARIOS, DemoSceanrio, DemoStep } from './demo-scenarios';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private activeSessions: Map<string, { scenarioId: string; stepIndex: number; tenantId: string }> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  getScenarios(): DemoSceanrio[] {
    return DEMO_SCENARIOS;
  }

  startSession(sessionId: string, scenarioId: string, tenantId: string): DemoStep {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario "${scenarioId}" not found`);

    this.activeSessions.set(sessionId, { scenarioId, stepIndex: 0, tenantId });
    return scenario.steps[0];
  }

  processMessage(sessionId: string, userMessage: string): DemoStep {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Demo session not found');

    const scenario = DEMO_SCENARIOS.find((s) => s.id === session.scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    session.stepIndex++;

    if (session.stepIndex >= scenario.steps.length) {
      this.activeSessions.delete(sessionId);
      return {
        userMessage: '',
        aiReply: 'Demo senaryosu tamamlandı. Sipariş akışını baştan başlatmak için yeni bir görüşme başlatın.',
        confidence: 100,
        action: 'end',
      };
    }

    const step = scenario.steps[session.stepIndex];

    if (step.action === 'order_created') {
      this.eventBus.emit(SystemEvents.ORDER_CREATED, session.tenantId, {
        entityType: 'order',
        orderNumber: step.orderNumber,
        description: `[DEMO] Sipariş #${step.orderNumber} oluşturuldu`,
        demo: true,
      }, `demo-${step.orderNumber}`);
    }

    if (step.action === 'human_transfer') {
      this.eventBus.emit(SystemEvents.HUMAN_REQUIRED, session.tenantId, {
        entityType: 'demo',
        description: '[DEMO] İnsan müdahalesi gerekiyor',
        demo: true,
      });
    }

    return step;
  }

  resetSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  isDemoMode(tenantId?: string): boolean {
    return tenantId === 'demo' || tenantId === 'demo-tenant-id' || !tenantId;
  }
}
