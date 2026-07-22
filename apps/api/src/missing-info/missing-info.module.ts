import { Module } from '@nestjs/common';
import { MissingInfoService } from './missing-info.service';

@Module({
  providers: [MissingInfoService],
  exports: [MissingInfoService],
})
export class MissingInfoModule {}
