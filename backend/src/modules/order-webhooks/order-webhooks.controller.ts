import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderWebhooksService } from './order-webhooks.service';
import {
    CreateWebhookIntegrationDto,
    UpdateWebhookIntegrationDto,
    CreateEventMappingDto,
    UpdateEventMappingDto,
} from './dto';
import { ProcessedStatus } from './entities/webhook-event-inbox.entity';
import { MessageStatus } from './entities/message-outbox.entity';

@ApiTags('Order Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('order-webhooks')
export class OrderWebhooksController {
    constructor(private readonly service: OrderWebhooksService) { }

    // ===================== Integrations =====================

    @Get('integrations')
    @ApiOperation({ summary: 'List all webhook integrations' })
    async listIntegrations(@Req() req: any) {
        return this.service.findAllIntegrations(req.user.tenantId);
    }

    @Post('integrations')
    @ApiOperation({ summary: 'Create a new webhook integration' })
    async createIntegration(
        @Req() req: any,
        @Body() dto: CreateWebhookIntegrationDto,
    ) {
        return this.service.createIntegration(req.user.tenantId, dto);
    }

    @Get('integrations/:id')
    @ApiOperation({ summary: 'Get integration details' })
    async getIntegration(@Req() req: any, @Param('id') id: string) {
        return this.service.findIntegration(req.user.tenantId, id);
    }

    @Patch('integrations/:id')
    @ApiOperation({ summary: 'Update integration' })
    async updateIntegration(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateWebhookIntegrationDto,
    ) {
        return this.service.updateIntegration(req.user.tenantId, id, dto);
    }

    @Delete('integrations/:id')
    @ApiOperation({ summary: 'Delete integration' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteIntegration(@Req() req: any, @Param('id') id: string) {
        await this.service.deleteIntegration(req.user.tenantId, id);
    }

    @Post('integrations/:id/regenerate-secret')
    @ApiOperation({ summary: 'Regenerate integration secret' })
    async regenerateSecret(@Req() req: any, @Param('id') id: string) {
        const secret = await this.service.regenerateSecret(req.user.tenantId, id);
        return { secret };
    }

    @Post('integrations/:id/test')
    @ApiOperation({ summary: 'Test webhook payload processing' })
    async testWebhook(
        @Req() req: any,
        @Param('id') id: string,
        @Body() payload: Record<string, any>,
    ) {
        return this.service.testWebhook(req.user.tenantId, id, payload);
    }

    // ===================== Event Types =====================

    @Get('event-types')
    @ApiOperation({ summary: 'List all available event types' })
    async listEventTypes() {
        return this.service.findAllEventTypes();
    }

    // ===================== Event Mappings =====================

    @Get('mappings')
    @ApiOperation({ summary: 'List event mappings' })
    async listMappings(
        @Req() req: any,
        @Query('integrationId') integrationId?: string,
    ) {
        return this.service.findAllMappings(req.user.tenantId, integrationId);
    }

    @Post('mappings')
    @ApiOperation({ summary: 'Create event mapping' })
    async createMapping(
        @Req() req: any,
        @Body() dto: CreateEventMappingDto,
    ) {
        return this.service.createMapping(req.user.tenantId, dto);
    }

    @Get('mappings/:id')
    @ApiOperation({ summary: 'Get mapping details' })
    async getMapping(@Req() req: any, @Param('id') id: string) {
        return this.service.findMapping(req.user.tenantId, id);
    }

    @Patch('mappings/:id')
    @ApiOperation({ summary: 'Update mapping' })
    async updateMapping(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateEventMappingDto,
    ) {
        return this.service.updateMapping(req.user.tenantId, id, dto);
    }

    @Delete('mappings/:id')
    @ApiOperation({ summary: 'Delete mapping' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMapping(@Req() req: any, @Param('id') id: string) {
        await this.service.deleteMapping(req.user.tenantId, id);
    }

    // ===================== Inbox (Events Monitoring) =====================

    @Get('inbox')
    @ApiOperation({ summary: 'List received webhook events' })
    async listInboxEvents(
        @Req() req: any,
        @Query('integrationId') integrationId?: string,
        @Query('eventTypeCode') eventTypeCode?: string,
        @Query('status') status?: ProcessedStatus,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.service.findInboxEvents(req.user.tenantId, {
            integrationId,
            eventTypeCode,
            status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: page || 1,
            limit: Math.min(limit || 20, 100),
        });
    }

    @Get('inbox/:id')
    @ApiOperation({ summary: 'Get event details' })
    async getInboxEvent(@Req() req: any, @Param('id') id: string) {
        return this.service.findInboxEvent(req.user.tenantId, id);
    }

    // ===================== Outbox (Messages Monitoring) =====================

    @Get('outbox')
    @ApiOperation({ summary: 'List outbox messages' })
    async listOutboxMessages(
        @Req() req: any,
        @Query('status') status?: MessageStatus,
        @Query('phone') phone?: string,
        @Query('orderId') orderId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.service.findOutboxMessages(req.user.tenantId, {
            status,
            phone,
            orderId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: page || 1,
            limit: Math.min(limit || 20, 100),
        });
    }

    @Post('outbox/:id/retry')
    @ApiOperation({ summary: 'Retry a failed message' })
    async retryMessage(@Req() req: any, @Param('id') id: string) {
        return this.service.retryMessage(req.user.tenantId, id);
    }

    // ===================== Statistics =====================

    @Get('statistics')
    @ApiOperation({ summary: 'Get webhook statistics' })
    async getStatistics(@Req() req: any) {
        return this.service.getStatistics(req.user.tenantId);
    }
}
