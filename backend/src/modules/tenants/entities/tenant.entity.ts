import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    name: string;

    @Column({ name: 'max_instances', default: 5 })
    maxInstances: number;

    @Column({ name: 'max_monthly_messages', default: 10000 })
    maxMonthlyMessages: number;

    @Column({ name: 'max_contacts', default: 5000 })
    maxContacts: number;

    @Column({ name: 'ai_enabled', default: true })
    aiEnabled: boolean;

    @Column({ name: 'warmup_enabled', default: true })
    warmupEnabled: boolean;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column({ name: 'billing_cycle', default: 'monthly' })
    billingCycle: string;

    @Column('jsonb', { default: {} })
    features: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => Tenant, (tenant) => tenant.plan)
    tenants: Tenant[];
}

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    name: string;

    @Column({ unique: true, nullable: true })
    slug: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column('jsonb', { default: {} })
    settings: Record<string, any>;

    @Column({ default: 'active' })
    status: string; // 'active', 'suspended', 'cancelled'

    @Column({ name: 'plan_id', nullable: true })
    planId: string;

    @ManyToOne(() => SubscriptionPlan, (plan) => plan.tenants)
    @JoinColumn({ name: 'plan_id' })
    plan: SubscriptionPlan;

    @Column({ name: 'trial_ends_at', nullable: true })
    trialEndsAt: Date;

    @Column({ name: 'asaas_customer_id', nullable: true })
    asaasCustomerId: string;

    @Column({ name: 'asaas_subscription_id', nullable: true })
    asaasSubscriptionId: string;

    @Column({ name: 'ai_tokens_consumed', default: 0 })
    aiTokensConsumed: number;

    @Column('decimal', { name: 'ai_tokens_cost', precision: 10, scale: 4, default: 0 })
    aiTokensCost: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => User, (user) => user.tenant)
    users: User[];
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ nullable: true })
    email: string;

    @Column({ name: 'password_hash', nullable: true })
    passwordHash: string;

    @Column({ nullable: true })
    name: string;

    @Column({ default: 'member' })
    role: string; // 'owner', 'admin', 'member'

    @Column({ name: 'last_login', nullable: true })
    lastLogin: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
