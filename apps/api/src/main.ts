import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exception.filter';
import { SentryGlobalFilter } from './common/sentry.filter';
import { validateEnvironment } from './common/env.validation';

async function bootstrap() {
  validateEnvironment();

  // Initialize Sentry if DSN is configured
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    try {
      const Sentry = require('@sentry/nestjs');
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      });
      console.log('Sentry initialized');
    } catch (e) {
      console.warn('Sentry init failed, continuing without monitoring');
    }
  } else {
    console.warn('SENTRY_DSN not configured - crash monitoring disabled');
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalFilters(new SentryGlobalFilter(), new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`SiparisAsistani API running on port ${port}`);
}
bootstrap();
