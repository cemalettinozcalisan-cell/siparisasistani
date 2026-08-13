import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimiterMiddleware } from './common/rate-limiter';
import { EventBusModule } from './event-bus/event-bus.module';
import { OrderEngineModule } from './order-engine/order-engine.module';
import { AiModule } from './ai/ai.module';
import { CallSessionsModule } from './call-sessions/call-sessions.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { PrintQueueModule } from './print-queue/print-queue.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { PaymentsModule } from './payments/payments.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

import { AiAuditModule } from './ai/audit/ai-audit.module';
import { DashboardController } from './dashboard/dashboard.controller';
import { CustomersController } from './customers/customers.controller';
import { CustomerPricesController } from './customers/customer-prices.controller';
import { ProductsController } from './products/products.controller';
import { SettingsController } from './settings/settings.controller';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AiTestModule } from './ai-test/ai-test.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { ReplayModule } from './replay/replay.module';
import { SupabaseService } from './common/supabase.client';
import { NetgsmModule } from './netgsm/netgsm.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AliasEngineModule } from './alias-engine/alias-engine.module';
import { ClarificationModule } from './clarification/clarification.module';
import { ReviewerModule } from './reviewer/reviewer.module';
import { MissingInfoModule } from './missing-info/missing-info.module';
import { ResponseValidatorModule } from './response-validator/response-validator.module';
import { QualityModule } from './quality/quality.module';
import { OrderProcessorModule } from './order-processor/order-processor.module';
import { TimelineModule } from './timeline/timeline.module';
import { ComplaintProcessorModule } from './complaint-processor/complaint-processor.module';
import { NotificationEngineModule } from './notification-engine/notification-engine.module';
import { PaymentEngineModule } from './payment-engine/payment-engine.module';
import { OrderStatusModule } from './order-status/order-status.module';
import { OrdersListModule } from './orders-list/orders-list.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { ConversationsModule } from './conversations/conversations.module';
import { WhatsAppMessagesModule } from './whatsapp-messages/whatsapp-messages.module';
import { ExportModule } from './export/export.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsApiModule } from './notifications-api/notifications-api.module';
import { AiAuditCenterModule } from './ai-audit-center/ai-audit-center.module';
import { SaasModule } from './saas/saas.module';
import { AdminModule } from './admin/admin.module';
import { LicenseModule } from './license/license.module';
import { FollowUpModule } from './followup/followup.module';
import { AiBrainModule } from './ai/brain/ai-brain.module';
import { OrderLockModule } from './order-lock/order-lock.module';
import { VoiceModule } from './voice/voice.module';
import { InstagramModule } from './instagram/instagram.module';
import { WebhookModule } from './webhook/webhook.module';
import { KvkkModule } from './kvkk/kvkk.module';
import { BackupModule } from './backup/backup.module';
import { ContactModule } from './contact/contact.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { QueueMonitorModule } from './queue-monitor/queue-monitor.module';
import { SalesEngineModule } from './sales-engine/sales-engine.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    EventBusModule,
    OrderEngineModule,
    AiModule,
    CallSessionsModule,
    WhatsAppModule,
    PrintQueueModule,
    ShipmentsModule,
    PaymentsModule,
    ActivityLogModule,

    AiAuditModule,
    OnboardingModule,
    AiTestModule,
    SearchModule,
    HealthModule,
    ReplayModule,
    AiBrainModule,
    OrderLockModule,
    VoiceModule,
    NetgsmModule,
    CampaignsModule,
    AliasEngineModule,
    ClarificationModule,
    ReviewerModule,
    MissingInfoModule,
    ResponseValidatorModule,
    QualityModule,
    OrderProcessorModule,
    TimelineModule,
    ComplaintProcessorModule,
    NotificationEngineModule,
    PaymentEngineModule,
    OrderStatusModule,
    OrdersListModule,
    OrderItemsModule,
    ConversationsModule,
    WhatsAppMessagesModule,
    ExportModule,
    AuthModule,
    UsersModule,
    NotificationsApiModule,
    AiAuditCenterModule,
    SaasModule,
    AdminModule,
    LicenseModule,
    FollowUpModule,
    InstagramModule,
    WebhookModule,
    KvkkModule,
    BackupModule,
    ContactModule,
    ApiKeysModule,
    QueueMonitorModule,
    SalesEngineModule,
  ],
  controllers: [
    DashboardController,
    CustomersController,
    CustomerPricesController,
    ProductsController,
    SettingsController,
  ],
  providers: [SupabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimiterMiddleware).forRoutes('*');
  }
}
