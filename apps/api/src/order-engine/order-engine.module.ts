import { Module } from '@nestjs/common';
import { OrderEngineService } from './order-engine.service';
import { OrderEngineController } from './order-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService } from '../event-bus/event-bus.service';

@Module({
  controllers: [OrderEngineController],
  providers: [OrderEngineService, SupabaseService, EventBusService],
  exports: [OrderEngineService],
})
export class OrderEngineModule {}
