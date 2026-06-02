import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, IsArray, Min, Max } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';

import { AiService } from './ai.service';
import { ElevenLabsService } from './elevenlabs.service';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

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

class PreviewVoiceDto {
    @IsString()
    voice: string;

    @IsOptional()
    @IsNumber()
    speed?: number;

    @IsOptional()
    @IsString()
    model?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly elevenLabs: ElevenLabsService,
    ) { }

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

    @Post('preview')
    @ApiOperation({ summary: 'Generate real-time audio preview for a voice' })
    async preview(
        @Body() dto: PreviewVoiceDto,
        @CurrentTenant() tenantId: string
    ) {
        const sampleText = 'Olá! Esta é uma amostra da minha voz para o aquecimento automático.';
        
        let buffer: Buffer;
        // Se for um ID de voz longo (estilo ElevenLabs), tenta ElevenLabs primeiro
        if (dto.voice.length > 15 && await this.elevenLabs.hasKey(tenantId)) {
            try {
                buffer = await this.elevenLabs.synthesizeSpeech(sampleText, dto.voice, tenantId);
            } catch (e) {
                // Fallback pro openai caso falhe
                buffer = await this.aiService.synthesizeSpeech(sampleText, 'alloy', dto.speed || 1.0, dto.model || 'tts-1-hd');
            }
        } else {
            buffer = await this.aiService.synthesizeSpeech(
                sampleText, 
                dto.voice, 
                dto.speed || 1.0,
                dto.model || 'tts-1-hd'
            );
        }
        
        return {
            success: true,
            audioBase64: buffer.toString('base64'),
            format: 'audio/mpeg'
        };
    }

    @Post('clone-voice')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Clones a custom voice using ElevenLabs' })
    async cloneVoice(
        @Body('name') name: string,
        @UploadedFile() file: any,
        @CurrentTenant() tenantId: string
    ) {
        if (!file) throw new Error('Arquivo de áudio não enviado.');
        
        const voiceId = await this.elevenLabs.cloneVoice(
            name || `Voz_${Date.now()}`,
            file.buffer,
            file.originalname || 'sample.mp3',
            tenantId
        );

        return {
            success: true,
            voiceId,
            message: 'Voz clonada com sucesso via ElevenLabs!'
        };
    }
}
