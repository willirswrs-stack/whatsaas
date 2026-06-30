"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var IPRoyalAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPRoyalAdapter = void 0;
const common_1 = require("@nestjs/common");
let IPRoyalAdapter = IPRoyalAdapter_1 = class IPRoyalAdapter {
    logger = new common_1.Logger(IPRoyalAdapter_1.name);
    async buyOrAllocateProxy(tenantId, currentProxies) {
        this.logger.log(`[IPROYAL ADAPTER] Simulando aquisição de IP dedicado sob demanda para tenant ${tenantId}`);
        const mockHost = `isp-us-${Math.floor(Math.random() * 10000)}.iproyal.com`;
        const mockPort = `${Math.floor(Math.random() * 10000 + 10000)}`;
        const mockUser = `usr_${tenantId.substring(0, 6)}`;
        const mockPass = `pass_${Math.random().toString(36).substring(2, 10)}`;
        return {
            host: mockHost,
            port: mockPort,
            username: mockUser,
            password: mockPass,
            provider: 'iproyal_isp',
            type: 'socks5'
        };
    }
};
exports.IPRoyalAdapter = IPRoyalAdapter;
exports.IPRoyalAdapter = IPRoyalAdapter = IPRoyalAdapter_1 = __decorate([
    (0, common_1.Injectable)()
], IPRoyalAdapter);
