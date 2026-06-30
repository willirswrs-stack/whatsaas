"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Tenant = exports.SubscriptionPlan = void 0;
const typeorm_1 = require("typeorm");
let SubscriptionPlan = class SubscriptionPlan {
    id;
    name;
    maxInstances;
    maxMonthlyMessages;
    maxContacts;
    aiEnabled;
    warmupEnabled;
    price;
    billingCycle;
    features;
    createdAt;
    tenants;
};
exports.SubscriptionPlan = SubscriptionPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_instances', default: 5 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxInstances", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_monthly_messages', default: 10000 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxMonthlyMessages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_contacts', default: 5000 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxContacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ai_enabled', default: true }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "aiEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warmup_enabled', default: true }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "warmupEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'billing_cycle', default: 'monthly' }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], SubscriptionPlan.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Tenant, (tenant) => tenant.plan),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "tenants", void 0);
exports.SubscriptionPlan = SubscriptionPlan = __decorate([
    (0, typeorm_1.Entity)('subscription_plans')
], SubscriptionPlan);
let Tenant = class Tenant {
    id;
    name;
    slug;
    email;
    settings;
    status; // 'active', 'suspended', 'cancelled'
    planId;
    plan;
    trialEndsAt;
    asaasCustomerId;
    asaasSubscriptionId;
    aiTokensConsumed;
    aiTokensCost;
    createdAt;
    updatedAt;
    users;
};
exports.Tenant = Tenant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tenant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], Tenant.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], Tenant.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_id', nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SubscriptionPlan, (plan) => plan.tenants),
    (0, typeorm_1.JoinColumn)({ name: 'plan_id' }),
    __metadata("design:type", SubscriptionPlan)
], Tenant.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_ends_at', nullable: true }),
    __metadata("design:type", Date)
], Tenant.prototype, "trialEndsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'asaas_customer_id', nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "asaasCustomerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'asaas_subscription_id', nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "asaasSubscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ai_tokens_consumed', default: 0 }),
    __metadata("design:type", Number)
], Tenant.prototype, "aiTokensConsumed", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'ai_tokens_cost', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], Tenant.prototype, "aiTokensCost", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => User, (user) => user.tenant),
    __metadata("design:type", Array)
], Tenant.prototype, "users", void 0);
exports.Tenant = Tenant = __decorate([
    (0, typeorm_1.Entity)('tenants')
], Tenant);
let User = class User {
    id;
    tenantId;
    tenant;
    email;
    passwordHash;
    name;
    role; // 'owner', 'admin', 'member'
    lastLogin;
    createdAt;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], User.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", Tenant)
], User.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'member' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLogin", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
