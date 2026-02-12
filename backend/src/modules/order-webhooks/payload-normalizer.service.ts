import { Injectable, Logger } from '@nestjs/common';
import { WebhookProvider } from './entities/webhook-integration.entity';

/**
 * Normalized payload structure for all e-commerce providers
 */
export interface NormalizedPayload {
    // Order info
    orderId: string;
    orderNumber?: string;
    orderStatus?: string;

    // Customer info
    customerName: string;
    customerEmail?: string;
    phoneE164: string; // Phone in E.164 format (+5511999999999)

    // Tracking
    trackingCode?: string;
    trackingUrl?: string;

    // Dates
    shippingDate?: string;
    estimatedDeliveryDate?: string;
    newDeliveryDate?: string;
    deliveredAt?: string;

    // Other
    cancelReason?: string;
    itemsCount?: number;
    totalAmount?: number;
    currency?: string;
    storeName?: string;

    // Shipping
    shippingMethod?: string;
    shippingCarrier?: string;

    // Raw event info
    eventType: string;
    providerId?: string;
    occurredAt: Date;
}

@Injectable()
export class PayloadNormalizerService {
    private readonly logger = new Logger(PayloadNormalizerService.name);

    /**
     * Normalize payload based on provider type
     */
    normalize(
        provider: WebhookProvider,
        payload: Record<string, any>,
        eventType?: string,
    ): NormalizedPayload {
        this.logger.debug(`Normalizing payload for provider: ${provider}`);

        switch (provider) {
            case WebhookProvider.SHOPIFY:
                return this.normalizeShopify(payload, eventType);
            case WebhookProvider.WOOCOMMERCE:
                return this.normalizeWooCommerce(payload, eventType);
            case WebhookProvider.YAMPI:
                return this.normalizeYampi(payload, eventType);
            case WebhookProvider.CARTPANDA:
                return this.normalizeCartPanda(payload, eventType);
            case WebhookProvider.NUVEMSHOP:
                return this.normalizeNuvemshop(payload, eventType);
            case WebhookProvider.TRAY:
                return this.normalizeTray(payload, eventType);
            case WebhookProvider.GENERIC:
            case WebhookProvider.OTHER:
            default:
                return this.normalizeGeneric(payload, eventType);
        }
    }

    /**
     * Detect event type based on provider and payload
     */
    detectEventType(provider: WebhookProvider, payload: Record<string, any>): string {
        switch (provider) {
            case WebhookProvider.SHOPIFY:
                return this.detectShopifyEventType(payload);
            case WebhookProvider.WOOCOMMERCE:
                return this.detectWooCommerceEventType(payload);
            case WebhookProvider.YAMPI:
                return this.detectYampiEventType(payload);
            case WebhookProvider.GENERIC:
            default:
                return payload.event_type || payload.eventType || payload.type || 'unknown';
        }
    }

    /**
     * Format phone number to E.164
     */
    formatPhoneE164(phone: string, defaultCountry: string = '55'): string {
        if (!phone) return '';

        // Remove all non-digits
        let digits = phone.replace(/\D/g, '');

        // If starts with +, it's already international
        if (phone.startsWith('+')) {
            return '+' + digits;
        }

        // If it starts with country code, add +
        if (digits.length >= 12 && digits.startsWith(defaultCountry)) {
            return '+' + digits;
        }

        // Otherwise, add country code
        if (digits.length === 10 || digits.length === 11) {
            return '+' + defaultCountry + digits;
        }

        // Return as-is with + prefix if long enough
        if (digits.length >= 10) {
            return '+' + defaultCountry + digits;
        }

        return '+' + digits;
    }

