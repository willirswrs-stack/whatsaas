import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { TenantGuard } from './guards/tenant.guard';
import { Tenant, User, SubscriptionPlan } from '../tenants/entities/tenant.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant, User, SubscriptionPlan]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'wathsaas_jwt_secret'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        JwtStrategy, 
        GoogleStrategy, 
        FacebookStrategy, 
        GithubStrategy, 
        TenantGuard
    ],
    exports: [AuthService, JwtStrategy, TenantGuard, JwtModule],
})
export class AuthModule { }
