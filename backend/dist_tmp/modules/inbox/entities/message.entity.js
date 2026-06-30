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
exports.Message = void 0;
const typeorm_1 = require("typeorm");
const contact_entity_1 = require("../../contacts/entities/contact.entity");
let Message = class Message {
    id;
    tenantId;
    instanceId;
    instanceName; // whatsapp instance name (for display)
    contactId;
    contact;
    /** Raw JID: 5511999999999@s.whatsapp.net or groupid@g.us */
    remoteJid;
    /** Normalized phone number (without suffix) for display */
    remotePhone;
    /** Remote contact display name (from WhatsApp) */
    remoteName;
    /** WhatsApp message ID (wamid) — unique per message */
    wamid;
    direction;
    type;
    /** Text content or media caption */
    content;
    /** For media messages: URL in our storage */
    mediaUrl;
    /** For media messages: MIME type */
    mediaMime;
    status;
    /** FK to campaign if sent via campaign */
    campaignId;
    /** Whether this is a group message */
    isGroup;
    /** Group name (for group messages) */
    groupName;
    /** Raw payload from Evolution API (for debugging) */
    rawPayload;
    /** Expiry at 90 days (for cleanup jobs) */
    expiresAt;
    createdAt;
    updatedAt;
};
exports.Message = Message;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Message.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Message.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_name', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "instanceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_id', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_entity_1.Contact, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'contact_id' }),
    __metadata("design:type", contact_entity_1.Contact)
], Message.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_jid' }),
    __metadata("design:type", String)
], Message.prototype, "remoteJid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_phone', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "remotePhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_name', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "remoteName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wamid', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "wamid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'direction', type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], Message.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'type', type: 'varchar', length: 20, default: 'text' }),
    __metadata("design:type", String)
], Message.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_url', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "mediaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_mime', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "mediaMime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, default: 'received' }),
    __metadata("design:type", String)
], Message.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'campaign_id', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_group', default: false }),
    __metadata("design:type", Boolean)
], Message.prototype, "isGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'group_name', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "groupName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raw_payload', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Message.prototype, "rawPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Message.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Message.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Message.prototype, "updatedAt", void 0);
exports.Message = Message = __decorate([
    (0, typeorm_1.Entity)('messages'),
    (0, typeorm_1.Index)(['tenantId', 'remoteJid', 'createdAt']),
    (0, typeorm_1.Index)(['tenantId', 'instanceId', 'createdAt']),
    (0, typeorm_1.Index)(['wamid'], { unique: true, where: '"wamid" IS NOT NULL' }),
    (0, typeorm_1.Index)(['contactId'])
], Message);
