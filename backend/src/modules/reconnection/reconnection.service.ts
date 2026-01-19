
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Instance } from '../instances/entities/instance.entity';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';

@Injectable()
export class ReconnectionService {
    private readonly logger = new Logger(ReconnectionService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        private providerFactory: WhatsAppProviderFactory,
        private configService: ConfigService,
    ) { }

    async getMonitoredInstances() {
        return this.instanceRepo.find({
            where: [
                { status: InstanceStatus.DISCONNECTED },
                { status: InstanceStatus.ERROR },
                { status: InstanceStatus.RECONNECTING }
            ],
            select: [
                'id', 'instanceName', 'status',
                'lastConnectionCheckAt', 'lastReconnectAttemptAt',
                'reconnectAttempts', 'reconnectLockedUntil',
                'lastReconnectErrorCode'
            ],
            order: { lastReconnectAttemptAt: 'DESC' }
        });
    }

    async processInstanceById(instanceId: string): Promise<void> {
        const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
        if (!instance) {
            this.logger.warn(`Instance ${instanceId} not found for processing`);
            return;
        }
        return this.processInstance(instance);
    }

    async findEligibleInstances(limit: number): Promise<Instance[]> {
        const now = new Date();

        return this.instanceRepo.createQueryBuilder('instance')
            .where('instance.provider = :provider', { provider: 'evolution' })
            .andWhere('instance.status IN (:...statuses)', { statuses: [InstanceStatus.DISCONNECTED, InstanceStatus.ERROR] })
            .andWhere(
                '(instance.reconnect_locked_until IS NULL OR instance.reconnect_locked_until <= :now)',
                { now }
            )
            .orderBy('instance.last_connection_check_at', 'ASC', 'NULLS FIRST')
            .limit(limit)
            .getMany();
    }

    async processInstance(instance: Instance): Promise<void> {
        this.logger.debug(`Processing reconnection for ${instance.instanceName} (${instance.id})`);

        // Atualiza timestamp de check
        await this.instanceRepo.update(instance.id, { lastConnectionCheckAt: new Date() });
        instance.lastConnectionCheckAt = new Date();

        try {
            const provider = this.providerFactory.getProvider(instance.provider);
            const status = await provider.getStatus(instance.instanceName);

            // 1. Provider diz CONNECTED -> Recuperação
            if (status.status === InstanceStatus.CONNECTED) {
                this.logger.log(`Instance ${instance.instanceName} recovered! Provider says CONNECTED.`);

                await this.instanceRepo.update(instance.id, {
                    status: InstanceStatus.CONNECTED,
                    reconnectAttempts: 0,
                    reconnectLockedUntil: null as any,
                    lastReconnectErrorMessage: null as any,
                    connectedAt: new Date()
                });
                return;
            }

            // 2. Provider não está conectado -> Tentar reconectar
            instance.reconnectAttempts = (instance.reconnectAttempts || 0) + 1;
            instance.lastReconnectAttemptAt = new Date();

            this.logger.log(`Attempting reconnection #${instance.reconnectAttempts} for ${instance.instanceName} (Status: ${status.status})`);

            try {
                // Tenta criar/conectar novamente.
                await provider.createInstance(instance.instanceName);

                // Se bem sucedido comando, mudamos para RECONNECTING
                // Lock curto (2 min) para dar tempo de conectar
                await this.instanceRepo.update(instance.id, {
                    status: InstanceStatus.RECONNECTING,
                    reconnectAttempts: instance.reconnectAttempts,
                    lastReconnectAttemptAt: instance.lastReconnectAttemptAt,
                    reconnectLockedUntil: new Date(Date.now() + 2 * 60 * 1000)
                });

            } catch (reconnectError: any) {
                await this.handleReconnectError(instance, reconnectError);
            }

        } catch (error) {
            // Erro ao consultar status (Provider offline?)
            await this.handleReconnectError(instance, error);
        }
    }

    private async handleReconnectError(instance: Instance, error: any) {
        this.logger.warn(`Reconnection failed for ${instance.instanceName}: ${error.message}`);

        const updateData: Partial<Instance> = {
            lastReconnectErrorCode: error.code || 'UNKNOWN',
            lastReconnectErrorMessage: error.message?.substring(0, 255),
            reconnectAttempts: instance.reconnectAttempts
        };

        // Backoff Strategy
        const attempts = instance.reconnectAttempts;
        let lockMinutes = 1;

        const errorMsg = (error.message || '').toLowerCase();

        if (errorMsg.includes('not found') || errorMsg.includes('404')) {
            lockMinutes = 360; // 6 hours for critical 'not found'
            updateData.status = InstanceStatus.ERROR;
        } else {
            // Exponential/Step Backoff
            if (attempts >= 5) lockMinutes = 60; // 1h
            else if (attempts >= 4) lockMinutes = 15;
            else if (attempts >= 3) lockMinutes = 5;
            else if (attempts >= 2) lockMinutes = 2;
        }

        updateData.reconnectLockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);

        await this.instanceRepo.update(instance.id, updateData);
    }
}
