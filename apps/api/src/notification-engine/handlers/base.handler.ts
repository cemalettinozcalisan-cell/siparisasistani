import { SystemEvent } from '../../event-bus/event-bus.service';

export interface NotificationHandler {
  readonly eventType: string;
  handle(event: SystemEvent): Promise<void>;
}
