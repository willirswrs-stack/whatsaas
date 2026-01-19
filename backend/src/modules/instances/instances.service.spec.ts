import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { InstancesService } from './instances.service';
import { Instance, Proxy } from './entities/instance.entity';
import { WhatsAppProviderFactory } from '../whatsapp';
import {
    createMockRepository,
    mockInstance,
    mockProviderFactory,
    mockWhatsAppProvider,
    MockRepository,
} from '../../test-utils';

describe('InstancesService', () => {
    let service: InstancesService;
    let instanceRepo: MockRepository<Instance>;
    let proxyRepo: MockRepository<Proxy>;
    let providerFactory: ReturnType<typeof mockProviderFactory>;
    let provider: ReturnType<typeof mockWhatsAppProvider>;

    beforeEach(async () => {
        instanceRepo = createMockRepository<Instance>();
        proxyRepo = createMockRepository<Proxy>();
        providerFactory = mockProviderFactory();
        provider = mockWhatsAppProvider();
        providerFactory.getProvider.mockReturnValue(provider);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InstancesService,
                {
                    provide: getRepositoryToken(Instance),
                    useValue: instanceRepo,
                },
                {
                    provide: getRepositoryToken(Proxy),
                    useValue: proxyRepo,
                },
                {
                    provide: WhatsAppProviderFactory,
                    useValue: providerFactory,
                },
            ],
        }).compile();

        service = module.get<InstancesService>(InstancesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all instances for a tenant', async () => {
            // Arrange
            const instances = [
                mockInstance({ id: 'inst-1', instanceName: 'instance-1' }),
                mockInstance({ id: 'inst-2', instanceName: 'instance-2' }),
            ];
            instanceRepo.find!.mockResolvedValue(instances);

            // Act
            const result = await service.findAll('tenant-123');

            // Assert
            expect(result).toHaveLength(2);
            expect(instanceRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123' },
                relations: ['proxy'],
                order: { createdAt: 'DESC' },
            });
        });

        it('should return empty array if no instances', async () => {
            // Arrange
            instanceRepo.find!.mockResolvedValue([]);

            // Act
            const result = await service.findAll('tenant-123');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should return instance if found', async () => {
            // Arrange
            const instance = mockInstance();
            instanceRepo.findOne!.mockResolvedValue(instance);

            // Act
            const result = await service.findOne('instance-123', 'tenant-123');

            // Assert
            expect(result).toEqual(instance);
            expect(instanceRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'instance-123', tenantId: 'tenant-123' },
                relations: ['proxy', 'warmupSchedules'],
            });
        });

        it('should throw NotFoundException if instance not found', async () => {
            // Arrange
            instanceRepo.findOne!.mockResolvedValue(null);

            // Act & Assert
            await expect(service.findOne('non-existent', 'tenant-123')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('create', () => {
        it('should create instance successfully', async () => {
            // Arrange
            const createData = {
                instanceName: 'new-instance',
                provider: 'evolution' as const,
            };
            instanceRepo.findOne!.mockResolvedValue(null); // No existing instance
            instanceRepo.create!.mockImplementation((data) => ({ ...mockInstance(), ...data }));
            instanceRepo.save!.mockImplementation((data) => Promise.resolve(data));
            provider.createInstance.mockResolvedValue({
                instanceId: 'evo-new-123',
                displayName: 'new-instance',
                provider: 'evolution',
            });
            provider.getQrCode.mockResolvedValue('data:image/png;base64,newQrCode');

            // Act
            const result = await service.create('tenant-123', createData);

            // Assert
            expect(result.instance.instanceName).toBe('new-instance');
            expect(result.qrCode).toBe('data:image/png;base64,newQrCode');
            expect(provider.createInstance).toHaveBeenCalledWith('new-instance');
            expect(instanceRepo.save).toHaveBeenCalled();
        });

        it('should throw error if instance name already exists', async () => {
            // Arrange
            const createData = {
                instanceName: 'existing-instance',
            };
            instanceRepo.findOne!.mockResolvedValue(mockInstance({ instanceName: 'existing-instance' }));

            // Act & Assert
            await expect(service.create('tenant-123', createData)).rejects.toThrow(
                /Já existe uma instância/
            );
        });

        it('should use default provider if not specified', async () => {
            // Arrange
            const createData = { instanceName: 'test-instance' };
            instanceRepo.findOne!.mockResolvedValue(null);
            instanceRepo.create!.mockImplementation((data) => ({ ...mockInstance(), ...data }));
            instanceRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            await service.create('tenant-123', createData);

            // Assert
            expect(providerFactory.getProvider).toHaveBeenCalledWith('wwebjs');
        });

        it('should store evolutionConfig with instanceId', async () => {
            // Arrange
            const createData = {
                instanceName: 'evo-instance',
                provider: 'evolution' as const,
            };
            instanceRepo.findOne!.mockResolvedValue(null);
            instanceRepo.create!.mockImplementation((data) => ({ ...mockInstance(), ...data }));
            instanceRepo.save!.mockImplementation((data) => Promise.resolve(data));
            provider.createInstance.mockResolvedValue({
                instanceId: 'evo-xyz-789',
                displayName: 'evo-instance',
                provider: 'evolution',
            });

            // Act
            await service.create('tenant-123', createData);

            // Assert
            expect(instanceRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    evolutionConfig: { instanceId: 'evo-xyz-789' },
                })
            );
        });
    });

    describe('getQrCode', () => {
        it('should return QR code from provider', async () => {
            // Arrange
            const instance = mockInstance({ provider: 'evolution' });
            instanceRepo.findOne!.mockResolvedValue(instance);
            provider.getQrCode.mockResolvedValue('data:image/png;base64,qrCodeData');

            // Act
            const result = await service.getQrCode('instance-123', 'tenant-123');

            // Assert
            expect(result).toBe('data:image/png;base64,qrCodeData');
            expect(provider.getQrCode).toHaveBeenCalledWith(instance.instanceName);
        });
    });

    describe('getStatus', () => {
        it('should return status and update instance if connected', async () => {
            // Arrange
            const instance = mockInstance({ status: 'connecting' });
            instanceRepo.findOne!.mockResolvedValue(instance);
            provider.getStatus.mockResolvedValue({
                status: 'connected',
                phoneNumber: '+5511999999999',
                name: 'Test Phone',
            });
            instanceRepo.save!.mockImplementation((data) => Promise.resolve(data));

            // Act
            const result = await service.getStatus('instance-123', 'tenant-123');

            // Assert
            expect(result.providerStatus.status).toBe('connected');
            expect(instanceRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'connected',
                    phone: '+5511999999999',
                    connectedAt: expect.any(Date),
                })
            );
        });

        it('should not update if status is the same', async () => {
            // Arrange
            const instance = mockInstance({ status: 'connected' });
            instanceRepo.findOne!.mockResolvedValue(instance);
            provider.getStatus.mockResolvedValue({
                status: 'connected',
                phoneNumber: '+5511999999999',
            });

            // Act
            await service.getStatus('instance-123', 'tenant-123');

            // Assert
            expect(instanceRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete instance from provider and database', async () => {
            // Arrange
            const instance = mockInstance();
            instanceRepo.findOne!.mockResolvedValue(instance);
            instanceRepo.remove!.mockResolvedValue(instance);

            // Act
            const result = await service.delete('instance-123', 'tenant-123');

            // Assert
            expect(result).toEqual({ success: true });
            expect(provider.deleteInstance).toHaveBeenCalledWith(instance.instanceName);
            expect(instanceRepo.remove).toHaveBeenCalledWith(instance);
        });

        it('should still delete from DB if provider deletion fails', async () => {
            // Arrange
            const instance = mockInstance();
            instanceRepo.findOne!.mockResolvedValue(instance);
            provider.deleteInstance.mockRejectedValue(new Error('Provider error'));
            instanceRepo.remove!.mockResolvedValue(instance);

            // Act
            const result = await service.delete('instance-123', 'tenant-123');

            // Assert
            expect(result).toEqual({ success: true });
            expect(instanceRepo.remove).toHaveBeenCalledWith(instance);
        });
    });

    describe('getAvailableProviders', () => {
        it('should return list of available providers', () => {
            // Act
            const result = service.getAvailableProviders();

            // Assert
            expect(result).toEqual([
                { type: 'evolution', name: 'Evolution API', available: true },
                { type: 'waha', name: 'WAHA', available: true },
            ]);
        });
    });

    describe('Proxy management', () => {
        describe('findAllProxies', () => {
            it('should return all proxies for a tenant', async () => {
                // Arrange
                const proxies = [
                    { id: 'proxy-1', host: 'proxy1.com', port: 1080 },
                    { id: 'proxy-2', host: 'proxy2.com', port: 1080 },
                ];
                proxyRepo.find!.mockResolvedValue(proxies);

                // Act
                const result = await service.findAllProxies('tenant-123');

                // Assert
                expect(result).toHaveLength(2);
            });
        });

        describe('createProxy', () => {
            it('should create a new proxy', async () => {
                // Arrange
                const proxyData = { host: 'newproxy.com', port: 1080 };
                proxyRepo.create!.mockImplementation((data) => ({ id: 'new-proxy', ...data }));
                proxyRepo.save!.mockImplementation((data) => Promise.resolve(data));

                // Act
                const result = await service.createProxy('tenant-123', proxyData);

                // Assert
                expect(result.tenantId).toBe('tenant-123');
                expect(result.host).toBe('newproxy.com');
            });
        });

        describe('deleteProxy', () => {
            it('should delete proxy if found', async () => {
                // Arrange
                const proxy = { id: 'proxy-123', tenantId: 'tenant-123' };
                proxyRepo.findOne!.mockResolvedValue(proxy);
                proxyRepo.remove!.mockResolvedValue(proxy);

                // Act
                const result = await service.deleteProxy('proxy-123', 'tenant-123');

                // Assert
                expect(result).toEqual({ success: true });
            });

            it('should throw NotFoundException if proxy not found', async () => {
                // Arrange
                proxyRepo.findOne!.mockResolvedValue(null);

                // Act & Assert
                await expect(service.deleteProxy('non-existent', 'tenant-123')).rejects.toThrow(
                    NotFoundException
                );
            });
        });
    });
});
