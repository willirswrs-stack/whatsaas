import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InboxService } from './inbox.service';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('inbox')
@ApiBearerAuth()
@Controller('inbox')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class InboxController {
    private readonly logger = new Logger(InboxController.name);

    constructor(private readonly inboxService: InboxService) {}

    /**
     * List all conversations (grouped by contact/JID, sorted by last message).
     */
    @Get()
    @ApiOperation({ summary: 'List all conversations' })
    async getConversations(
        @CurrentTenant() tenantId: string,
        @Query('instanceId') instanceId?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.inboxService.getConversations(tenantId, {
            instanceId,
            search,
            limit: limit ? parseInt(limit, 10) : 30,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }

    /**
     * Get paginated messages for a specific conversation.
     */
    @Get(':jid/messages')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    async getMessages(
        @CurrentTenant() tenantId: string,
        @Param('jid') jid: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('instanceId') instanceId?: string,
    ) {
        // jid comes URL-encoded, decode it
        const remoteJid = decodeURIComponent(jid);
        return this.inboxService.getMessages(tenantId, remoteJid, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 50,
            instanceId,
        });
    }

    /**
     * Send a reply message from the inbox.
     * Automatically uses the chip that received the original message.
     */
    @Post(':jid/send')
    @ApiOperation({ summary: 'Send reply to a conversation' })
    async sendReply(
        @CurrentTenant() tenantId: string,
        @Param('jid') jid: string,
        @Body() body: { content: string; instanceId?: string },
    ) {
        const remoteJid = decodeURIComponent(jid);
        const message = await this.inboxService.sendReply(
            tenantId,
            remoteJid,
            body.content,
            body.instanceId,
        );
        return { success: true, message };
    }

    /**
     * Mark all messages in a conversation as read.
     */
    @Patch(':jid/read')
    @ApiOperation({ summary: 'Mark conversation as read' })
    async markAsRead(
        @CurrentTenant() tenantId: string,
        @Param('jid') jid: string,
    ) {
        const remoteJid = decodeURIComponent(jid);
        await this.inboxService.markAsRead(tenantId, remoteJid);
        return { success: true };
    }

    /**
     * Get total unread message count (for dashboard badge).
     */
    @Get('unread-count')
    @ApiOperation({ summary: 'Get total unread count' })
    async getUnreadCount(@CurrentTenant() tenantId: string) {
        const count = await this.inboxService.getUnreadCount(tenantId);
        return { count };
    }
}
