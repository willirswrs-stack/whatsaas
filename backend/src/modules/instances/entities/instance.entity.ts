import { InstanceStatus } from '../../../common/enums/instance-status.enum';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';

import { ProxyEntity } from '../../proxies/entities/proxy.entity';

@Entity('instances')
@Index(['tenantId', 'status'])
export class Instance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', nullable: true })
    tenantId: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ name: 'instance_name', unique: true, nullable: true })
    instanceName: string;

    @Column({
        type: 'enum',
        enum: InstanceStatus,
        default: InstanceStatus.CREATED
    })
    status: InstanceStatus;

    @Column({ name: 'channel_type', default: 'unofficial' })
    channelType: string; // 'unofficial' (QR), 'official' (Meta)

    @Column({ default: 'evolution' })
    provider: 'waha' | 'evolution' | 'mobile_farm' | 'antidetect'; // WhatsApp API provider

    @Column({ 
        type: 'varchar', 
        default: 'registration',
        name: 'lifecycle_stage' 
    })
    stage: string; // 'registration', 'mobile_warmup', 'web_migration', 'mature', 'sold'

    @Column({ name: 'proxy_id', nullable: true })
    proxyId: string;

    @ManyToOne(() => ProxyEntity, (proxy) => proxy.instances, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'proxy_id' })
    proxy: ProxyEntity;

    @Column('jsonb', { name: 'meta_config', default: {} })
    metaConfig: Record<string, any>;

    @Column('jsonb', { name: 'evolution_config', default: {} })
    evolutionConfig: Record<string, any>;

    @Column({ name: 'warmup_day', default: 0 })
    warmupDay: number;

    @Column({ name: 'warmup_enabled', default: true })
    warmupEnabled: boolean;

    @Column({ name: 'is_system_seed', default: false })
    isSystemSeed: boolean;

    @Column({ name: 'warmup_profile', default: 'cold_outbound' })
    warmupProfile: string;

    @Column({ name: 'daily_limit', default: 10 })
    dailyLimit: number;

    @Column({ name: 'daily_sent', default: 0 })
    dailySent: number;

    @Column({ name: 'connected_at', nullable: true })
    connectedAt: Date;

    @Column({ name: 'last_connection_check_at', nullable: true })
    lastConnectionCheckAt: Date;

    @Column({ name: 'last_reconnect_attempt_at', nullable: true })
    lastReconnectAttemptAt: Date;

    @Column({ name: 'reconnect_attempts', default: 0 })
    reconnectAttempts: number;

    @Column({ name: 'reconnect_locked_until', nullable: true })
    reconnectLockedUntil: Date;

    @Column({ name: 'last_reconnect_error_code', nullable: true })
    lastReconnectErrorCode: string;

    @Column({ name: 'last_reconnect_error_message', nullable: true })
    lastReconnectErrorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'updated_at', nullable: true })
    updatedAt: Date;

    @OneToMany(() => WarmupSchedule, (schedule) => schedule.instance)
    warmupSchedules: WarmupSchedule[];

    // Helper: Check if has capacity
    hasCapacity(): boolean {
        return this.dailySent < this.dailyLimit;
    }

    // Helper: Get remaining capacity
    getRemainingCapacity(): number {
        return Math.max(0, this.dailyLimit - this.dailySent);
    }
}

@Entity('warmup_schedules')
export class WarmupSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'instance_id' })
    instanceId: string;

    @ManyToOne(() => Instance, (instance) => instance.warmupSchedules, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'instance_id' })
    instance: Instance;

    @Column({ name: 'day_number' })
    dayNumber: number;

    @Column({ name: 'target_messages' })
    targetMessages: number;

    @Column({ name: 'sent_count', default: 0 })
    sentCount: number;

    @Column('jsonb', { name: 'conversation_log', default: [] })
    conversationLog: any[];

    @Column({ default: 'pending' })
    status: string; // 'pending', 'running', 'completed'

    @Column({ name: 'scheduled_at' })
    scheduledAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;
}
