import { Module } from '@nestjs/common';
import { NotificationEngineService } from './notification-engine.service';
import { NotificationEngineController } from './notification-engine.controller';
import { OrderCreatedHandler } from './handlers/order-created.handler';
import { ComplaintHandler } from './handlers/complaint.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ShipmentHandler } from './handlers/shipment.handler';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [NotificationEngineController],
  providers: [
    NotificationEngineService,
    OrderCreatedHandler,
    ComplaintHandler,
    PaymentHandler,
    ShipmentHandler,
    SupabaseService,
  ],
})
export class NotificationEngineModule {}
