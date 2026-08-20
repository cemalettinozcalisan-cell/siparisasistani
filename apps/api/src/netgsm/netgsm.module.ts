import { Module } from '@nestjs/common';
import { NetgsmController } from './netgsm.controller';
import { IncomingCallWebhook } from './webhook/incoming-call';
import { CallEventsWebhook } from './webhook/call-events';
import { DtmfWebhook } from './webhook/dtmf';
import { RecordingsWebhook } from './webhook/recordings';
import { IncomingSmsWebhook } from './webhook/incoming-sms';
import { CallFlowService } from './call-flow.service';
import { NetgsmXmlBuilder } from './xml/xml-builder';
import { TelephonyProviderFactory } from './providers/provider.factory';
import { NetgsmProvider } from './providers/netgsm.provider';
import { AiModule } from '../ai/ai.module';
import { AiBrainModule } from '../ai/brain/ai-brain.module';
import { VoiceModule } from '../voice/voice.module';
import { OrderEngineModule } from '../order-engine/order-engine.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [AiModule, AiBrainModule, VoiceModule, OrderEngineModule],
  controllers: [NetgsmController],
  providers: [
    IncomingCallWebhook,
    CallEventsWebhook,
    DtmfWebhook,
    RecordingsWebhook,
    IncomingSmsWebhook,
    CallFlowService,
    NetgsmXmlBuilder,
    TelephonyProviderFactory,
    NetgsmProvider,
    SupabaseService,
  ],
  exports: [TelephonyProviderFactory, CallFlowService, NetgsmProvider],
})
export class NetgsmModule {}
