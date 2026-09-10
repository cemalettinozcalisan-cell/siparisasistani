import { Module } from '@nestjs/common';
import { AiEmployeeController } from './ai-employee.controller';
import { AiEmployeeService } from './ai-employee.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [AiEmployeeController],
  providers: [AiEmployeeService, SupabaseService],
  exports: [AiEmployeeService],
})
export class AiEmployeeModule {}