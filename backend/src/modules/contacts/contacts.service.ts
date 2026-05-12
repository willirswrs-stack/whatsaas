import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Contact, Tag, ContactTag, CustomField } from './entities/contact.entity';
import * as XLSX from 'xlsx';
import {
    CreateContactDto,
    UpdateContactDto,
    ContactQueryDto,
    CreateTagDto,
    UpdateTagDto,
    CreateCustomFieldDto,
    UpdateCustomFieldDto,
    BulkAddTagsDto,
    BulkRemoveTagsDto,
} from './dto';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { ProviderType } from '../whatsapp/whatsapp-provider.interface';

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);

    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        @InjectRepository(Tag)
        private tagRepository: Repository<Tag>,
        @InjectRepository(ContactTag)
        private contactTagRepository: Repository<ContactTag>,
        @InjectRepository(CustomField)
        private customFieldRepository: Repository<CustomField>,
        private providerFactory: WhatsAppProviderFactory,
    ) { }

    // ============ CONTACTS ============

    async findAllContacts(tenantId: string, query: ContactQueryDto) {
        this.logger.log(`findAllContacts: tenantId=${tenantId} query=${JSON.stringify(query)}`);
        const { search, tagIds, isValid, optedOut, startDate, endDate } = query;
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;

        // Base where conditions
        const where: any = { tenantId };
        if (isValid !== undefined) where.isValid = isValid;
        if (optedOut !== undefined) where.optedOut = optedOut;

        // Category Filter - Case Insensitive Partial Match
        if (query.category) {
            where.category = ILike(`%${query.category.trim()}%`);
        }

        // Date Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt = Between(start, end);
        } else if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            where.createdAt = MoreThanOrEqual(start);
        } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt = LessThanOrEqual(end);
        }

        this.logger.log(`findAllContacts: page=${page} limit=${limit} skip=${skip} where=${JSON.stringify(where)}`);

        let contacts: Contact[];
        let total: number;

        // If simple query (no search or tags), use findAndCount for maximum reliability
        if (!search && (!tagIds || tagIds.length === 0)) {
            [contacts, total] = await this.contactRepository.findAndCount({
                where,
                order: { createdAt: 'DESC', id: 'DESC' },
                skip,
                take: limit,
            });
            this.logger.log(`Repository findAndCount returned: contacts=${contacts.length}, total=${total}`);
        } else {
            // Use QueryBuilder for complex filters
            const qb = this.contactRepository.createQueryBuilder('contact')
                .where('contact.tenantId = :tenantId', { tenantId });

            if (isValid !== undefined) qb.andWhere('contact.isValid = :isValid', { isValid });
            if (optedOut !== undefined) qb.andWhere('contact.optedOut = :optedOut', { optedOut });

            if (query.category) {
                qb.andWhere('contact.category ILIKE :category', { category: `%${query.category.trim()}%` });
            }

            // Date Filters in QueryBuilder
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                qb.andWhere('contact.createdAt >= :startDate', { startDate: start });
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                qb.andWhere('contact.createdAt <= :endDate', { endDate: end });
            }

            if (search) {
                qb.andWhere(
                    '(contact.name ILIKE :search OR contact.phone ILIKE :search OR contact.email ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            if (tagIds && tagIds.length > 0) {
                qb.andWhere(qb2 => {
                    const subQuery = qb2.subQuery()
                        .select('ct.contactId')
                        .from(ContactTag, 'ct')
                        .where('ct.tagId IN (:...tagIds)', { tagIds });
                    return 'contact.id IN ' + subQuery.getQuery();
                });
                // MUST set the parameter on the main QB because getQuery() doesn't include params
                qb.setParameter('tagIds', tagIds);
            }

            qb.orderBy('contact.createdAt', 'DESC')
                .skip(skip)
                .take(limit);

            // Set all parameters explicitly just to be safe
            qb.setParameters({
                tenantId,
                isValid,
                optedOut,
                category: query.category ? `%${query.category.trim()}%` : undefined,
                search: search ? `%${search}%` : undefined,
                tagIds,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });

            [contacts, total] = await qb.getManyAndCount();
            this.logger.log(`QueryBuilder returned: contacts=${contacts.length}, total=${total}`);
        }

        // Get tags for the result set
        const contactIds = contacts.map(c => c.id);
        const contactTags = contactIds.length > 0
            ? await this.contactTagRepository.find({
                where: { contactId: In(contactIds) }
            })
            : [];

        const tagIdsToFetch = [...new Set(contactTags.map(ct => ct.tagId))];
        const tags = tagIdsToFetch.length > 0
            ? await this.tagRepository.find({
                where: { id: In(tagIdsToFetch) }
            })
            : [];

        const tagMap = new Map(tags.map(t => [t.id, t]));

        const data = contacts.map(contact => ({
            ...contact,
            tags: contactTags
                .filter(ct => ct.contactId === contact.id)
                .map(ct => tagMap.get(ct.tagId))
                .filter(Boolean)
        }));

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id: string) {
        return this.contactRepository.findOne({ where: { id } });
    }

    async findByPhone(tenantId: string, phone: string) {
        const normalized = this.normalizePhone(phone);
        return this.contactRepository.findOne({
            where: { tenantId, phone: normalized }
        });
    }

    async findContactById(tenantId: string, id: string) {
        const contact = await this.contactRepository.findOne({
            where: { id, tenantId }
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        // Get tags
        const contactTags = await this.contactTagRepository.find({
            where: { contactId: id }
        });

        const tagIds = contactTags.map(ct => ct.tagId);
        const tags = tagIds.length > 0
            ? await this.tagRepository.find({ where: { id: In(tagIds) } })
            : [];

        return { ...contact, tags };
    }

    async createContact(tenantId: string, dto: CreateContactDto) {
        const normalizedPhone = this.normalizePhone(dto.phone);

        // Check if phone already exists
        const existing = await this.contactRepository.findOne({
            where: { tenantId, phone: normalizedPhone }
        });

        if (existing) {
            throw new BadRequestException('Já existe um contato com este telefone');
        }

        if (!dto.phone || dto.phone.trim().length < 8) {
            throw new BadRequestException('Telefone inválido ou muito curto');
        }

        const contact = this.contactRepository.create({
            tenantId,
            phone: normalizedPhone,
            name: dto.name,
            email: dto.email,
            category: dto.category,
            customFields: dto.customFields || {},
        });

        const saved = await this.contactRepository.save(contact);

        // Add tags if provided
        if (dto.tagIds && dto.tagIds.length > 0) {
            await this.addTagsToContact(saved.id, dto.tagIds);
        }

        return this.findContactById(tenantId, saved.id);
    }

    async updateContact(tenantId: string, id: string, dto: UpdateContactDto) {
        const contact = await this.findContactById(tenantId, id);

        // Check phone uniqueness if changing
        if (dto.phone && dto.phone !== contact.phone) {
            const normalizedPhone = this.normalizePhone(dto.phone);
            const existing = await this.contactRepository.findOne({
                where: { tenantId, phone: normalizedPhone }
            });
            if (existing) {
                throw new BadRequestException('Já existe um contato com este telefone');
            }
            // Update the phone in DTO
            dto.phone = normalizedPhone;
        }

        // Handle tags update
        if (dto.tagIds !== undefined) {
            await this.contactTagRepository.delete({ contactId: id });
            if (dto.tagIds.length > 0) {
                await this.addTagsToContact(id, dto.tagIds);
            }
        }

        // Update contact fields
        const { tagIds, ...updateData } = dto;
        await this.contactRepository.update(id, updateData);

        return this.findContactById(tenantId, id);
    }

    async deleteContact(tenantId: string, id: string) {
        const contact = await this.findContactById(tenantId, id);
        await this.contactTagRepository.delete({ contactId: id });
        await this.contactRepository.delete(id);
        return { message: 'Contato excluído com sucesso' };
    }

    async bulkDeleteContacts(tenantId: string, ids: string[]) {
        await this.contactTagRepository.delete({ contactId: In(ids) });
        await this.contactRepository.delete({ id: In(ids), tenantId });
        return { message: `${ids.length} contatos excluídos` };
    }

    async importContacts(tenantId: string, contacts: CreateContactDto[]) {
        const results = { imported: 0, skipped: 0, errors: [] as string[] };

        // 1. Normalize phones and prepare map
        const contactMap = new Map<string, CreateContactDto>();
        const phonesToCheck: string[] = [];

        for (const dto of contacts) {
            try {
                if (!dto.phone) continue;
                const normalized = this.normalizePhone(dto.phone);
                // Simple validation
                if (normalized.length < 10) {
                    results.errors.push(`${dto.phone}: Telefone inválido`);
                    continue;
                }

                // Deduplicate within the file itself
                if (contactMap.has(normalized)) {
                    continue;
                }

                dto.phone = normalized;
                contactMap.set(normalized, dto);
                phonesToCheck.push(normalized);
            } catch (e) {
                results.errors.push(`${dto.phone}: Erro ao normalizar`);
            }
        }

        if (phonesToCheck.length === 0) {
            return results;
        }

        // 2. Find existing contacts in DB (Batch)
        // Split into chunks if too many phones (e.g. 500)
        const chunkSize = 500;
        const protectionSet = new Set<string>(); // Phones that already exist

        for (let i = 0; i < phonesToCheck.length; i += chunkSize) {
            const chunk = phonesToCheck.slice(i, i + chunkSize);
            const existingContacts = await this.contactRepository.find({
                where: {
                    tenantId,
                    phone: In(chunk)
                },
                select: ['phone']
            });
            existingContacts.forEach(c => protectionSet.add(c.phone));
        }

        // 3. Filter valid new contacts and prepare updates
        const newContacts: Contact[] = [];
        const contactsToUpdate: { id: string, data: Partial<Contact> }[] = [];
        const contactTagsToInsert: { contactIndex: number, tagIds: string[], contactId?: string }[] = [];

        // We need existing IDs for updating
        const existingContactsMap = new Map<string, string>(); // Phone -> ID
        if (protectionSet.size > 0) {
            const existing = await this.contactRepository.find({
                where: { tenantId, phone: In(Array.from(protectionSet)) },
                select: ['id', 'phone']
            });
            existing.forEach(c => existingContactsMap.set(c.phone, c.id));
        }

        let index = 0;
        for (const [phone, dto] of contactMap.entries()) {
            if (protectionSet.has(phone)) {
                // Update existing
                const existingId = existingContactsMap.get(phone);
                if (existingId) {
                    contactsToUpdate.push({
                        id: existingId,
                        data: {
                            name: dto.name || undefined,
                            email: dto.email || undefined,
                            category: dto.category || undefined,
                            customFields: dto.customFields || {},
                        }
                    });
                    if (dto.tagIds && dto.tagIds.length > 0) {
                        contactTagsToInsert.push({ contactIndex: -1, tagIds: dto.tagIds, contactId: existingId });
                    }
                }
                continue;
            }

            const contact = this.contactRepository.create({
                tenantId,
                phone: dto.phone,
                name: dto.name,
                email: dto.email,
                category: dto.category,
                customFields: dto.customFields || {},
                onWhatsapp: true,
            });

            newContacts.push(contact);

            if (dto.tagIds && dto.tagIds.length > 0) {
                contactTagsToInsert.push({ contactIndex: index, tagIds: dto.tagIds });
            }
            index++;
        }

        // 4. Process Updates
        if (contactsToUpdate.length > 0) {
            for (const item of contactsToUpdate) {
                await this.contactRepository.update(item.id, item.data);
            }
            results.imported += contactsToUpdate.length;
        }

        // 5. Insert New Contacts
        if (newContacts.length > 0) {
            for (let i = 0; i < newContacts.length; i += chunkSize) {
                const chunk = newContacts.slice(i, i + chunkSize);
                try {
                    const savedChunk = await this.contactRepository.save(chunk);
                    results.imported += savedChunk.length;

                    // Map saved IDs back to our tag request structure
                    savedChunk.forEach((savedContact, idx) => {
                        const originalIndex = i + idx;
                        const tagReq = contactTagsToInsert.find(t => t.contactIndex === originalIndex);
                        if (tagReq) {
                            tagReq.contactId = savedContact.id;
                        }
                    });
                } catch (err) {
                    results.errors.push(`Erro ao salvar lote ${i / chunkSize}: ${err.message}`);
                    results.imported -= chunk.length;
                }
            }
        }

        // 6. Finalize Tags (Common logic for New and Updated)
        const finalTagsToInsert: ContactTag[] = [];
        const contactIdsToClearTags: string[] = [];

        for (const req of contactTagsToInsert) {
            if (!req.contactId) continue;

            contactIdsToClearTags.push(req.contactId);
            for (const tagId of req.tagIds) {
                finalTagsToInsert.push(this.contactTagRepository.create({
                    contactId: req.contactId,
                    tagId
                }));
            }
        }

        if (contactIdsToClearTags.length > 0) {
            // Delete existing tags for these contacts to avoid duplicates/stale data
            await this.contactTagRepository.delete({ contactId: In(contactIdsToClearTags) });
        }

        if (finalTagsToInsert.length > 0) {
            // Save tags in chunks
            for (let i = 0; i < finalTagsToInsert.length; i += chunkSize) {
                await this.contactTagRepository.save(finalTagsToInsert.slice(i, i + chunkSize));
            }
        }

        // Update tag counts if we added tags
        // Optimization: Collect all unique tag IDs from imports and update them once
        // TODO: Implement later for performance

        return results;
    }

    async parseAndImportHeaderFile(tenantId: string, buffer: Buffer, mimetype: string) {
        // Parse buffer using XLSX
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json<any>(sheet);

        const contactsToImport: CreateContactDto[] = [];
        const tagCache = new Map<string, string>(); // Name -> ID

        // 1. Process rows
        for (const row of rawData) {
            // Helper function for fuzzy header matching
            const findValue = (obj: any, searchTerms: string[]) => {
                const key = Object.keys(obj).find(k =>
                    searchTerms.some(term => k.toLowerCase().trim().includes(term))
                );
                return key ? obj[key] : undefined;
            };

            const phone = findValue(row, ['phone', 'telefone', 'celular', 'whatsapp', 'mobile']);
            const name = findValue(row, ['name', 'nome', 'cliente']);
            const email = findValue(row, ['email', 'e-mail']);
            const category = findValue(row, ['category', 'categoria']);
            const tagsStr = findValue(row, ['tags', 'etiquetas']);

            if (!phone) continue; // Skip if no phone found

            // Map all other columns to custom fields
            const customFields: Record<string, any> = {};
            const knownKeys = ['phone', 'telefone', 'celular', 'whatsapp', 'mobile', 'name', 'nome', 'cliente', 'email', 'e-mail', 'category', 'categoria', 'tags', 'etiquetas'];

            Object.keys(row).forEach(key => {
                const lowerKey = key.toLowerCase().trim();
                // If it's not a known main field, put it in customFields
                if (!knownKeys.some(k => lowerKey.includes(k))) {
                    customFields[key] = row[key];
                }
            });

            const dto: CreateContactDto = {
                phone: String(phone).replace(/\D/g, ''),
                name: name ? String(name) : undefined,
                email: email ? String(email) : undefined,
                category: category ? String(category).substring(0, 100) : undefined,
                customFields,
                tagIds: []
            };

            // Process Tags
            if (tagsStr) {
                const tagNames = String(tagsStr).split(',').map(t => t.trim()).filter(t => t.length > 0);
                for (const tagName of tagNames) {
                    if (!tagCache.has(tagName)) {
                        // Find or Create Tag
                        let tag = await this.tagRepository.findOne({ where: { tenantId, name: tagName } });
                        if (!tag) {
                            tag = await this.tagRepository.save(this.tagRepository.create({
                                tenantId,
                                name: tagName,
                                color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random color
                            }));
                        }
                        tagCache.set(tagName, tag.id);
                    }
                    const tagId = tagCache.get(tagName);
                    if (tagId) dto.tagIds?.push(tagId);
                }
            }

            contactsToImport.push(dto);
        }

        return this.importContacts(tenantId, contactsToImport);
    }

    async exportContacts(tenantId: string, tagIds?: string[]) {
        const query: ContactQueryDto = { tagIds, limit: 10000 };
        const result = await this.findAllContacts(tenantId, query);
        return result.data;
    }

    // ============ TAGS ============

    async findAllTags(tenantId: string) {
        return this.tagRepository.find({
            where: { tenantId },
            order: { name: 'ASC' }
        });
    }

    async findTagById(tenantId: string, id: string) {
        const tag = await this.tagRepository.findOne({
            where: { id, tenantId }
        });

        if (!tag) {
            throw new NotFoundException('Tag não encontrada');
        }

        return tag;
    }

    async createTag(tenantId: string, dto: CreateTagDto) {
        const existing = await this.tagRepository.findOne({
            where: { tenantId, name: dto.name }
        });

        if (existing) {
            throw new BadRequestException('Já existe uma tag com este nome');
        }

        const tag = this.tagRepository.create({
            tenantId,
            name: dto.name,
            color: dto.color || '#a855f7',
            description: dto.description,
        });

        return this.tagRepository.save(tag);
    }

    async updateTag(tenantId: string, id: string, dto: UpdateTagDto) {
        await this.findTagById(tenantId, id);

        if (dto.name) {
            const existing = await this.tagRepository.findOne({
                where: { tenantId, name: dto.name }
            });
            if (existing && existing.id !== id) {
                throw new BadRequestException('Já existe uma tag com este nome');
            }
        }

        await this.tagRepository.update(id, dto);
        return this.findTagById(tenantId, id);
    }

    async deleteTag(tenantId: string, id: string) {
        await this.findTagById(tenantId, id);
        await this.contactTagRepository.delete({ tagId: id });
        await this.tagRepository.delete(id);
        return { message: 'Tag excluída com sucesso' };
    }

    async addTagsToContact(contactId: string, tagIds: string[]) {
        const contactTags = tagIds.map(tagId =>
            this.contactTagRepository.create({ contactId, tagId })
        );
        await this.contactTagRepository.save(contactTags);

        // Update contact counts
        await this.updateTagCounts(tagIds);
    }

    async bulkAddTags(tenantId: string, dto: BulkAddTagsDto) {
        const { contactIds, tagIds } = dto;

        for (const contactId of contactIds) {
            for (const tagId of tagIds) {
                const existing = await this.contactTagRepository.findOne({
                    where: { contactId, tagId }
                });
                if (!existing) {
                    await this.contactTagRepository.save(
                        this.contactTagRepository.create({ contactId, tagId })
                    );
                }
            }
        }

        await this.updateTagCounts(tagIds);
        return { message: `Tags adicionadas a ${contactIds.length} contatos` };
    }

    async blockContact(tenantId: string, id: string) {
        await this.contactRepository.update({ id, tenantId }, { isValid: false });
        return { message: 'Contato bloqueado' };
    }

    async unblockContact(tenantId: string, id: string) {
        await this.contactRepository.update({ id, tenantId }, { isValid: true });
        return { message: 'Contato desbloqueado' };
    }

    async setOptOut(tenantId: string, id: string, optedOut: boolean) {
        await this.contactRepository.update(
            { id, tenantId },
            { 
                optedOut, 
                optedOutAt: optedOut ? new Date() : undefined 
            }
        );
        return { message: optedOut ? 'Opt-out ativado' : 'Opt-out desativado' };
    }

    async verifyContacts(tenantId: string, instanceName: string, contactIds: string[], providerTypeStr: 'evolution' | 'waha') {
        const provider = this.providerFactory.getProvider(providerTypeStr);

        const results: any[] = [];

        for (const contactId of contactIds) {
            const contact = await this.contactRepository.findOne({ where: { id: contactId, tenantId } });
            if (!contact) continue;

            if (!contact.phone) {
                results.push({ contactId, status: 'no_phone' });
                continue;
            }

            try {
                const isOnWhatsapp = await provider.isOnWhatsApp(instanceName, contact.phone);
                contact.onWhatsapp = isOnWhatsapp;

                await this.contactRepository.save(contact);
                results.push({ contactId, phone: contact.phone, onWhatsapp: isOnWhatsapp });
            } catch (error) {
                this.logger.error(`Error verifying contact ${contactId}: ${error.message}`);
                results.push({ contactId, error: error.message });
            }
        }

        return { results };
    }

    async bulkRemoveTags(tenantId: string, dto: BulkRemoveTagsDto) {
        const { contactIds, tagIds } = dto;

        await this.contactTagRepository.delete({
            contactId: In(contactIds),
            tagId: In(tagIds)
        });

        await this.updateTagCounts(tagIds);
        return { message: `Tags removidas de ${contactIds.length} contatos` };
    }

    private async updateTagCounts(tagIds: string[]) {
        for (const tagId of tagIds) {
            const count = await this.contactTagRepository.count({
                where: { tagId }
            });
            await this.tagRepository.update(tagId, { contactCount: count });
        }
    }

    // ============ CUSTOM FIELDS ============

    async findAllCustomFields(tenantId: string) {
        return this.customFieldRepository.find({
            where: { tenantId },
            order: { order: 'ASC' }
        });
    }

    async createCustomField(tenantId: string, dto: CreateCustomFieldDto) {
        const existing = await this.customFieldRepository.findOne({
            where: { tenantId, key: dto.key }
        });

        if (existing) {
            throw new BadRequestException('Já existe um campo com esta chave');
        }

        // Get max order
        const maxOrder = await this.customFieldRepository
            .createQueryBuilder('cf')
            .where('cf.tenant_id = :tenantId', { tenantId })
            .select('MAX(cf.order)', 'max')
            .getRawOne();

        const field = this.customFieldRepository.create({
            tenantId,
            name: dto.name,
            key: dto.key,
            type: dto.type || 'text',
            options: dto.options,
            required: dto.required || false,
            order: (maxOrder?.max || 0) + 1,
        });

        return this.customFieldRepository.save(field);
    }

    async updateCustomField(tenantId: string, id: string, dto: UpdateCustomFieldDto) {
        const field = await this.customFieldRepository.findOne({
            where: { id, tenantId }
        });

        if (!field) {
            throw new NotFoundException('Campo não encontrado');
        }

        await this.customFieldRepository.update(id, dto);
        return this.customFieldRepository.findOne({ where: { id } });
    }

    async deleteCustomField(tenantId: string, id: string) {
        const field = await this.customFieldRepository.findOne({
            where: { id, tenantId }
        });

        if (!field) {
            throw new NotFoundException('Campo não encontrado');
        }

        await this.customFieldRepository.delete(id);
        return { message: 'Campo excluído com sucesso' };
    }


    // ============ HELPERS ============

    private normalizePhone(phone: string): string {
        // Remover caracteres não numéricos
        let cleanPhone = phone.replace(/\D/g, '');

        // Lógica específica para Brasil (DDI 55)
        // Se tem 10 ou 11 dígitos, assume que é BR sem DDI
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        return cleanPhone;
    }

    // ============ STATISTICS ============

    async getContactStats(tenantId: string) {
        const total = await this.contactRepository.count({ where: { tenantId } });
        const valid = await this.contactRepository.count({ where: { tenantId, isValid: true } });
        const optedOut = await this.contactRepository.count({ where: { tenantId, optedOut: true } });
        const onWhatsapp = await this.contactRepository.count({ where: { tenantId, onWhatsapp: true } });

        const tags = await this.tagRepository.find({ where: { tenantId } });

        return {
            total,
            valid,
            invalid: total - valid,
            optedOut,
            onWhatsapp,
            tagCount: tags.length,
            topTags: tags.sort((a, b) => b.contactCount - a.contactCount).slice(0, 5),
        };
    }
}