    /**
     * Get value from nested path like "order.customer.name"
     */
    getNestedValue(obj: any, path: string): any {
        if (!path) return undefined;
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // ========== Provider-specific normalizers ==========

    private normalizeGeneric(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload.order || payload.data?.order || payload;
        const customer = order.customer || payload.customer || {};
        const shipping = order.shipping || payload.shipping || {};

        return {
            orderId: order.id?.toString() || order.order_id?.toString() || payload.order_id?.toString() || '',
            orderNumber: order.number?.toString() || order.order_number?.toString(),
            orderStatus: order.status || order.financial_status,
            customerName: customer.name || customer.first_name
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                : '',
            customerEmail: customer.email,
            phoneE164: this.formatPhoneE164(customer.phone || shipping.phone || order.phone || ''),
            trackingCode: shipping.tracking_number || order.tracking_code || order.tracking_number,
            trackingUrl: shipping.tracking_url || order.tracking_url,
            shippingDate: order.shipped_at || order.shipping_date,
            estimatedDeliveryDate: shipping.estimated_delivery || order.estimated_delivery,
            newDeliveryDate: order.new_delivery_date || order.rescheduled_date,
            cancelReason: order.cancel_reason || order.cancellation_reason,
            itemsCount: order.line_items?.length || order.items?.length || order.items_count,
            totalAmount: order.total_price ? parseFloat(order.total_price) : order.total,
            currency: order.currency,
            storeName: payload.store_name || order.store_name,
            shippingMethod: shipping.method || order.shipping_method,
            shippingCarrier: shipping.carrier || order.carrier,
            eventType: eventType || payload.event_type || 'unknown',
            providerId: payload.id?.toString(),
            occurredAt: new Date(payload.occurred_at || payload.created_at || new Date()),
        };
    }

    private normalizeShopify(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload;
        const customer = order.customer || {};
        const shipping = order.shipping_address || {};

        return {
            orderId: order.id?.toString() || '',
            orderNumber: order.order_number?.toString() || order.name,
            orderStatus: order.financial_status || order.fulfillment_status,
            customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                || `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim(),
            customerEmail: customer.email || order.email,
            phoneE164: this.formatPhoneE164(customer.phone || shipping.phone || ''),
            trackingCode: order.fulfillments?.[0]?.tracking_number,
            trackingUrl: order.fulfillments?.[0]?.tracking_url,
            shippingDate: order.fulfillments?.[0]?.created_at,
            itemsCount: order.line_items?.length,
            totalAmount: parseFloat(order.total_price) || 0,
            currency: order.currency,
            storeName: order.source_name,
            shippingMethod: order.shipping_lines?.[0]?.title,
            shippingCarrier: order.fulfillments?.[0]?.tracking_company,
            cancelReason: order.cancel_reason,
            eventType: eventType || this.detectShopifyEventType(payload),
            providerId: order.id?.toString(),
            occurredAt: new Date(order.updated_at || order.created_at || new Date()),
        };
    }

    private normalizeWooCommerce(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload;
        const billing = order.billing || {};
        const shipping = order.shipping || {};

        return {
            orderId: order.id?.toString() || '',
            orderNumber: order.number?.toString(),
            orderStatus: order.status,
            customerName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
            customerEmail: billing.email,
            phoneE164: this.formatPhoneE164(billing.phone || ''),
            trackingCode: order.meta_data?.find((m: any) => m.key === '_tracking_number')?.value,
            trackingUrl: order.meta_data?.find((m: any) => m.key === '_tracking_url')?.value,
            itemsCount: order.line_items?.length,
            totalAmount: parseFloat(order.total) || 0,
            currency: order.currency,
            shippingMethod: order.shipping_lines?.[0]?.method_title,
            eventType: eventType || this.detectWooCommerceEventType(payload),
            providerId: order.id?.toString(),
            occurredAt: new Date(order.date_modified || order.date_created || new Date()),
        };
    }

    private normalizeYampi(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const data = payload.data || payload;
        const customer = data.customer || {};

        return {
            orderId: data.id?.toString() || '',
            orderNumber: data.number?.toString(),
            orderStatus: data.status?.name || data.status,
            customerName: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            customerEmail: customer.email,
            phoneE164: this.formatPhoneE164(customer.phone || ''),
            trackingCode: data.shipment?.tracking_code,
            trackingUrl: data.shipment?.tracking_url,
            itemsCount: data.items?.length,
            totalAmount: data.values?.total || 0,
            currency: 'BRL',
            shippingMethod: data.shipment?.method,
            shippingCarrier: data.shipment?.carrier,
            eventType: eventType || this.detectYampiEventType(payload),
            providerId: data.id?.toString(),
            occurredAt: new Date(data.updated_at || data.created_at || new Date()),
        };
    }

    private normalizeCartPanda(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload.order || payload;
        const customer = order.customer || {};

        return {
            orderId: order.id?.toString() || '',
            orderNumber: order.number?.toString(),
            orderStatus: order.status,
            customerName: customer.name,
            customerEmail: customer.email,
            phoneE164: this.formatPhoneE164(customer.phone || customer.cellphone || ''),
            trackingCode: order.tracking?.code,
            trackingUrl: order.tracking?.url,
            itemsCount: order.items?.length,
            totalAmount: order.total,
            currency: 'BRL',
            shippingMethod: order.shipping?.method,
            eventType: eventType || payload.event || 'unknown',
            providerId: order.id?.toString(),
            occurredAt: new Date(payload.occurred_at || new Date()),
        };
    }

    private normalizeNuvemshop(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload;
        const customer = order.customer || {};
        const shipping = order.shipping_address || {};

        return {
            orderId: order.id?.toString() || '',
            orderNumber: order.number?.toString(),
            orderStatus: order.status,
            customerName: customer.name || `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim(),
            customerEmail: customer.email,
            phoneE164: this.formatPhoneE164(customer.phone || shipping.phone || ''),
            trackingCode: order.shipping_tracking_number,
            trackingUrl: order.shipping_tracking_url,
            itemsCount: order.products?.length,
            totalAmount: parseFloat(order.total) || 0,
            currency: order.currency,
            shippingMethod: order.shipping_option,
            eventType: eventType || 'unknown',
            providerId: order.id?.toString(),
            occurredAt: new Date(order.updated_at || order.created_at || new Date()),
        };
    }

    private normalizeTray(payload: Record<string, any>, eventType?: string): NormalizedPayload {
        const order = payload.Order || payload;
        const customer = order.Customer || {};

        return {
            orderId: order.id?.toString() || '',
            orderNumber: order.id?.toString(),
            orderStatus: order.status,
            customerName: customer.name,
            customerEmail: customer.email,
            phoneE164: this.formatPhoneE164(customer.cellphone || customer.phone || ''),
            trackingCode: order.shipment_tracker,
            itemsCount: order.OrderProductSold?.length,
            totalAmount: parseFloat(order.total) || 0,
            currency: 'BRL',
            shippingMethod: order.ShippingMethod?.name,
            eventType: eventType || payload.scope || 'unknown',
            providerId: order.id?.toString(),
            occurredAt: new Date(order.modified || order.created || new Date()),
        };
    }

    // ========== Event type detection ==========

    private detectShopifyEventType(payload: Record<string, any>): string {
        // Shopify sends topic in X-Shopify-Topic header, which should be passed in payload
        const topic = payload._shopify_topic || payload.topic;
        if (topic) {
            if (topic.includes('orders/create')) return 'order_created';
            if (topic.includes('orders/paid')) return 'order_paid';
            if (topic.includes('orders/fulfilled')) return 'order_shipped';
            if (topic.includes('orders/cancelled')) return 'order_canceled';
        }
        return 'unknown';
    }

    private detectWooCommerceEventType(payload: Record<string, any>): string {
        const status = payload.status;
        if (!status) return 'unknown';

        const statusMap: Record<string, string> = {
            'pending': 'order_created',
            'processing': 'order_paid',
            'on-hold': 'order_created',
            'completed': 'order_delivered',
            'cancelled': 'order_canceled',
            'refunded': 'order_canceled',
            'shipped': 'order_shipped',
        };

        return statusMap[status] || 'unknown';
    }

    private detectYampiEventType(payload: Record<string, any>): string {
        const event = payload.event || payload.type;
        if (!event) return 'unknown';

        const eventMap: Record<string, string> = {
            'order.created': 'order_created',
            'order.paid': 'order_paid',
            'order.shipped': 'order_shipped',
            'order.delivered': 'order_delivered',
            'order.cancelled': 'order_canceled',
        };

        return eventMap[event] || event;
    }
}
