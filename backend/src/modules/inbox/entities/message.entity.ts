import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction' | 'other';

@Entity('messages')
@Index(['tenantId', 'remoteJid', 'createdAt'])
@Index(['tenantId', 'instanceId', 'createdAt'])
@Index(['wamid'], { unique: true, where: '"wamid" IS NOT NULL' })
@Index(['contactId'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'instance_id', nullable: true })
    instanceId: string;

    @Column({ name: 'instance_name', nullable: true })
    instanceName: string; // whatsapp instance name (for display)

    @Column({ name: 'contact_id', nullable: true })
    contactId: string;

    @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    /** Raw JID: 5511999999999@s.whatsapp.net or groupid@g.us */
    @Column({ name: 'remote_jid' })
    remoteJid: string;

    /** Normalized phone number (without suffix) for display */
    @Column({ name: 'remote_phone', nullable: true })
    remotePhone: string;

    /** Remote contact display name (from WhatsApp) */
    @Column({ name: 'remote_name', nullable: true })
    remoteName: string;

    /** WhatsApp message ID (wamid) — unique per message */
    @Column({ name: 'wamid', nullable: true })
    wamid: string;

    @Column({ name: 'direction', type: 'varchar', length: 10 })
    direction: MessageDirection;

    @Column({ name: 'type', type: 'varchar', length: 20, default: 'text' })
    type: MessageType;

    /** Text content or media caption */
    @Column({ name: 'content', type: 'text', nullable: true })
    content: string;

    /** For media messages: URL in our storage */
    @Column({ name: 'media_url', nullable: true })
    mediaUrl: string;

    /** For media messages: MIME type */
    @Column({ name: 'media_mime', nullable: true })
    mediaMime: string;

    @Column({ name: 'status', type: 'varchar', length: 20, default: 'received' })
    status: MessageStatus;

    /** FK to campaign if sent via campaign */
    @Column({ name: 'campaign_id', nullable: true })
    campaignId: string;

    /** Whether this is a group message */
    @Column({ name: 'is_group', default: false })
    isGroup: boolean;

    /** Group name (for group messages) */
    @Column({ name: 'group_name', nullable: true })
    groupName: string;

    /** Raw payload from Evolution API (for debugging) */
    @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
    rawPayload: Record<string, any>;

    /** Expiry at 90 days (for cleanup jobs) */
    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
