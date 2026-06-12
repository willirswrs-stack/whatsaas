import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { Tenant, User, SubscriptionPlan } from '../tenants/entities/tenant.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(SubscriptionPlan)
        private planRepo: Repository<SubscriptionPlan>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async handleSocialLogin(profile: { email: string, firstName: string, lastName?: string, provider: string }): Promise<AuthResponseDto> {
        if (!profile.email) {
            throw new UnauthorizedException('Social profile does not share an email address.');
        }

        // 1. Try to find existing user
        let user = await this.userRepo.findOne({
            where: { email: profile.email },
            relations: ['tenant', 'tenant.plan'],
        });

        // 2. If not found, AUTO-REGISTER (Auto-Provisioning)
        if (!user) {
            // Get default plan (Trial Gratúito)
            const defaultPlan = await this.planRepo.findOne({
                where: { name: 'Trial Gratúito' },
            });

            // Create tenant dynamically
            const name = `${profile.firstName} ${profile.lastName || ''}`.trim();
            const slug = `${profile.provider}-${Date.now()}`; // Safe unique slug placeholder
            
            const tenant = this.tenantRepo.create({
                name: `${name}'s Workspace`,
                slug,
                email: profile.email,
                planId: defaultPlan?.id,
                status: 'trial', // Start as trial
                trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days trial for social
            });
            const savedTenant = await this.tenantRepo.save(tenant);

            // Create user (generate arbitrary pass since they use social)
            const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
            user = this.userRepo.create({
                tenantId: savedTenant.id,
                email: profile.email,
                passwordHash: randomPass,
                name: name,
                role: 'owner',
            });
            await this.userRepo.save(user);
            
            // Re-fetch full relations
            user = await this.userRepo.findOne({
                where: { id: user.id },
                relations: ['tenant', 'tenant.plan'],
            });
        }

        if (!user) throw new UnauthorizedException('Failed to authenticate user.');

        // 3. Generate and return session tokens
        const tokens = this.generateTokens(user, user.tenant);

        return {
            ...tokens,
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                plan: user.tenant.plan,
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    async register(dto: RegisterDto): Promise<AuthResponseDto> {
        // Check if email already exists
        const existingTenant = await this.tenantRepo.findOne({
            where: { email: dto.email },
        });
        if (existingTenant) {
            throw new ConflictException('Email already registered');
        }

        // Get default plan (Trial Gratúito)
        const defaultPlan = await this.planRepo.findOne({
            where: { name: 'Trial Gratúito' },
        });

        // Create tenant
        const baseSlug = dto.companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-');

        let slug = baseSlug;
        let counter = 1;
        while (await this.tenantRepo.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const tenant = this.tenantRepo.create({
            name: dto.companyName,
            slug,
            email: dto.email,
            planId: defaultPlan?.id,
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days trial
        });
        await this.tenantRepo.save(tenant);

        // Create owner user
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.userRepo.create({
            tenantId: tenant.id,
            email: dto.email,
            passwordHash,
            name: dto.name,
            role: 'owner',
        });
        await this.userRepo.save(user);

        // Generate tokens
        const tokens = this.generateTokens(user, tenant);

        return {
            ...tokens,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                plan: defaultPlan,
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    async login(dto: LoginDto): Promise<AuthResponseDto> {
        // Find user with tenant
        const user = await this.userRepo.findOne({
            where: { email: dto.email },
            relations: ['tenant', 'tenant.plan'],
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.userRepo.update(user.id, { lastLogin: new Date() });

        // Generate tokens
        const tokens = this.generateTokens(user, user.tenant);

        return {
            ...tokens,
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                plan: user.tenant.plan,
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    async validateUser(userId: string): Promise<User | null> {
        return this.userRepo.findOne({
            where: { id: userId },
            relations: ['tenant'],
        });
    }

    async seed() {
        // 1. Create Plans
        const plans = [
            { name: 'Free', price: 0, maxInstances: 1, maxMonthlyMessages: 1000 },
            { name: 'Starter', price: 97, maxInstances: 3, maxMonthlyMessages: 10000 },
            { name: 'Pro', price: 197, maxInstances: 10, maxMonthlyMessages: 50000 },
            { name: 'Enterprise', price: 497, maxInstances: 50, maxMonthlyMessages: 1000000 },
        ];

        for (const p of plans) {
            const exists = await this.planRepo.findOne({ where: { name: p.name } });
            if (!exists) {
                await this.planRepo.save(this.planRepo.create(p));
            }
        }

        // 2. Create Super Admin
        const adminEmail = 'admin@whatsaas.com';
        const adminExists = await this.userRepo.findOne({ where: { email: adminEmail } });

        if (!adminExists) {
            // Create System Tenant
            let systemTenant = await this.tenantRepo.findOne({ where: { slug: 'system' } });
            if (!systemTenant) {
                const entPlan = await this.planRepo.findOne({ where: { name: 'Enterprise' } });
                systemTenant = await this.tenantRepo.save(this.tenantRepo.create({
                    name: 'System',
                    slug: 'system',
                    email: 'system@whatsaas.com',
                    planId: entPlan?.id,
                    status: 'active'
                }));
            }

            const defaultAdminPass = this.configService.get<string>('ADMIN_DEFAULT_PASSWORD') || 'admin123';
            const passwordHash = await bcrypt.hash(defaultAdminPass, 12);
            await this.userRepo.save(this.userRepo.create({
                tenantId: systemTenant.id,
                email: adminEmail,
                passwordHash,
                name: 'Super Admin',
                role: 'super_admin'
            }));
        }

        return { message: 'Database seeded successfully' };
    }

    async resetAdminPassword() {
        const adminEmail = 'admin@whatsaas.com';
        let user = await this.userRepo.findOne({ where: { email: adminEmail } });

        const defaultAdminPass = this.configService.get<string>('ADMIN_DEFAULT_PASSWORD') || 'admin123';
        const newPasswordHash = await bcrypt.hash(defaultAdminPass, 12);

        if (user) {
            user.passwordHash = newPasswordHash;
            user.role = 'super_admin'; // Garantir role correta
            await this.userRepo.save(user);
            return { message: 'Admin password reset using environment variable ADMIN_DEFAULT_PASSWORD' };
        } else {
            // Se não existir, chama o seed para criar
            await this.seed();
            return { message: 'Admin created using environment variable ADMIN_DEFAULT_PASSWORD' };
        }
    }

    public generateTokens(user: User, tenant: Tenant) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: tenant.id,
            role: user.role,
        };

        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }
}
