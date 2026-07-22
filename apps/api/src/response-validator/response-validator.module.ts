import { Module } from '@nestjs/common';
import { ResponseValidatorService } from './response-validator.service';

@Module({
  providers: [ResponseValidatorService],
  exports: [ResponseValidatorService],
})
export class ResponseValidatorModule {}
