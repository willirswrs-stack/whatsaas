import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max, Matches } from 'class-validator';
import { WebhookProvider, SignatureType } from '../entities/webhook-integration.entity';

export class CreateWebhookIntegrationDto {
    @IsString()
    name: string;

    @IsEnum(WebhookProvider)
    @IsOptional()
    provider?: WebhookProvider = WebhookProvider.GENERIC;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean = true;

    @IsString()
    @IsOptional()
    inboundSecret?: string; // Will be auto-generated if not provided

    @IsString()
    @IsOptional()
    signatureHeader?: string;

    @IsEnum(SignatureType)
    @IsOptional()
    signatureType?: SignatureType = SignatureType.NONE;

    @IsString()
    @IsOptional()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Endpoint slug must be lowercase alphanumeric with hyphens only',
    })
    endpointSlug?: string; // Will be auto-generated if not provided

    @IsInt()
    @Min(1)
    @Max(1000)
    @IsOptional()
    rateLimitPerMinute?: number = 60;
}

export class UpdateWebhookIntegrationDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(WebhookProvider)
    @IsOptional()
    provider?: WebhookProvider;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;

    @IsString()
    @IsOptional()
    inboundSecret?: string;

    @IsString()
    @IsOptional()
    signatureHeader?: string;

    @IsEnum(SignatureType)
    @IsOptional()
    signatureType?: SignatureType;

    @IsString()
    @IsOptional()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Endpoint slug must be lowercase alphanumeric with hyphens only',
    })
    endpointSlug?: string;

    @IsInt()
    @Min(1)
    @Max(1000)
    @IsOptional()
    rateLimitPerMinute?: number;
}
