import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'securepassword123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Acme Inc' })
    @IsString()
    companyName: string;
}

export class LoginDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'securepassword123' })
    @IsString()
    password: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    refreshToken: string;
}

export interface AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: any;
    };
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}
