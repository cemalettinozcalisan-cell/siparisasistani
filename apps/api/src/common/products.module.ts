import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.client';
import { ProductLookupService } from './product-lookup.service';
import { AliasEngineModule } from '../alias-engine/alias-engine.module';

@Global()
@Module({
  imports: [AliasEngineModule],
  providers: [ProductLookupService, SupabaseService],
  exports: [ProductLookupService],
})
export class ProductsModule {}
