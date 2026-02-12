import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { WebhookIntegration } from './webhook-integration.entity';
import { MessageOutbox } from './message-outbox.entity';

export enum ProcessedStatus {
    PENDING = 'pending',
    PROCESSED = 'processed',
    IGNORED = 'ignored',
    FAILED = 'failed',
}

@Entity('webhook_event_inbox')
@Index(['tenantId', 'processedStatus'])
@Index(['eventHash'], { unique: true })
@Index(['tenantId', 'receivedAt'])
@Index(['integrationId', 'eventTypeCode'])
export class WebhookEventInbox {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'webhook_integration_id' })
    integrationId: string;

    @ManyToOne(() => WebhookIntegration, (integration) => integration.eventInbox, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'webhook_integration_id' })
    integration: WebhookIntegration;

    @Column({ name: 'provider_event_id', nullable: true })
    providerEventId: string;

    @Column({ name: 'event_type_code' })
    eventTypeCode: string;

    @Column({ name: 'event_hash', unique: true })
    eventHash: string;

    @Column({ name: 'occurred_at', type: 'timestamp' })
    occurredAt: Date;

    @Column('jsonb', { name: 'payload_raw' })
    payloadRaw: Record<string, any>;

    @Column('jsonb', { name: 'normalized_data', nullable: true })
    normalizedData: Record<string, any>;

    @CreateDateColumn({ name: 'received_at' })
    receivedAt: Date;

    @Column({
        name: 'processed_status',
        type: 'enum',
        enum: ProcessedStatus,
        default: ProcessedStatus.PENDING,
    })
    processedStatus: ProcessedStatus;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column('text', { name: 'error_message', nullable: true })
    errorMessage: string;

    @Column('jsonb', { name: 'processing_log', default: [] })
    processingLog: Array<{
        timestamp: string;
        action: string;
        details?: any;
    }>;

    @OneToMany(() => MessageOutbox, (outbox) => outbox.sourceEvent)
    messages: MessageOutbox[];
}
