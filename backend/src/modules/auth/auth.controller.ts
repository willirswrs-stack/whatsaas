import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private configService: ConfigService
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new tenant and user' })
    @ApiResponse({ status: 201, description: 'Registration successful' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(dto);
    }

    @Post('reset-admin')
    @ApiOperation({ summary: 'Force reset admin password' })
    async resetAdmin() {
        return this.authService.resetAdminPassword();
    }

    // ==========================
    // 🌐 SOCIAL LOGIN ROUTES
    // ==========================

    // 1. GOOGLE
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) {}

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res: any) {
        return this.handleSocialRedirect(req, res);
    }

    // 2. FACEBOOK
    @Get('facebook')
    @UseGuards(AuthGuard('facebook'))
    async facebookAuth(@Req() req) {}

    @Get('facebook/callback')
    @UseGuards(AuthGuard('facebook'))
    async facebookAuthRedirect(@Req() req, @Res() res: any) {
        return this.handleSocialRedirect(req, res);
    }

    // 3. GITHUB
    @Get('github')
    @UseGuards(AuthGuard('github'))
    async githubAuth(@Req() req) {}

    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    async githubAuthRedirect(@Req() req, @Res() res: any) {
        return this.handleSocialRedirect(req, res);
    }

    // Reusable logic to generate session and shoot user back to Frontend
    private async handleSocialRedirect(req: any, res: any) {
        try {
            // req.user here is the profile parsed by Passport strategy
            const result = await this.authService.handleSocialLogin(req.user);
            
            const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
            
            // Pass values to query to simulate auto-login on UI side
            const redirectUri = `${frontendUrl}/login/callback?` + 
                `accessToken=${result.accessToken}&` +
                `refreshToken=${result.refreshToken}&` +
                `user=${encodeURIComponent(JSON.stringify(result.user))}`;

            return res.redirect(redirectUri);
        } catch (err) {
            const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
            return res.redirect(`${frontendUrl}/login?error=social_failed`);
        }
    }
}
