import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { EventBusListenersModule } from './listeners/event-bus-listeners.module';
import { RealtimeEventsGateway } from './realtime-events.gateway';
import { EventsStreamController } from './events-stream.controller';

@Global()
@Module({
  imports: [EventBusListenersModule],
  controllers: [EventsStreamController],
  providers: [EventBusService, RealtimeEventsGateway],
  exports: [EventBusService],
})
export class EventBusModule {}
