
import { InstanceStatus as EnumInstanceStatus } from '../../common/enums/instance-status.enum';

/**
 * WhatsApp Provider Interface
 * Abstract interface for WhatsApp API providers (WAHA, Evolution, etc.)
 */

export type ProviderType = 'waha' | 'evolution' | 'mobile_farm' | 'antidetect';

export interface InstanceResult {
    instanceId: string;
    displayName: string;
    provider: ProviderType;
}

export interface InstanceStatus {
    status: EnumInstanceStatus;
    phoneNumber?: string;
    name?: string;
}

export interface SendMessageResult {
    messageId: string;
    status: 'sent' | 'queued' | 'failed';
}

export interface IWhatsAppProvider {
    readonly providerType: ProviderType;

    /**
     * Create a new WhatsApp instance/session
     */
    createInstance(instanceName: string, config?: Record<string, any>): Promise<InstanceResult>;

    /**
     * Get QR Code for connecting WhatsApp
     * Returns base64 data URI
     */
    getQrCode(instanceName: string): Promise<string>;

    getPairingCode?(instanceName: string, phoneNumber: string): Promise<{ pairingCode: string; phone: string }>;

    /**
     * Get instance connection status
     */
    getStatus(instanceName: string): Promise<InstanceStatus>;

    /**
     * Delete/logout instance
     */
    deleteInstance(instanceName: string): Promise<void>;

    /**
     * Send text message
     */
    sendText(instanceName: string, to: string, text: string): Promise<SendMessageResult>;

    /**
     * Send media message (image, video, audio, document)
     */
    sendMedia(instanceName: string, to: string, media: {
        type: 'image' | 'video' | 'audio' | 'document';
        url: string;
        caption?: string;
        filename?: string;
    }): Promise<SendMessageResult>;

    /**
     * Send presence (typing, recording)
     */
    sendPresence(
        instanceName: string,
        to: string,
        presence: 'composing' | 'recording' | 'paused',
        durationMs: number,
    ): Promise<void>;

    /**
     * Check if number is on WhatsApp
     */
    isOnWhatsApp(instanceName: string, phone: string): Promise<boolean>;

    /**
     * Scan maturity metrics (chat count, groups, etc) for chip analytics
     */
    getMaturityMetrics(instanceName: string): Promise<{
        chatCount: number;
        groupCount: number;
    }>;

    /**
     * Join a WhatsApp group via invite URL
     */
    joinGroup(instanceName: string, inviteUrl: string): Promise<any>;
}
