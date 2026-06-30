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
exports.TenantSettings = void 0;
const typeorm_1 = require("typeorm");
/** Settings salvas por tenant (configurações específicas do cliente) */
let TenantSettings = class TenantSettings {
    id;
    tenantId;
    // ─── Chaves de API (por tenant) ───────────────────────────
    openaiKey;
    anthropicKey;
    geminiKey;
    groqKey;
    /** Settings extras por tenant (elevenLabsKey, etc.) */
    extraSettings;
    /**
     * Configurações globais — apenas o Super Admin pode alterar.
     * Armazenadas no tenant virtual "system" (tenantId = 'system').
     * Inclui: LLM global, dias de aquecimento, prompts dos agentes.
     */
    globalConfig;
    createdAt;
    updatedAt;
};
exports.TenantSettings = TenantSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TenantSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', unique: true }),
    __metadata("design:type", String)
], TenantSettings.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'openai_key', nullable: true }),
    __metadata("design:type", String)
], TenantSettings.prototype, "openaiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'anthropic_key', nullable: true }),
    __metadata("design:type", String)
], TenantSettings.prototype, "anthropicKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gemini_key', nullable: true }),
    __metadata("design:type", String)
], TenantSettings.prototype, "geminiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groq_key', nullable: true }),
    __metadata("design:type", String)
], TenantSettings.prototype, "groqKey", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'extra_settings', default: {} }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "extraSettings", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { name: 'global_config', default: {} }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "globalConfig", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TenantSettings.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TenantSettings.prototype, "updatedAt", void 0);
exports.TenantSettings = TenantSettings = __decorate([
    (0, typeorm_1.Entity)('tenant_settings')
], TenantSettings);
