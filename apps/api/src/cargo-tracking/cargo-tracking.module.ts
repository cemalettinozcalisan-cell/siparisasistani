import { Module } from '@nestjs/common';
import { CargoTrackingService } from './cargo-tracking.service';
import { CargoTrackingController } from './cargo-tracking.controller';
import { CargoFirmFactory } from './cargo.factory';
import { YurticiProvider } from './providers/yurtici.provider';
import { ArasProvider } from './providers/aras.provider';
import { MngProvider } from './providers/mng.provider';
import { DhlProvider } from './providers/dhl.provider';
import { SuratProvider } from './providers/surat.provider';
import { PttProvider } from './providers/ptt.provider';
import { TimelineModule } from '../timeline/timeline.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [TimelineModule, EventBusModule],
  controllers: [CargoTrackingController],
  providers: [
    CargoTrackingService,
    CargoFirmFactory,
    SupabaseService,
    YurticiProvider,
    ArasProvider,
    MngProvider,
    DhlProvider,
    SuratProvider,
    PttProvider,
  ],
  exports: [CargoTrackingService],
})
export class CargoTrackingModule {}