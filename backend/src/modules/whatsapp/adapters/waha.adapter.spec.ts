import { ConfigService } from '@nestjs/config';
import { WahaAdapter } from './waha.adapter';
import { mockConfigService } from '../../../test-utils';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WahaAdapter', () => {
    let adapter: WahaAdapter;
    let configService: ReturnType<typeof mockConfigService>;

    const mockResponse = (data: any, status = 200, ok = true, contentType = 'application/json') => ({
        ok,
        status,
        headers: {
            get: jest.fn().mockReturnValue(contentType),
        },
        text: jest.fn().mockResolvedValue(JSON.stringify(data)),
        json: jest.fn().mockResolvedValue(data),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
    });

    beforeEach(() => {
        configService = mockConfigService({
            WAHA_API_URL: 'http://waha-api:8080',
            WAHA_API_KEY: 'test-waha-key',
        });

        adapter = new WahaAdapter(configService as unknown as ConfigService);
        mockFetch.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('providerType', () => {
        it('should return "waha"', () => {
            expect(adapter.providerType).toBe('waha');
        });
    });

    describe('createInstance', () => {
        it('should create WAHA session with default name', async () => {
            mockFetch
                .mockResolvedValueOnce(mockResponse({ name: 'default' })) // create session
                .mockResolvedValueOnce(mockResponse({ status: 'STARTING' })); // start

            const result = await adapter.createInstance('test-instance');

            expect(result.instanceId).toBe('default');
            expect(result.displayName).toBe('test-instance');
            expect(result.provider).toBe('waha');
        });

        it('should handle "already exists" error gracefully', async () => {
            mockFetch
                .mockResolvedValueOnce(mockResponse({ error: 'already exists' }, 400, false))
                .mockResolvedValueOnce(mockResponse({ status: 'STARTING' }));

            // Mock to throw on first call
            mockFetch.mockReset();
            mockFetch
                .mockImplementationOnce(() => Promise.reject(new Error('already exists')))
                .mockResolvedValueOnce(mockResponse({ status: 'STARTING' }));

            const result = await adapter.createInstance('test-instance');

            expect(result.instanceId).toBe('default');
        });
    });

    describe('getQrCode', () => {
        it('should return QR code as base64 data URI', async () => {
            const imageBuffer = new ArrayBuffer(100);
            mockFetch
                .mockResolvedValueOnce(mockResponse({ status: 'started' })) // start
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: jest.fn().mockReturnValue('image/png') },
                    arrayBuffer: jest.fn().mockResolvedValue(imageBuffer),
                });

            const result = await adapter.getQrCode('test-instance');

            expect(result).toContain('data:image/png;base64,');
        });

        it('should handle JSON response format', async () => {
            mockFetch
                .mockResolvedValueOnce(mockResponse({ status: 'started' }))
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: jest.fn().mockReturnValue('application/json') },
                    json: jest.fn().mockResolvedValue({ value: 'base64_data', mimetype: 'image/png' }),
                });

            const result = await adapter.getQrCode('test-instance');

            expect(result).toContain('data:image/png;base64,');
        });
    });

    describe('getStatus', () => {
        it('should return connected status for WORKING', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({
                status: 'WORKING',
                me: { id: '5511999999999@s.whatsapp.net', pushname: 'Test' },
            }));

            const result = await adapter.getStatus('test-instance');

            expect(result.status).toBe('connected');
            expect(result.phoneNumber).toBe('5511999999999@s.whatsapp.net');
        });

        it('should return qr_pending for SCAN_QR_CODE', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ status: 'SCAN_QR_CODE' }));

            const result = await adapter.getStatus('test-instance');

            expect(result.status).toBe('qr_pending');
        });

        it('should return disconnected on error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await adapter.getStatus('test-instance');

            expect(result.status).toBe('disconnected');
        });
    });

    describe('deleteInstance', () => {
        it('should stop the session', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ success: true }));

            await adapter.deleteInstance('test-instance');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://waha-api:8080/api/sessions/default/stop',
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('sendText', () => {
        it('should send text message', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({
                id: 'msg-123',
            }));

            const result = await adapter.sendText('test-instance', '5511999999999', 'Hello!');

            expect(result.messageId).toBe('msg-123');
            expect(result.status).toBe('sent');
        });
    });

    describe('sendPresence', () => {
        it('should send typing presence', async () => {
            mockFetch
                .mockResolvedValueOnce(mockResponse({ success: true }))
                .mockResolvedValueOnce(mockResponse({ success: true }));

            await adapter.sendPresence('test-instance', '5511999999999', 'composing', 100);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://waha-api:8080/api/default/startTyping',
                expect.anything()
            );
        }, 5000);
    });

    describe('isOnWhatsApp', () => {
        it('should return true if registered', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([{ isRegistered: true }]));

            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            expect(result).toBe(true);
        });

        it('should return false if not registered', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([{ isRegistered: false }]));

            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            expect(result).toBe(false);
        });

        it('should return true on error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await adapter.isOnWhatsApp('test-instance', '5511999999999');

            expect(result).toBe(true);
        });
    });

    describe('formatJid', () => {
        it('should format phone to JID', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ id: 'msg-123' }));

            await adapter.sendText('test-instance', '+55 (11) 99999-9999', 'Test');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        chatId: '5511999999999@s.whatsapp.net',
                        text: 'Test',
                    }),
                })
            );
        });
    });

    describe('Request headers', () => {
        it('should include X-Api-Key header', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ status: 'WORKING' }));

            await adapter.getStatus('test-instance');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Api-Key': 'test-waha-key',
                    }),
                })
            );
        });
    });
});
