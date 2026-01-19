import { Injectable, Logger } from '@nestjs/common';

export interface NormalizedPhone {
    normalized: string | null;
    raw: string;
    isValid: boolean;
    country?: 'BR' | 'INTL';
    ddd?: string;
    type?: 'mobile' | 'landline' | 'unknown';
    error?: string;
}

export interface ImportedContact {
    phone: string;
    name?: string;
    email?: string;
    tags?: string[];
    customFields?: Record<string, string>;
}

export interface NormalizedContact extends ImportedContact {
    phoneNormalized: string;
    isValid: boolean;
    phoneType: 'mobile' | 'landline' | 'unknown';
}

@Injectable()
export class PhoneNormalizerService {
    private readonly logger = new Logger(PhoneNormalizerService.name);

    // DDDs válidos do Brasil
    private readonly BR_DDDs = new Set([
        // São Paulo
        '11', '12', '13', '14', '15', '16', '17', '18', '19',
        // Rio de Janeiro
        '21', '22', '24',
        // Espírito Santo
        '27', '28',
        // Minas Gerais
        '31', '32', '33', '34', '35', '37', '38',
        // Paraná
        '41', '42', '43', '44', '45', '46',
        // Santa Catarina
        '47', '48', '49',
        // Rio Grande do Sul
        '51', '53', '54', '55',
        // Centro-Oeste
        '61', '62', '63', '64', '65', '66', '67', '68', '69',
        // Nordeste
        '71', '73', '74', '75', '77', '79',
        '81', '82', '83', '84', '85', '86', '87', '88', '89',
        // Norte
        '91', '92', '93', '94', '95', '96', '97', '98', '99',
    ]);

    /**
     * Normaliza um número de telefone para o formato E.164 (+55...)
     */
    normalize(phone: string): NormalizedPhone {
        const raw = phone;

        // 1. Remover tudo que não é número
        let cleaned = phone.replace(/\D/g, '');

        if (!cleaned || cleaned.length < 8) {
            return {
                raw,
                normalized: null,
                isValid: false,
                error: 'Número muito curto',
            };
        }

        // 2. Remover zeros à esquerda (exceto se for DDI)
        if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
            cleaned = cleaned.replace(/^0+/, '');
        }

