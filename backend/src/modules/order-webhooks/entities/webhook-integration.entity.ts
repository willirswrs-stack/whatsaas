import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { WebhookEventMapping } from './webhook-event-mapping.entity';
import { WebhookEventInbox } from './webhook-event-inbox.entity';

export enum WebhookProvider {
    GENERIC = 'generic',
    SHOPIFY = 'shopify',
    WOOCOMMERCE = 'woocommerce',
    YAMPI = 'yampi',
    CARTPANDA = 'cartpanda',
    NUVEMSHOP = 'nuvemshop',
    TRAY = 'tray',
    OTHER = 'other',
}

export enum SignatureType {
    NONE = 'none',
    HMAC_SHA256 = 'hmac_sha256',
    TOKEN_HEADER = 'token_header',
}

@Entity('webhook_integrations')
@Index(['tenantId', 'endpointSlug'], { unique: true })
@Index(['tenantId', 'isEnabled'])
export class WebhookIntegration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: WebhookProvider,
        default: WebhookProvider.GENERIC,
    })
    provider: WebhookProvider;

    @Column({ name: 'is_enabled', default: true })
    isEnabled: boolean;

    @Column({ name: 'inbound_secret' })
    inboundSecret: string;

    @Column({ name: 'signature_header', nullable: true })
    signatureHeader: string;

    @Column({
        name: 'signature_type',
        type: 'enum',
        enum: SignatureType,
        default: SignatureType.NONE,
    })
    signatureType: SignatureType;

    @Column({ name: 'endpoint_slug' })
    endpointSlug: string;

    @Column({ name: 'rate_limit_per_minute', default: 60 })
    rateLimitPerMinute: number;

    @Column('jsonb', { name: 'metadata', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => WebhookEventMapping, (mapping) => mapping.integration)
    eventMappings: WebhookEventMapping[];

    @OneToMany(() => WebhookEventInbox, (inbox) => inbox.integration)
    eventInbox: WebhookEventInbox[];
}
