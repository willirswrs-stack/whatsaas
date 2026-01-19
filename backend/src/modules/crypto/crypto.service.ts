import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
    private readonly logger = new Logger(CryptoService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private readonly authTagLength = 16;
    private readonly key: Buffer;

    constructor() {
        const secretKey = process.env.ENCRYPTION_KEY;

        if (!secretKey) {
            this.logger.warn('ENCRYPTION_KEY not set. Generating a random key for development.');
            // In production, this should be a persistent key from environment
            this.key = crypto.randomBytes(this.keyLength);
        } else {
            // Derive a consistent key from the secret using PBKDF2
            this.key = crypto.pbkdf2Sync(
                secretKey,
                'whatsaas-salt', // Salt for key derivation
                100000,
                this.keyLength,
                'sha256'
            );
        }
    }

    /**
     * Encrypts a plaintext string using AES-256-GCM
     * Returns a base64 encoded string containing: iv:authTag:ciphertext
     */
    encrypt(plaintext: string): string {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
                authTagLength: this.authTagLength,
            });

            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();

            // Combine iv, authTag, and encrypted data
            const combined = Buffer.concat([
                iv,
                authTag,
                Buffer.from(encrypted, 'hex'),
            ]);

            return combined.toString('base64');
        } catch (error) {
            this.logger.error(`Encryption error: ${error.message}`);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypts an encrypted string back to plaintext
     */
    decrypt(encryptedData: string): string {
        try {
            const combined = Buffer.from(encryptedData, 'base64');

            // Extract iv, authTag, and ciphertext
            const iv = combined.subarray(0, this.ivLength);
            const authTag = combined.subarray(this.ivLength, this.ivLength + this.authTagLength);
            const ciphertext = combined.subarray(this.ivLength + this.authTagLength);

            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
                authTagLength: this.authTagLength,
            });
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error(`Decryption error: ${error.message}`);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Masks a token for display (shows only first and last 4 characters)
     */
    maskToken(token: string): string {
        if (token.length <= 12) {
            return '****';
        }
        return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
    }
}
