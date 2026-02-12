import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { WebhookIntegration } from './webhook-integration.entity';
import { MessageChannel } from './message-outbox.entity';

export enum SendMode {
    TEMPLATE_ONLY = 'template_only',
    TEMPLATE_PREFERRED = 'template_preferred',
    FREE_TEXT_IF_24H = 'free_text_if_24h',
}

@Entity('webhook_event_mappings')
@Index(['tenantId', 'integrationId', 'eventTypeCode'])
@Index(['tenantId', 'isEnabled'])
export class WebhookEventMapping {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'webhook_integration_id' })
    integrationId: string;

    @ManyToOne(() => WebhookIntegration, (integration) => integration.eventMappings, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'webhook_integration_id' })
    integration: WebhookIntegration;

    @Column({ name: 'event_type_code' })
    eventTypeCode: string;

    @Column({ name: 'is_enabled', default: true })
    isEnabled: boolean;

    @Column('jsonb', { name: 'match_rules', default: {} })
    matchRules: Record<string, any>;
    // Example: { "status": "shipped", "shipping_method": "motoboy" }

    @Column({
        name: 'message_channel',
        type: 'enum',
        enum: MessageChannel,
        default: MessageChannel.WHATSAPP,
    })
    messageChannel: MessageChannel;

    @Column({ name: 'whatsapp_instance_id', nullable: true })
    whatsappInstanceId: string;

    @Column({
        name: 'send_mode',
        type: 'enum',
        enum: SendMode,
        default: SendMode.TEMPLATE_ONLY,
    })
    sendMode: SendMode;

    @Column({ name: 'template_name', nullable: true })
    templateName: string;

    @Column({ name: 'template_language', default: 'pt_BR' })
    templateLanguage: string;

    @Column('jsonb', { name: 'template_variables_map', default: {} })
    templateVariablesMap: Record<string, string>;
    // Maps template variable to payload path
    // Example: { "1": "order.customer.name", "2": "order.tracking.code" }

    @Column('text', { name: 'fallback_text', nullable: true })
    fallbackText: string;

    @Column({ name: 'rate_limit_per_minute', default: 60 })
    rateLimitPerMinute: number;

    // n8n Integration
    @Column({ name: 'forward_to_n8n', default: false })
    forwardToN8n: boolean;

    @Column({ name: 'n8n_webhook_url', nullable: true })
    n8nWebhookUrl: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
