import { Module } from '@nestjs/common';
import { OrderSummaryService } from './order-summary.service';

@Module({
  providers: [OrderSummaryService],
  exports: [OrderSummaryService],
})
export class OrderSummaryModule {}
