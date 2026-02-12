import {
    Controller,
    Post,
    Body,
    Param,
    Headers,
    Req,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrderWebhooksService } from './order-webhooks.service';

@ApiTags('Webhooks Inbound')
@Controller('webhooks')
export class OrderWebhooksInboundController {
    private readonly logger = new Logger(OrderWebhooksInboundController.name);

    constructor(private readonly service: OrderWebhooksService) { }

    /**
     * Public webhook endpoint for e-commerce platforms
     * URL: POST /api/v1/webhooks/:tenantSlug/:endpointSlug
     */
    @Post(':tenantSlug/:endpointSlug')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Receive webhook from e-commerce platform' })
    @ApiExcludeEndpoint() // Hide from swagger as it's a public endpoint
    async handleWebhook(
        @Param('tenantSlug') tenantSlug: string,
        @Param('endpointSlug') endpointSlug: string,
        @Body() payload: Record<string, any>,
        @Headers() headers: Record<string, string>,
        @Req() req: Request,
    ) {
        this.logger.debug(
            `Webhook received: ${tenantSlug}/${endpointSlug}`,
        );

        // Get raw body for signature validation
        // Express rawBody middleware stores it in req.rawBody
        const rawBody = (req as any).rawBody?.toString() || JSON.stringify(payload);

        try {
            const result = await this.service.handleInboundWebhook(
                tenantSlug,
                endpointSlug,
                payload,
                this.normalizeHeaders(headers),
                rawBody,
            );

            return result;
        } catch (error) {
            this.logger.error(
                `Webhook error: ${tenantSlug}/${endpointSlug} - ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Normalize header names to lowercase for consistent access
     */
    private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            normalized[key.toLowerCase()] = String(value);
        }
        return normalized;
    }
}
