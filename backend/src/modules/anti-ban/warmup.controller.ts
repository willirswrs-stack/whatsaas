import { Controller, Post, Get, Request, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WarmupService, WARMUP_SCHEDULE } from './warmup.service';
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
        return WARMUP_SCHEDULE;
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
