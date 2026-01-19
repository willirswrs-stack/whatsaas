import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WahaAdapter } from './adapters/waha.adapter';
import { EvolutionAdapter } from './adapters/evolution.adapter';
import { WhatsAppProviderFactory } from './whatsapp-provider.factory';

/**
 * WhatsApp Module
 * Provides WhatsApp provider adapters (WAHA, Evolution)
 * 
 * @Global so it can be injected anywhere without importing
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        WahaAdapter,
        EvolutionAdapter,
        WhatsAppProviderFactory,
    ],
    exports: [
        WahaAdapter,
        EvolutionAdapter,
        WhatsAppProviderFactory,
    ],
})
export class WhatsAppModule { }
