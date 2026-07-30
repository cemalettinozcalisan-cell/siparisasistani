import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private readonly service: BackupService) {}

  @Get('run')
  async runBackup() {
    return this.service.runBackup();
  }

  @Get('list')
  async listBackups() {
    return this.service.listBackups();
  }

  @Get('download/:filename')
  async download(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = await this.service.downloadBackup(filename);
    if (!filePath) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    const stream = fs.createReadStream(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  }
}
