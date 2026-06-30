"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("./entities/message.entity");
const contact_entity_1 = require("../contacts/entities/contact.entity");
const instance_entity_1 = require("../instances/entities/instance.entity");
const whatsapp_provider_factory_1 = require("../whatsapp/whatsapp-provider.factory");
let InboxService = InboxService_1 = class InboxService {
    messageRepo;
    contactRepo;
    instanceRepo;
    providerFactory;
    logger = new common_1.Logger(InboxService_1.name);
    /** 90 days retention */
    RETENTION_DAYS = 90;
    constructor(messageRepo, contactRepo, instanceRepo, providerFactory) {
        this.messageRepo = messageRepo;
        this.contactRepo = contactRepo;
        this.instanceRepo = instanceRepo;
        this.providerFactory = providerFactory;
    }
    /**
     * Persist a message (inbound or outbound).
     * Idempotent: skips if wamid already exists.
     */
    async saveMessage(dto) {
        try {
            // Idempotency check by wamid
            if (dto.wamid) {
                const existing = await this.messageRepo.findOne({ where: { wamid: dto.wamid } });
                if (existing)
                    return existing;
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
        }
        catch (error) {
            // Silently ignore duplicate wamid (race condition)
            if (error?.code === '23505')
                return null;
            this.logger.error(`Failed to save message: ${error.message}`);
            return null;
        }
    }
    /**
     * List conversations grouped by remoteJid, ordered by last message.
     * Returns one entry per unique conversation.
     */
    async getConversations(tenantId, options) {
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
            qb.andWhere('(m.remote_phone ILIKE :search OR m.remote_name ILIKE :search OR m.group_name ILIKE :search)', { search: `%${options.search}%` });
        }
        const rows = await qb.getRawMany();
        // For each conversation, fetch the last message content
        const data = await Promise.all(rows.map(async (row) => {
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
        }));
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
    async getMessages(tenantId, remoteJid, options) {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;
        const where = { tenantId, remoteJid };
        if (options?.instanceId)
            where.instanceId = options.instanceId;
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
    async markAsRead(tenantId, remoteJid) {
        await this.messageRepo.update({ tenantId, remoteJid, direction: 'inbound', status: 'received' }, { status: 'read' });
    }
    /**
     * Send a reply message from the inbox.
     * Uses the instance that received the original message (fallback to any connected instance).
     */
    async sendReply(tenantId, remoteJid, content, instanceIdOverride) {
        // Find the instance that last communicated with this JID
        let instanceId = instanceIdOverride;
        let instanceName;
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
        let instance = null;
        if (instanceId) {
            instance = await this.instanceRepo.findOne({
                where: { id: instanceId, tenantId },
            });
        }
        // Fallback: use any connected instance for this tenant
        if (!instance || instance.status !== 'connected') {
            instance = await this.instanceRepo.findOne({
                where: { tenantId, status: 'connected' },
                order: { createdAt: 'DESC' },
            });
        }
        if (!instance) {
            throw new common_1.NotFoundException('Nenhum chip conectado disponível para enviar a mensagem.');
        }
        const remotePhone = remoteJid.split('@')[0];
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
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
    async cleanupExpiredMessages() {
        const result = await this.messageRepo.delete({
            expiresAt: (0, typeorm_2.LessThan)(new Date()),
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
    async getUnreadCount(tenantId) {
        return this.messageRepo.count({
            where: { tenantId, direction: 'inbound', status: 'received' },
        });
    }
};
exports.InboxService = InboxService;
exports.InboxService = InboxService = InboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __param(2, (0, typeorm_1.InjectRepository)(instance_entity_1.Instance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        whatsapp_provider_factory_1.WhatsAppProviderFactory])
], InboxService);
