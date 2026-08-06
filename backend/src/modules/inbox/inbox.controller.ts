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
   * Send a media reply (photo, video, audio, document) from inbox.
   */
  @Post(':jid/send-media')
  @ApiOperation({ summary: 'Send media reply to a conversation' })
  async sendMediaReply(
    @CurrentTenant() tenantId: string,
    @Param('jid') jid: string,
    @Body()
    body: {
      type: 'image' | 'video' | 'audio' | 'document';
      url: string;
      caption?: string;
      filename?: string;
      instanceId?: string;
    },
  ) {
    const remoteJid = decodeURIComponent(jid);
    const message = await this.inboxService.sendMediaReply(
      tenantId,
      remoteJid,
      {
        type: body.type,
        url: body.url,
        caption: body.caption,
        filename: body.filename,
      },
      body.instanceId,
    );
    return { success: true, message };
  }

  /**
   * Publish WhatsApp Status/Stories broadcast for an instance.
   */
  @Post('status')
  @ApiOperation({ summary: 'Publish WhatsApp Status/Story broadcast' })
  async publishStatus(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      instanceId: string;
      type: 'text' | 'image' | 'video' | 'audio';
      content: string;
      caption?: string;
      backgroundColor?: string;
    },
  ) {
    const result = await this.inboxService.publishStatus(
      tenantId,
      body.instanceId,
      {
        type: body.type,
        content: body.content,
        caption: body.caption,
        backgroundColor: body.backgroundColor,
      },
    );
    return { success: true, result };
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
