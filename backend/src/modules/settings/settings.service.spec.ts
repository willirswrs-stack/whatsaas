import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SettingsService } from './settings.service';
import { TenantSettings } from './entities/tenant-settings.entity';
import {
    createMockRepository,
    mockTenantSettings,
    MockRepository,
} from '../../test-utils';

describe('SettingsService', () => {
    let service: SettingsService;
    let settingsRepo: MockRepository<TenantSettings>;

    beforeEach(async () => {
        settingsRepo = createMockRepository<TenantSettings>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                {
                    provide: getRepositoryToken(TenantSettings),
                    useValue: settingsRepo,
                },
            ],
        }).compile();

        service = module.get<SettingsService>(SettingsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getSettings', () => {
        it('should return masked API keys for existing settings', async () => {
            // Arrange
            const settings = mockTenantSettings({
                openaiKey: 'sk-1234567890abcdefghijklmnop',
                anthropicKey: 'sk-ant-1234567890abcdefgh',
            });
            settingsRepo.findOne!.mockResolvedValue(settings);

            // Act
            const result = await service.getSettings('tenant-123');

            // Assert
            expect(result.openaiKey).toMatch(/^sk-1234\*{4}.*$/);
            expect(result.anthropicKey).toMatch(/^sk-ant-\*{4}.*$/);
            expect(result.openaiKey).not.toBe(settings.openaiKey);
        });

        it('should create new settings if not found', async () => {
            // Arrange
            settingsRepo.findOne!.mockResolvedValue(null);
            settingsRepo.create!.mockImplementation((data) => ({ ...mockTenantSettings(), ...data, openaiKey: null, anthropicKey: null }));
            settingsRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            const result = await service.getSettings('new-tenant');

            // Assert
            expect(settingsRepo.create).toHaveBeenCalledWith({ tenantId: 'new-tenant' });
            expect(settingsRepo.save).toHaveBeenCalled();
            expect(result.openaiKey).toBe('');
        });

        it('should return empty string for null keys', async () => {
            // Arrange
            const settings = mockTenantSettings({
                openaiKey: null,
                anthropicKey: null,
                geminiKey: null,
                groqKey: null,
            });
            settingsRepo.findOne!.mockResolvedValue(settings);

            // Act
            const result = await service.getSettings('tenant-123');

            // Assert
            expect(result.openaiKey).toBe('');
            expect(result.anthropicKey).toBe('');
            expect(result.geminiKey).toBe('');
            expect(result.groqKey).toBe('');
        });
    });

    describe('updateSettings', () => {
        it('should update API keys when not masked', async () => {
            // Arrange
            const existingSettings = mockTenantSettings();
            settingsRepo.findOne!.mockResolvedValue(existingSettings);
            settingsRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            await service.updateSettings('tenant-123', {
                openaiKey: 'sk-new-key-12345678901234',
            });

            // Assert
            expect(settingsRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    openaiKey: 'sk-new-key-12345678901234',
                })
            );
        });

        it('should NOT update keys when value contains asterisks (masked)', async () => {
            // Arrange
            const existingSettings = mockTenantSettings({
                openaiKey: 'sk-original-key-12345678',
            });
            settingsRepo.findOne!.mockResolvedValue(existingSettings);
            settingsRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            await service.updateSettings('tenant-123', {
                openaiKey: 'sk-1234****5678', // Masked value from frontend
            });

            // Assert
            expect(settingsRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    openaiKey: 'sk-original-key-12345678', // Should keep original
                })
            );
        });

        it('should create settings if not found', async () => {
            // Arrange
            settingsRepo.findOne!.mockResolvedValue(null);
            settingsRepo.create!.mockImplementation((data) => ({ ...mockTenantSettings(), ...data }));
            settingsRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            await service.updateSettings('new-tenant', {
                openaiKey: 'sk-new-key-123456789',
            });

            // Assert
            expect(settingsRepo.create).toHaveBeenCalledWith({ tenantId: 'new-tenant' });
            expect(settingsRepo.save).toHaveBeenCalled();
        });

        it('should merge extraSettings with existing ones', async () => {
            // Arrange
            const existingSettings = mockTenantSettings({
                extraSettings: { feature1: true, feature2: 'old' },
            });
            settingsRepo.findOne!.mockResolvedValue(existingSettings);
            settingsRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            await service.updateSettings('tenant-123', {
                extraSettings: { feature2: 'new', feature3: 'added' },
            });

            // Assert
            expect(settingsRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    extraSettings: {
                        feature1: true,
                        feature2: 'new',
                        feature3: 'added',
                    },
                })
            );
        });
    });

    describe('getOpenAIKey', () => {
        it('should return the actual OpenAI key', async () => {
            // Arrange
            const settings = mockTenantSettings({ openaiKey: 'sk-real-key-12345' });
            settingsRepo.findOne!.mockResolvedValue(settings);

            // Act
            const result = await service.getOpenAIKey('tenant-123');

            // Assert
            expect(result).toBe('sk-real-key-12345');
        });

        it('should return null if settings not found', async () => {
            // Arrange
            settingsRepo.findOne!.mockResolvedValue(null);

            // Act
            const result = await service.getOpenAIKey('tenant-123');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('getAllLLMKeys', () => {
        it('should return all LLM keys', async () => {
            // Arrange
            const settings = mockTenantSettings({
                openaiKey: 'sk-openai',
                anthropicKey: 'sk-anthropic',
                geminiKey: 'gemini-key',
                groqKey: null,
            });
            settingsRepo.findOne!.mockResolvedValue(settings);

            // Act
            const result = await service.getAllLLMKeys('tenant-123');

            // Assert
            expect(result).toEqual({
                openaiKey: 'sk-openai',
                anthropicKey: 'sk-anthropic',
                geminiKey: 'gemini-key',
                groqKey: undefined,
            });
        });

        it('should return undefined for all keys if no settings', async () => {
            // Arrange
            settingsRepo.findOne!.mockResolvedValue(null);

            // Act
            const result = await service.getAllLLMKeys('tenant-123');

            // Assert
            expect(result.openaiKey).toBeUndefined();
            expect(result.anthropicKey).toBeUndefined();
        });
    });

    describe('maskKey', () => {
        it('should mask keys correctly', async () => {
            // We need to test the private method through getSettings
            const settings = mockTenantSettings({
                openaiKey: 'sk-1234567890abcdefghij',
            });
            settingsRepo.findOne!.mockResolvedValue(settings);

            const result = await service.getSettings('tenant-123');

            // First 7 chars + **** + last 4 chars
            expect(result.openaiKey).toBe('sk-1234****ghij');
        });

        it('should return empty string for short keys', async () => {
            const settings = mockTenantSettings({
                openaiKey: 'short', // Less than 8 chars
            });
            settingsRepo.findOne!.mockResolvedValue(settings);

            const result = await service.getSettings('tenant-123');

            expect(result.openaiKey).toBe('');
        });
    });
});
