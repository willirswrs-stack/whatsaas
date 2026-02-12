import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';

import { WhatsAppProviderFactory } from './whatsapp-provider.factory';
import { WahaAdapter } from './adapters/waha.adapter';
import { EvolutionAdapter } from './adapters/evolution.adapter';
import { mockWhatsAppProvider } from '../../test-utils';

describe('WhatsAppProviderFactory', () => {
    let factory: WhatsAppProviderFactory;
    let wahaAdapter: jest.Mocked<WahaAdapter>;
    let evolutionAdapter: jest.Mocked<EvolutionAdapter>;

    beforeEach(async () => {
        wahaAdapter = mockWhatsAppProvider({ providerType: 'waha' }) as any;

        evolutionAdapter = mockWhatsAppProvider({ providerType: 'evolution' }) as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WhatsAppProviderFactory,
                { provide: ModuleRef, useValue: {} },
                { provide: WahaAdapter, useValue: wahaAdapter },
                { provide: EvolutionAdapter, useValue: evolutionAdapter },
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
            expect(providers).toHaveLength(2);
        });
    });

    describe('isProviderAvailable', () => {
        it('should return true for registered providers', () => {
            expect(factory.isProviderAvailable('waha')).toBe(true);
            expect(factory.isProviderAvailable('evolution')).toBe(true);
        });

        it('should return false for unknown providers', () => {
            expect(factory.isProviderAvailable('unknown' as any)).toBe(false);
        });
    });
});
