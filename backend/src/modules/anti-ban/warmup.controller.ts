import { Controller, Post, Get, Request, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WarmupService } from './warmup.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('warmup')
@UseGuards(JwtAuthGuard)
export class WarmupController {
    constructor(private readonly warmupService: WarmupService) { }

    @Post('session') // Manual trigger for testing
    async createSession(@Request() req, @Body() body: any) {
        const tenantId = req.user?.tenantId || req.user?.id;
        return this.warmupService.createWarmupSession(tenantId || req.user.tenantId, body?.instAId, body?.instBId);
    }

    @Post('live-session')
    async createLiveSession(@Request() req, @Body() body: { instAId: string; instBId: string }) {
        const tenantId = req.user?.tenantId || req.user?.id;
        const sessionId = uuidv4();
        return this.warmupService.createLiveSession(tenantId, body.instAId, body.instBId, sessionId);
    }

    @Get('schedule')
    getSchedule() {
        const schedule: { day: number; limit: number; interval: number; maxPartners: number }[] = [];
        for (let day = 1; day <= 30; day++) {
            const progress = (day - 1) / 59;
            schedule.push({
                day,
                limit: Math.floor(50 + progress * (3000 - 50)),
                interval: Math.max(5, Math.floor(120 - progress * (120 - 5))),
                maxPartners: Math.floor(1 + Math.pow(progress, 1.5) * 29),
            });
        }
        return schedule;
    }

    @Get('stats')
    async getStats(@Request() req) {
        return this.warmupService.getStats(req.user.tenantId);
    }

    // Force daily routine (admin)
    @Post('daily-force')
    async forceDailyRoutine() {
        return this.warmupService.executeDailyWarmupRoutine();
    }
}
