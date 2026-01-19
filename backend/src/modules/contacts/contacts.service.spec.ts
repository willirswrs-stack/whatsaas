import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ContactsService } from './contacts.service';
import { Contact, Tag, ContactTag, CustomField } from './entities';
import { createMockRepository, MockRepository } from '../../test-utils';

const mockContact = (overrides = {}) => ({
    id: 'contact-123',
    tenantId: 'tenant-123',
    phone: '5511999999999',
    email: 'john@test.com',
    name: 'John Doe',
    customFields: {},
    isValid: true,
    onWhatsapp: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    ...overrides,
});

const mockTag = (overrides = {}) => ({
    id: 'tag-123',
    tenantId: 'tenant-123',
    name: 'VIP',
    color: '#FF0000',
    contactCount: 10,
    createdAt: new Date(),
    ...overrides,
});

const mockCustomField = (overrides = {}) => ({
    id: 'field-123',
    tenantId: 'tenant-123',
    name: 'Company',
    fieldKey: 'company',
    fieldType: 'text',
    required: false,
    createdAt: new Date(),
    ...overrides,
});

describe('ContactsService', () => {
    let service: ContactsService;
    let contactRepo: MockRepository<Contact>;
    let tagRepo: MockRepository<Tag>;
    let contactTagRepo: MockRepository<ContactTag>;
    let customFieldRepo: MockRepository<CustomField>;

    beforeEach(async () => {
        contactRepo = createMockRepository<Contact>();
        tagRepo = createMockRepository<Tag>();
        contactTagRepo = createMockRepository<ContactTag>();
        customFieldRepo = createMockRepository<CustomField>();

        // Mock createQueryBuilder
        contactRepo.createQueryBuilder = jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[mockContact()], 1]),
            getMany: jest.fn().mockResolvedValue([mockContact()]),
        });

        contactTagRepo.createQueryBuilder = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([{ tag_id: 'tag-123', count: '5' }]),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContactsService,
                { provide: getRepositoryToken(Contact), useValue: contactRepo },
                { provide: getRepositoryToken(Tag), useValue: tagRepo },
                { provide: getRepositoryToken(ContactTag), useValue: contactTagRepo },
                { provide: getRepositoryToken(CustomField), useValue: customFieldRepo },
            ],
        }).compile();

        service = module.get<ContactsService>(ContactsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Contacts CRUD', () => {
        describe('findAllContacts', () => {
            it('should return paginated contacts', async () => {
                const result = await service.findAllContacts('tenant-123', { page: 1, limit: 10 });

                expect(result.contacts).toHaveLength(1);
                expect(result.total).toBe(1);
            });
        });

        describe('findContactById', () => {
            it('should return a contact by id', async () => {
                contactRepo.findOne!.mockResolvedValue(mockContact());

                const result = await service.findContactById('tenant-123', 'contact-123');

                expect(result.id).toBe('contact-123');
            });

            it('should throw NotFoundException if not found', async () => {
                contactRepo.findOne!.mockResolvedValue(null);

                await expect(service.findContactById('tenant-123', 'non-existent'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('createContact', () => {
            it('should create a new contact', async () => {
                contactRepo.create!.mockImplementation((data) => ({ ...mockContact(), ...data }));
                contactRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createContact('tenant-123', {
                    phone: '5511888888888',
                    name: 'Jane Doe',
                });

                expect(result.phone).toBe('5511888888888');
            });
        });

        describe('updateContact', () => {
            it('should update an existing contact', async () => {
                const contact = mockContact();
                contactRepo.findOne!.mockResolvedValue(contact);
                contactRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.updateContact('tenant-123', 'contact-123', {
                    name: 'Updated Name',
                });

                expect(result.name).toBe('Updated Name');
            });
        });

        describe('deleteContact', () => {
            it('should delete a contact', async () => {
                const contact = mockContact();
                contactRepo.findOne!.mockResolvedValue(contact);
                contactRepo.remove!.mockResolvedValue(contact);

                const result = await service.deleteContact('tenant-123', 'contact-123');

                expect(result.deleted).toBe(true);
            });
        });

        describe('bulkDeleteContacts', () => {
            it('should delete multiple contacts', async () => {
                contactRepo.delete!.mockResolvedValue({ affected: 5 });

                const result = await service.bulkDeleteContacts('tenant-123', ['c1', 'c2', 'c3', 'c4', 'c5']);

                expect(result.deleted).toBe(5);
            });
        });

        describe('importContacts', () => {
            it('should import multiple contacts', async () => {
                contactRepo.create!.mockImplementation((data) => ({ ...mockContact(), ...data }));
                contactRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const contacts = [
                    { phone: '5511111111111', name: 'Contact 1' },
                    { phone: '5511222222222', name: 'Contact 2' },
                ];

                const result = await service.importContacts('tenant-123', contacts);

                expect(result.imported).toBe(2);
            });
        });

        describe('exportContacts', () => {
            it('should export contacts', async () => {
                contactRepo.find!.mockResolvedValue([mockContact()]);

                const result = await service.exportContacts('tenant-123');

                expect(result).toHaveLength(1);
            });
        });
    });

    describe('Tags', () => {
        describe('findAllTags', () => {
            it('should return all tags', async () => {
                tagRepo.find!.mockResolvedValue([mockTag()]);

                const result = await service.findAllTags('tenant-123');

                expect(result).toHaveLength(1);
            });
        });

        describe('findTagById', () => {
            it('should return a tag by id', async () => {
                tagRepo.findOne!.mockResolvedValue(mockTag());

                const result = await service.findTagById('tenant-123', 'tag-123');

                expect(result.name).toBe('VIP');
            });

            it('should throw NotFoundException if not found', async () => {
                tagRepo.findOne!.mockResolvedValue(null);

                await expect(service.findTagById('tenant-123', 'non-existent'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('createTag', () => {
            it('should create a new tag', async () => {
                tagRepo.findOne!.mockResolvedValue(null);
                tagRepo.create!.mockImplementation((data) => ({ ...mockTag(), ...data }));
                tagRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createTag('tenant-123', {
                    name: 'Premium',
                    color: '#00FF00',
                });

                expect(result.name).toBe('Premium');
            });

            it('should throw BadRequestException if tag exists', async () => {
                tagRepo.findOne!.mockResolvedValue(mockTag());

                await expect(service.createTag('tenant-123', { name: 'VIP' }))
                    .rejects.toThrow(BadRequestException);
            });
        });

        describe('updateTag', () => {
            it('should update an existing tag', async () => {
                tagRepo.findOne!.mockResolvedValue(mockTag());
                tagRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.updateTag('tenant-123', 'tag-123', {
                    color: '#0000FF',
                });

                expect(result.color).toBe('#0000FF');
            });
        });

        describe('deleteTag', () => {
            it('should delete a tag', async () => {
                tagRepo.findOne!.mockResolvedValue(mockTag());
                tagRepo.remove!.mockResolvedValue(mockTag());

                const result = await service.deleteTag('tenant-123', 'tag-123');

                expect(result.deleted).toBe(true);
            });
        });
    });

    describe('Custom Fields', () => {
        describe('findAllCustomFields', () => {
            it('should return all custom fields', async () => {
                customFieldRepo.find!.mockResolvedValue([mockCustomField()]);

                const result = await service.findAllCustomFields('tenant-123');

                expect(result).toHaveLength(1);
            });
        });

        describe('createCustomField', () => {
            it('should create a new custom field', async () => {
                customFieldRepo.findOne!.mockResolvedValue(null);
                customFieldRepo.create!.mockImplementation((data) => ({ ...mockCustomField(), ...data }));
                customFieldRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createCustomField('tenant-123', {
                    name: 'Birthday',
                    fieldType: 'date',
                });

                expect(result.name).toBe('Birthday');
            });
        });

        describe('updateCustomField', () => {
            it('should update a custom field', async () => {
                customFieldRepo.findOne!.mockResolvedValue(mockCustomField());
                customFieldRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.updateCustomField('tenant-123', 'field-123', {
                    required: true,
                });

                expect(result.required).toBe(true);
            });
        });

        describe('deleteCustomField', () => {
            it('should delete a custom field', async () => {
                customFieldRepo.findOne!.mockResolvedValue(mockCustomField());
                customFieldRepo.remove!.mockResolvedValue(mockCustomField());

                const result = await service.deleteCustomField('tenant-123', 'field-123');

                expect(result.deleted).toBe(true);
            });
        });
    });

    describe('getContactStats', () => {
        it('should return contact statistics', async () => {
            contactRepo.count!.mockResolvedValue(100);
            tagRepo.find!.mockResolvedValue([mockTag({ contactCount: 50 })]);

            const result = await service.getContactStats('tenant-123');

            expect(result.totalContacts).toBe(100);
        });
    });
});
