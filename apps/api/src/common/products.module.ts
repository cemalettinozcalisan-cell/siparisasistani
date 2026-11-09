import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.client';
import { ProductLookupService } from './product-lookup.service';

@Global()
@Module({
  providers: [ProductLookupService, SupabaseService],
  exports: [ProductLookupService],
})
export class ProductsModule {}
