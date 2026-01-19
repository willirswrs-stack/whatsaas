import { Test, TestingModule } from '@nestjs/testing';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { mockInstance } from '../../test-utils';

describe('InstancesController', () => {
    let controller: InstancesController;
    let instancesService: jest.Mocked<Partial<InstancesService>>;

    beforeEach(async () => {
        instancesService = {
            findAll: jest.fn().mockResolvedValue([mockInstance()]),
            findOne: jest.fn().mockResolvedValue(mockInstance()),
            create: jest.fn().mockResolvedValue({
                instance: mockInstance(),
                qrCode: 'data:image/png;base64,mockQrCode',
            }),
            getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,mockQrCode'),
            getStatus: jest.fn().mockResolvedValue({
                instance: mockInstance(),
                providerStatus: { status: 'connecting' },
            }),
            delete: jest.fn().mockResolvedValue({ success: true }),
            getAvailableProviders: jest.fn().mockReturnValue(['waha', 'evolution', 'wwebjs']),
            findAllProxies: jest.fn().mockResolvedValue([]),
            createProxy: jest.fn().mockResolvedValue({ id: 'proxy-123', host: 'test.com', port: 1080 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [InstancesController],
            providers: [
                { provide: InstancesService, useValue: instancesService },
            ],
        }).compile();

        controller = module.get<InstancesController>(InstancesController);
    });

    describe('findAll', () => {
        it('should return all instances', async () => {
            const result = await controller.findAll('tenant-123');

            expect(result).toHaveLength(1);
            expect(instancesService.findAll).toHaveBeenCalledWith('tenant-123');
        });
    });

    describe('getProviders', () => {
        it('should return available providers', async () => {
            const result = await controller.getProviders();

            expect(result.providers).toContain('evolution');
            expect(result.providers).toContain('waha');
        });
    });

    describe('findOne', () => {
        it('should return instance by id', async () => {
            const result = await controller.findOne('instance-123', 'tenant-123');

            expect(result.id).toBe('instance-123');
            expect(instancesService.findOne).toHaveBeenCalledWith('instance-123', 'tenant-123');
        });
    });

    describe('getStatus', () => {
        it('should return instance status', async () => {
            const result = await controller.getStatus('instance-123', 'tenant-123');

            expect(result.providerStatus).toBeDefined();
            expect(instancesService.getStatus).toHaveBeenCalledWith('instance-123', 'tenant-123');
        });
    });

    describe('create', () => {
        it('should create a new instance', async () => {
            const dto = { instanceName: 'new-instance', provider: 'evolution' as const };

            const result = await controller.create(dto, 'tenant-123');

            expect(result.instance).toBeDefined();
            expect(result.qrCode).toBeDefined();
            expect(instancesService.create).toHaveBeenCalledWith('tenant-123', dto);
        });
    });

    describe('getQrCode', () => {
        it('should return QR code', async () => {
            const result = await controller.getQrCode('instance-123', 'tenant-123');

            expect(result.qrCode).toContain('base64');
            expect(instancesService.getQrCode).toHaveBeenCalledWith('instance-123', 'tenant-123');
        });
    });

    describe('delete', () => {
        it('should delete instance', async () => {
            const result = await controller.delete('instance-123', 'tenant-123');

            expect(result.success).toBe(true);
            expect(instancesService.delete).toHaveBeenCalledWith('instance-123', 'tenant-123');
        });
    });

    describe('Proxies', () => {
        describe('findAllProxies', () => {
            it('should return all proxies', async () => {
                const result = await controller.findAllProxies('tenant-123');

                expect(result).toEqual([]);
                expect(instancesService.findAllProxies).toHaveBeenCalledWith('tenant-123');
            });
        });

        describe('createProxy', () => {
            it('should create a new proxy', async () => {
                const data = { host: 'proxy.com', port: 1080 };

                const result = await controller.createProxy(data, 'tenant-123');

                expect(result.id).toBe('proxy-123');
                expect(instancesService.createProxy).toHaveBeenCalledWith('tenant-123', data);
            });
        });
    });
});
