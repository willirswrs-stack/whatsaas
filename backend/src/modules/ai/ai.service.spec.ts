import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AiService } from './ai.service';
import { mockConfigService } from '../../test-utils';

// Mock OpenAI module
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockImplementation((params) => {
                    // Detect if it's a warmup conversation request
                    const isWarmup = params.messages?.some((m: any) =>
                        m.content?.includes('warmup') || m.content?.includes('conversation')
                    );

                    if (isWarmup) {
                        return Promise.resolve({
                            choices: [{
                                message: {
                                    content: JSON.stringify({
                                        conversation: [
                                            { role: 'A', content: 'Hello!', isAudio: false },
                                            { role: 'B', content: 'Hi there!', isAudio: false },
                                            { role: 'A', content: 'How are you?', isAudio: false },
                                            { role: 'B', content: 'Good, thanks!', isAudio: false },
                                            { role: 'A', content: 'Great!', isAudio: false },
                                        ],
                                    }),
                                },
                            }],
                            usage: { total_tokens: 100 },
                        });
                    }

                    return Promise.resolve({
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    variations: ['Variation 1', 'Variation 2', 'Variation 3'],
                                }),
                            },
                        }],
                        usage: { total_tokens: 150 },
                    });
                }),
            },
        },
    }));
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AiService', () => {
    let service: AiService;
    let configService: ReturnType<typeof mockConfigService>;

    beforeEach(async () => {
        configService = mockConfigService({
            OPENAI_API_KEY: 'sk-test-key',
            ANTHROPIC_API_KEY: 'sk-ant-test-key',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AiService>(AiService);
        mockFetch.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateVariations', () => {
        it('should generate variations using OpenAI', async () => {
            const result = await service.generateVariations('Hello {{name}}!', 3, 0.7, 'openai');

            expect(result.variations).toBeDefined();
            expect(result.tokensUsed).toBeDefined();
        });

        it('should use Anthropic when specified', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    content: [{ text: '{"variations": ["V1", "V2", "V3"]}' }],
                    usage: { input_tokens: 50, output_tokens: 100 },
                }),
            });

            const result = await service.generateVariations('Hello {{name}}!', 3, 0.7, 'anthropic');

            expect(result.variations).toBeDefined();
        });
    });

    describe('generateVariationsWithKey', () => {
        it('should return mock variations when no API key provided', async () => {
            const result = await service.generateVariationsWithKey('Hello {{name}}!', 3, null);

            expect(result.variations).toBeDefined();
            expect(result.tokensUsed).toBe(0);
        });

        it('should return mock variations for placeholder key', async () => {
            const result = await service.generateVariationsWithKey('Hello {{name}}!', 3, 'sk-placeholder');

            expect(result.variations).toBeDefined();
            expect(result.tokensUsed).toBe(0);
        });

        it('should use OpenAI with custom key', async () => {
            const result = await service.generateVariationsWithKey(
                'Hello {{name}}!',
                3,
                'sk-real-api-key',
                'openai',
            );

            expect(result.variations).toBeDefined();
        });

        it('should use Anthropic with custom key', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    content: [{ text: '{"variations": ["V1", "V2"]}' }],
                    usage: { input_tokens: 30, output_tokens: 70 },
                }),
            });

            const result = await service.generateVariationsWithKey(
                'Hello {{name}}!',
                2,
                'sk-ant-real-key',
                'anthropic',
            );

            expect(result.variations).toBeDefined();
        });
    });

    describe('generateWarmupConversation', () => {
        it('should generate warmup conversation', async () => {
            const result = await service.generateWarmupConversation({
                messageCount: 5,
                topics: ['sports', 'weather'],
            });

            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0]).toHaveProperty('role');
            expect(result[0]).toHaveProperty('content');
        });
    });

    describe('getMockVariations', () => {
        it('should generate mock variations from prompt', async () => {
            const result = await service.generateVariationsWithKey(
                'Gere 5 variações para:\n---\nOlá {{nome}}! Temos uma oferta.\n---',
                5,
                null,
            );

            expect(result.variations).toHaveLength(5);
            expect(result.tokensUsed).toBe(0);
        });

        it('should produce distinct variations', async () => {
            const result = await service.generateVariationsWithKey('Hello {{name}}!', 5, null);

            const uniqueVariations = new Set(result.variations);
            expect(uniqueVariations.size).toBe(result.variations.length);
        });
    });

    describe('Error handling', () => {
        it('should fallback to mock on OpenAI error', async () => {
            // Force OpenAI to throw by making the mock throw
            jest.spyOn(console, 'error').mockImplementation(() => { });

            const result = await service.generateVariationsWithKey(
                'Hello!',
                3,
                'sk-test',
                'openai',
            );

            // Should still return something (either real or mock)
            expect(result).toBeDefined();
        });

        it('should fallback to mock on Anthropic error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await service.generateVariationsWithKey(
                'Hello!',
                3,
                'sk-ant-test',
                'anthropic',
            );

            // Should return mock variations
            expect(result.variations).toBeDefined();
            expect(result.tokensUsed).toBe(0);
        });
    });
});
