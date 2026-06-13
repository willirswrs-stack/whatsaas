import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateManualTenantDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    planId?: string;

    @IsString()
    userName: string;

    @IsEmail()
    userEmail: string;

    @IsString()
    passwordHash: string;
}
