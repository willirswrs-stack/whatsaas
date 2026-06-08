import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002'],
        credentials: true,
        methods: ['GET', 'POST'],
    },
    namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(EventsGateway.name);

    constructor(private readonly jwtService: JwtService) { }

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
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
            } else {
                client.disconnect();
            }
        } catch (error) {
            // this.logger.error(`Connection rejected: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // this.logger.verbose(`Client ${client.id} disconnected`);
    }

    emitToTenant(tenantId: string, event: string, data: any) {
        if (this.server) {
            this.server.to(`tenant:${tenantId}`).emit(event, data);
        } else {
            this.logger.warn(`Could not emit event "${event}" to tenant "${tenantId}" - WebSocket server not initialized.`);
        }
    }
}
