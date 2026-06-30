"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomField = exports.ContactTag = exports.Tag = exports.Contact = void 0;
const typeorm_1 = require("typeorm");
const campaign_entity_1 = require("../../campaigns/entities/campaign.entity");
let Contact = class Contact {
    id;
    tenantId;
    phone;
    name;
    email;
    customFields;
    category;
    isValid;
    onWhatsapp;
    lastInteraction;
    optedOut;
    optedOutAt;
    createdAt;
    updatedAt;
    // Relacionamento com Tags (será resolvido depois)
    tags;
    campaignContacts;
};
exports.Contact = Contact;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Contact.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Contact.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Contact.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Contact.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Contact.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_fields', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Contact.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Contact.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_valid', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Contact.prototype, "isValid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'on_whatsapp', type: 'boolean', nullable: true }),
    __metadata("design:type", Boolean)
], Contact.prototype, "onWhatsapp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_interaction', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Contact.prototype, "lastInteraction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opted_out', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Contact.prototype, "optedOut", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opted_out_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Contact.prototype, "optedOutAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Contact.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Contact.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => campaign_entity_1.CampaignContact, (cc) => cc.contact),
    __metadata("design:type", Array)
], Contact.prototype, "campaignContacts", void 0);
exports.Contact = Contact = __decorate([
    (0, typeorm_1.Entity)('contacts')
], Contact);
let Tag = class Tag {
    id;
    tenantId;
    name;
    color;
    description;
    contactCount;
    createdAt;
};
exports.Tag = Tag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], Tag.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Tag.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 7, default: '#a855f7' }),
    __metadata("design:type", String)
], Tag.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Tag.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Tag.prototype, "contactCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Tag.prototype, "createdAt", void 0);
exports.Tag = Tag = __decorate([
    (0, typeorm_1.Entity)('tags')
], Tag);
let ContactTag = class ContactTag {
    id;
    contactId;
    tagId;
    addedAt;
};
exports.ContactTag = ContactTag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContactTag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_id', type: 'uuid' }),
    __metadata("design:type", String)
], ContactTag.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tag_id', type: 'uuid' }),
    __metadata("design:type", String)
], ContactTag.prototype, "tagId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'added_at' }),
    __metadata("design:type", Date)
], ContactTag.prototype, "addedAt", void 0);
exports.ContactTag = ContactTag = __decorate([
    (0, typeorm_1.Entity)('contact_tags')
], ContactTag);
let CustomField = class CustomField {
    id;
    tenantId;
    name;
    key; // slug do campo, ex: "data_nascimento"
    type;
    options; // Para campos do tipo 'select'
    required;
    order;
    createdAt;
};
exports.CustomField = CustomField;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomField.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], CustomField.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], CustomField.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], CustomField.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'text' }),
    __metadata("design:type", String)
], CustomField.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], CustomField.prototype, "options", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomField.prototype, "required", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'field_order' }),
    __metadata("design:type", Number)
], CustomField.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CustomField.prototype, "createdAt", void 0);
exports.CustomField = CustomField = __decorate([
    (0, typeorm_1.Entity)('custom_fields')
], CustomField);
