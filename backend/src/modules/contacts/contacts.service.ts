import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
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

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        @InjectRepository(Tag)
        private tagRepository: Repository<Tag>,
        @InjectRepository(ContactTag)
        private contactTagRepository: Repository<ContactTag>,
        @InjectRepository(CustomField)
        private customFieldRepository: Repository<CustomField>,
    ) { }

    // ============ CONTACTS ============

    async findAllContacts(tenantId: string, query: ContactQueryDto) {
        const { search, tagIds, isValid, optedOut, page = 1, limit = 50 } = query;
        const skip = (page - 1) * limit;

        const qb = this.contactRepository.createQueryBuilder('contact')
            .where('contact.tenant_id = :tenantId', { tenantId });

        // Search by name or phone
        if (search) {
            qb.andWhere(
                '(contact.name ILIKE :search OR contact.phone ILIKE :search OR contact.email ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Filter by tags
        if (tagIds && tagIds.length > 0) {
            qb.andWhere(qb2 => {
                const subQuery = qb2.subQuery()
                    .select('ct.contact_id')
                    .from(ContactTag, 'ct')
                    .where('ct.tag_id IN (:...tagIds)', { tagIds })
                    .getQuery();
                return 'contact.id IN ' + subQuery;
            });
        }

        // Filter by validity
        if (isValid !== undefined) {
            qb.andWhere('contact.is_valid = :isValid', { isValid });
        }

        // Filter by opt-out
        if (optedOut !== undefined) {
            qb.andWhere('contact.opted_out = :optedOut', { optedOut });
        }

        qb.orderBy('contact.created_at', 'DESC')
            .skip(skip)
            .take(limit);

        const [contacts, total] = await qb.getManyAndCount();

        // Get tags for each contact
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

        // Attach tags to contacts
        const contactsWithTags = contacts.map(contact => ({
            ...contact,
            tags: contactTags
                .filter(ct => ct.contactId === contact.id)
                .map(ct => tagMap.get(ct.tagId))
                .filter(Boolean)
        }));

        return {
            data: contactsWithTags,
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

        // 3. Filter valid new contacts
        const newContacts: Contact[] = [];
        const contactTagsToInsert: { contactIndex: number, tagIds: string[] }[] = [];

        let index = 0;
        for (const [phone, dto] of contactMap.entries()) {
            if (protectionSet.has(phone)) {
                results.skipped++;
                continue;
            }

            const contact = this.contactRepository.create({
                tenantId,
                phone: dto.phone,
                name: dto.name,
                email: dto.email,
                customFields: dto.customFields || {},
                onWhatsapp: true, // Optimistic assumption for imported contacts
            });

            newContacts.push(contact);

            if (dto.tagIds && dto.tagIds.length > 0) {
                contactTagsToInsert.push({ contactIndex: index, tagIds: dto.tagIds });
            }
            index++;
        }

        // 4. Batch Insert Contacts
        if (newContacts.length > 0) {
            // Save in chunks to avoid query limits
            for (let i = 0; i < newContacts.length; i += chunkSize) {
                const chunk = newContacts.slice(i, i + chunkSize);
                try {
                    const savedChunk = await this.contactRepository.save(chunk);
                    results.imported += savedChunk.length;

                    // Handle Tags for this chunk
                    // We need to map saved entities back to their tag requests
                    // This is tricky because order might be preserved but IDs are generated.
                    // Assuming save returns in same order.

                    const chunkTags: ContactTag[] = [];
                    savedChunk.forEach((savedContact, idx) => {
                        const originalIndex = i + idx;
                        // Find if this specific contact index had tags
                        const tagReq = contactTagsToInsert.find(t => t.contactIndex === originalIndex);
                        if (tagReq) {
                            tagReq.tagIds.forEach(tagId => {
                                chunkTags.push(this.contactTagRepository.create({
                                    contactId: savedContact.id,
                                    tagId
                                }));
                            });
                        }
                    });

                    if (chunkTags.length > 0) {
                        await this.contactTagRepository.save(chunkTags);
                    }

                } catch (err) {
                    // Try fallback to individual insert if batch fail?
                    // For now, log error and count as failed
                    // This is rare unless there's a constraint violation not caught
                    results.errors.push(`Erro ao salvar lote ${i / chunkSize}: ${err.message}`);
                    results.imported -= chunk.length;
                }
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
            // Map columns dynamically
            // Supported: phone/telefone/celular, name/nome, email, tags (comma separated)

            let phone = row['phone'] || row['Phone'] || row['telefone'] || row['Telefone'] || row['celular'] || row['Celular'] || row['whatsapp'] || row['mobile'];
            const name = row['name'] || row['Name'] || row['nome'] || row['Nome'] || row['cliente'];
            const email = row['email'] || row['Email'] || row['e-mail'];
            const tagsStr = row['tags'] || row['Tags'] || row['etiquetas'];

            if (!phone) continue; // Skip empty phones

            // Convert phone to string just in case
            phone = String(phone).replace(/\D/g, '');

            const dto: CreateContactDto = {
                phone,
                name: name ? String(name) : undefined,
                email: email ? String(email) : undefined,
                customFields: {}, // TODO: Map other columns
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
