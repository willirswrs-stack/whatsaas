import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';

import { WhatsAppProviderFactory } from './whatsapp-provider.factory';
import { WahaAdapter } from './adapters/waha.adapter';
import { EvolutionAdapter } from './adapters/evolution.adapter';
import { WwebjsAdapter } from './adapters/wwebjs.adapter';
import { mockWhatsAppProvider } from '../../test-utils';

describe('WhatsAppProviderFactory', () => {
    let factory: WhatsAppProviderFactory;
    let wahaAdapter: jest.Mocked<WahaAdapter>;
    let evolutionAdapter: jest.Mocked<EvolutionAdapter>;
    let wwebjsAdapter: jest.Mocked<WwebjsAdapter>;

    beforeEach(async () => {
        wahaAdapter = mockWhatsAppProvider() as any;
        wahaAdapter.providerType = 'waha';

        evolutionAdapter = mockWhatsAppProvider() as any;
        evolutionAdapter.providerType = 'evolution';

        wwebjsAdapter = mockWhatsAppProvider() as any;
        wwebjsAdapter.providerType = 'wwebjs';

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WhatsAppProviderFactory,
                { provide: ModuleRef, useValue: {} },
                { provide: WahaAdapter, useValue: wahaAdapter },
                { provide: EvolutionAdapter, useValue: evolutionAdapter },
                { provide: WwebjsAdapter, useValue: wwebjsAdapter },
            ],
        }).compile();

        factory = module.get<WhatsAppProviderFactory>(WhatsAppProviderFactory);
    });

    describe('getProvider', () => {
        it('should return WAHA adapter for "waha" type', () => {
            const provider = factory.getProvider('waha');
            expect(provider.providerType).toBe('waha');
        });

        it('should return Evolution adapter for "evolution" type', () => {
            const provider = factory.getProvider('evolution');
            expect(provider.providerType).toBe('evolution');
        });

        it('should return wwebjs adapter for "wwebjs" type', () => {
            const provider = factory.getProvider('wwebjs');
            expect(provider.providerType).toBe('wwebjs');
        });

        it('should throw error for unknown provider type', () => {
            expect(() => factory.getProvider('unknown' as any))
                .toThrow('Unknown WhatsApp provider: unknown');
        });
    });

    describe('getAvailableProviders', () => {
        it('should return all registered provider types', () => {
            const providers = factory.getAvailableProviders();

            expect(providers).toContain('waha');
            expect(providers).toContain('evolution');
            expect(providers).toContain('wwebjs');
            expect(providers).toHaveLength(3);
        });
    });

    describe('isProviderAvailable', () => {
        it('should return true for registered providers', () => {
            expect(factory.isProviderAvailable('waha')).toBe(true);
            expect(factory.isProviderAvailable('evolution')).toBe(true);
            expect(factory.isProviderAvailable('wwebjs')).toBe(true);
        });

        it('should return false for unknown providers', () => {
            expect(factory.isProviderAvailable('unknown' as any)).toBe(false);
        });
    });
});
