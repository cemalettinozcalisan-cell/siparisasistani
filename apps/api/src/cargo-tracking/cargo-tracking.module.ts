import { Module } from '@nestjs/common';
import { CargoTrackingService } from './cargo-tracking.service';
import { TimelineModule } from '../timeline/timeline.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [TimelineModule, EventBusModule],
  providers: [CargoTrackingService],
  exports: [CargoTrackingService],
})
export class CargoTrackingModule {}