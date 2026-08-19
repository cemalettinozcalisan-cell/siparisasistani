import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { OrderCreatedHandler } from './handlers/order-created.handler';
import { ComplaintHandler } from './handlers/complaint.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ShipmentHandler } from './handlers/shipment.handler';
import { NotificationHandler } from './handlers/base.handler';

@Injectable()
export class NotificationEngineService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEngineService.name);
  private handlers = new Map<string, NotificationHandler>();

  constructor(
    private readonly eventBus: EventBusService,
    orderCreated: OrderCreatedHandler,
    complaint: ComplaintHandler,
    payment: PaymentHandler,
    shipment: ShipmentHandler,
  ) {
    this.register(orderCreated);
    this.register(complaint);
    this.register(payment);
    this.register(shipment);
    // Kargo gönderimi iki farklı olay adıyla yayınlanabilir (STATUS_UPDATED / ORDER_SHIPPED)
    this.handlers.set(SystemEvents.ORDER_SHIPPED, shipment);
  }

  private register(handler: NotificationHandler) {
    this.handlers.set(handler.eventType, handler);
  }

  onModuleInit() {
    this.eventBus.onAll().subscribe((event) => {
      // Direct handler for exact event type
      const handler = this.handlers.get(event.type);
      if (handler) {
        handler.handle(event).catch((err) => {
          this.logger.error(`Handler ${handler.eventType} failed: ${(err as Error).message}`);
        });
        return;
      }
      // Payment events: PAYMENT_CREATED, PAYMENT_RECEIVED, etc. -> PAYMENT_EVENT handler
      if (event.type.startsWith('PAYMENT_')) {
        const paymentHandler = this.handlers.get('PAYMENT_EVENT');
        if (paymentHandler) {
          paymentHandler.handle(event).catch((err) => {
            this.logger.error(`PaymentHandler failed: ${(err as Error).message}`);
          });
        }
      }

    });
    this.logger.log(`NotificationEngine started with ${this.handlers.size} handlers`);
  }
}
