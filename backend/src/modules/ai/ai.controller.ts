import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, IsArray, Min, Max } from 'class-validator';

import { AiService } from './ai.service';
import { TenantGuard } from '../auth/guards/tenant.guard';

class SpinDto {
    @IsString()
    originalText: string;

    @IsNumber()
    @Min(1)
    @Max(10)
    count: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    creativity?: number;

    @IsOptional()
    @IsIn(['openai', 'anthropic'])
    provider?: 'openai' | 'anthropic';
}

class WarmupScriptDto {
    @IsNumber()
    messageCount: number;

    @IsArray()
    @IsString({ each: true })
    topics: string[];
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('spin')
    @ApiOperation({ summary: 'Generate message variations using AI' })
    async spin(@Body() dto: SpinDto) {
        const result = await this.aiService.generateVariations(
            dto.originalText,
            dto.count,
            dto.creativity || 0.7,
            dto.provider || 'openai',
        );

        return {
            success: true,
            variations: result.variations,
            tokensUsed: result.tokensUsed,
        };
    }

    @Post('warmup-script')
    @ApiOperation({ summary: 'Generate warm-up conversation script' })
    async warmupScript(@Body() dto: WarmupScriptDto) {
        const conversation = await this.aiService.generateWarmupConversation({
            messageCount: dto.messageCount,
            topics: dto.topics,
        });

        return {
            success: true,
            conversation,
        };
    }
}
