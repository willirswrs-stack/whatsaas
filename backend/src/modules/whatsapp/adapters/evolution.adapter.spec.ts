import { ConfigService } from '@nestjs/config';
import { EvolutionAdapter } from './evolution.adapter';
import { mockConfigService } from '../../../test-utils';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EvolutionAdapter', () => {
    let adapter: EvolutionAdapter;
    let configService: ReturnType<typeof mockConfigService>;

    // Helper to create mock Response
    const mockResponse = (data: any, status = 200, ok = true) => ({
        ok,
        status,
        text: jest.fn().mockResolvedValue(JSON.stringify(data)),
        json: jest.fn().mockResolvedValue(data),
    });

    beforeEach(() => {
        configService = mockConfigService({
            EVOLUTION_API_URL: 'http://evolution-api:8080',
            EVOLUTION_API_KEY: 'test-evolution-key',
        });

        adapter = new EvolutionAdapter(configService as unknown as ConfigService);

        // Reset fetch mock
        mockFetch.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('providerType', () => {
        it('should return "evolution"', () => {
            expect(adapter.providerType).toBe('evolution');
        });
    });

    describe('createInstance', () => {
        it('should create instance via Evolution API', async () => {
            // Arrange - first call fetches existing instances (empty)
            mockFetch
                .mockResolvedValueOnce(mockResponse([])) // fetchInstances - no existing
                .mockResolvedValueOnce(mockResponse({
                    instance: {
                        instanceName: 'test-instance',
                        instanceId: 'evo-123',
                        status: 'created',
                    },
                })); // create

            // Act
            const result = await adapter.createInstance('test-instance');

            // Assert
            expect(result.instanceId).toBe('test-instance');
            expect(result.displayName).toBe('test-instance');
            expect(result.provider).toBe('evolution');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://evolution-api:8080/instance/create',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should reuse existing instance if found', async () => {
            // Arrange - instance already exists
            mockFetch.mockResolvedValueOnce(mockResponse([
                { name: 'test-instance', id: 'existing-123' },
            ]));

            // Act
            const result = await adapter.createInstance('test-instance');

            // Assert
            expect(result.instanceId).toBe('test-instance');
            expect(mockFetch).toHaveBeenCalledTimes(1); // Only fetched instances, no create
        });

        it('should handle API errors gracefully', async () => {
            // Arrange
            mockFetch
                .mockResolvedValueOnce(mockResponse([])) // fetchInstances
                .mockResolvedValueOnce(mockResponse(
                    { error: 'Internal Server Error' },
                    500,
                    false
                ));

            // Act & Assert
            await expect(adapter.createInstance('test-instance')).rejects.toThrow();
        });
    });

    describe('getQrCode', () => {
        it('should return QR code as base64 data URI', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
            }));

            // Act
            const result = await adapter.getQrCode('test-instance');

            // Assert
            expect(result).toContain('data:image/png;base64,');
        });

        it('should handle nested qrcode.base64 format', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                qrcode: {
                    base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
                },
            }));

            // Act
            const result = await adapter.getQrCode('test-instance');

            // Assert
            expect(result).toContain('data:image/png;base64,');
        });

        it('should return raw QR code string when no base64', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                code: '2@ABC123XYZ',
            }));

            // Act
            const result = await adapter.getQrCode('test-instance');

            // Assert
            expect(result).toBe('qr:2@ABC123XYZ');
        });

        it('should retry when count is 0', async () => {
            // Arrange - first returns count 0, second returns QR
            mockFetch
                .mockResolvedValueOnce(mockResponse({ count: 0 }))
                .mockResolvedValueOnce(mockResponse({
                    base64: 'data:image/png;base64,qrData',
                }));

            // Act
            const result = await adapter.getQrCode('test-instance');

            // Assert
            expect(result).toContain('data:image/png;base64,');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        }, 10000);
    });

    describe('getStatus', () => {
        it('should return connected status with phone number', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                instance: {
                    state: 'open',
                    wuid: '5511999999999@s.whatsapp.net',
                    profileName: 'Test User',
                },
            }));

            // Act
            const result = await adapter.getStatus('test-instance');

            // Assert
            expect(result.status).toBe('connected');
            expect(result.phoneNumber).toBe('5511999999999@s.whatsapp.net');
        });

        it('should return disconnected for closed state', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                instance: { state: 'close' },
            }));

            // Act
            const result = await adapter.getStatus('test-instance');

            // Assert
            expect(result.status).toBe('disconnected');
        });

        it('should return connecting for connecting state', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                instance: { state: 'connecting' },
            }));

            // Act
            const result = await adapter.getStatus('test-instance');

            // Assert
            expect(result.status).toBe('connecting');
        });

        it('should return scan_qr for qrcode state', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                instance: { state: 'qrcode' },
            }));

            // Act
            const result = await adapter.getStatus('test-instance');

            // Assert
            expect(result.status).toBe('scan_qr');
        });

        it('should return disconnected on error', async () => {
            // Arrange
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Act
            const result = await adapter.getStatus('test-instance');

            // Assert
            expect(result.status).toBe('disconnected');
        });
    });

    describe('deleteInstance', () => {
        it('should delete instance via API', async () => {
            // Arrange - logout then delete
            mockFetch
                .mockResolvedValueOnce(mockResponse({ success: true })) // logout
                .mockResolvedValueOnce(mockResponse({ success: true })); // delete

            // Act
            await adapter.deleteInstance('test-instance');

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(
                'http://evolution-api:8080/instance/delete/test-instance',
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        it('should not throw if instance already deleted (404)', async () => {
            // Arrange
            mockFetch
                .mockResolvedValueOnce(mockResponse({ success: true })) // logout
                .mockResolvedValueOnce(mockResponse(
                    { error: 'not found' },
                    404,
                    false
                ));

            // Act & Assert - should not throw
            await expect(adapter.deleteInstance('test-instance')).resolves.not.toThrow();
        });
    });

    describe('sendText', () => {
        it('should send text message successfully', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse({
                key: { id: 'msg-123' },
                status: 'PENDING',
            }));

            // Act
            const result = await adapter.sendText('test-instance', '5511999999999', 'Hello!');

            // Assert
            expect(result.messageId).toBe('msg-123');
            expect(result.status).toBe('sent');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://evolution-api:8080/message/sendText/test-instance',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        number: '5511999999999',
                        text: 'Hello!',
                    }),
                })
            );
        });
    });

    describe('sendPresence', () => {
        it('should send composing presence', async () => {
            // Arrange
            mockFetch
                .mockResolvedValueOnce(mockResponse({ success: true })) // composing
                .mockResolvedValueOnce(mockResponse({ success: true })); // paused

            // Act
            await adapter.sendPresence('test-instance', '5511999999999', 'composing', 100);

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(
                'http://evolution-api:8080/chat/presence/test-instance',
                expect.objectContaining({ method: 'POST' })
            );
        }, 5000);

        it('should not throw on error', async () => {
            // Arrange
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Act & Assert
            await expect(
                adapter.sendPresence('test-instance', '5511999999999', 'composing', 0)
            ).resolves.not.toThrow();
        });
    });

    describe('isOnWhatsApp', () => {
        it('should return true if number is on WhatsApp', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse([
                { exists: true, jid: '5511999999999@s.whatsapp.net' },
            ]));

            // Act
            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            // Assert
            expect(result).toBe(true);
        });

        it('should return false if number is not on WhatsApp', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(mockResponse([
                { exists: false },
            ]));

            // Act
            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            // Assert
            expect(result).toBe(false);
        });

        it('should return true on error (assume exists)', async () => {
            // Arrange
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Act
            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('formatPhone', () => {
        it('should format phone number by removing non-digits', async () => {
            // Test through sendText
            mockFetch.mockResolvedValueOnce(mockResponse({ key: { id: 'msg-123' } }));

            await adapter.sendText('test-instance', '+55 (11) 99999-9999', 'Test');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        number: '5511999999999',
                        text: 'Test',
                    }),
                })
            );
        });
    });

    describe('Request headers', () => {
        it('should include proper headers in requests', async () => {
            // Arrange - need two responses: fetchInstances + create
            mockFetch
                .mockResolvedValueOnce(mockResponse([])) // fetchInstances
                .mockResolvedValueOnce(mockResponse({ instance: { instanceName: 'test' } })); // create

            // Act
            await adapter.createInstance('test');

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: {
                        apikey: 'test-evolution-key',
                        'Content-Type': 'application/json',
                    },
                })
            );
        });
    });
});
