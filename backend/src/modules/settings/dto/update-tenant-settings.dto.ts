import { IsString, IsOptional } from 'class-validator';

export class UpdateTenantSettingsDto {
    @IsOptional()
    @IsString()
    openaiKey?: string;

    @IsOptional()
    @IsString()
    anthropicKey?: string;

    @IsOptional()
    @IsString()
    geminiKey?: string;

    @IsOptional()
    @IsString()
    groqKey?: string;

    @IsOptional()
    @IsString()
    elevenLabsKey?: string;
}
