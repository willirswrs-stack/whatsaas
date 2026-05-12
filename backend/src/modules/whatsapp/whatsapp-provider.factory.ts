import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IWhatsAppProvider, ProviderType } from './whatsapp-provider.interface';
import { WahaAdapter } from './adapters/waha.adapter';
import { EvolutionAdapter } from './adapters/evolution.adapter';

/**
 * WhatsApp Provider Factory
 * Returns the appropriate provider adapter based on type
 */
@Injectable()
export class WhatsAppProviderFactory {
    private readonly logger = new Logger(WhatsAppProviderFactory.name);
    private readonly providers = new Map<ProviderType, IWhatsAppProvider>();

    constructor(
        private moduleRef: ModuleRef,
        private wahaAdapter: WahaAdapter,
        private evolutionAdapter: EvolutionAdapter,
    ) {
        this.providers.set('waha', wahaAdapter);
        this.providers.set('evolution', evolutionAdapter);
        this.providers.set('mobile_farm', evolutionAdapter);
        this.providers.set('antidetect', evolutionAdapter);
    }

    /**
     * Get provider by type
     */
    getProvider(providerType: ProviderType): IWhatsAppProvider {
        const provider = this.providers.get(providerType);

        if (!provider) {
            this.logger.error(`Unknown provider type: ${providerType}`);
            throw new Error(`Unknown WhatsApp provider: ${providerType}`);
        }

        this.logger.debug(`Using provider: ${providerType}`);
        return provider;
    }

    /**
     * Get all available provider types
     */
    getAvailableProviders(): ProviderType[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a provider is available
     */
    isProviderAvailable(providerType: ProviderType): boolean {
        return this.providers.has(providerType);
    }
}
