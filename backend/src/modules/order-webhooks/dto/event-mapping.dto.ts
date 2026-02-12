import {
    IsString,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsInt,
    Min,
    Max,
    IsObject,
    IsUrl,
} from 'class-validator';
import { MessageChannel } from '../entities/message-outbox.entity';
import { SendMode } from '../entities/webhook-event-mapping.entity';

export class CreateEventMappingDto {
    @IsString()
    integrationId: string;

    @IsString()
    eventTypeCode: string;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean = true;

    @IsObject()
    @IsOptional()
    matchRules?: Record<string, any> = {};

    @IsEnum(MessageChannel)
    @IsOptional()
    messageChannel?: MessageChannel = MessageChannel.WHATSAPP;

    @IsString()
    @IsOptional()
    whatsappInstanceId?: string;

    @IsEnum(SendMode)
    @IsOptional()
    sendMode?: SendMode = SendMode.TEMPLATE_ONLY;

    @IsString()
    @IsOptional()
    templateName?: string;

    @IsString()
    @IsOptional()
    templateLanguage?: string = 'pt_BR';

    @IsObject()
    @IsOptional()
    templateVariablesMap?: Record<string, string> = {};

    @IsString()
    @IsOptional()
    fallbackText?: string;

    @IsInt()
    @Min(1)
    @Max(1000)
    @IsOptional()
    rateLimitPerMinute?: number = 60;

    @IsBoolean()
    @IsOptional()
    forwardToN8n?: boolean = false;

    @IsUrl()
    @IsOptional()
    n8nWebhookUrl?: string;
}

export class UpdateEventMappingDto {
    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;

    @IsObject()
    @IsOptional()
    matchRules?: Record<string, any>;

    @IsEnum(MessageChannel)
    @IsOptional()
    messageChannel?: MessageChannel;

    @IsString()
    @IsOptional()
    whatsappInstanceId?: string;

    @IsEnum(SendMode)
    @IsOptional()
    sendMode?: SendMode;

    @IsString()
    @IsOptional()
    templateName?: string;

    @IsString()
    @IsOptional()
    templateLanguage?: string;

    @IsObject()
    @IsOptional()
    templateVariablesMap?: Record<string, string>;

    @IsString()
    @IsOptional()
    fallbackText?: string;

    @IsInt()
    @Min(1)
    @Max(1000)
    @IsOptional()
    rateLimitPerMinute?: number;

    @IsBoolean()
    @IsOptional()
    forwardToN8n?: boolean;

    @IsUrl()
    @IsOptional()
    n8nWebhookUrl?: string;
}
