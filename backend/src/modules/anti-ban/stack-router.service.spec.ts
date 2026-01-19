import { Test, TestingModule } from '@nestjs/testing';
import {
    StackRouterService,
    StackRoutingInput,
    StackType
} from './stack-router.service';

describe('StackRouterService', () => {
    let service: StackRouterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StackRouterService],
        }).compile();

        service = module.get<StackRouterService>(StackRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // =========================================================================
    // CRITICAL SAFETY RULES
    // =========================================================================

    describe('Critical Safety Rules', () => {
        it('should route to wwebjs when chip was recently blocked', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-1',
                warmupDays: 30,
                chipHealthScore: 80,
                daysSinceLastBlock: 3,
                campaignId: 'camp-1',
                campaignVolume: 500,
                messagesSentToday: 0,
                messagesRemaining: 500,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('CRITICAL_RECENTLY_BLOCKED');
            expect(result.confidence).toBeGreaterThanOrEqual(80); // Base is 95, reduced for missing metrics
        });

        it('should route to wwebjs when chip health is critical (<30)', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-2',
                warmupDays: 60,
                chipHealthScore: 25,
                campaignId: 'camp-2',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('CRITICAL_LOW_HEALTH');
        });

        it('should route to wwebjs when risk level is critical', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-3',
                warmupDays: 30,
                chipHealthScore: 90,
                campaignId: 'camp-3',
                campaignVolume: 1000,
                messagesSentToday: 0,
                messagesRemaining: 1000,
                riskLevel: 'critical',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('CRITICAL_RISK_LEVEL');
        });
    });

    // =========================================================================
    // WARMUP RULES
    // =========================================================================

    describe('Warmup Rules', () => {
        it('should route to wwebjs for chips in initial warmup phase (days 1-3)', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-warmup-1',
                warmupDays: 2,
                chipHealthScore: 85,
                campaignId: 'camp-4',
                campaignVolume: 50,
                messagesSentToday: 0,
                messagesRemaining: 50,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('WARMUP_INITIAL_PHASE');
        });

        it('should route to wwebjs for chips in early warmup phase (days 4-7)', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-warmup-2',
                warmupDays: 5,
                chipHealthScore: 75,
                campaignId: 'camp-5',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('WARMUP_EARLY_PHASE');
        });

        it('should route to waha for chips in mid warmup phase (days 8-14)', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-warmup-3',
                warmupDays: 10,
                chipHealthScore: 70,
                campaignId: 'camp-6',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('waha');
            expect(result.metadata.ruleApplied).toBe('WARMUP_MID_PHASE');
        });
    });

    // =========================================================================
    // VOLUME-BASED RULES
    // =========================================================================

    describe('Volume-Based Rules', () => {
        it('should route to evolution for high volume with healthy mature chip', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-volume-1',
                warmupDays: 30,
                chipHealthScore: 90,
                campaignId: 'camp-7',
                campaignVolume: 800,
                messagesSentToday: 0,
                messagesRemaining: 800,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('evolution');
            expect(result.metadata.ruleApplied).toBe('HIGH_VOLUME_HEALTHY_CHIP');
        });

        it('should route to waha for medium volume with good chip', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-volume-2',
                warmupDays: 12,
                chipHealthScore: 70,
                campaignId: 'camp-8',
                campaignVolume: 200,
                messagesSentToday: 0,
                messagesRemaining: 200,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('waha');
        });

        it('should route to wwebjs for low volume campaigns', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-volume-3',
                warmupDays: 60,
                chipHealthScore: 95,
                campaignId: 'camp-9',
                campaignVolume: 30,
                messagesSentToday: 0,
                messagesRemaining: 30,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('LOW_VOLUME_ANY_CHIP');
        });
    });

    // =========================================================================
    // CONTEXT RULES
    // =========================================================================

    describe('Context Rules', () => {
        it('should route to wwebjs when conversation is active', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-context-1',
                warmupDays: 30,
                chipHealthScore: 85,
                campaignId: 'camp-10',
                campaignVolume: 500,
                messagesSentToday: 100,
                messagesRemaining: 400,
                riskLevel: 'low',
                conversationActive: true,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('ACTIVE_CONVERSATION');
        });

        it('should route to wwebjs for first contact with elevated risk', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-context-2',
                warmupDays: 20,
                chipHealthScore: 75,
                campaignId: 'camp-11',
                campaignVolume: 200,
                messagesSentToday: 0,
                messagesRemaining: 200,
                riskLevel: 'medium',
                conversationActive: false,
                isFirstContactMessage: true,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBe('wwebjs');
            expect(result.metadata.ruleApplied).toBe('FIRST_CONTACT_HIGH_RISK');
        });
    });

    // =========================================================================
    // FALLBACK AND CONFIDENCE
    // =========================================================================

    describe('Fallback and Confidence', () => {
        it('should always return a valid result', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-fallback',
                warmupDays: 20,
                chipHealthScore: 55,
                campaignId: 'camp-12',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'medium',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.selectedStack).toBeDefined();
            expect(['wwebjs', 'waha', 'evolution', 'official']).toContain(result.selectedStack);
            expect(result.confidence).toBeGreaterThanOrEqual(50);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });

        it('should provide a fallback stack', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-fallback-2',
                warmupDays: 30,
                chipHealthScore: 90,
                campaignId: 'camp-13',
                campaignVolume: 800,
                messagesSentToday: 0,
                messagesRemaining: 800,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.fallbackStack).toBeDefined();
            // Fallback should be safer than primary
            const safetyOrder: StackType[] = ['wwebjs', 'waha', 'evolution', 'official'];
            const primaryIdx = safetyOrder.indexOf(result.selectedStack);
            const fallbackIdx = safetyOrder.indexOf(result.fallbackStack!);
            expect(fallbackIdx).toBeLessThanOrEqual(primaryIdx);
        });

        it('should reduce confidence when data is incomplete', () => {
            const completeInput: StackRoutingInput = {
                instanceId: 'test-conf-1',
                warmupDays: 30,
                chipHealthScore: 80,
                campaignId: 'camp-14',
                campaignVolume: 500,
                messagesSentToday: 0,
                messagesRemaining: 500,
                riskLevel: 'low',
                conversationActive: false,
                averageDeliveryRate: 98,
                recentFailureRate: 1,
            };

            const incompleteInput: StackRoutingInput = {
                ...completeInput,
                averageDeliveryRate: undefined,
                recentFailureRate: undefined,
            };

            const completeResult = service.route(completeInput);
            const incompleteResult = service.route(incompleteInput);

            // Incomplete data should have lower confidence
            expect(incompleteResult.confidence).toBeLessThan(completeResult.confidence);
        });
    });

    // =========================================================================
    // BATCH ROUTING
    // =========================================================================

    describe('Batch Routing', () => {
        it('should route multiple inputs and provide distribution summary', () => {
            const inputs: StackRoutingInput[] = [
                {
                    instanceId: 'batch-1',
                    warmupDays: 2,
                    chipHealthScore: 85,
                    campaignId: 'camp-batch',
                    campaignVolume: 300,
                    messagesSentToday: 0,
                    messagesRemaining: 100,
                    riskLevel: 'low',
                    conversationActive: false,
                },
                {
                    instanceId: 'batch-2',
                    warmupDays: 30,
                    chipHealthScore: 90,
                    campaignId: 'camp-batch',
                    campaignVolume: 300,
                    messagesSentToday: 100,
                    messagesRemaining: 100,
                    riskLevel: 'low',
                    conversationActive: false,
                },
                {
                    instanceId: 'batch-3',
                    warmupDays: 60,
                    chipHealthScore: 95,
                    campaignId: 'camp-batch',
                    campaignVolume: 300,
                    messagesSentToday: 200,
                    messagesRemaining: 100,
                    riskLevel: 'low',
                    conversationActive: false,
                },
            ];

            const { results, summary } = service.routeBatch(inputs, { summarize: true });

            expect(results).toHaveLength(3);
            expect(summary).toBeDefined();
            expect(summary!.total).toBe(3);
            expect(summary!.averageConfidence).toBeGreaterThan(0);
        });
    });

    // =========================================================================
    // SCENARIO RECOMMENDATIONS
    // =========================================================================

    describe('Scenario Recommendations', () => {
        it('should recommend wwebjs for new chip with conservative approach', () => {
            const recommendation = service.recommendForScenario({
                chipAge: 'new',
                health: 'good',
                campaignSize: 'medium',
                riskTolerance: 'conservative',
            });

            expect(recommendation.stack).toBe('wwebjs');
            expect(recommendation.notes.length).toBeGreaterThan(0);
        });

        it('should recommend evolution for veteran chip with aggressive approach', () => {
            const recommendation = service.recommendForScenario({
                chipAge: 'veteran',
                health: 'excellent',
                campaignSize: 'massive', // Changed from 'large' to 'massive' (2000 msgs)
                riskTolerance: 'aggressive',
            });

            // With veteran chip (60 days), excellent health (92), massive volume (2000), and low risk
            // the HIGH_VOLUME_HEALTHY_CHIP rule should apply -> evolution
            expect(recommendation.stack).toBe('evolution');
        });
    });

    // =========================================================================
    // STACK CAPABILITIES
    // =========================================================================

    describe('Stack Capabilities', () => {
        it('should return capabilities for a specific stack', () => {
            const capabilities = service.getStackCapabilities('wwebjs');

            expect(capabilities.humanMimetismLevel).toBe(10);
            expect(capabilities.supportsPresence).toBe(true);
            expect(capabilities.costPerMessage).toBe(0);
        });

        it('should return all stack capabilities', () => {
            const all = service.getAllStackCapabilities();

            expect(all.wwebjs).toBeDefined();
            expect(all.waha).toBeDefined();
            expect(all.evolution).toBeDefined();
            expect(all.official).toBeDefined();
        });
    });

    // =========================================================================
    // EDGE CASES
    // =========================================================================

    describe('Edge Cases', () => {
        it('should handle invalid chipHealthScore gracefully', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-edge-1',
                warmupDays: 30,
                chipHealthScore: 150, // Invalid, should be clamped
                campaignId: 'camp-edge',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.selectedStack).toBeDefined();
        });

        it('should handle negative warmupDays gracefully', () => {
            const input: StackRoutingInput = {
                instanceId: 'test-edge-2',
                warmupDays: -5, // Invalid
                chipHealthScore: 80,
                campaignId: 'camp-edge-2',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.selectedStack).toBeDefined();
        });

        it('should calculate daysSinceLastBlock from lastBlockedAt date', () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const input: StackRoutingInput = {
                instanceId: 'test-edge-3',
                warmupDays: 30,
                chipHealthScore: 80,
                lastBlockedAt: threeDaysAgo,
                campaignId: 'camp-edge-3',
                campaignVolume: 100,
                messagesSentToday: 0,
                messagesRemaining: 100,
                riskLevel: 'low',
                conversationActive: false,
            };

            const result = service.route(input);

            expect(result.metadata.ruleApplied).toBe('CRITICAL_RECENTLY_BLOCKED');
        });
    });
});
