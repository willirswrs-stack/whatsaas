import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const JwtConfig: JwtModuleAsyncOptions = {
    useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'wathsaas_jwt_secret'),
        signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
    }),
    inject: [ConfigService],
};
