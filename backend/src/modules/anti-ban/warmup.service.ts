/**
 * WarmupService - Intelligent Warmup Engine
 * 
 * Manages the lifecycle of new chips, gradually increasing their load capacity
 * to avoid bans. Implements a progressive maturity curve.
 * 
 * @principle "Slow is smooth, smooth is fast"
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Instance } from '../instances/entities/instance.entity';
// import { Cron, CronExpression } from '@nestjs/schedule';

// Define the Warmup Schedule
export const WARMUP_SCHEDULE = [
    { day: 1, limit: 10, interval: 120 },   // Day 1: 10 msgs, super slow
    { day: 2, limit: 20, interval: 90 },    // Day 2: 20 msgs
    { day: 3, limit: 30, interval: 60 },
    { day: 4, limit: 50, interval: 45 },
    { day: 5, limit: 80, interval: 30 },
    { day: 6, limit: 120, interval: 25 },
    { day: 7, limit: 160, interval: 20 },
    { day: 8, limit: 220, interval: 15 },
    { day: 9, limit: 300, interval: 12 },
    { day: 10, limit: 400, interval: 10 },
    { day: 11, limit: 550, interval: 8 },
    { day: 12, limit: 700, interval: 6 },
    { day: 13, limit: 900, interval: 5 },
    { day: 14, limit: 1200, interval: 4 },  // Day 14: Graduated!
];

// Max limit for mature chips
export const MATURE_LIMIT = 2000;

import { WARMUP_QUEUE } from '../../config/bull.config';

@Injectable()
export class WarmupService {
    private readonly logger = new Logger(WarmupService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectQueue(WARMUP_QUEUE) private warmupQueue: Queue,
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
    async executeDailyWarmupRoutine(): Promise<{ advanced: number; completed: number }> {
        this.logger.log('🔥 Executing Daily Warmup Routine...');

        // Find all instances with warmup enabled
        const instances = await this.instanceRepo.find({
            where: { warmupEnabled: true },
        });

        let advancedCount = 0;
        let completedCount = 0;

        for (const instance of instances) {
            const result = await this.advanceInstanceWarmup(instance);
            if (result === 'advanced') advancedCount++;
            if (result === 'completed') completedCount++;
        }

        this.logger.log(`✅ Warmup Routine Finished: ${advancedCount} advanced, ${completedCount} completed.`);
        return { advanced: advancedCount, completed: completedCount };
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

        // Current usage check (Optional strict mode: only advance if used yesterday)
        // For now, we assume time-based progression is sufficient

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
            });

            return 'completed';
        }

        // Advance to next stage
        await this.instanceRepo.update(instance.id, {
            warmupDay: nextDay,
            dailyLimit: schedule.limit,
        });

        this.logger.log(
            `📈 Instance ${instance.instanceName} advanced to Day ${nextDay} ` +
            `(Limit: ${schedule.limit}, Interval: ${schedule.interval}s)`
        );

        return 'advanced';
    }

    /**
     * Get metadata for a specific warmup day
     */
    getScheduleForDay(day: number) {
        return WARMUP_SCHEDULE.find(s => s.day === day);
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
