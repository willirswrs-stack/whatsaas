import { Controller, Post, Get, Request, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WarmupService, WARMUP_SCHEDULE } from './warmup.service';

@Controller('warmup')
@UseGuards(JwtAuthGuard)
export class WarmupController {
    constructor(private readonly warmupService: WarmupService) { }

    @Post('session') // Manual trigger for testing
    async createSession(@Request() req, @Body() body: any) {
        const tenantId = req.user?.tenantId || req.user?.id; // Add fallback if needed
        return this.warmupService.createWarmupSession(tenantId || req.user.tenantId, body?.instAId, body?.instBId);
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
