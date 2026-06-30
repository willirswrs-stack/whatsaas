"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contact_entity_1 = require("./entities/contact.entity");
const instance_entity_1 = require("../instances/entities/instance.entity");
const XLSX = __importStar(require("xlsx"));
const whatsapp_provider_factory_1 = require("../whatsapp/whatsapp-provider.factory");
let ContactsService = ContactsService_1 = class ContactsService {
    contactRepository;
    tagRepository;
    contactTagRepository;
    customFieldRepository;
    instanceRepository;
    providerFactory;
    logger = new common_1.Logger(ContactsService_1.name);
    constructor(contactRepository, tagRepository, contactTagRepository, customFieldRepository, instanceRepository, providerFactory) {
        this.contactRepository = contactRepository;
        this.tagRepository = tagRepository;
        this.contactTagRepository = contactTagRepository;
        this.customFieldRepository = customFieldRepository;
        this.instanceRepository = instanceRepository;
        this.providerFactory = providerFactory;
    }
    // ============ CONTACTS ============
    async findAllContacts(tenantId, query) {
        this.logger.log(`findAllContacts: tenantId=${tenantId} query=${JSON.stringify(query)}`);
        const { search, tagIds, isValid, optedOut, startDate, endDate } = query;
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        // Base where conditions
        const where = { tenantId };
        if (isValid !== undefined)
            where.isValid = isValid;
        if (optedOut !== undefined)
            where.optedOut = optedOut;
        // Category Filter - Case Insensitive Partial Match
        if (query.category) {
            where.category = (0, typeorm_2.ILike)(`%${query.category.trim()}%`);
        }
        // Date Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt = (0, typeorm_2.Between)(start, end);
        }
        else if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            where.createdAt = (0, typeorm_2.MoreThanOrEqual)(start);
        }
        else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt = (0, typeorm_2.LessThanOrEqual)(end);
        }
        this.logger.log(`findAllContacts: page=${page} limit=${limit} skip=${skip} where=${JSON.stringify(where)}`);
        let contacts;
        let total;
        // If simple query (no search or tags), use findAndCount for maximum reliability
        if (!search && (!tagIds || tagIds.length === 0)) {
            const sortByStr = query.sortBy || 'createdAt';
            const sortOrderStr = query.sortOrder || 'DESC';
            // To ensure stable sorting with pagination, add id as secondary sort when not sorting by id
            const orderOptions = { [sortByStr]: sortOrderStr };
            if (sortByStr !== 'id') {
                orderOptions.id = 'DESC';
            }
            [contacts, total] = await this.contactRepository.findAndCount({
                where,
                order: orderOptions,
                skip,
                take: limit,
            });
            this.logger.log(`Repository findAndCount returned: contacts=${contacts.length}, total=${total}`);
        }
        else {
            // Use QueryBuilder for complex filters
            const qb = this.contactRepository.createQueryBuilder('contact')
                .where('contact.tenantId = :tenantId', { tenantId });
            if (isValid !== undefined)
                qb.andWhere('contact.isValid = :isValid', { isValid });
            if (optedOut !== undefined)
                qb.andWhere('contact.optedOut = :optedOut', { optedOut });
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
                qb.andWhere('(contact.name ILIKE :search OR contact.phone ILIKE :search OR contact.email ILIKE :search)', { search: `%${search}%` });
            }
            if (tagIds && tagIds.length > 0) {
                qb.andWhere(qb2 => {
                    const subQuery = qb2.subQuery()
                        .select('ct.contactId')
                        .from(contact_entity_1.ContactTag, 'ct')
                        .where('ct.tagId IN (:...tagIds)', { tagIds });
                    return 'contact.id IN ' + subQuery.getQuery();
                });
                // MUST set the parameter on the main QB because getQuery() doesn't include params
                qb.setParameter('tagIds', tagIds);
            }
            const sortByStr = query.sortBy || 'createdAt';
            const sortOrderStr = query.sortOrder || 'DESC';
            qb.orderBy(`contact.${sortByStr}`, sortOrderStr)
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
                where: { contactId: (0, typeorm_2.In)(contactIds) }
            })
            : [];
        const tagIdsToFetch = [...new Set(contactTags.map(ct => ct.tagId))];
        const tags = tagIdsToFetch.length > 0
            ? await this.tagRepository.find({
                where: { id: (0, typeorm_2.In)(tagIdsToFetch) }
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
    async findById(id) {
        return this.contactRepository.findOne({ where: { id } });
    }
    async findByPhone(tenantId, phone) {
        const normalized = this.normalizePhone(phone);
        return this.contactRepository.findOne({
            where: { tenantId, phone: normalized }
        });
    }
    async findContactById(tenantId, id) {
        const contact = await this.contactRepository.findOne({
            where: { id, tenantId }
        });
        if (!contact) {
            throw new common_1.NotFoundException('Contato não encontrado');
        }
        // Get tags
        const contactTags = await this.contactTagRepository.find({
            where: { contactId: id }
        });
        const tagIds = contactTags.map(ct => ct.tagId);
        const tags = tagIds.length > 0
            ? await this.tagRepository.find({ where: { id: (0, typeorm_2.In)(tagIds) } })
            : [];
        return { ...contact, tags };
    }
    async createContact(tenantId, dto) {
        const normalizedPhone = this.normalizePhone(dto.phone);
        // Check if phone already exists
        const existing = await this.contactRepository.findOne({
            where: { tenantId, phone: normalizedPhone }
        });
        if (existing) {
            throw new common_1.BadRequestException('Já existe um contato com este telefone');
        }
        if (!dto.phone || dto.phone.trim().length < 8) {
            throw new common_1.BadRequestException('Telefone inválido ou muito curto');
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
    async updateContact(tenantId, id, dto) {
        const contact = await this.findContactById(tenantId, id);
        // Check phone uniqueness if changing
        if (dto.phone && dto.phone !== contact.phone) {
            const normalizedPhone = this.normalizePhone(dto.phone);
            const existing = await this.contactRepository.findOne({
                where: { tenantId, phone: normalizedPhone }
            });
            if (existing) {
                throw new common_1.BadRequestException('Já existe um contato com este telefone');
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
    async deleteContact(tenantId, id) {
        const contact = await this.findContactById(tenantId, id);
        await this.contactTagRepository.delete({ contactId: id });
        await this.contactRepository.delete(id);
        return { message: 'Contato excluído com sucesso' };
    }
    async bulkDeleteContacts(tenantId, ids) {
        await this.contactTagRepository.delete({ contactId: (0, typeorm_2.In)(ids) });
        await this.contactRepository.delete({ id: (0, typeorm_2.In)(ids), tenantId });
        return { message: `${ids.length} contatos excluídos` };
    }
    async bulkDeleteContactsByTags(tenantId, tagIds) {
        if (!tagIds || tagIds.length === 0) {
            throw new common_1.BadRequestException('Nenhuma tag fornecida para exclusão em massa');
        }
        // Encontrar os contatos que possuem as tags selecionadas (qualquer uma delas)
        const contactTags = await this.contactTagRepository.find({
            where: { tagId: (0, typeorm_2.In)(tagIds) },
            select: ['contactId']
        });
        if (contactTags.length === 0) {
            return { message: 'Nenhum contato encontrado com as tags informadas' };
        }
        // Extrair IDs únicos
        const uniqueContactIds = [...new Set(contactTags.map(ct => ct.contactId))];
        // Garantir que pertencem ao tenant correto
        const contactsToDelete = await this.contactRepository.find({
            where: { id: (0, typeorm_2.In)(uniqueContactIds), tenantId },
            select: ['id']
        });
        const idsToDelete = contactsToDelete.map(c => c.id);
        if (idsToDelete.length === 0) {
            return { message: 'Nenhum contato encontrado com as tags informadas neste tenant' };
        }
        // Chama a exclusão padrão e retorna a contagem
        return this.bulkDeleteContacts(tenantId, idsToDelete);
    }
    async importContacts(tenantId, contacts) {
        const results = { imported: 0, skipped: 0, errors: [] };
        // 1. Normalize phones and prepare map
        const contactMap = new Map();
        const phonesToCheck = [];
        for (const dto of contacts) {
            try {
                if (!dto.phone)
                    continue;
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
            }
            catch (e) {
                results.errors.push(`${dto.phone}: Erro ao normalizar`);
            }
        }
        if (phonesToCheck.length === 0) {
            return results;
        }
        // 2. Find existing contacts in DB (Batch)
        // Split into chunks if too many phones (e.g. 500)
        const chunkSize = 500;
        const protectionSet = new Set(); // Phones that already exist
        for (let i = 0; i < phonesToCheck.length; i += chunkSize) {
            const chunk = phonesToCheck.slice(i, i + chunkSize);
            const existingContacts = await this.contactRepository.find({
                where: {
                    tenantId,
                    phone: (0, typeorm_2.In)(chunk)
                },
                select: ['phone']
            });
            existingContacts.forEach(c => protectionSet.add(c.phone));
        }
        // 3. Filter valid new contacts and prepare updates
        const newContacts = [];
        const contactsToUpdate = [];
        const contactTagsToInsert = [];
        // We need existing IDs for updating
        const existingContactsMap = new Map(); // Phone -> ID
        if (protectionSet.size > 0) {
            const existing = await this.contactRepository.find({
                where: { tenantId, phone: (0, typeorm_2.In)(Array.from(protectionSet)) },
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
                }
                catch (err) {
                    results.errors.push(`Erro ao salvar lote ${i / chunkSize}: ${err.message}`);
                    results.imported -= chunk.length;
                }
            }
        }
        // 6. Finalize Tags (Common logic for New and Updated)
        const finalTagsToInsert = [];
        const contactIdsToCheck = [];
        for (const req of contactTagsToInsert) {
            if (req.contactId) {
                contactIdsToCheck.push(req.contactId);
            }
        }
        // Fetch existing tags to avoid duplicates
        const existingContactTags = contactIdsToCheck.length > 0
            ? await this.contactTagRepository.find({ where: { contactId: (0, typeorm_2.In)(contactIdsToCheck) } })
            : [];
        for (const req of contactTagsToInsert) {
            if (!req.contactId)
                continue;
            const existingTagsForContact = existingContactTags
                .filter(ct => ct.contactId === req.contactId)
                .map(ct => ct.tagId);
            for (const tagId of req.tagIds) {
                // Only insert if the contact doesn't already have this tag
                if (!existingTagsForContact.includes(tagId)) {
                    finalTagsToInsert.push(this.contactTagRepository.create({
                        contactId: req.contactId,
                        tagId
                    }));
                }
            }
        }
        if (finalTagsToInsert.length > 0) {
            // Save tags in chunks safely
            for (let i = 0; i < finalTagsToInsert.length; i += chunkSize) {
                await this.contactTagRepository.save(finalTagsToInsert.slice(i, i + chunkSize));
            }
        }
        // Update tag counts if we added tags
        // Optimization: Collect all unique tag IDs from imports and update them once
        // TODO: Implement later for performance
        return results;
    }
    async importFromWhatsApp(tenantId, instanceId, includeGroups, tagIds) {
        const instance = await this.instanceRepository.findOne({ where: { id: instanceId, tenantId } });
        if (!instance) {
            throw new common_1.NotFoundException('Instância não encontrada');
        }
        const providerType = instance.provider || 'evolution';
        const provider = this.providerFactory.getProvider(providerType);
        this.logger.log(`Importing contacts from WhatsApp instance: ${instance.instanceName} for tenant: ${tenantId}`);
        const wahaContacts = await provider.getContacts(instance.instanceName);
        const contactsToImport = [];
        if (wahaContacts && wahaContacts.length > 0) {
            for (const contact of wahaContacts) {
                // Filtrar apenas contatos válidos (usuários, não grupos)
                // Evolution v2 usa 'remoteJid', WAHA usa 'id' ou 'id._serialized'
                const rawId = contact.remoteJid || contact.id?._serialized || contact.id || '';
                const phoneStr = typeof rawId === 'string' ? rawId : '';
                if (!phoneStr.includes('@s.whatsapp.net')) {
                    continue; // Ignorar grupos, broadcast lists, etc.
                }
                const phone = phoneStr.split('@')[0];
                const name = contact.name || contact.pushName || contact.notify || undefined;
                if (phone) {
                    contactsToImport.push({
                        phone: phone,
                        name: name,
                        tagIds: tagIds && tagIds.length > 0 ? [...tagIds] : []
                    });
                }
            }
        }
        // Importar membros de grupos se solicitado
        if (includeGroups && typeof provider.getGroupParticipants === 'function') {
            this.logger.log(`Fetching group participants for instance: ${instance.instanceName}`);
            const groupParticipants = await provider.getGroupParticipants(instance.instanceName);
            const tagCache = new Map(); // Cache groupName -> tagId
            for (const participant of groupParticipants) {
                const phoneStr = participant.id;
                if (!phoneStr || !phoneStr.includes('@s.whatsapp.net'))
                    continue;
                const phone = phoneStr.split('@')[0];
                if (!phone)
                    continue;
                // Tratar Tag do Grupo
                const tagName = `Grupo: ${participant.groupName}`;
                if (!tagCache.has(tagName)) {
                    let tag = await this.tagRepository.findOne({ where: { tenantId, name: tagName } });
                    if (!tag) {
                        tag = await this.tagRepository.save(this.tagRepository.create({
                            tenantId,
                            name: tagName,
                            color: '#' + Math.floor(Math.random() * 16777215).toString(16)
                        }));
                    }
                    tagCache.set(tagName, tag.id);
                }
                const tagId = tagCache.get(tagName);
                // Verificar se já existe na lista de importação para apenas adicionar a tag
                const existingIndex = contactsToImport.findIndex(c => c.phone === phone);
                if (existingIndex >= 0) {
                    if (!contactsToImport[existingIndex].tagIds) {
                        contactsToImport[existingIndex].tagIds = [];
                    }
                    if (tagId && !contactsToImport[existingIndex].tagIds.includes(tagId)) {
                        contactsToImport[existingIndex].tagIds.push(tagId);
                    }
                }
                else {
                    const allTags = tagIds ? [...tagIds] : [];
                    if (tagId && !allTags.includes(tagId)) {
                        allTags.push(tagId);
                    }
                    contactsToImport.push({
                        phone: phone,
                        name: participant.name,
                        tagIds: allTags
                    });
                }
            }
        }
        if (contactsToImport.length === 0) {
            return { imported: 0, skipped: 0, errors: [] };
        }
        this.logger.log(`Found ${contactsToImport.length} valid contacts to import from WhatsApp`);
        // Usar o método importContacts existente que já lida com duplicatas e otimização de banco
        return this.importContacts(tenantId, contactsToImport);
    }
    async parseAndImportHeaderFile(tenantId, buffer, mimetype) {
        // Parse buffer using XLSX
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);
        const contactsToImport = [];
        const tagCache = new Map(); // Name -> ID
        // 1. Process rows
        for (const row of rawData) {
            // Helper function for fuzzy header matching
            const findValue = (obj, searchTerms) => {
                const key = Object.keys(obj).find(k => searchTerms.some(term => k.toLowerCase().trim().includes(term)));
                return key ? obj[key] : undefined;
            };
            const phone = findValue(row, ['phone', 'telefone', 'celular', 'whatsapp', 'mobile']);
            const name = findValue(row, ['name', 'nome', 'cliente']);
            const email = findValue(row, ['email', 'e-mail']);
            const category = findValue(row, ['category', 'categoria']);
            const tagsStr = findValue(row, ['tags', 'etiquetas']);
            if (!phone)
                continue; // Skip if no phone found
            // Map all other columns to custom fields
            const customFields = {};
            const knownKeys = ['phone', 'telefone', 'celular', 'whatsapp', 'mobile', 'name', 'nome', 'cliente', 'email', 'e-mail', 'category', 'categoria', 'tags', 'etiquetas'];
            Object.keys(row).forEach(key => {
                const lowerKey = key.toLowerCase().trim();
                // If it's not a known main field, put it in customFields
                if (!knownKeys.some(k => lowerKey.includes(k))) {
                    customFields[key] = row[key];
                }
            });
            const dto = {
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
                    if (tagId)
                        dto.tagIds?.push(tagId);
                }
            }
            contactsToImport.push(dto);
        }
        return this.importContacts(tenantId, contactsToImport);
    }
    async exportContacts(tenantId, tagIds) {
        const query = { tagIds, limit: 10000 };
        const result = await this.findAllContacts(tenantId, query);
        return result.data;
    }
    // ============ TAGS ============
    async findAllTags(tenantId) {
        return this.tagRepository.find({
            where: { tenantId },
            order: { name: 'ASC' }
        });
    }
    async findTagById(tenantId, id) {
        const tag = await this.tagRepository.findOne({
            where: { id, tenantId }
        });
        if (!tag) {
            throw new common_1.NotFoundException('Tag não encontrada');
        }
        return tag;
    }
    async createTag(tenantId, dto) {
        const existing = await this.tagRepository.findOne({
            where: { tenantId, name: dto.name }
        });
        if (existing) {
            throw new common_1.BadRequestException('Já existe uma tag com este nome');
        }
        const tag = this.tagRepository.create({
            tenantId,
            name: dto.name,
            color: dto.color || '#a855f7',
            description: dto.description,
        });
        return this.tagRepository.save(tag);
    }
    async updateTag(tenantId, id, dto) {
        await this.findTagById(tenantId, id);
        if (dto.name) {
            const existing = await this.tagRepository.findOne({
                where: { tenantId, name: dto.name }
            });
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException('Já existe uma tag com este nome');
            }
        }
        await this.tagRepository.update(id, dto);
        return this.findTagById(tenantId, id);
    }
    async deleteTag(tenantId, id) {
        await this.findTagById(tenantId, id);
        await this.contactTagRepository.delete({ tagId: id });
        await this.tagRepository.delete(id);
        return { message: 'Tag excluída com sucesso' };
    }
    async addTagsToContact(contactId, tagIds) {
        const contactTags = tagIds.map(tagId => this.contactTagRepository.create({ contactId, tagId }));
        await this.contactTagRepository.save(contactTags);
        // Update contact counts
        await this.updateTagCounts(tagIds);
    }
    async bulkAddTags(tenantId, dto) {
        const { contactIds, tagIds } = dto;
        for (const contactId of contactIds) {
            for (const tagId of tagIds) {
                const existing = await this.contactTagRepository.findOne({
                    where: { contactId, tagId }
                });
                if (!existing) {
                    await this.contactTagRepository.save(this.contactTagRepository.create({ contactId, tagId }));
                }
            }
        }
        await this.updateTagCounts(tagIds);
        return { message: `Tags adicionadas a ${contactIds.length} contatos` };
    }
    async blockContact(tenantId, id) {
        await this.contactRepository.update({ id, tenantId }, { isValid: false });
        return { message: 'Contato bloqueado' };
    }
    async unblockContact(tenantId, id) {
        await this.contactRepository.update({ id, tenantId }, { isValid: true });
        return { message: 'Contato desbloqueado' };
    }
    async setOptOut(tenantId, id, optedOut) {
        await this.contactRepository.update({ id, tenantId }, {
            optedOut,
            optedOutAt: optedOut ? new Date() : undefined
        });
        return { message: optedOut ? 'Opt-out ativado' : 'Opt-out desativado' };
    }
    async verifyContacts(tenantId, instanceName, contactIds, providerTypeStr) {
        const provider = this.providerFactory.getProvider(providerTypeStr);
        const results = [];
        for (const contactId of contactIds) {
            const contact = await this.contactRepository.findOne({ where: { id: contactId, tenantId } });
            if (!contact)
                continue;
            if (!contact.phone) {
                results.push({ contactId, status: 'no_phone' });
                continue;
            }
            try {
                const isOnWhatsapp = await provider.isOnWhatsApp(instanceName, contact.phone);
                contact.onWhatsapp = isOnWhatsapp;
                await this.contactRepository.save(contact);
                results.push({ contactId, phone: contact.phone, onWhatsapp: isOnWhatsapp });
            }
            catch (error) {
                this.logger.error(`Error verifying contact ${contactId}: ${error.message}`);
                results.push({ contactId, error: error.message });
            }
        }
        return { results };
    }
    async bulkRemoveTags(tenantId, dto) {
        const { contactIds, tagIds } = dto;
        await this.contactTagRepository.delete({
            contactId: (0, typeorm_2.In)(contactIds),
            tagId: (0, typeorm_2.In)(tagIds)
        });
        await this.updateTagCounts(tagIds);
        return { message: `Tags removidas de ${contactIds.length} contatos` };
    }
    async updateTagCounts(tagIds) {
        for (const tagId of tagIds) {
            const count = await this.contactTagRepository.count({
                where: { tagId }
            });
            await this.tagRepository.update(tagId, { contactCount: count });
        }
    }
    // ============ CUSTOM FIELDS ============
    async findAllCustomFields(tenantId) {
        return this.customFieldRepository.find({
            where: { tenantId },
            order: { order: 'ASC' }
        });
    }
    async createCustomField(tenantId, dto) {
        const existing = await this.customFieldRepository.findOne({
            where: { tenantId, key: dto.key }
        });
        if (existing) {
            throw new common_1.BadRequestException('Já existe um campo com esta chave');
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
    async updateCustomField(tenantId, id, dto) {
        const field = await this.customFieldRepository.findOne({
            where: { id, tenantId }
        });
        if (!field) {
            throw new common_1.NotFoundException('Campo não encontrado');
        }
        await this.customFieldRepository.update(id, dto);
        return this.customFieldRepository.findOne({ where: { id } });
    }
    async deleteCustomField(tenantId, id) {
        const field = await this.customFieldRepository.findOne({
            where: { id, tenantId }
        });
        if (!field) {
            throw new common_1.NotFoundException('Campo não encontrado');
        }
        await this.customFieldRepository.delete(id);
        return { message: 'Campo excluído com sucesso' };
    }
    // ============ HELPERS ============
    normalizePhone(phone) {
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
    async getContactStats(tenantId) {
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
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = ContactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __param(1, (0, typeorm_1.InjectRepository)(contact_entity_1.Tag)),
    __param(2, (0, typeorm_1.InjectRepository)(contact_entity_1.ContactTag)),
    __param(3, (0, typeorm_1.InjectRepository)(contact_entity_1.CustomField)),
    __param(4, (0, typeorm_1.InjectRepository)(instance_entity_1.Instance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        whatsapp_provider_factory_1.WhatsAppProviderFactory])
], ContactsService);
