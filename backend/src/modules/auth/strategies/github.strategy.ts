import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'DUMMY_CLIENT_ID',
            clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'DUMMY_SECRET',
            callbackURL: `${configService.get<string>('API_URL', 'http://localhost:3333')}/api/v1/auth/github/callback`,
            scope: ['user:email'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
        const { displayName, username, emails, photos } = profile;
        const user = {
            email: emails?.[0]?.value || null,
            firstName: displayName || username,
            lastName: '',
            picture: photos?.[0]?.value || null,
            accessToken,
            provider: 'github',
        };
        done(null, user);
    }
}
