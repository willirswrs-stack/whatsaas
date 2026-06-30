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
exports.FlowTrigger = exports.FlowExecution = exports.Flow = void 0;
const typeorm_1 = require("typeorm");
let Flow = class Flow {
    id;
    tenantId;
    folderId;
    name;
    description;
    channel;
    category;
    status;
    // Estrutura visual do fluxo (React Flow)
    nodes;
    edges;
    // Estatísticas
    executionCount;
    lastExecutedAt;
    createdAt;
    updatedAt;
};
exports.Flow = Flow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Flow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], Flow.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'folder_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Flow.prototype, "folderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Flow.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Flow.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Flow.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Flow.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'draft' }),
    __metadata("design:type", String)
], Flow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Flow.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Flow.prototype, "edges", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'execution_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flow.prototype, "executionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_executed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Flow.prototype, "lastExecutedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Flow.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Flow.prototype, "updatedAt", void 0);
exports.Flow = Flow = __decorate([
    (0, typeorm_1.Entity)('flows')
], Flow);
let FlowExecution = class FlowExecution {
    id;
    flowId;
    contactId;
    instanceId;
    status;
    currentNodeId;
    // Variáveis do fluxo (respostas coletadas, etc)
    variables;
    // Log de execução
    logs;
    startedAt;
    completedAt;
    nextActionAt; // Para delays
};
exports.FlowExecution = FlowExecution;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FlowExecution.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'flow_id', type: 'uuid' }),
    __metadata("design:type", String)
], FlowExecution.prototype, "flowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_id', type: 'uuid' }),
    __metadata("design:type", String)
], FlowExecution.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instance_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], FlowExecution.prototype, "instanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'running' }),
    __metadata("design:type", String)
], FlowExecution.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_node_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], FlowExecution.prototype, "currentNodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], FlowExecution.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], FlowExecution.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], FlowExecution.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FlowExecution.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_action_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FlowExecution.prototype, "nextActionAt", void 0);
exports.FlowExecution = FlowExecution = __decorate([
    (0, typeorm_1.Entity)('flow_executions')
], FlowExecution);
let FlowTrigger = class FlowTrigger {
    id;
    flowId;
    tenantId;
    type;
    // Para keyword: palavras-chave, Para schedule: cron expression
    config;
    active;
    createdAt;
};
exports.FlowTrigger = FlowTrigger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FlowTrigger.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'flow_id', type: 'uuid' }),
    __metadata("design:type", String)
], FlowTrigger.prototype, "flowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], FlowTrigger.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], FlowTrigger.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], FlowTrigger.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], FlowTrigger.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FlowTrigger.prototype, "createdAt", void 0);
exports.FlowTrigger = FlowTrigger = __decorate([
    (0, typeorm_1.Entity)('flow_triggers')
], FlowTrigger);
