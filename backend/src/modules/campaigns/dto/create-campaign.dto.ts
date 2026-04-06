import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsBoolean, IsInt, Min, Max, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CampaignSettingsDto {
    @ApiProperty({ required: false, example: '08:00' })
    @IsOptional()
    @IsString()
    activeHoursStart?: string;

    @ApiProperty({ required: false, example: '20:00' })
    @IsOptional()
    @IsString()
    activeHoursEnd?: string;

    @ApiProperty({ required: false, example: 'random', enum: ['formal', 'casual', 'direct', 'mixed', 'none', 'random'] })
    @IsOptional()
    @IsIn(['formal', 'casual', 'direct', 'mixed', 'none', 'random'])
    greetingStyle?: 'formal' | 'casual' | 'direct' | 'mixed' | 'none' | 'random';
}

export class CreateCampaignDto {
    @ApiProperty({ example: 'Black Friday Campaign' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    templateId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    flowId?: string;

    @ApiProperty({ required: false, description: 'Single instance ID (deprecated, use instanceIds)' })
    @IsOptional()
    @IsUUID()
    instanceId?: string;

    @ApiProperty({ type: [String], required: false, description: 'List of Instance IDs to distribute sending' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    instanceIds?: string[];

    @ApiProperty({ type: [String], required: false })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    contactIds?: string[];

    @ApiProperty({ type: [String], required: false, description: 'List of Tag IDs to include contacts from' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    tagIds?: string[];

    @ApiProperty({ required: false, default: true })
    @IsOptional()
    @IsBoolean()
    aiSpinEnabled?: boolean;

    @ApiProperty({ required: false, minimum: 1, maximum: 50, default: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    variationCount?: number;

    @ApiProperty({ required: false, default: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    minDelaySec?: number;

    @ApiProperty({ required: false, default: 30 })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxDelaySec?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => CampaignSettingsDto)
    settings?: CampaignSettingsDto;
}
