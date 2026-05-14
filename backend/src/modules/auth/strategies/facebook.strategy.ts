import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get<string>('FACEBOOK_CLIENT_ID') || 'DUMMY_CLIENT_ID',
            clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET') || 'DUMMY_SECRET',
            callbackURL: `${configService.get<string>('API_URL', 'http://localhost:3333')}/api/v1/auth/facebook/callback`,
            scope: 'email',
            profileFields: ['emails', 'name', 'picture'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
        const { name, emails, photos } = profile;
        const user = {
            email: emails?.[0]?.value || null,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos?.[0]?.value || null,
            accessToken,
            provider: 'facebook',
        };
        done(null, user);
    }
}
