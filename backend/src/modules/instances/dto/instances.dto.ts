import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateIf,
} from 'class-validator';
export class UpdateInstanceDto {
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  @IsString()
  proxyId?: string | null;

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

  @IsOptional()
  warmupDay?: number;

  @IsOptional()
  @IsObject()
  chipDetails?: Record<string, any>;
}

export class ToggleWarmupDto {
  @IsBoolean()
  enabled: boolean;
}

export class PairingCodeDto {
  @IsString()
  phoneNumber: string;
}
