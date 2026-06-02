import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message, MessageDirection, MessageStatus, MessageType } from './entities/message.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Instance } from '../instances/entities/instance.entity';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { ProviderType } from '../whatsapp/whatsapp-provider.interface';

export interface SaveMessageDto {
    tenantId: string;
    instanceId?: string;
    instanceName?: string;
    contactId?: string;
    remoteJid: string;
    remotePhone?: string;
    remoteName?: string;
    wamid?: string;
    direction: MessageDirection;
    type?: MessageType;
    content?: string;
    mediaUrl?: string;
    mediaMime?: string;
    status?: MessageStatus;
    campaignId?: string;
    isGroup?: boolean;
    groupName?: string;
    rawPayload?: Record<string, any>;
}

export interface ConversationSummary {
    remoteJid: string;
    remotePhone: string;
    remoteName: string;
    isGroup: boolean;
    groupName?: string;
    contactId?: string;
    instanceId?: string;
    instanceName?: string;
    lastMessage: {
        content: string;
        direction: MessageDirection;
        type: MessageType;
        createdAt: Date;
    };
    unreadCount: number;
    totalMessages: number;
}

@Injectable()
export class InboxService {
    private readonly logger = new Logger(InboxService.name);
    /** 90 days retention */
    private readonly RETENTION_DAYS = 90;

    constructor(
        @InjectRepository(Message)
        private messageRepo: Repository<Message>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        private providerFactory: WhatsAppProviderFactory,
    ) {}

    /**
     * Persist a message (inbound or outbound).
     * Idempotent: skips if wamid already exists.
     */
    async saveMessage(dto: SaveMessageDto): Promise<Message | null> {
        try {
            // Idempotency check by wamid
            if (dto.wamid) {
                const existing = await this.messageRepo.findOne({ where: { wamid: dto.wamid } });
                if (existing) return existing;
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + this.RETENTION_DAYS);

            const message = this.messageRepo.create({
                ...dto,
                type: dto.type || 'text',
                status: dto.status || (dto.direction === 'inbound' ? 'received' : 'sent'),
                expiresAt,
            });

            return await this.messageRepo.save(message);
        } catch (error: any) {
            // Silently ignore duplicate wamid (race condition)
            if (error?.code === '23505') return null;
            this.logger.error(`Failed to save message: ${error.message}`);
            return null;
        }
    }

    /**
     * List conversations grouped by remoteJid, ordered by last message.
     * Returns one entry per unique conversation.
     */
    async getConversations(
        tenantId: string,
        options?: { instanceId?: string; search?: string; limit?: number; offset?: number }
    ): Promise<{ data: ConversationSummary[]; total: number }> {
        const limit = options?.limit || 30;
        const offset = options?.offset || 0;

        // Subquery: latest message per remoteJid + instanceId
        const qb = this.messageRepo
            .createQueryBuilder('m')
            .select([
                'm.remote_jid AS "remoteJid"',
                'm.remote_phone AS "remotePhone"',
                'm.remote_name AS "remoteName"',
                'm.is_group AS "isGroup"',
                'm.group_name AS "groupName"',
                'm.contact_id AS "contactId"',
                'm.instance_id AS "instanceId"',
                'm.instance_name AS "instanceName"',
                'MAX(m.created_at) AS "lastMessageAt"',
                `COUNT(CASE WHEN m.direction = 'inbound' AND m.status = 'received' THEN 1 END) AS "unreadCount"`,
                'COUNT(*) AS "totalMessages"',
            ])
            .where('m.tenant_id = :tenantId', { tenantId })
            .andWhere('m.created_at > NOW() - INTERVAL \'90 days\'')
            .groupBy('m.remote_jid, m.remote_phone, m.remote_name, m.is_group, m.group_name, m.contact_id, m.instance_id, m.instance_name')
            .orderBy('"lastMessageAt"', 'DESC')
            .limit(limit)
            .offset(offset);

        if (options?.instanceId) {
            qb.andWhere('m.instance_id = :instanceId', { instanceId: options.instanceId });
        }

        if (options?.search) {
            qb.andWhere(
                '(m.remote_phone ILIKE :search OR m.remote_name ILIKE :search OR m.group_name ILIKE :search)',
                { search: `%${options.search}%` }
            );
        }

        const rows = await qb.getRawMany();

        // For each conversation, fetch the last message content
        const data: ConversationSummary[] = await Promise.all(
            rows.map(async (row) => {
                const lastMsg = await this.messageRepo.findOne({
                    where: { tenantId, remoteJid: row.remoteJid },
                    order: { createdAt: 'DESC' },
                    select: ['content', 'direction', 'type', 'createdAt'],
                });

                return {
                    remoteJid: row.remoteJid,
                    remotePhone: row.remotePhone || row.remoteJid.split('@')[0],
                    remoteName: row.remoteName || row.groupName || row.remotePhone || 'Desconhecido',
                    isGroup: row.isGroup,
                    groupName: row.groupName,
                    contactId: row.contactId,
                    instanceId: row.instanceId,
                    instanceName: row.instanceName,
                    lastMessage: {
                        content: lastMsg?.content || '',
                        direction: lastMsg?.direction || 'inbound',
                        type: lastMsg?.type || 'text',
                        createdAt: lastMsg?.createdAt || new Date(),
                    },
                    unreadCount: parseInt(row.unreadCount, 10) || 0,
                    totalMessages: parseInt(row.totalMessages, 10) || 0,
                };
            })
        );

        // Get total count for pagination
        const totalQb = this.messageRepo
            .createQueryBuilder('m')
            .select('COUNT(DISTINCT m.remote_jid)', 'count')
            .where('m.tenant_id = :tenantId', { tenantId });

        if (options?.instanceId) {
            totalQb.andWhere('m.instance_id = :instanceId', { instanceId: options.instanceId });
        }
        const totalRow = await totalQb.getRawOne();
        const total = parseInt(totalRow?.count || '0', 10);

        return { data, total };
    }

