import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: jest.Mocked<Partial<AuthService>>;

    beforeEach(async () => {
        authService = {
            register: jest.fn().mockResolvedValue({
                accessToken: 'mock-token',
                refreshToken: 'mock-refresh',
                tenant: { id: 'tenant-123', name: 'Test', slug: 'test', plan: null },
                user: { id: 'user-123', name: 'John', email: 'john@test.com', role: 'owner' },
            }),
            login: jest.fn().mockResolvedValue({
                accessToken: 'mock-token',
                refreshToken: 'mock-refresh',
                tenant: { id: 'tenant-123', name: 'Test', slug: 'test', plan: null },
                user: { id: 'user-123', name: 'John', email: 'john@test.com', role: 'owner' },
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authService },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
    });

    describe('register', () => {
        it('should register a new user', async () => {
            const dto = {
                name: 'John Doe',
                email: 'john@test.com',
                password: 'password123',
                companyName: 'Test Company',
            };

            const result = await controller.register(dto);

            expect(result.accessToken).toBeDefined();
            expect(authService.register).toHaveBeenCalledWith(dto);
        });
    });

    describe('login', () => {
        it('should login a user', async () => {
            const dto = {
                email: 'john@test.com',
                password: 'password123',
            };

            const result = await controller.login(dto);

            expect(result.accessToken).toBeDefined();
            expect(authService.login).toHaveBeenCalledWith(dto);
        });
    });
});
