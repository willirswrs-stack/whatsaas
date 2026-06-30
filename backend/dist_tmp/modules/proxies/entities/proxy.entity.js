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
exports.ProxyEntity = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../../tenants/entities/tenant.entity");
const instance_entity_1 = require("../../instances/entities/instance.entity");
let ProxyEntity = class ProxyEntity {
    id;
    tenantId;
    tenant;
    provider; // iproyal, proxy-cheap, etc
    host;
    port;
    username;
    password;
    assignedInstanceId; // O ID do chip do Evolution/Waha
    expirationDate;
    status;
    createdAt;
    updatedAt;
    instances;
};
exports.ProxyEntity = ProxyEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProxyEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], ProxyEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], ProxyEntity.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'iproyal' }),
    __metadata("design:type", String)
], ProxyEntity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProxyEntity.prototype, "host", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProxyEntity.prototype, "port", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProxyEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProxyEntity.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assignedInstanceId', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ProxyEntity.prototype, "assignedInstanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expirationDate', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ProxyEntity.prototype, "expirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }) // active, expired, suspended
    ,
    __metadata("design:type", String)
], ProxyEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProxyEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updatedAt' }),
    __metadata("design:type", Date)
], ProxyEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => instance_entity_1.Instance, (instance) => instance.proxy),
    __metadata("design:type", Array)
], ProxyEntity.prototype, "instances", void 0);
exports.ProxyEntity = ProxyEntity = __decorate([
    (0, typeorm_1.Entity)('proxies')
], ProxyEntity);
