import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MessageOutbox } from './message-outbox.entity';

export enum LogDirection {
    OUTBOUND = 'outbound',
    INBOUND = 'inbound',
}

@Entity('message_logs')
@Index(['tenantId', 'createdAt'])
@Index(['messageOutboxId'])
export class MessageLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'message_outbox_id' })
    messageOutboxId: string;

    @ManyToOne(() => MessageOutbox, (outbox) => outbox.logs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'message_outbox_id' })
    message: MessageOutbox;

    @Column({
        type: 'enum',
        enum: LogDirection,
        default: LogDirection.OUTBOUND,
    })
    direction: LogDirection;

    @Column('jsonb', { name: 'provider_response', nullable: true })
    providerResponse: Record<string, any>;

    @Column('text', { name: 'error_details', nullable: true })
    errorDetails: string;

    @Column({ name: 'http_status', nullable: true })
    httpStatus: number;

    @Column({ name: 'duration_ms', nullable: true })
    durationMs: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