        // 3. Detectar formato e processar
        try {
            // Já tem DDI Brasil (+55)
            if (cleaned.startsWith('55') && cleaned.length >= 12) {
                return this.validateBrazilian(cleaned, raw);
            }

            // Número com 11 dígitos: DDD + 9 dígitos (celular BR moderno)
            if (cleaned.length === 11) {
                return this.validateBrazilian('55' + cleaned, raw);
            }

            // Número com 10 dígitos: DDD + 8 dígitos (fixo ou celular antigo)
            if (cleaned.length === 10) {
                const ddd = cleaned.substring(0, 2);
                const number = cleaned.substring(2);

                // Verificar se é celular (começa com 9, 8 ou 7) que precisa do 9
                if (number.startsWith('9') || number.startsWith('8') || number.startsWith('7')) {
                    // Celular sem o 9 na frente - adicionar
                    cleaned = '55' + ddd + '9' + number;
                } else {
                    // Fixo - manter como está
                    cleaned = '55' + cleaned;
                }

                return this.validateBrazilian(cleaned, raw);
            }

            // Número com 9 dígitos: Celular sem DDD (assumir São Paulo 11)
            if (cleaned.length === 9 && cleaned.startsWith('9')) {
                this.logger.warn(`Número sem DDD: ${cleaned}, assumindo DDD 11`);
                return this.validateBrazilian('5511' + cleaned, raw);
            }

            // Número com 8 dígitos: Fixo sem DDD
            if (cleaned.length === 8) {
                this.logger.warn(`Número fixo sem DDD: ${cleaned}, assumindo DDD 11`);
                return this.validateBrazilian('5511' + cleaned, raw);
            }

            // Número internacional (13+ dígitos com outro DDI)
            if (cleaned.length >= 10 && !cleaned.startsWith('55')) {
                return {
                    raw,
                    normalized: '+' + cleaned,
                    isValid: true,
                    country: 'INTL',
                    type: 'unknown',
                };
            }

            return {
                raw,
                normalized: null,
                isValid: false,
                error: `Formato não reconhecido: ${cleaned.length} dígitos`,
            };
        } catch (error) {
            return {
                raw,
                normalized: null,
                isValid: false,
                error: error.message,
            };
        }
    }

    /**
     * Valida e formata número brasileiro
     */
    private validateBrazilian(phone: string, raw: string): NormalizedPhone {
        // phone deve estar no formato: 55DDXXXXXXXXX (12-13 dígitos)
        if (phone.length < 12 || phone.length > 13) {
            return {
                raw,
                normalized: null,
                isValid: false,
                error: `Número BR inválido: ${phone.length} dígitos`,
            };
        }

        const ddd = phone.substring(2, 4);
        const number = phone.substring(4);

        // Validar DDD
        if (!this.BR_DDDs.has(ddd)) {
            return {
                raw,
                normalized: null,
                isValid: false,
                error: `DDD inválido: ${ddd}`,
            };
        }

        // Determinar tipo (celular ou fixo)
        let type: 'mobile' | 'landline' | 'unknown';
        if (number.startsWith('9') && number.length === 9) {
            type = 'mobile';
        } else if (number.length === 8 && !number.startsWith('9')) {
            type = 'landline';
        } else {
            type = 'unknown';
        }

        // Para WhatsApp, apenas celulares são válidos
        const isValid = type === 'mobile' || type === 'unknown';

        return {
            raw,
            normalized: '+' + phone,
            isValid,
            country: 'BR',
            ddd,
            type,
            error: type === 'landline' ? 'Telefone fixo não suporta WhatsApp' : undefined,
        };
    }

    /**
     * Normaliza uma lista de contatos importados
     */
    normalizeContacts(contacts: ImportedContact[]): {
        valid: NormalizedContact[];
        invalid: Array<ImportedContact & { error: string }>;
        stats: {
            total: number;
            valid: number;
            invalid: number;
            duplicates: number;
            mobile: number;
            landline: number;
        };
    } {
        const valid: NormalizedContact[] = [];
        const invalid: Array<ImportedContact & { error: string }> = [];
        const seenPhones = new Set<string>();
        let duplicates = 0;
        let mobile = 0;
        let landline = 0;

        for (const contact of contacts) {
            const result = this.normalize(contact.phone);

            if (!result.isValid || !result.normalized) {
                invalid.push({
                    ...contact,
                    error: result.error || 'Número inválido',
                });
                if (result.type === 'landline') {
                    landline++;
                }
                continue;
            }

            // Verificar duplicata
            if (seenPhones.has(result.normalized)) {
                duplicates++;
                this.logger.debug(`Duplicata removida: ${result.normalized}`);
                continue;
            }

            seenPhones.add(result.normalized);

            if (result.type === 'mobile') {
                mobile++;
            }

            valid.push({
                ...contact,
                phoneNormalized: result.normalized,
                isValid: true,
                phoneType: result.type || 'unknown',
            });
        }

        const stats = {
            total: contacts.length,
            valid: valid.length,
            invalid: invalid.length,
            duplicates,
            mobile,
            landline,
        };

        this.logger.log(
            `📱 Normalização: ${stats.valid}/${stats.total} válidos, ` +
            `${stats.duplicates} duplicatas, ${stats.landline} fixos removidos`,
        );

        return { valid, invalid, stats };
    }

    /**
     * Parseia arquivo CSV/TXT de contatos
     */
    parseContactsFile(
        content: string,
        options: {
            delimiter?: string;
            hasHeader?: boolean;
            phoneColumn?: number;
            nameColumn?: number;
        } = {},
    ): ImportedContact[] {
        const {
            delimiter = ',',
            hasHeader = true,
            phoneColumn = 0,
            nameColumn = 1,
        } = options;

        const lines = content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            return [];
        }

        const startIndex = hasHeader ? 1 : 0;
        const contacts: ImportedContact[] = [];

        for (let i = startIndex; i < lines.length; i++) {
            const columns = lines[i].split(delimiter).map((col) => col.trim());

            const phone = columns[phoneColumn];
            if (!phone) continue;

            contacts.push({
                phone,
                name: columns[nameColumn] || undefined,
                email: columns[2] || undefined,
            });
        }

        this.logger.log(`📄 Parseados ${contacts.length} contatos do arquivo`);

        return contacts;
    }

    /**
     * Formata número para exibição
     */
    formatForDisplay(phone: string): string {
        const result = this.normalize(phone);

        if (!result.normalized || result.country !== 'BR') {
            return phone;
        }

        // Formato: +55 (11) 99999-9999
        const ddd = result.ddd;
        const number = result.normalized.substring(5);

        if (number.length === 9) {
            return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
        }

        return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
}
