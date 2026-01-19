import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { Tenant, User, SubscriptionPlan } from '../tenants/entities/tenant.entity';
import {
    createMockRepository,
    mockTenant,
    mockUser,
    mockSubscriptionPlan,
    mockJwtService,
    MockRepository,
} from '../../test-utils';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let tenantRepo: MockRepository<Tenant>;
    let userRepo: MockRepository<User>;
    let planRepo: MockRepository<SubscriptionPlan>;
    let jwtService: ReturnType<typeof mockJwtService>;
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        tenantRepo = createMockRepository<Tenant>();
        userRepo = createMockRepository<User>();
        planRepo = createMockRepository<SubscriptionPlan>();
        jwtService = mockJwtService();
        configService = { get: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(Tenant),
                    useValue: tenantRepo,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepo,
                },
                {
                    provide: getRepositoryToken(SubscriptionPlan),
                    useValue: planRepo,
                },
                {
                    provide: JwtService,
                    useValue: jwtService,
                },
                {
                    provide: ConfigService,
                    useValue: configService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const registerDto = {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'securepassword123',
            companyName: 'Acme Inc',
        };

        it('should register a new user successfully', async () => {
            // Arrange
            const plan = mockSubscriptionPlan();
            const tenant = mockTenant({ email: registerDto.email, name: registerDto.companyName });
            const user = mockUser({ email: registerDto.email, name: registerDto.name });

            tenantRepo.findOne!.mockResolvedValue(null); // No existing tenant
            planRepo.findOne!.mockResolvedValue(plan);
            tenantRepo.create!.mockReturnValue(tenant);
            tenantRepo.save!.mockResolvedValue(tenant);
            userRepo.create!.mockReturnValue(user);
            userRepo.save!.mockResolvedValue(user);

            // Act
            const result = await service.register(registerDto);

            // Assert
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe(registerDto.email);
            expect(result.tenant.name).toBe(registerDto.companyName);
            expect(tenantRepo.save).toHaveBeenCalled();
            expect(userRepo.save).toHaveBeenCalled();
            expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
        });

        it('should throw ConflictException if email already exists', async () => {
            // Arrange
            tenantRepo.findOne!.mockResolvedValue(mockTenant({ email: registerDto.email }));

            // Act & Assert
            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
            expect(tenantRepo.save).not.toHaveBeenCalled();
        });

        it('should create tenant with correct slug from company name', async () => {
            // Arrange
            const dto = { ...registerDto, companyName: 'My Awesome Company!' };
            tenantRepo.findOne!.mockResolvedValue(null);
            planRepo.findOne!.mockResolvedValue(mockSubscriptionPlan());
            tenantRepo.create!.mockImplementation((data) => ({ ...mockTenant(), ...data }));
            tenantRepo.save!.mockImplementation((data) => Promise.resolve(data));
            userRepo.create!.mockReturnValue(mockUser());
            userRepo.save!.mockResolvedValue(mockUser());

            // Act
            await service.register(dto);

            // Assert
            expect(tenantRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    slug: 'my-awesome-company-',
                })
            );
        });

        it('should set trial period of 14 days', async () => {
            // Arrange
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            tenantRepo.findOne!.mockResolvedValue(null);
            planRepo.findOne!.mockResolvedValue(mockSubscriptionPlan());
            tenantRepo.create!.mockImplementation((data) => ({ ...mockTenant(), ...data }));
            tenantRepo.save!.mockImplementation((data) => Promise.resolve(data));
            userRepo.create!.mockReturnValue(mockUser());
            userRepo.save!.mockResolvedValue(mockUser());

            // Act
            await service.register(registerDto);

            // Assert
            expect(tenantRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    trialEndsAt: new Date(now + 14 * 24 * 60 * 60 * 1000),
                })
            );
        });
    });

    describe('login', () => {
        const loginDto = {
            email: 'john@example.com',
            password: 'securepassword123',
        };

        it('should login user successfully with correct credentials', async () => {
            // Arrange
            const user = mockUser({
                email: loginDto.email,
                tenant: mockTenant(),
            });
            userRepo.findOne!.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            userRepo.update!.mockResolvedValue({ affected: 1 });

            // Act
            const result = await service.login(loginDto);

            // Assert
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe(loginDto.email);
            expect(userRepo.update).toHaveBeenCalledWith(user.id, expect.objectContaining({ lastLogin: expect.any(Date) }));
        });

        it('should throw UnauthorizedException if user not found', async () => {
            // Arrange
            userRepo.findOne!.mockResolvedValue(null);

            // Act & Assert
            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if password is incorrect', async () => {
            // Arrange
            const user = mockUser({ email: loginDto.email });
            userRepo.findOne!.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act & Assert
            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('validateUser', () => {
        it('should return user if found', async () => {
            // Arrange
            const user = mockUser();
            userRepo.findOne!.mockResolvedValue(user);

            // Act
            const result = await service.validateUser('user-123');

            // Assert
            expect(result).toEqual(user);
            expect(userRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                relations: ['tenant'],
            });
        });

        it('should return null if user not found', async () => {
            // Arrange
            userRepo.findOne!.mockResolvedValue(null);

            // Act
            const result = await service.validateUser('non-existent-id');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('generateTokens', () => {
        it('should generate access and refresh tokens with correct payload', async () => {
            // Arrange
            const user = mockUser();
            const tenant = mockTenant();

            // Act - access private method through login
            userRepo.findOne!.mockResolvedValue({ ...user, tenant });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            userRepo.update!.mockResolvedValue({ affected: 1 });

            await service.login({ email: user.email, password: 'password' });

            // Assert
            expect(jwtService.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    sub: user.id,
                    email: user.email,
                    tenantId: tenant.id,
                    role: user.role,
                })
            );
            // Refresh token has different expiration
            expect(jwtService.sign).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ expiresIn: '30d' })
            );
        });
    });
});