    /**
     * Get paginated messages for a specific conversation (remoteJid).
     */
    async getMessages(
        tenantId: string,
        remoteJid: string,
        options?: { page?: number; limit?: number; instanceId?: string }
    ) {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = { tenantId, remoteJid };
        if (options?.instanceId) where.instanceId = options.instanceId;

        const [data, total] = await this.messageRepo.findAndCount({
            where,
            order: { createdAt: 'ASC' },
            take: limit,
            skip,
            relations: ['contact'],
        });

        return {
            data,
            meta: {
                total,
                page,
                last_page: Math.ceil(total / limit),
                limit,
            },
        };
    }

    /**
     * Mark all inbound messages in a conversation as read.
     */
    async markAsRead(tenantId: string, remoteJid: string): Promise<void> {
        await this.messageRepo.update(
            { tenantId, remoteJid, direction: 'inbound', status: 'received' },
            { status: 'read' }
        );
    }

    /**
     * Send a reply message from the inbox.
     * Uses the instance that received the original message (fallback to any connected instance).
     */
    async sendReply(
        tenantId: string,
        remoteJid: string,
        content: string,
        instanceIdOverride?: string
    ): Promise<Message | null> {
        // Find the instance that last communicated with this JID
        let instanceId = instanceIdOverride;
        let instanceName: string | undefined;

        if (!instanceId) {
            const lastMsg = await this.messageRepo.findOne({
                where: { tenantId, remoteJid },
                order: { createdAt: 'DESC' },
                select: ['instanceId', 'instanceName'],
            });
            instanceId = lastMsg?.instanceId || undefined;
            instanceName = lastMsg?.instanceName || undefined;
        }

        // Verify instance is connected
        let instance: Instance | null = null;
        if (instanceId) {
            instance = await this.instanceRepo.findOne({
                where: { id: instanceId, tenantId },
            });
        }

        // Fallback: use any connected instance for this tenant
        if (!instance || instance.status !== 'connected' as any) {
            instance = await this.instanceRepo.findOne({
                where: { tenantId, status: 'connected' as any },
                order: { createdAt: 'DESC' },
            });
        }

        if (!instance) {
            throw new NotFoundException('Nenhum chip conectado disponível para enviar a mensagem.');
        }

        const remotePhone = remoteJid.split('@')[0];
        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');

        const result = await provider.sendText(instance.instanceName, remotePhone, content);
        const wamid = result?.messageId;

        // Persist outbound message
        return this.saveMessage({
            tenantId,
            instanceId: instance.id,
            instanceName: instance.instanceName,
            remoteJid,
            remotePhone,
            direction: 'outbound',
            type: 'text',
            content,
            wamid,
            status: 'sent',
            isGroup: remoteJid.endsWith('@g.us'),
        });
    }

    /**
     * Cleanup expired messages (90 day retention).
     * Should be called by a cron job.
     */
    async cleanupExpiredMessages(): Promise<number> {
        const result = await this.messageRepo.delete({
            expiresAt: LessThan(new Date()),
        });
        const deleted = result.affected || 0;
        if (deleted > 0) {
            this.logger.log(`🗑️ Cleaned up ${deleted} expired messages`);
        }
        return deleted;
    }

    /**
     * Get unread count for a tenant (for dashboard badge).
     */
    async getUnreadCount(tenantId: string): Promise<number> {
        return this.messageRepo.count({
            where: { tenantId, direction: 'inbound', status: 'received' },
        });
    }
}
