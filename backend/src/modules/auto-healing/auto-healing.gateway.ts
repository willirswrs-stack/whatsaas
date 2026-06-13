import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'auto-healing',
})
export class AutoHealingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AutoHealingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected for auto-healing monitor: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from auto-healing monitor: ${client.id}`);
  }

  notifyErrorDetected(errorData: { message: string, context?: string, code?: string }) {
    this.server.emit('AGENT_DETECTED_ERROR', {
      timestamp: new Date(),
      ...errorData,
    });
  }

  notifyFixing(actionData: { action: string, details?: string }) {
    this.server.emit('AGENT_FIXING', {
      timestamp: new Date(),
      ...actionData,
    });
  }

  notifyResolved(resolutionData: { message: string }) {
    this.server.emit('AGENT_RESOLVED', {
      timestamp: new Date(),
      ...resolutionData,
    });
  }

  notifyActionRequired(actionData: { message: string, proposal: string, payload: any }) {
    this.server.emit('AGENT_ACTION_REQUIRED', {
      timestamp: new Date(),
      ...actionData,
    });
  }

  // Frontend will emit this when Admin clicks "Approve"
  @SubscribeMessage('AGENT_APPROVE_ACTION')
  handleApproveAction(@MessageBody() data: any) {
    this.logger.log(`Admin approved auto-healing action: ${JSON.stringify(data)}`);
    // Opcionalmente repassar para o Service para executar a ação de fato.
    this.server.emit('AGENT_ACTION_APPROVED_ACK', { success: true, payload: data });
  }
}
