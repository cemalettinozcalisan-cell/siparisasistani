import { Injectable, Logger } from '@nestjs/common';
import { Subject, filter, Observable } from 'rxjs';

export enum SystemEvents {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAYMENT_CONFIRMED = 'ORDER_PAYMENT_CONFIRMED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_LINK_SENT = 'PAYMENT_LINK_SENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  PAYMENT_REMINDER_SENT = 'PAYMENT_REMINDER_SENT',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  CALLBACK_REQUIRED = 'CALLBACK_REQUIRED',
  HUMAN_REQUIRED = 'HUMAN_REQUIRED',
  PRINT_REQUESTED = 'PRINT_REQUESTED',
  WHATSAPP_NOTIFICATION = 'WHATSAPP_NOTIFICATION',
  ACTIVITY_LOG = 'ACTIVITY_LOG',
}

export interface SystemEvent {
  type: SystemEvents;
  tenantId: string;
  entityId?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private eventSubject = new Subject<SystemEvent>();

  emit(type: SystemEvents, tenantId: string, payload: Record<string, unknown>, entityId?: string): void {
    const event: SystemEvent = {
      type,
      tenantId,
      entityId,
      payload,
      timestamp: new Date(),
    };

    this.logger.debug(`Event: ${type} for tenant ${tenantId}`);
    this.eventSubject.next(event);
  }

  on(eventType: SystemEvents): Observable<SystemEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((event) => event.type === eventType),
    );
  }

  onAll(): Observable<SystemEvent> {
    return this.eventSubject.asObservable();
  }
}
