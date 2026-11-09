import { Module } from '@nestjs/common';
import { NotificationEngineService } from './notification-engine.service';
import { NotificationEngineController } from './notification-engine.controller';
import { OrderCreatedHandler } from './handlers/order-created.handler';
import { ComplaintHandler } from './handlers/complaint.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ShipmentHandler } from './handlers/shipment.handler';
import { VoiceHandler } from './handlers/voice.handler';
import { OrderUpdatedHandler } from './handlers/order-updated.handler';
import { OrderCancelledHandler } from './handlers/order-cancelled.handler';
import { SupabaseService } from '../common/supabase.client';
import { AiEmployeeModule } from '../ai-employee/ai-employee.module';

@Module({
  imports: [AiEmployeeModule],
  controllers: [NotificationEngineController],
  providers: [
    NotificationEngineService,
    OrderCreatedHandler,
    ComplaintHandler,
    PaymentHandler,
    ShipmentHandler,
    VoiceHandler,
    OrderUpdatedHandler,
    OrderCancelledHandler,
    SupabaseService,
  ],
})
export class NotificationEngineModule {}
