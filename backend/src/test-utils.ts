/**
 * Test Utilities for WhatSaas Backend
 * Contains mock factories, fixtures, and helper functions for testing
 */

import { Repository, ObjectLiteral } from 'typeorm';

// ============================================
// Mock Repository Factory
// ============================================

export type MockRepository<T extends ObjectLiteral> = Partial<
    Record<keyof Repository<T>, jest.Mock>
>;

export function createMockRepository<T extends ObjectLiteral>(): MockRepository<T> {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        remove: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(),
    };
}

// ============================================
// Mock Factories
// ============================================

export const mockTenant = (overrides = {}) => ({
    id: 'tenant-123',
    name: 'Test Company',
    slug: 'test-company',
    email: 'test@company.com',
    settings: {},
    status: 'active',
    planId: 'plan-123',
    plan: mockSubscriptionPlan(),
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    ...overrides,
});

export const mockUser = (overrides = {}) => ({
    id: 'user-123',
    tenantId: 'tenant-123',
    tenant: mockTenant(),
    email: 'user@test.com',
    passwordHash: '$2b$10$hashedpassword',
    name: 'Test User',
    role: 'owner',
    lastLogin: null,
    createdAt: new Date(),
    ...overrides,
});

export const mockSubscriptionPlan = (overrides = {}) => ({
    id: 'plan-123',
    name: 'Starter',
    maxInstances: 5,
    maxMonthlyMessages: 10000,
    maxContacts: 5000,
    aiEnabled: true,
    warmupEnabled: true,
    price: 0,
    billingCycle: 'monthly',
    features: {},
    createdAt: new Date(),
    ...overrides,
});

export const mockTenantSettings = (overrides = {}) => ({
    id: 'settings-123',
    tenantId: 'tenant-123',
    openaiKey: 'sk-test-openai-key-12345678',
    anthropicKey: 'sk-ant-test-key-12345678',
    geminiKey: null,
    groqKey: null,
    extraSettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const mockInstance = (overrides = {}) => ({
    id: 'instance-123',
    tenantId: 'tenant-123',
    instanceName: 'test-instance',
    phone: null,
    status: 'connecting',
    provider: 'evolution',
    proxyId: null,
    proxy: null,
    evolutionConfig: { instanceId: 'evo-123' },
    warmupSchedules: [],
    dailyMessageCount: 0,
    dailyMessageLimit: 200,
    connectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const mockCampaign = (overrides = {}) => ({
    id: 'campaign-123',
    tenantId: 'tenant-123',
    title: 'Test Campaign',
    status: 'draft',
    message: 'Hello {{name}}!',
    variations: [],
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    stats: { total: 0, sent: 0, delivered: 0, failed: 0 },
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// ============================================
// JWT Mock
// ============================================

export const mockJwtService = () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'user-123', tenantId: 'tenant-123' }),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-123', tenantId: 'tenant-123' }),
    decode: jest.fn().mockReturnValue({ sub: 'user-123', tenantId: 'tenant-123' }),
});

// ============================================
// ConfigService Mock
// ============================================

export const mockConfigService = (config: Record<string, any> = {}) => ({
    get: jest.fn((key: string) => {
        const defaults: Record<string, any> = {
            EVOLUTION_API_URL: 'http://localhost:8081',
            EVOLUTION_API_KEY: 'test-api-key',
            WAHA_API_URL: 'http://localhost:8080',
            WAHA_API_KEY: 'test-waha-key',
            JWT_SECRET: 'test-jwt-secret',
            ...config,
        };
        return defaults[key];
    }),
    getOrThrow: jest.fn((key: string) => {
        const value = mockConfigService(config).get(key);
        if (value === undefined) throw new Error(`Config ${key} not found`);
        return value;
    }),
});

// ============================================
// WhatsApp Provider Mock
// ============================================

export const mockWhatsAppProvider = () => ({
    providerType: 'evolution' as const,
    createInstance: jest.fn().mockResolvedValue({
        instanceId: 'evo-123',
        displayName: 'test-instance',
        provider: 'evolution',
    }),
    getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,mockQrCode'),
    getStatus: jest.fn().mockResolvedValue({
        status: 'connecting',
        phoneNumber: null,
        name: null,
    }),
    deleteInstance: jest.fn().mockResolvedValue(undefined),
    sendText: jest.fn().mockResolvedValue({
        messageId: 'msg-123',
        status: 'sent',
    }),
    sendPresence: jest.fn().mockResolvedValue(undefined),
    isOnWhatsApp: jest.fn().mockResolvedValue(true),
});

export const mockProviderFactory = () => ({
    getProvider: jest.fn().mockReturnValue(mockWhatsAppProvider()),
    getAvailableProviders: jest.fn().mockReturnValue([
        { type: 'evolution', name: 'Evolution API', available: true },
        { type: 'waha', name: 'WAHA', available: true },
    ]),
});

// ============================================
// HTTP/Axios Mock Helper
// ============================================

export const mockAxiosResponse = <T>(data: T, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
});

// ============================================
// Test Module Helper
// ============================================

export const getRepositoryToken = (entity: any) => {
    return `${entity.name}Repository`;
};
