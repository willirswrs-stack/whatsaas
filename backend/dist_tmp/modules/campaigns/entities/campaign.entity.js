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
exports.CampaignContact = exports.MessageVariation = exports.Campaign = exports.Template = void 0;
const typeorm_1 = require("typeorm");
const contact_entity_1 = require("../../contacts/entities/contact.entity");
let Template = class Template {
    id;
    tenantId;
    name;
    content;
    contentType; // 'text', 'image', 'video', 'audio', 'document'
    mediaConfig;
    variables;
    createdAt;
    campaigns;
};
exports.Template = Template;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Template.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', nullable: true }),
    __metadata("design:type", String)
], Template.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Template.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Template.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_type', default: 'text' }),
    __metadata("design:type", String)
], Template.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'media_config', default: {} }),
    __metadata("design:type", Object)
], Template.prototype, "mediaConfig", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: [] }),
    __metadata("design:type", Array)
], Template.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Template.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Campaign, (campaign) => campaign.template),
    __metadata("design:type", Array)
], Template.prototype, "campaigns", void 0);
exports.Template = Template = __decorate([
    (0, typeorm_1.Entity)('templates')
], Template);
let Campaign = class Campaign {
    id;
    tenantId;
    name;
    templateId;
    template;
    flowId;
    instanceId; // Deprecated, kept for backward compatibility
    instanceIds;
    status; // 'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'split'
    parentCampaignId;
    aiSpinEnabled;
    variationCount;
    scheduleConfig;
    targetingRules;
    minDelayMs;
    maxDelayMs;
    // Anti-Ban Settings
    settings;
    totalContacts;
    sentCount;
    deliveredCount;
    readCount;
    failedCount;
    scheduledAt;
    startedAt;
    completedAt;
    createdAt;
    variations;
    campaignContacts;
};
exports.Campaign = Campaign;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Campaign.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', nullable: true }),
    __metadata("design:type", String)
], Campaign.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Campaign.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_id', nullable: true }),
    __metadata("design:type", String)
], Campaign.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Template, (template) => template.campaigns),
    (0, typeorm_1.JoinColumn)({ name: 'template_id' }),
    __metadata("design:type", Template)
], Campaign.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'flow_id', nullable: true }),
    __metadata("design:type", String)
], Campaign.prototype, "flowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id', nullable: true }),
    __metadata("design:type", String)
], Campaign.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'instance_ids', default: [] }),
    __metadata("design:type", Array)
], Campaign.prototype, "instanceIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], Campaign.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_campaign_id', nullable: true }),
    __metadata("design:type", String)
], Campaign.prototype, "parentCampaignId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ai_spin_enabled', default: true }),
    __metadata("design:type", Boolean)
], Campaign.prototype, "aiSpinEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'variation_count', default: 20 }),
    __metadata("design:type", Number)
], Campaign.prototype, "variationCount", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'schedule_config', default: {} }),
    __metadata("design:type", Object)
], Campaign.prototype, "scheduleConfig", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'targeting_rules', default: {} }),
    __metadata("design:type", Object)
], Campaign.prototype, "targetingRules", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_delay_ms', default: 5000 }),
    __metadata("design:type", Number)
], Campaign.prototype, "minDelayMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_delay_ms', default: 15000 }),
    __metadata("design:type", Number)
], Campaign.prototype, "maxDelayMs", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'settings', default: {} }),
    __metadata("design:type", Object)
], Campaign.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_contacts', default: 0 }),
    __metadata("design:type", Number)
], Campaign.prototype, "totalContacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_count', default: 0 }),
    __metadata("design:type", Number)
], Campaign.prototype, "sentCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_count', default: 0 }),
    __metadata("design:type", Number)
], Campaign.prototype, "deliveredCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_count', default: 0 }),
    __metadata("design:type", Number)
], Campaign.prototype, "readCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_count', default: 0 }),
    __metadata("design:type", Number)
], Campaign.prototype, "failedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', nullable: true }),
    __metadata("design:type", Date)
], Campaign.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', nullable: true }),
    __metadata("design:type", Date)
], Campaign.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', nullable: true }),
    __metadata("design:type", Date)
], Campaign.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Campaign.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MessageVariation, (variation) => variation.campaign),
    __metadata("design:type", Array)
], Campaign.prototype, "variations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CampaignContact, (cc) => cc.campaign),
    __metadata("design:type", Array)
], Campaign.prototype, "campaignContacts", void 0);
exports.Campaign = Campaign = __decorate([
    (0, typeorm_1.Entity)('campaigns'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], Campaign);
let MessageVariation = class MessageVariation {
    id;
    campaignId;
    campaign;
    variationIndex;
    content;
    contentHash;
    useCount;
    createdAt;
};
exports.MessageVariation = MessageVariation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MessageVariation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'campaign_id' }),
    __metadata("design:type", String)
], MessageVariation.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Campaign, (campaign) => campaign.variations, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'campaign_id' }),
    __metadata("design:type", Campaign)
], MessageVariation.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'variation_index' }),
    __metadata("design:type", Number)
], MessageVariation.prototype, "variationIndex", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], MessageVariation.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_hash' }),
    __metadata("design:type", String)
], MessageVariation.prototype, "contentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'use_count', default: 0 }),
    __metadata("design:type", Number)
], MessageVariation.prototype, "useCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MessageVariation.prototype, "createdAt", void 0);
exports.MessageVariation = MessageVariation = __decorate([
    (0, typeorm_1.Entity)('message_variations')
], MessageVariation);
let CampaignContact = class CampaignContact {
    id;
    campaignId;
    campaign;
    contactId;
    contact;
    instanceId;
    variationId;
    status; // 'queued', 'sending', 'sent', 'delivered', 'read', 'failed'
    retryCount;
    scheduledAt;
    sentAt;
    deliveredAt;
    readAt;
    failedAt;
    errorMessage;
    messageId;
    contentHash;
    timingMetadata;
    createdAt;
    updatedAt;
};
exports.CampaignContact = CampaignContact;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CampaignContact.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'campaign_id' }),
    __metadata("design:type", String)
], CampaignContact.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Campaign, (campaign) => campaign.campaignContacts, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'campaign_id' }),
    __metadata("design:type", Campaign)
], CampaignContact.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_id' }),
    __metadata("design:type", String)
], CampaignContact.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_entity_1.Contact, (contact) => contact.campaignContacts, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'contact_id' }),
    __metadata("design:type", contact_entity_1.Contact)
], CampaignContact.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id', nullable: true }),
    __metadata("design:type", String)
], CampaignContact.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'variation_id', nullable: true }),
    __metadata("design:type", String)
], CampaignContact.prototype, "variationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'queued' }),
    __metadata("design:type", String)
], CampaignContact.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], CampaignContact.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', nullable: true }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', nullable: true }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', nullable: true }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_at', nullable: true }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_at', nullable: true }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "failedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', nullable: true }),
    __metadata("design:type", String)
], CampaignContact.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'message_id', nullable: true }),
    __metadata("design:type", String)
], CampaignContact.prototype, "messageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_hash', nullable: true }),
    __metadata("design:type", String)
], CampaignContact.prototype, "contentHash", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'timing_metadata', nullable: true }),
    __metadata("design:type", Object)
], CampaignContact.prototype, "timingMetadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CampaignContact.prototype, "updatedAt", void 0);
exports.CampaignContact = CampaignContact = __decorate([
    (0, typeorm_1.Entity)('campaign_contacts'),
    (0, typeorm_1.Index)(['campaignId', 'status']),
    (0, typeorm_1.Index)(['contactId'])
], CampaignContact);
