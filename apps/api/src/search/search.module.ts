import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [SearchController],
  providers: [SupabaseService],
})
export class SearchModule {}
