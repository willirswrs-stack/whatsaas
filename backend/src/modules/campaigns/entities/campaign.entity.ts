import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';

@Entity('contacts')
@Index(['tenantId'])
@Index(['phone'])
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', nullable: true })
    tenantId: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    name: string;

    @Column('jsonb', { name: 'custom_fields', default: {} })
    customFields: Record<string, any>;

    @Column({ name: 'is_valid', default: true })
    isValid: boolean;

    @Column({ name: 'on_whatsapp', nullable: true })
    onWhatsapp: boolean;

    @Column({ name: 'last_interaction', nullable: true })
    lastInteraction: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => CampaignContact, (cc) => cc.contact)
    campaignContacts: CampaignContact[];
}

@Entity('templates')
export class Template {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', nullable: true })
    tenantId: string;

    @Column()
    name: string;

    @Column('text')
    content: string;

    @Column({ name: 'content_type', default: 'text' })
    contentType: string; // 'text', 'image', 'video', 'audio', 'document'

    @Column('jsonb', { name: 'media_config', default: {} })
    mediaConfig: Record<string, any>;

    @Column('jsonb', { default: [] })
    variables: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => Campaign, (campaign) => campaign.template)
    campaigns: Campaign[];
}

@Entity('campaigns')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', nullable: true })
    tenantId: string;

    @Column()
    name: string;

    @Column({ name: 'template_id', nullable: true })
    templateId: string;

    @ManyToOne(() => Template, (template) => template.campaigns)
    @JoinColumn({ name: 'template_id' })
    template: Template;

    @Column({ name: 'flow_id', nullable: true })
    flowId: string;

    @Column({ name: 'instance_id', nullable: true })
    instanceId: string;

    @Column({ default: 'draft' })
    status: string; // 'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'

    @Column({ name: 'ai_spin_enabled', default: true })
    aiSpinEnabled: boolean;

    @Column({ name: 'variation_count', default: 20 })
    variationCount: number;

    @Column('jsonb', { name: 'schedule_config', default: {} })
    scheduleConfig: Record<string, any>;

    @Column('jsonb', { name: 'targeting_rules', default: {} })
    targetingRules: Record<string, any>;

    @Column({ name: 'min_delay_ms', default: 5000 })
    minDelayMs: number;

    @Column({ name: 'max_delay_ms', default: 15000 })
    maxDelayMs: number;

    // Anti-Ban Settings
    @Column('jsonb', { name: 'settings', default: {} })
    settings: {
        activeHoursStart?: string;
        activeHoursEnd?: string;
        greetingStyle?: 'formal' | 'casual' | 'direct' | 'mixed' | 'none' | 'random';
        timezone?: string;
        daysOfWeek?: number[];
    };

    @Column({ name: 'total_contacts', default: 0 })
    totalContacts: number;

    @Column({ name: 'sent_count', default: 0 })
    sentCount: number;

    @Column({ name: 'delivered_count', default: 0 })
    deliveredCount: number;

    @Column({ name: 'read_count', default: 0 })
    readCount: number;

    @Column({ name: 'failed_count', default: 0 })
    failedCount: number;

    @Column({ name: 'scheduled_at', nullable: true })
    scheduledAt: Date;

    @Column({ name: 'started_at', nullable: true })
    startedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => MessageVariation, (variation) => variation.campaign)
    variations: MessageVariation[];

    @OneToMany(() => CampaignContact, (cc) => cc.campaign)
    campaignContacts: CampaignContact[];
}

@Entity('message_variations')
export class MessageVariation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign, (campaign) => campaign.variations, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ name: 'variation_index' })
    variationIndex: number;

    @Column('text')
    content: string;

    @Column({ name: 'content_hash' })
    contentHash: string;

    @Column({ name: 'use_count', default: 0 })
    useCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('campaign_contacts')
@Index(['campaignId', 'status'])
@Index(['contactId'])
export class CampaignContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign, (campaign) => campaign.campaignContacts, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ name: 'contact_id' })
    contactId: string;

    @ManyToOne(() => Contact, (contact) => contact.campaignContacts, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'instance_id', nullable: true })
    instanceId: string;

    @Column({ name: 'variation_id', nullable: true })
    variationId: string;

    @Column({ default: 'queued' })
    status: string; // 'queued', 'sending', 'sent', 'delivered', 'read', 'failed'

    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    @Column({ name: 'scheduled_at', nullable: true })
    scheduledAt: Date;

    @Column({ name: 'sent_at', nullable: true })
    sentAt: Date;

    @Column({ name: 'delivered_at', nullable: true })
    deliveredAt: Date;

    @Column({ name: 'read_at', nullable: true })
    readAt: Date;

    @Column({ name: 'failed_at', nullable: true })
    failedAt: Date;

    @Column({ name: 'error_message', nullable: true })
    errorMessage: string;

    @Column({ name: 'message_id', nullable: true })
    messageId: string;

    @Column({ name: 'content_hash', nullable: true })
    contentHash: string;

    @Column('jsonb', { name: 'timing_metadata', nullable: true })
    timingMetadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
