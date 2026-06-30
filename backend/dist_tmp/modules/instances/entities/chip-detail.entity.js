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
exports.ChipDetail = void 0;
const typeorm_1 = require("typeorm");
const instance_entity_1 = require("./instance.entity");
let ChipDetail = class ChipDetail {
    id;
    instanceId;
    instance;
    carrier;
    deviceName;
    isInDrawer;
    planType;
    rechargeDate;
    rechargeValue;
    expirationDate;
    healthScore;
    banCount;
    unbanCount;
    tags;
    physicalLocation;
    iccid;
    profileStatus;
    createdAt;
    updatedAt;
};
exports.ChipDetail = ChipDetail;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChipDetail.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id' }),
    __metadata("design:type", String)
], ChipDetail.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => instance_entity_1.Instance, (instance) => instance.chipDetail, {
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)({ name: 'instance_id' }),
    __metadata("design:type", instance_entity_1.Instance)
], ChipDetail.prototype, "instance", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChipDetail.prototype, "carrier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_name', nullable: true }),
    __metadata("design:type", String)
], ChipDetail.prototype, "deviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_in_drawer', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ChipDetail.prototype, "isInDrawer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_type', nullable: true }),
    __metadata("design:type", String)
], ChipDetail.prototype, "planType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'recharge_date', nullable: true }),
    __metadata("design:type", Date)
], ChipDetail.prototype, "rechargeDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'recharge_value', nullable: true }),
    __metadata("design:type", Number)
], ChipDetail.prototype, "rechargeValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'expiration_date', nullable: true }),
    __metadata("design:type", Date)
], ChipDetail.prototype, "expirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'health_score', type: 'int', default: 100 }),
    __metadata("design:type", Number)
], ChipDetail.prototype, "healthScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ban_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ChipDetail.prototype, "banCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unban_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ChipDetail.prototype, "unbanCount", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: [] }),
    __metadata("design:type", Array)
], ChipDetail.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'physical_location', nullable: true }),
    __metadata("design:type", String)
], ChipDetail.prototype, "physicalLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChipDetail.prototype, "iccid", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'profile_status', default: {} }),
    __metadata("design:type", Object)
], ChipDetail.prototype, "profileStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ChipDetail.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ChipDetail.prototype, "updatedAt", void 0);
exports.ChipDetail = ChipDetail = __decorate([
    (0, typeorm_1.Entity)('chip_details')
], ChipDetail);
