import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { WebhookEventInbox } from './webhook-event-inbox.entity';
import { MessageLog } from './message-log.entity';

export enum MessageChannel {
    WHATSAPP = 'whatsapp',
}

export enum MessageProvider {
    EVOLUTION_CLOUD = 'evolution_cloud',
}

export enum MessageStatus {
    QUEUED = 'queued',
    SENDING = 'sending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
    RETRYING = 'retrying',
}

@Entity('message_outbox')
@Index(['tenantId', 'status'])
@Index(['sourceEventId'])
@Index(['toPhoneE164'])
@Index(['orderId'])
@Index(['createdAt'])
export class MessageOutbox {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'source_event_id' })
    sourceEventId: string;

    @ManyToOne(() => WebhookEventInbox, (inbox) => inbox.messages, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'source_event_id' })
    sourceEvent: WebhookEventInbox;

    @Column({
        type: 'enum',
        enum: MessageChannel,
        default: MessageChannel.WHATSAPP,
    })
    channel: MessageChannel;

    @Column({ name: 'to_phone_e164' })
    toPhoneE164: string;

    @Column({ name: 'customer_name', nullable: true })
    customerName: string;

    @Column({ name: 'order_id', nullable: true })
    orderId: string;

    @Column({ name: 'template_name', nullable: true })
    templateName: string;

    @Column({ name: 'template_language', nullable: true })
    templateLanguage: string;

    @Column('jsonb', { name: 'template_params', nullable: true })
    templateParams: Record<string, any>;

    @Column('text', { name: 'message_text', nullable: true })
    messageText: string;

    @Column({
        type: 'enum',
        enum: MessageProvider,
        default: MessageProvider.EVOLUTION_CLOUD,
    })
    provider: MessageProvider;

    @Column({ name: 'provider_instance_id' })
    providerInstanceId: string;

    @Column({ name: 'provider_message_id', nullable: true })
    providerMessageId: string;

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.QUEUED,
    })
    status: MessageStatus;

    @Column({ default: 0 })
    tries: number;

    @Column('text', { name: 'last_error', nullable: true })
    lastError: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
    nextRetryAt: Date;

    @OneToMany(() => MessageLog, (log) => log.message)
    logs: MessageLog[];
}
