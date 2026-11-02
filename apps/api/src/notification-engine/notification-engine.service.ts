import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { OrderCreatedHandler } from './handlers/order-created.handler';
import { ComplaintHandler } from './handlers/complaint.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ShipmentHandler } from './handlers/shipment.handler';
import { VoiceHandler } from './handlers/voice.handler';
import { NotificationHandler } from './handlers/base.handler';

@Injectable()
export class NotificationEngineService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEngineService.name);
  private handlers = new Map<string, NotificationHandler[]>();

  constructor(
    private readonly eventBus: EventBusService,
    orderCreated: OrderCreatedHandler,
    complaint: ComplaintHandler,
    payment: PaymentHandler,
    shipment: ShipmentHandler,
    voice: VoiceHandler,
  ) {
    this.register(orderCreated);
    this.register(complaint);
    this.register(payment);
    this.register(shipment);
    // Kargo gönderimi iki farklı olay adıyla yayınlanabilir (STATUS_UPDATED / ORDER_SHIPPED)
    this.add(SystemEvents.ORDER_SHIPPED, shipment);
    // Ödeme onayı (dekont / link) geldiğinde de sipariş bildirimi düşer — aynı handler
    this.add(SystemEvents.ORDER_PAYMENT_CONFIRMED, orderCreated);
    // AI Çalışanım sesli bildirim kanalı — birden çok event dinler.
    // ÖNEMLİ: aynı olay birden çok handler'a gidebilir; map tek handler tutmaz (voice, orderCreated'ı ezmemeli).
    for (const evt of [SystemEvents.ORDER_CREATED, SystemEvents.ORDER_UPDATED, SystemEvents.COMPLAINT_CREATED, SystemEvents.REQUEST_CREATED, SystemEvents.SUBSCRIPTION_THRESHOLD, SystemEvents.SYSTEM_HEALTH_FAILED]) {
      this.add(evt, voice);
    }
  }

  private register(handler: NotificationHandler) {
    this.add(handler.eventType, handler);
  }

  private add(eventType: string, handler: NotificationHandler) {
    const list = this.handlers.get(eventType) || [];
    if (!list.includes(handler)) list.push(handler);
    this.handlers.set(eventType, list);
  }

  onModuleInit() {
    this.eventBus.onAll().subscribe((event) => {
      // Exact event type -> tüm handler'lar (orderCreated + voice gibi)
      const list = this.handlers.get(event.type);
      this.logger.debug(`[engine] ${event.type} -> ${(list || []).map((h) => h.eventType).join(',') || 'HANDLER YOK'}`);
      if (list?.length) {
        for (const handler of list) {
          handler.handle(event).catch((err) => {
            this.logger.error(`Handler ${handler.eventType} failed: ${(err as Error).message}`);
          });
        }
        return;
      }
      // Payment events: PAYMENT_CREATED, PAYMENT_RECEIVED, etc. -> PAYMENT_EVENT handler
      if (event.type.startsWith('PAYMENT_')) {
        for (const handler of this.handlers.get('PAYMENT_EVENT') || []) {
          handler.handle(event).catch((err) => {
            this.logger.error(`PaymentHandler failed: ${(err as Error).message}`);
          });
        }
      }
    });
    this.logger.log(`NotificationEngine started with ${this.handlers.size} event types`);
  }
}
