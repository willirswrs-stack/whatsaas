import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
import { Contact, Tag, ContactTag, CustomField } from './entities/contact.entity';
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

        for (const dto of contacts) {
            try {
                const normalizedPhone = this.normalizePhone(dto.phone);

                const existing = await this.contactRepository.findOne({
                    where: { tenantId, phone: normalizedPhone }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                // Update DTO with normalized phone
                dto.phone = normalizedPhone;
                await this.createContact(tenantId, dto);
                results.imported++;
            } catch (error) {
                results.errors.push(`${dto.phone}: ${error.message}`);
            }
        }

        return results;
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
