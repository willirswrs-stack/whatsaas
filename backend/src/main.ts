import './instrument';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import * as express from 'express';
import * as path from 'path';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // Buffer logs during startup to avoid losing them
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Use Structured Logging (Pino)
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Security: Helmet
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // Increase payload limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global Exception Filter (Consistent Errors)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-ID'],
  });

  // Serve uploaded files statically (before global prefix to avoid /api/v1 prefix)
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatSaas API')
    .setDescription('WhatsApp Marketing SaaS Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'Health Check')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Start Server
  const port = process.env.PORT || 3333;

  // BIND TO 0.0.0.0 IS CRITICAL FOR DOCKER/IPV4
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`🚀 WhatSaas API is running on: ${await app.getUrl()}`);
  logger.log(`📄 Swagger Docs available at: ${await app.getUrl()}/docs`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Graceful Shutdown - Critical for production (Docker SIGTERM)
  const shutdown = async (signal: string) => {
    logger.log(`⚠️ Received ${signal}. Starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('✅ Application closed gracefully.');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
