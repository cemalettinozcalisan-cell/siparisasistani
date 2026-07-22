import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ProductsController } from './products/products.controller';
import { SettingsController } from './settings/settings.controller';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AiTestModule } from './ai-test/ai-test.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { ReplayModule } from './replay/replay.module';
import { SupabaseService } from './common/supabase.client';
import { NetgsmModule } from './netgsm/netgsm.module';
import { DemoModule } from './demo/demo.module';
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
import { ExportModule } from './export/export.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LicenseModule } from './license/license.module';
import { FollowUpModule } from './followup/followup.module';
import { AiBrainModule } from './ai/brain/ai-brain.module';
import { OrderLockModule } from './order-lock/order-lock.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    DemoModule,
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
    ExportModule,
    AuthModule,
    UsersModule,
    LicenseModule,
    FollowUpModule,
  ],
  controllers: [
    DashboardController,
    CustomersController,
    ProductsController,
    SettingsController,
  ],
  providers: [SupabaseService],
})
export class AppModule {}
