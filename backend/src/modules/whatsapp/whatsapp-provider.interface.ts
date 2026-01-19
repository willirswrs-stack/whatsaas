
import { InstanceStatus as EnumInstanceStatus } from '../../common/enums/instance-status.enum';

/**
 * WhatsApp Provider Interface
 * Abstract interface for WhatsApp API providers (WAHA, Evolution, etc.)
 */

export type ProviderType = 'waha' | 'evolution';

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
    createInstance(instanceName: string): Promise<InstanceResult>;

    /**
     * Get QR Code for connecting WhatsApp
     * Returns base64 data URI
     */
    getQrCode(instanceName: string): Promise<string>;

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
}
