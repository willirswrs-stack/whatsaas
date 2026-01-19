import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
    let controller: SettingsController;
    let settingsService: jest.Mocked<Partial<SettingsService>>;

    beforeEach(async () => {
        settingsService = {
            getSettings: jest.fn().mockResolvedValue({
                openaiKey: 'sk-1234****5678',
                anthropicKey: '',
                geminiKey: '',
                groqKey: '',
                extraSettings: {},
            }),
            updateSettings: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SettingsController],
            providers: [
                { provide: SettingsService, useValue: settingsService },
            ],
        }).compile();

        controller = module.get<SettingsController>(SettingsController);
    });

    describe('getSettings', () => {
        it('should return tenant settings', async () => {
            const result = await controller.getSettings('tenant-123');

            expect(result.openaiKey).toBeDefined();
            expect(settingsService.getSettings).toHaveBeenCalledWith('tenant-123');
        });
    });

    describe('updateSettings', () => {
        it('should update settings and return success', async () => {
            const data = { openaiKey: 'sk-new-key' };

            const result = await controller.updateSettings('tenant-123', data);

            expect(result.success).toBe(true);
            expect(settingsService.updateSettings).toHaveBeenCalledWith('tenant-123', data);
        });
    });
});
