import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { CryptoService } from '../crypto/crypto.service';
import { MetaGraphApiService, MetaTemplate, BusinessProfile } from './meta-graph-api.service';
import { CreateWabaAccountDto, UpdateWabaProfileDto, CreateMetaTemplateDto, BusinessCategory } from './dto';

export interface WabaAccount {
    id: string;
    name: string;
    wabaId: string;
    phoneNumberId: string;
    phoneNumber: string;
    accessTokenMasked: string;
    appId?: string;
    displayName?: string;
    about?: string;
    description?: string;
    category: string;
    email?: string;
    profilePhoto?: string;
    status: 'active' | 'pending' | 'disconnected';
    qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class MetaTemplatesService {
    private readonly logger = new Logger(MetaTemplatesService.name);
    private readonly pool: Pool;

    constructor(
        private readonly cryptoService: CryptoService,
        private readonly metaGraphApiService: MetaGraphApiService,
    ) {
        this.pool = new Pool({
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5433', 10),
            user: process.env.DATABASE_USER || 'wathsaas',
            password: process.env.DATABASE_PASSWORD || 'wathsaas_secret_2024',
            database: process.env.DATABASE_NAME || 'wathsaas',
        });
    }

    /**
     * Create a new WABA account
     */
    async createWabaAccount(tenantId: string, dto: CreateWabaAccountDto): Promise<WabaAccount> {
        this.logger.log(`Creating WABA account for tenant ${tenantId}`);

        // Validate access token by fetching phone info
        try {
            console.log('[DEBUG] Validating Meta Token...', { phoneNumberId: dto.phoneNumberId });
            const phoneInfo = await this.metaGraphApiService.getPhoneNumberInfo(dto.phoneNumberId, dto.accessToken);
            console.log('[DEBUG] Meta Token Validated:', phoneInfo);

            // Encrypt the access token before storing
            const encryptedToken = this.cryptoService.encrypt(dto.accessToken);

            console.log('[DEBUG] Inserting into DB...');
            const result = await this.pool.query(
                `INSERT INTO waba_accounts 
         (tenant_id, name, waba_id, phone_number_id, phone_number, access_token, app_id, display_name, quality_rating, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
         RETURNING *`,
                [
                    tenantId,
                    dto.name,
                    dto.wabaId,
                    dto.phoneNumberId,
                    dto.phoneNumber,
                    encryptedToken,
                    dto.appId || null,
                    phoneInfo?.verified_name || dto.name,
                    phoneInfo?.quality_rating || 'UNKNOWN',
                ],
            );

            console.log('[DEBUG] Inserted successfully');
            return this.mapToWabaAccount(result.rows[0]);
        } catch (error) {
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}] Error creating WABA Account:\n${error.stack || error.message}\nDTO: ${JSON.stringify(dto, null, 2)}\n\n`;
            fs.appendFileSync('waba_creation_error.log', logMsg);

            this.logger.error(`Failed to create WABA account: ${error.message}`, error.stack);

            if (error.status === 401) {
                throw new BadRequestException('Access token inválido ou expirado');
            }

            if (error.message && error.message.includes('does not exist')) {
                throw new BadRequestException('ID do Telefone inválido. Verifique se você não inverteu "Phone Number ID" com o "Número de Telefone". O ID deve conter apenas números fornecidos pela Meta.');
            }

            throw new BadRequestException(`Erro na API Oficial (Meta): ${error.message || 'Erro desconhecido'}`);
        }
    }

    /**
     * List all WABA accounts for a tenant
     */
    async listWabaAccounts(tenantId: string): Promise<WabaAccount[]> {
        const result = await this.pool.query(
            `SELECT * FROM waba_accounts WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId],
        );

        return result.rows.map((row) => this.mapToWabaAccount(row));
    }

    /**
     * Get a single WABA account
     */
    async getWabaAccount(tenantId: string, accountId: string): Promise<WabaAccount> {
        const result = await this.pool.query(
            `SELECT * FROM waba_accounts WHERE id = $1 AND tenant_id = $2`,
            [accountId, tenantId],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Conta WABA não encontrada');
        }

        return this.mapToWabaAccount(result.rows[0]);
    }

    /**
     * Get decrypted access token (internal use only)
     */
    async getDecryptedAccessToken(accountId: string): Promise<string> {
        const result = await this.pool.query(
            `SELECT access_token FROM waba_accounts WHERE id = $1`,
            [accountId],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Conta WABA não encontrada');
        }

        return this.cryptoService.decrypt(result.rows[0].access_token);
    }

    /**
     * Update WABA account profile
     */
    async updateProfile(tenantId: string, accountId: string, dto: UpdateWabaProfileDto): Promise<WabaAccount> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const currentDbToken = await this.getDecryptedAccessToken(accountId);
        const accessTokenToUse = dto.accessToken || currentDbToken;

        // Update profile via Meta API
        const profileData: any = {};
        if (dto.about) profileData.about = dto.about;
        if (dto.description) profileData.description = dto.description;
        if (dto.email) profileData.email = dto.email;
        if (dto.category) profileData.vertical = dto.category;
        if (dto.websites) profileData.websites = dto.websites;
        if (dto.address) profileData.address = dto.address;

        if (Object.keys(profileData).length > 0) {
            await this.metaGraphApiService.updateBusinessProfile(
                account.phoneNumberId,
                accessTokenToUse,
                profileData,
            );
        }

        // Update local database
        let encryptedToken: string | null = null;
        if (dto.accessToken) {
            encryptedToken = this.cryptoService.encrypt(dto.accessToken);
        }

        await this.pool.query(
            `UPDATE waba_accounts SET
        about = COALESCE($1, about),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        email = COALESCE($4, email),
        app_id = COALESCE($5, app_id),
        access_token = COALESCE($6, access_token),
        updated_at = NOW()
       WHERE id = $7`,
            [dto.about || null, dto.description || null, dto.category || null, dto.email || null, dto.appId || null, encryptedToken, accountId],
        );

        return this.getWabaAccount(tenantId, accountId);
    }

    /**
     * Get business profile from Meta
     */
    async getBusinessProfile(tenantId: string, accountId: string): Promise<BusinessProfile> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const accessToken = await this.getDecryptedAccessToken(accountId);

        return this.metaGraphApiService.getBusinessProfile(account.phoneNumberId, accessToken);
    }

    /**
     * List templates for a WABA account
     */
    async listTemplates(tenantId: string, accountId: string): Promise<MetaTemplate[]> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const accessToken = await this.getDecryptedAccessToken(accountId);

        return this.metaGraphApiService.listTemplates(account.wabaId, accessToken);
    }

    /**
     * Create a new template
     */
    async createTemplate(
        tenantId: string,
        accountId: string,
        dto: CreateMetaTemplateDto,
    ): Promise<{ id: string; status: string }> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const accessToken = await this.getDecryptedAccessToken(accountId);

        // Build template components
        const components: any[] = [];

        // Header component
        if (dto.header) {
            const headerComponent: any = {
                type: 'HEADER',
                format: dto.header.type,
            };
            if (dto.header.type === 'TEXT' && dto.header.text) {
                headerComponent.text = dto.header.text;
                if (dto.header.example) {
                    headerComponent.example = { header_text: [dto.header.example] };
                }
            }
            components.push(headerComponent);
        }

        // Body component (required)
        const bodyComponent: any = {
            type: 'BODY',
            text: dto.body,
        };

        // Extract variables from body
        const bodyVariables = dto.body.match(/\{\{(\d+)\}\}/g);
        if (bodyVariables) {
            bodyComponent.example = {
                body_text: [bodyVariables.map(() => 'exemplo')],
            };
        }
        components.push(bodyComponent);

        // Footer component
        if (dto.footer) {
            components.push({
                type: 'FOOTER',
                text: dto.footer,
            });
        }

        // Buttons component
        if (dto.buttons && dto.buttons.length > 0) {
            components.push({
                type: 'BUTTONS',
                buttons: dto.buttons.map((btn) => ({
                    type: btn.type,
                    text: btn.text,
                    ...(btn.url && { url: btn.url }),
                    ...(btn.phone_number && { phone_number: btn.phone_number }),
                })),
            });
        }

        // Normalize template name (lowercase, underscores)
        const normalizedName = dto.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        return this.metaGraphApiService.createTemplate(account.wabaId, accessToken, {
            name: normalizedName,
            category: dto.category,
            language: dto.language,
            components,
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(tenantId: string, accountId: string, templateName: string): Promise<boolean> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const accessToken = await this.getDecryptedAccessToken(accountId);

        return this.metaGraphApiService.deleteTemplate(account.wabaId, accessToken, templateName);
    }

    /**
     * Sync phone info and quality rating
     */
    async syncPhoneInfo(tenantId: string, accountId: string): Promise<WabaAccount> {
        const account = await this.getWabaAccount(tenantId, accountId);
        const accessToken = await this.getDecryptedAccessToken(accountId);

        try {
            const phoneInfo = await this.metaGraphApiService.getPhoneNumberInfo(account.phoneNumberId, accessToken);

            await this.pool.query(
                `UPDATE waba_accounts SET
          display_name = $1,
          quality_rating = $2,
          status = 'active',
          updated_at = NOW()
         WHERE id = $3`,
                [phoneInfo.verified_name, phoneInfo.quality_rating || 'UNKNOWN', accountId],
            );

            return this.getWabaAccount(tenantId, accountId);
        } catch (error) {
            // Mark as disconnected if token is invalid
            await this.pool.query(
                `UPDATE waba_accounts SET status = 'disconnected', updated_at = NOW() WHERE id = $1`,
                [accountId],
            );
            throw error;
        }
    }

    /**
     * Delete WABA account
     */
    async deleteWabaAccount(tenantId: string, accountId: string): Promise<void> {
        const result = await this.pool.query(
            `DELETE FROM waba_accounts WHERE id = $1 AND tenant_id = $2`,
            [accountId, tenantId],
        );

        if (result.rowCount === 0) {
            throw new NotFoundException('Conta WABA não encontrada');
        }
    }

    /**
     * Map database row to WabaAccount DTO
     */
    private mapToWabaAccount(row: any): WabaAccount {
        return {
            id: row.id,
            name: row.name,
            wabaId: row.waba_id,
            phoneNumberId: row.phone_number_id,
            phoneNumber: row.phone_number,
            accessTokenMasked: this.cryptoService.maskToken(
                this.cryptoService.decrypt(row.access_token),
            ),
            appId: row.app_id,
            displayName: row.display_name,
            about: row.about,
            description: row.description,
            category: row.category || 'OTHER',
            email: row.email,
            profilePhoto: row.profile_photo,
            status: row.status,
            qualityRating: row.quality_rating || 'UNKNOWN',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
