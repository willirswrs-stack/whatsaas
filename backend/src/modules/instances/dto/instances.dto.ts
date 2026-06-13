import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateInstanceDto {
    @IsOptional()
    @IsString()
    proxyId?: string;

    @IsOptional()
    @IsBoolean()
    warmupEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    isSystemSeed?: boolean;

    @IsOptional()
    @IsString()
    warmupProfile?: string;

    @IsOptional()
    @IsObject()
    metaConfig?: Record<string, any>;
}

export class ToggleWarmupDto {
    @IsBoolean()
    enabled: boolean;
}

export class PairingCodeDto {
    @IsString()
    phoneNumber: string;
}
