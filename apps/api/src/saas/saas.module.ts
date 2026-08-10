import { Module } from '@nestjs/common';
import { SaasController } from './saas.controller';
import { SaasService } from './saas.service';
import { SupabaseService } from '../common/supabase.client';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [TimelineModule],
  controllers: [SaasController],
  providers: [SaasService, SupabaseService],
})
export class SaasModule {}
