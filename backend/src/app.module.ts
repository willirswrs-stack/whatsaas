
import { Module } from '@nestjs/common';
import { AdminPanelsModule } from './admin/admin-panels.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';

// Modules
import { HealthModule } from './modules/health/health.module';
import { BullBoardModule } from './modules/bull-board/bull-board.module';
import { AuthModule } from './modules/auth/auth.module';
import { EvolutionModule } from './modules/evolution/evolution.module';
import { DispatcherModule } from './modules/dispatcher/dispatcher.module';
import { AiModule } from './modules/ai/ai.module';
import { InstancesModule } from './modules/instances/instances.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { MetaTemplatesModule } from './modules/meta-templates/meta-templates.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { FlowsModule } from './modules/flows/flows.module';
import { AntiBanModule } from './modules/anti-ban/anti-ban.module';
import { EventsModule } from './modules/events/events.module';
import { ReconnectionModule } from './modules/reconnection/reconnection.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { OrderWebhooksModule } from './modules/order-webhooks/order-webhooks.module';


@Module({
  imports: [
    // Environment Configuration & Validation (Fail Fast)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // Allow other env vars
        abortEarly: true,   // Stop on first error
      },
    }),

    // Structured Logging (Pino)
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
          transport: config.get('NODE_ENV') !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
          genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
          autoLogging: {
            ignore: (req) => req.url === '/api/v1/health', // Ignore health checks logs
          },
        },
      }),
    }),

    // Serve Static Files (Uploads)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Database (PostgreSQL)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: parseInt(configService.get<string>('DATABASE_PORT') || '5432', 10),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
          // Sync False em produção/dev consistente
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),

    // Queue (Redis + BullMQ)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          password: configService.get<string>('REDIS_PASSWORD'),
        };
        console.log('🔌 [APP-MODULE] Connection:', redisConfig);
        return {
          connection: redisConfig,
          defaultJobOptions: {
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Application Modules
    HealthModule,
    BullBoardModule, // <-- Monitoramento de Filas
    EventsModule,
    CryptoModule,
    AuthModule,
    EvolutionModule,
    DispatcherModule,
    AiModule,
    InstancesModule,
    CampaignsModule,
    WhatsAppModule,
    AdminPanelsModule,
    MetaTemplatesModule,
    SettingsModule,
    ContactsModule,
    FlowsModule,
    AntiBanModule,
    ReconnectionModule,
    UploadsModule,
    OrderWebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
})
export class AppModule { }
