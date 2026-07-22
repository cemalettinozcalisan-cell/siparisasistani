import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { EventBusListenersModule } from './listeners/event-bus-listeners.module';

@Global()
@Module({
  imports: [EventBusListenersModule],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
