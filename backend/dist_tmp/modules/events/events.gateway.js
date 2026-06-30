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
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    jwtService;
    server;
    logger = new common_1.Logger(EventsGateway_1.name);
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                // this.logger.verbose(`Client ${client.id} no token`);
                client.disconnect();
                return;
            }
            // Verify pode lançar exceção se token inválido
            const payload = this.jwtService.verify(token);
            const tenantId = payload.tenantId;
            if (tenantId) {
                await client.join(`tenant:${tenantId}`);
                this.logger.log(`Client ${client.id} joined room tenant:${tenantId}`);
                client.data.tenantId = tenantId;
            }
            else {
                client.disconnect();
            }
        }
        catch (error) {
            // this.logger.error(`Connection rejected: ${error.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        // this.logger.verbose(`Client ${client.id} disconnected`);
    }
    emitToTenant(tenantId, event, data) {
        if (this.server) {
            this.server.to(`tenant:${tenantId}`).emit(event, data);
        }
        else {
            this.logger.warn(`Could not emit event "${event}" to tenant "${tenantId}" - WebSocket server not initialized.`);
        }
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002'],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        namespace: 'events',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], EventsGateway);
