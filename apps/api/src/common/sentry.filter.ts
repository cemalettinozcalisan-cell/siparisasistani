import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class SentryGlobalFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SentryGlobalFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    try {
      const Sentry = require('@sentry/nestjs');
      Sentry.captureException(exception);
    } catch {}
    this.logger.error('Unhandled exception forwarded to Sentry');
    super.catch(exception, host);
  }
}
