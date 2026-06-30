/**
 * WarmupProcessor - Job Processor for Warmup Tasks
 *
 * Handles background jobs related to instance warmup:
 * 1. Daily warmup advancement (scheduled)
 * 2. Warmup conversation generation (future)
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { WarmupService } from './warmup.service';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { HumanBehaviorService } from './human-behavior.service';
import { ActivePreventionService } from './active-prevention.service';

@Processor(WARMUP_QUEUE)
@Injectable()
export class WarmupProcessor extends WorkerHost {
  private readonly logger = new Logger(WarmupProcessor.name);

  constructor(
    private readonly warmupService: WarmupService,
    private readonly whatsappFactory: WhatsAppProviderFactory,
    private readonly humanBehavior: HumanBehaviorService,
    private readonly activePrevention: ActivePreventionService,
    @InjectRepository(Instance)
    private instanceRepo: Repository<Instance>,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`🔥 Processing Warmup Job: ${job.name}`);

    switch (job.name) {
      case 'daily-warmup-routine':
        return this.handleDailyWarmup(job);

      case 'continuous-warmup-routine':
        return this.handleContinuousWarmup(job);

      case 'execute-warmup-message':
        return this.handleWarmupMessage(job);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleDailyWarmup(job: Job): Promise<any> {
    this.logger.log('📅 Starting Daily Warmup Routine check...');
    try {
      const result = await this.warmupService.executeDailyWarmupRoutine();
      this.logger.log(`✅ Daily Warmup Completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Warmup Routine Failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleContinuousWarmup(job: Job): Promise<any> {
    this.logger.log('💧 Starting Continuous Warmup Routine...');
    try {
      const result = await this.warmupService.executeContinuousWarmupRoutine();
      this.logger.log(
        `✅ Continuous Warmup Completed: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Continuous Warmup Failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleWarmupMessage(job: Job): Promise<any> {
    const { instanceId, instanceName, toPhone, content, provider } = job.data;
    const resolvedProvider = provider || 'evolution';
    this.logger.log(
      `💌 Sending Warmup Message: ${instanceName} -> ${toPhone} (provider: ${resolvedProvider})`,
    );

    try {
      // VERIFICAÇÃO DE SEGURANÇA 1: O remetente ainda está conectado?
      if (instanceId) {
        const sender = await this.instanceRepo.findOne({
          where: { id: instanceId },
        });
        if (!sender || sender.status !== 'connected') {
          this.logger.warn(
            `🛑 Remetente ${instanceName} não está conectado (Status: ${sender?.status}). Abortando envio para evitar falhas.`,
          );
          return { success: false, reason: 'sender_disconnected' };
        }
      }

      // VERIFICAÇÃO DE SEGURANÇA 2: O destinatário ainda está conectado?
      // Enviar mensagens repetidas para um número desconectado gera um padrão robótico no WhatsApp (apenas 1 check)
      if (toPhone) {
        const receiver = await this.instanceRepo.findOne({
          where: { phone: toPhone },
        });
        if (!receiver || receiver.status !== 'connected') {
          this.logger.warn(
            `🛑 Destinatário ${toPhone} (${receiver?.instanceName || 'Desconhecido'}) não está conectado. Abortando envio para proteger o remetente contra banimento.`,
          );
          return { success: false, reason: 'receiver_disconnected' };
        }
      }

      const client = this.whatsappFactory.getProvider(resolvedProvider);

      // VERIFICAÇÃO DE SEGURANÇA 3: O provedor (Evolution/WAHA) concorda que está conectado? (À prova de falhas de webhook)
      try {
        const senderStatus = await client.getStatus(instanceName);
        if (senderStatus.status !== 'connected') {
          this.logger.warn(
            `🛑 Remetente ${instanceName} consta como '${senderStatus.status}' diretamente no Provedor! Abortando envio.`,
          );
          return { success: false, reason: 'sender_disconnected_provider' };
        }
      } catch (e) {
        this.logger.warn(
          `🛑 Falha ao checar status do remetente no provedor: ${e.message}. Abortando por segurança.`,
        );
        return { success: false, reason: 'provider_check_failed' };
      }

      // --- [PREVENÇÃO ATIVA] ---
      // 1. Simular comportamento humano (Presença/Digitação)
      const timing = this.humanBehavior.generateTimingMetadata(content);
      this.logger.log(
        `🎭 [Prevenção] ${instanceName} digitando por ${timing.typingDurationMs}ms...`,
      );

      await client.sendPresence(
        instanceName,
        toPhone,
        'composing',
        timing.typingDurationMs,
      );

      // 2. Aplicar Telemetria de Hardware (Bateria/Movimento)
      await this.activePrevention.applyPrevention(instanceId);

      // 3. Enviar a mensagem após a simulação
      const result = await client.sendText(instanceName, toPhone, content);

      if (instanceId) {
        await this.instanceRepo
          .increment({ id: instanceId }, 'dailySent', 1)
          .catch((err) => {
            this.logger.warn(
              `Failed to increment dailySent for instance ${instanceId}: ${err.message}`,
            );
          });
      }

      this.logger.log(
        `✅ Warmup Message Sent with Active Protection | instanceName=${instanceName} | to=${toPhone}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send warmup message | instance=${instanceName} | to=${toPhone} | error=${error.message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job ${job.id} has failed: ${job.failedReason}`);
  }
}
