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
exports.WarmupSchedule = exports.Instance = void 0;
const instance_status_enum_1 = require("../../../common/enums/instance-status.enum");
const typeorm_1 = require("typeorm");
const proxy_entity_1 = require("../../proxies/entities/proxy.entity");
const chip_detail_entity_1 = require("./chip-detail.entity");
let Instance = class Instance {
    id;
    tenantId;
    phone;
    instanceName;
    status;
    channelType; // 'unofficial' (QR), 'official' (Meta)
    provider; // WhatsApp API provider
    stage; // 'registration', 'mobile_warmup', 'web_migration', 'mature', 'sold'
    proxyId;
    proxy;
    metaConfig;
    evolutionConfig;
    warmupDay;
    warmupEnabled;
    isSystemSeed;
    warmupProfile;
    dailyLimit;
    dailySent;
    connectedAt;
    lastConnectionCheckAt;
    lastReconnectAttemptAt;
    reconnectAttempts;
    reconnectLockedUntil;
    lastReconnectErrorCode;
    lastReconnectErrorMessage;
    createdAt;
    updatedAt;
    warmupSchedules;
    chipDetail;
    // Helper: Check if has capacity
    hasCapacity() {
        return this.dailySent < this.dailyLimit;
    }
    // Helper: Get remaining capacity
    getRemainingCapacity() {
        return Math.max(0, this.dailyLimit - this.dailySent);
    }
};
exports.Instance = Instance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Instance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_name', unique: true, nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "instanceName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: instance_status_enum_1.InstanceStatus,
        default: instance_status_enum_1.InstanceStatus.CREATED
    }),
    __metadata("design:type", String)
], Instance.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_type', default: 'unofficial' }),
    __metadata("design:type", String)
], Instance.prototype, "channelType", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'evolution' }),
    __metadata("design:type", String)
], Instance.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: 'registration',
        name: 'lifecycle_stage'
    }),
    __metadata("design:type", String)
], Instance.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'proxy_id', nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "proxyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => proxy_entity_1.ProxyEntity, (proxy) => proxy.instances, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'proxy_id' }),
    __metadata("design:type", proxy_entity_1.ProxyEntity)
], Instance.prototype, "proxy", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'meta_config', default: {} }),
    __metadata("design:type", Object)
], Instance.prototype, "metaConfig", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'evolution_config', default: {} }),
    __metadata("design:type", Object)
], Instance.prototype, "evolutionConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warmup_day', default: 0 }),
    __metadata("design:type", Number)
], Instance.prototype, "warmupDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warmup_enabled', default: true }),
    __metadata("design:type", Boolean)
], Instance.prototype, "warmupEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_system_seed', default: false }),
    __metadata("design:type", Boolean)
], Instance.prototype, "isSystemSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warmup_profile', default: 'cold_outbound' }),
    __metadata("design:type", String)
], Instance.prototype, "warmupProfile", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'daily_limit', default: 10 }),
    __metadata("design:type", Number)
], Instance.prototype, "dailyLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'daily_sent', default: 0 }),
    __metadata("design:type", Number)
], Instance.prototype, "dailySent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'connected_at', nullable: true }),
    __metadata("design:type", Date)
], Instance.prototype, "connectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_connection_check_at', nullable: true }),
    __metadata("design:type", Date)
], Instance.prototype, "lastConnectionCheckAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reconnect_attempt_at', nullable: true }),
    __metadata("design:type", Date)
], Instance.prototype, "lastReconnectAttemptAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reconnect_attempts', default: 0 }),
    __metadata("design:type", Number)
], Instance.prototype, "reconnectAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reconnect_locked_until', nullable: true }),
    __metadata("design:type", Date)
], Instance.prototype, "reconnectLockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reconnect_error_code', nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "lastReconnectErrorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reconnect_error_message', nullable: true }),
    __metadata("design:type", String)
], Instance.prototype, "lastReconnectErrorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Instance.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', nullable: true }),
    __metadata("design:type", Date)
], Instance.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WarmupSchedule, (schedule) => schedule.instance),
    __metadata("design:type", Array)
], Instance.prototype, "warmupSchedules", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => chip_detail_entity_1.ChipDetail, (chipDetail) => chipDetail.instance, {
        cascade: true,
        eager: true
    }),
    __metadata("design:type", chip_detail_entity_1.ChipDetail)
], Instance.prototype, "chipDetail", void 0);
exports.Instance = Instance = __decorate([
    (0, typeorm_1.Entity)('instances'),
    (0, typeorm_1.Index)(['tenantId', 'status'])
], Instance);
let WarmupSchedule = class WarmupSchedule {
    id;
    instanceId;
    instance;
    dayNumber;
    targetMessages;
    sentCount;
    conversationLog;
    status; // 'pending', 'running', 'completed'
    scheduledAt;
    completedAt;
};
exports.WarmupSchedule = WarmupSchedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WarmupSchedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id' }),
    __metadata("design:type", String)
], WarmupSchedule.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Instance, (instance) => instance.warmupSchedules, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'instance_id' }),
    __metadata("design:type", Instance)
], WarmupSchedule.prototype, "instance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'day_number' }),
    __metadata("design:type", Number)
], WarmupSchedule.prototype, "dayNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_messages' }),
    __metadata("design:type", Number)
], WarmupSchedule.prototype, "targetMessages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_count', default: 0 }),
    __metadata("design:type", Number)
], WarmupSchedule.prototype, "sentCount", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'conversation_log', default: [] }),
    __metadata("design:type", Array)
], WarmupSchedule.prototype, "conversationLog", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], WarmupSchedule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at' }),
    __metadata("design:type", Date)
], WarmupSchedule.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', nullable: true }),
    __metadata("design:type", Date)
], WarmupSchedule.prototype, "completedAt", void 0);
exports.WarmupSchedule = WarmupSchedule = __decorate([
    (0, typeorm_1.Entity)('warmup_schedules')
], WarmupSchedule);
