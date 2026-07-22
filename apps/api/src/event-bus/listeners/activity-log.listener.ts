import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class ActivityLogListener implements OnModuleInit {
  private readonly logger = new Logger(ActivityLogListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit() {
    // Disabled - replaced by OrderStatusService + NotificationEngine + TimelineService
  }
}
