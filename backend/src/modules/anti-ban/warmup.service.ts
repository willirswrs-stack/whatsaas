/**
 * WarmupService - Intelligent Warmup Engine
 * 
 * Manages the lifecycle of new chips, gradually increasing their load capacity
 * to avoid bans. Implements a progressive maturity curve.
 * 
 * @principle "Slow is smooth, smooth is fast"
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Instance } from '../instances/entities/instance.entity';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { InstancesService } from '../instances/instances.service';
import { AiService } from '../ai/ai.service';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { HumanBehaviorService } from './human-behavior.service';

// Define the Warmup Schedule
export const WARMUP_SCHEDULE = [
    { day: 1, limit: 50, interval: 90 },    // Day 1: 50 msgs
    { day: 2, limit: 100, interval: 60 },   // Day 2: 100 msgs
    { day: 3, limit: 150, interval: 45 },
    { day: 4, limit: 250, interval: 35 },
    { day: 5, limit: 400, interval: 25 },
    { day: 6, limit: 600, interval: 20 },
    { day: 7, limit: 800, interval: 15 },
    { day: 8, limit: 1000, interval: 12 },
    { day: 9, limit: 1300, interval: 10 },
    { day: 10, limit: 1600, interval: 8 },
    { day: 11, limit: 2000, interval: 6 },
    { day: 12, limit: 2500, interval: 5 },
    { day: 13, limit: 2800, interval: 4 },
    { day: 14, limit: 3000, interval: 3 },  // Day 14: Graduated!
];

// Max limit for mature chips
export const MATURE_LIMIT = 5000;

@Injectable()
export class WarmupService {
    private readonly logger = new Logger(WarmupService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectQueue(WARMUP_QUEUE) private warmupQueue: Queue,
        @Inject(forwardRef(() => InstancesService))
        private instancesService: InstancesService,
        private aiService: AiService,
        private humanBehavior: HumanBehaviorService,
    ) { }

    // =========================================================================
    // SCHEDULING
    // =========================================================================

    /**
     * Initializes the background scheduler
     */
    async onModuleInit() {
        await this.scheduleDailyJob();
    }

    /**
     * Schedules the daily repeatable job
     */
    async scheduleDailyJob() {
        // Remove existing repeatable jobs to avoid duplicates on restart
        const repeatableJobs = await this.warmupQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            if (job.name === 'daily-warmup-routine') {
                await this.warmupQueue.removeRepeatableByKey(job.key);
            }
        }

        // Add daily job (runs at 04:00 AM)
        await this.warmupQueue.add(
            'daily-warmup-routine',
            {},
            {
                repeat: {
                    pattern: '0 4 * * *', // Every day at 4am
                },
                jobId: 'daily-warmup-routine-job'
            }
        );

        this.logger.log('⏰ Daily Warmup Routine scheduled for 04:00 AM');
    }

    // =========================================================================
    // CORE LOGIC
    // =========================================================================

    /**
     * Executes the daily warmup routine for all tenants
     * Should be called once per day (e.g., via Cron or BullMQ)
     */
    async executeDailyWarmupRoutine(): Promise<{ advanced: number; completed: number; sessions: number }> {
        this.logger.log('🔥 Executing Daily Warmup Routine...');

        // Find all instances with warmup enabled
        const instances = await this.instanceRepo.find({
            where: { warmupEnabled: true },
        });

        let advancedCount = 0;
        let completedCount = 0;
        const tenantIds = new Set<string>();

        for (const instance of instances) {
            const result = await this.advanceInstanceWarmup(instance);
            if (result === 'advanced') advancedCount++;
            if (result === 'completed') completedCount++;

            // Collect tenant IDs for session generation
            if (instance.status === 'connected') {
                tenantIds.add(instance.tenantId);
            }
        }

        // Trigger warmup sessions for eligible tenants — create ALL pair combinations
        let sessionsTriggered = 0;
        for (const tenantId of tenantIds) {
            try {
                const sessionResults = await this.createAllPairSessions(tenantId);
                sessionsTriggered += sessionResults.sessionsCreated;
                this.logger.log(`💬 ${sessionResults.sessionsCreated} Warmup Sessions triggered for tenant ${tenantId}`);
            } catch (err) {
                this.logger.error(`Failed to trigger sessions for tenant ${tenantId}: ${err.message}`);
            }
        }

        this.logger.log(`✅ Warmup Routine Finished: ${advancedCount} advanced, ${completedCount} completed, ${sessionsTriggered} sessions created.`);
        return { advanced: advancedCount, completed: completedCount, sessions: sessionsTriggered };
    }

    /**
     * Advances a single instance's warmup stage
     */
    async advanceInstanceWarmup(instance: Instance): Promise<'advanced' | 'completed' | 'no-change'> {
        // Validation: If disconnected or banned, do not advance
        if (instance.status !== 'connected') {
            this.logger.warn(`Skipping warmup advance for ${instance.instanceName} (Status: ${instance.status})`);
            return 'no-change';
        }

        // Initialize if null
        if (!instance.warmupDay) instance.warmupDay = 0;

        // Increment day
        const nextDay = instance.warmupDay + 1;
        const schedule = this.getScheduleForDay(nextDay);

        if (!schedule) {
            // Reached end of schedule -> Graduate
            this.logger.log(`🎓 Instance ${instance.instanceName} has graduated from warmup!`);

            await this.instanceRepo.update(instance.id, {
                warmupEnabled: false,
                warmupDay: nextDay,
                dailyLimit: MATURE_LIMIT,
                dailySent: 0,
            });

            return 'completed';
        }

        // Advance to next stage
        await this.instanceRepo.update(instance.id, {
            warmupDay: nextDay,
            dailyLimit: schedule.limit,
            dailySent: 0,
        });

        this.logger.log(
            `📈 Instance ${instance.instanceName} advanced to Day ${nextDay} ` +
            `(Limit: ${schedule.limit}, Interval: ${schedule.interval}s)`
        );

        return 'advanced';
    }

    /**
     * Creates a warmup session (conversation) between two instances
     */
    /**
     * Creates warmup sessions for ALL pairs of connected instances.
     * With 3 instances (A, B, C), creates 3 sessions: A↔B, A↔C, B↔C
     */
    async createAllPairSessions(tenantId: string) {
        const instances = await this.instancesService.findAll(tenantId);
        const candidates = instances.filter(i =>
            (i.status === InstanceStatus.CONNECTED || i.status === 'connected' as any) &&
            i.warmupEnabled &&
            i.phone
        );

        if (candidates.length < 2) {
            this.logger.warn(`Not enough candidates for warmup (Found ${candidates.length}, need ≥2)`);
            return { sessionsCreated: 0, reason: 'min_instances' };
        }

        // Generate ALL unique pairs
        const pairs: [any, any][] = [];
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                pairs.push([candidates[i], candidates[j]]);
            }
        }

        this.logger.log(`🔄 Creating ${pairs.length} warmup sessions for ${candidates.length} instances`);

        let sessionsCreated = 0;
        let baseDelay = 0; // Stagger sessions so they don't all fire at once

        for (const [instA, instB] of pairs) {
            try {
                const result = await this.createWarmupSession(tenantId, instA, instB, baseDelay);
                if (result.success) {
                    sessionsCreated++;
                    baseDelay += result.totalDurationMs + (Math.floor(Math.random() * 300000) + 120000); // 2-7 min gap between sessions
                }
            } catch (err) {
                this.logger.error(`Session error ${instA.instanceName}↔${instB.instanceName}: ${err.message}`);
            }
        }

        return { sessionsCreated, totalPairs: pairs.length };
    }

    /**
     * Creates a single warmup session (conversation) between two specific instances
     */
    async createWarmupSession(tenantId: string, instA?: any, instB?: any, startDelayMs: number = 0) {
        let resolvedA = typeof instA === 'object' ? instA : null;
        let resolvedB = typeof instB === 'object' ? instB : null;

        // If specific IDs were requested, fetch them
        if (typeof instA === 'string' && typeof instB === 'string') {
            const instances = await this.instancesService.findAll(tenantId);
            resolvedA = instances.find(i => i.id === instA);
            resolvedB = instances.find(i => i.id === instB);
        }

        // If no specific instances provided or not found, find candidates (backward compat)
        if (!resolvedA || !resolvedB) {
            const instances = await this.instancesService.findAll(tenantId);
            const candidates = instances.filter(i =>
                (i.status === InstanceStatus.CONNECTED || i.status === 'connected' as any) &&
                i.warmupEnabled &&
                i.phone
            );

            if (candidates.length < 2) {
                this.logger.warn(`Not enough candidates for warmup session (Found ${candidates.length}, need 2)`);
                return { success: false, reason: 'min_instances', count: candidates.length, totalDurationMs: 0 };
            }

            const shuffled = candidates.sort(() => 0.5 - Math.random());
            [resolvedA, resolvedB] = shuffled.slice(0, 2);
        }

        instA = resolvedA;
        instB = resolvedB;

        if (!instA.phone || !instB.phone) {
            this.logger.warn(`Instances missing phone numbers: A=${instA.phone}, B=${instB.phone}`);
            return { success: false, reason: 'missing_phones', totalDurationMs: 0 };
        }

        console.log(`[Warmup] 💬 Generating conversation: ${instA.instanceName} (${instA.phone}) ↔ ${instB.instanceName} (${instB.phone})`);

        // Generate conversation with MORE messages
        const allTopics = ['trabalho', 'futebol', 'clima', 'comida', 'tecnologia', 'viagem', 'filmes',
            'música', 'série', 'receitas', 'exercício', 'pets', 'feriado', 'compras online',
            'trânsito', 'família', 'notícias', 'memes', 'jogos', 'café'];
        const randomTopics = allTopics.sort(() => 0.5 - Math.random()).slice(0, 3);

        let conversation;
        try {
            conversation = await this.aiService.generateWarmupConversation({
                messageCount: Math.floor(Math.random() * 8) + 8, // 8-15 messages (more than before)
                topics: randomTopics,
            });

            if (!conversation || !Array.isArray(conversation)) {
                this.logger.error(`AI generated invalid conversation: ${JSON.stringify(conversation)}`);
                return { success: false, reason: 'ai_error_invalid_response', totalDurationMs: 0 };
            }
        } catch (error) {
            this.logger.error(`Failed to generate warmup conversation: ${error.message}`);
            return { success: false, reason: 'ai_exception', error: error.message, totalDurationMs: 0 };
        }

        // Schedule messages
        let accumulatedDelay = startDelayMs;
        let messagesScheduled = 0;

        for (const msg of conversation) {
            try {
                if (!msg || typeof msg.content !== 'string') {
                    this.logger.warn(`Skipping invalid message object: ${JSON.stringify(msg)}`);
                    continue;
                }

                const sender = msg.role === 'A' ? instA : instB;
                const receiver = msg.role === 'A' ? instB : instA;

                // Fallback: instâncias antigas podem não ter 'provider' salvo
                const resolvedProvider = sender.provider || 'evolution';

                if (!sender.instanceName) {
                    this.logger.warn(`Skipping message: sender has no instanceName`);
                    continue;
                }

                // Use Human Behavior Service for realistic timing
                const timing = this.humanBehavior.generateTimingMetadata(msg.content);
                accumulatedDelay += timing.totalWaitMs;

                // Add extra buffer (random 10-45s) for more natural pacing
                accumulatedDelay += Math.floor(Math.random() * 35000) + 10000;

                await this.warmupQueue.add(
                    'execute-warmup-message',
                    {
                        instanceId: sender.id,
                        instanceName: sender.instanceName,
                        toPhone: receiver.phone,
                        content: msg.content,
                        tenantId: sender.tenantId,
                        provider: resolvedProvider,
                    },
                    {
                        delay: accumulatedDelay,
                        removeOnComplete: true,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 30000, // retry após 30s, 60s, 120s
                        },
                    }
                );
                messagesScheduled++;
            } catch (loopError) {
                this.logger.error(`Error in scheduling message: ${loopError.message}`);
            }
        }

        const minutes = Math.round(accumulatedDelay / 1000 / 60);
        console.log(`[Warmup] ✅ Scheduled ${messagesScheduled} messages for ${instA.instanceName}↔${instB.instanceName}. Duration: ~${minutes} min.`);
        return {
            success: true,
            messages: messagesScheduled,
            totalDurationMs: accumulatedDelay,
            conversation,
            instA: { id: instA.id, name: instA.instanceName, phone: instA.phone, provider: instA.provider },
            instB: { id: instB.id, name: instB.instanceName, phone: instB.phone, provider: instB.provider }
        };
    }

    /**
     * Get metadata for a specific warmup day
     */
    getScheduleForDay(day: number) {
        return WARMUP_SCHEDULE.find(s => s.day === day);
    }

    /**
     * Get warmup statistics for a tenant
     */
    async getStats(tenantId: string) {
        const instances = await this.instancesService.findAll(tenantId);
        const warmupInstances = instances.filter(i => i.warmupEnabled);

        const total = warmupInstances.length;
        const totalMessagesSent = warmupInstances.reduce((acc, curr) => acc + curr.dailySent, 0);

        // Simple health calculation (mock for now, can be improved based on connection stability)
        const avgHealth = total > 0
            ? Math.round(warmupInstances.reduce((acc, curr) => acc + (curr.status === 'connected' ? 100 : 50), 0) / total)
            : 0;

        return {
            activeChips: total,
            totalMessagesSent,
            avgHealth,
            instances: warmupInstances.map(i => ({
                id: i.id,
                phone: i.phone,
                day: i.warmupDay,
                dailyLimit: i.dailyLimit,
                sent: i.dailySent,
                status: i.status,
                health: i.status === 'connected' ? 95 + Math.floor(Math.random() * 5) : 50
            }))
        };
    }

    /**
     * Calculate current progress percentage
     */
    getWarmupProgress(day: number): number {
        const totalDays = WARMUP_SCHEDULE.length;
        if (day >= totalDays) return 100;
        return Math.round((day / totalDays) * 100);
    }
}
