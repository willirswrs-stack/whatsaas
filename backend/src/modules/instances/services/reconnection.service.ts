/**
 * ReconnectionService — Serviço de Auto-Reconexão Ativa
 *
 * Monitora e reconecta chips desconectados automaticamente.
 * Implementa backoff exponencial para evitar spam de reconexões
 * que agravam o estado restritivo do número no WhatsApp.
 *
 * Roda a cada 3 minutos verificando:
 * 1. Chips em status 'reconnecting' por mais de 10 minutos → tenta reconectar
 * 2. Chips em status 'disconnected' → agenda reconexão com backoff
 * 3. Divergências entre banco e Evolution API → corrige silenciosamente
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../entities/instance.entity';
import { InstanceStatus } from '../../../common/enums/instance-status.enum';
import { WhatsAppProviderFactory } from '../../whatsapp/whatsapp-provider.factory';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class ReconnectionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ReconnectionService.name);
    private monitorInterval: NodeJS.Timeout | null = null;
    private syncInterval: NodeJS.Timeout | null = null;

    // Backoff em minutos por número de tentativas
    // Tentativa 1: 5min, 2: 10min, 3: 20min, 4+: 40min
    private readonly BACKOFF_MINUTES = [5, 10, 20, 40];

    // Tempo máximo em que um chip pode ficar em 'reconnecting' antes de agir (10 min)
    private readonly RECONNECTING_TIMEOUT_MS = 10 * 60 * 1000;

    // Intervalo de verificação de reconexão (3 min)
    private readonly RECONNECT_CHECK_INTERVAL_MS = 3 * 60 * 1000;

    // Intervalo de sincronização de estado BD ↔ Provider (10 min)
    private readonly STATE_SYNC_INTERVAL_MS = 10 * 60 * 1000;

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        private whatsappFactory: WhatsAppProviderFactory,
        private eventsGateway: EventsGateway,
    ) {}

    onModuleInit() {
        this.logger.log('🔄 ReconnectionService iniciado — monitoramento ativo de desconexões');

        // Iniciar monitoramento de reconexão após 30s (aguardar boot completo)
        setTimeout(() => {
            this.monitorInterval = setInterval(
                () => this.runReconnectionCycle().catch(e => this.logger.error(`Erro no ciclo de reconexão: ${e.message}`)),
                this.RECONNECT_CHECK_INTERVAL_MS
            );

            // Executar imediatamente na inicialização para reconectar chips que caíram
            this.runReconnectionCycle().catch(e => this.logger.error(`Erro na reconexão inicial: ${e.message}`));
        }, 30000);

        // Iniciar sincronização de estado após 60s
        setTimeout(() => {
            this.syncInterval = setInterval(
                () => this.runStateSyncCycle().catch(e => this.logger.error(`Erro no ciclo de sync: ${e.message}`)),
                this.STATE_SYNC_INTERVAL_MS
            );

            // Executar imediatamente
            this.runStateSyncCycle().catch(e => this.logger.error(`Erro no sync inicial: ${e.message}`));
        }, 60000);
    }

    onModuleDestroy() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        if (this.syncInterval) clearInterval(this.syncInterval);
    }

    // =========================================================================
    // CICLO PRINCIPAL DE RECONEXÃO (a cada 3 min)
    // =========================================================================

    async runReconnectionCycle(): Promise<void> {
        const now = new Date();

        // 1. Buscar chips em estado problemático
        const disconnectedInstances = await this.instanceRepo.find({
            where: [
                { status: InstanceStatus.DISCONNECTED },
                { status: InstanceStatus.RECONNECTING },
            ],
        });

        if (disconnectedInstances.length === 0) {
            return; // Nada a fazer
        }

        this.logger.log(`🔍 Verificando ${disconnectedInstances.length} chips desconectados/reconectando...`);

        for (const instance of disconnectedInstances) {
            try {
                await this.processDisconnectedInstance(instance, now);
            } catch (e) {
                this.logger.error(`Erro ao processar ${instance.instanceName}: ${e.message}`);
            }
        }
    }

    private async processDisconnectedInstance(instance: Instance, now: Date): Promise<void> {
        // Se está bloqueado por backoff, verificar se o tempo passou
        if (instance.reconnectLockedUntil && new Date(instance.reconnectLockedUntil) > now) {
            const remainingMs = new Date(instance.reconnectLockedUntil).getTime() - now.getTime();
            this.logger.debug(`⏳ ${instance.instanceName} aguardando backoff (${Math.round(remainingMs / 60000)}min restantes)`);
            return;
        }

        // Se está em 'reconnecting' há menos de 10 minutos, aguardar Baileys tentar
        if (instance.status === InstanceStatus.RECONNECTING && instance.lastReconnectAttemptAt) {
            const timeSinceAttempt = now.getTime() - new Date(instance.lastReconnectAttemptAt).getTime();
            if (timeSinceAttempt < this.RECONNECTING_TIMEOUT_MS) {
                this.logger.debug(`⏳ ${instance.instanceName} ainda em reconexão automática do Baileys (${Math.round(timeSinceAttempt / 60000)}min)`);
                return;
            }
        }

        // Tentar reconexão
        await this.attemptReconnect(instance, now);
    }

    private async attemptReconnect(instance: Instance, now: Date): Promise<void> {
        const attempts = (instance.reconnectAttempts || 0) + 1;
        const backoffIndex = Math.min(attempts - 1, this.BACKOFF_MINUTES.length - 1);
        const backoffMinutes = this.BACKOFF_MINUTES[backoffIndex];
        const lockedUntil = new Date(now.getTime() + backoffMinutes * 60 * 1000);

        this.logger.log(`🔁 Tentando reconectar ${instance.instanceName} (tentativa #${attempts}, próxima em ${backoffMinutes}min)...`);

        try {
            const provider = this.whatsappFactory.getProvider((instance.provider as any) || 'evolution');

            // Verificar o status real no provider antes de agir
            let providerStatus: any;
            try {
                providerStatus = await provider.getStatus(instance.instanceName);
            } catch (e) {
                this.logger.warn(`Não consegui verificar status de ${instance.instanceName} no provider: ${e.message}`);
            }

            // Se já reconectou sozinho, apenas atualizar o banco
            if (providerStatus?.status === InstanceStatus.CONNECTED) {
                this.logger.log(`✅ ${instance.instanceName} já está conectado no provider! Atualizando banco...`);
                await this.instanceRepo.update(instance.id, {
                    status: InstanceStatus.CONNECTED,
                    connectedAt: now,
                    reconnectAttempts: 0,
                    reconnectLockedUntil: null as any,
                    phone: providerStatus.phoneNumber?.replace('@s.whatsapp.net', '') || instance.phone,
                });
                this.emitStatusUpdate(instance, InstanceStatus.CONNECTED);
                return;
            }

            // Chip não está conectado — tentar conectar via provider
            // Para Baileys (Evolution), isso significa garantir que a instância está no container
            // e em modo de aguardar QR ou pairing code
            if (providerStatus && providerStatus.exists === false) {
                // Instância não existe no container — recriar
                this.logger.warn(`${instance.instanceName} não existe no container. Recriando...`);
                try {
                    const config = instance.channelType === 'official' ? instance.metaConfig : {};
                    await provider.createInstance(instance.instanceName, config);
                } catch (createErr) {
                    this.logger.error(`Falha ao recriar ${instance.instanceName}: ${createErr.message}`);
                }
            }

            // Atualizar banco com a tentativa
            await this.instanceRepo.update(instance.id, {
                status: InstanceStatus.RECONNECTING,
                reconnectAttempts: attempts,
                lastReconnectAttemptAt: now,
                reconnectLockedUntil: lockedUntil,
            });

            this.emitStatusUpdate(instance, InstanceStatus.RECONNECTING);
            this.logger.log(`📡 ${instance.instanceName} aguardando reconexão (backoff: ${backoffMinutes}min)`);

        } catch (err) {
            this.logger.error(`❌ Falha na reconexão de ${instance.instanceName}: ${err.message}`);
            await this.instanceRepo.update(instance.id, {
                reconnectAttempts: attempts,
                lastReconnectAttemptAt: now,
                reconnectLockedUntil: lockedUntil,
                lastReconnectErrorMessage: err.message?.substring(0, 255),
            });
        }
    }

    // =========================================================================
    // CICLO DE SINCRONIZAÇÃO DE ESTADO (a cada 10 min)
    // Detecta divergências entre banco de dados e Evolution API
    // =========================================================================

    async runStateSyncCycle(): Promise<void> {
        this.logger.debug('🔄 Executando ciclo de sincronização de estado BD ↔ Provider...');

        // Buscar todos os chips que o banco considera conectados
        const connectedInDB = await this.instanceRepo.find({
            where: { status: InstanceStatus.CONNECTED },
        });

        if (connectedInDB.length === 0) return;

        let divergences = 0;

        for (const instance of connectedInDB) {
            try {
                const provider = this.whatsappFactory.getProvider((instance.provider as any) || 'evolution');
                const providerStatus = await provider.getStatus(instance.instanceName);

                if (providerStatus.status !== InstanceStatus.CONNECTED) {
                    divergences++;
                    this.logger.warn(
                        `⚠️ DIVERGÊNCIA DETECTADA: ${instance.instanceName} — BD:connected | Provider:${providerStatus.status}. Corrigindo...`
                    );

                    // Corrigir o banco
                    await this.instanceRepo.update(instance.id, {
                        status: providerStatus.status === InstanceStatus.DISCONNECTED
                            ? InstanceStatus.DISCONNECTED
                            : InstanceStatus.RECONNECTING,
                        lastReconnectAttemptAt: new Date(),
                    });

                    this.emitStatusUpdate(instance, providerStatus.status || InstanceStatus.DISCONNECTED);
                } else if (providerStatus.phoneNumber && !instance.phone) {
                    // Aproveitar para sincronizar o número de telefone se faltar
                    const phone = providerStatus.phoneNumber.replace('@s.whatsapp.net', '');
                    await this.instanceRepo.update(instance.id, { phone });
                    this.logger.log(`📱 Sincronizando telefone de ${instance.instanceName}: ${phone}`);
                }
            } catch (e) {
                this.logger.warn(`Erro ao sincronizar ${instance.instanceName}: ${e.message}`);
            }
        }

        if (divergences > 0) {
            this.logger.warn(`⚠️ Ciclo de sync encontrou ${divergences} divergências e as corrigiu`);
        } else {
            this.logger.debug(`✅ Sync concluído — ${connectedInDB.length} chips confirmados como conectados`);
        }
    }

    // =========================================================================
    // MÉTODO PÚBLICO: Reconectar manualmente uma instância específica
    // =========================================================================

    async forceReconnect(instanceId: string): Promise<{ success: boolean; message: string }> {
        const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
        if (!instance) {
            return { success: false, message: 'Instância não encontrada' };
        }

        // Resetar o backoff
        await this.instanceRepo.update(instanceId, {
            reconnectAttempts: 0,
            reconnectLockedUntil: null as any,
        });

        await this.attemptReconnect(instance, new Date());
        return { success: true, message: `Reconexão forçada para ${instance.instanceName}` };
    }

    // =========================================================================
    // MÉTODO PÚBLICO: Reconectar TODOS os chips desconectados (ação administrativa)
    // =========================================================================

    async reconnectAll(): Promise<{ attempted: number; alreadyConnected: number }> {
        const instances = await this.instanceRepo.find({
            where: [
                { status: InstanceStatus.DISCONNECTED },
                { status: InstanceStatus.RECONNECTING },
            ],
        });

        this.logger.log(`🔄 Iniciando reconexão forçada de ${instances.length} chips...`);

        // Resetar backoff para todos
        for (const instance of instances) {
            await this.instanceRepo.update(instance.id, {
                reconnectAttempts: 0,
                reconnectLockedUntil: null as any,
            });
        }

        await this.runReconnectionCycle();

        const alreadyConnected = await this.instanceRepo.count({
            where: { status: InstanceStatus.CONNECTED },
        });

        return { attempted: instances.length, alreadyConnected };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private emitStatusUpdate(instance: Instance, status: string) {
        try {
            this.eventsGateway.emitToTenant(instance.tenantId, 'instance.status', {
                instanceId: instance.id,
                instanceName: instance.instanceName,
                status,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            // Ignorar erros de WebSocket
        }
    }
}
