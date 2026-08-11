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
import { AiService } from '../ai/ai.service';

@Processor(WARMUP_QUEUE)
@Injectable()
export class WarmupProcessor extends WorkerHost {
  private readonly logger = new Logger(WarmupProcessor.name);

  constructor(
    private readonly warmupService: WarmupService,
    private readonly whatsappFactory: WhatsAppProviderFactory,
    private readonly humanBehavior: HumanBehaviorService,
    private readonly activePrevention: ActivePreventionService,
    private readonly aiService: AiService,
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
    const {
      instanceId,
      instanceName,
      toPhone,
      content,
      provider,
      tenantId,
      msgType,
      isAudio,
      mediaUrl,
    } = job.data;
    const resolvedProvider = provider || 'evolution';
    const targetType = msgType || (isAudio ? 'audio' : 'text');

    this.logger.log(
      `💌 Sending Warmup Message (${targetType}): ${instanceName} -> ${toPhone} (provider: ${resolvedProvider})`,
    );

    try {
      let senderInstance: Instance | null = null;
      // VERIFICAÇÃO DE SEGURANÇA 1: O remetente ainda está conectado?
      if (instanceId) {
        senderInstance = await this.instanceRepo.findOne({
          where: { id: instanceId },
        });
        if (!senderInstance || senderInstance.status !== 'connected') {
          this.logger.warn(
            `🛑 Remetente ${instanceName} não está conectado (Status: ${senderInstance?.status}). Abortando envio para evitar falhas.`,
          );
          return { success: false, reason: 'sender_disconnected' };
        }
      }

      // VERIFICAÇÃO DE SEGURANÇA 2: O destinatário ainda está conectado?
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

      // VERIFICAÇÃO DE SEGURANÇA 3: O provedor (Evolution/WAHA) concorda que está conectado?
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

      // --- [PREVENÇÃO ATIVA & DISPARO DE MÍDIAS] ---
      await this.activePrevention.applyPrevention(instanceId);

      let result: any;

      if (targetType === 'audio') {
        this.logger.log(`🎙️ Generating voice TTS for warmup background job...`);
        const HUMAN_VOICES = ['nova', 'onyx', 'echo', 'shimmer', 'fable', 'alloy'];
        const voice = senderInstance?.metaConfig?.voiceProfile || HUMAN_VOICES[Math.floor(Math.random() * HUMAN_VOICES.length)];
        const speed = Number(senderInstance?.metaConfig?.voiceSpeed) || 1.0;
        const model = senderInstance?.metaConfig?.voiceModel || 'tts-1-hd';

        let base64Audio = '';
        try {
          const buffer = await this.aiService.synthesizeSpeech(
            content,
            voice,
            speed,
            model,
            tenantId,
          );
          base64Audio = buffer.toString('base64');
        } catch (synthErr) {
          this.logger.warn(`TTS Synthesis failed: ${synthErr.message}. Fallback to text.`);
        }

        if (base64Audio) {
          await client.sendPresence(instanceName, toPhone, 'recording', 3000);
          result = await client.sendMedia(instanceName, toPhone, {
            type: 'audio',
            url: base64Audio,
            filename: 'audio.mp3',
          });
        } else {
          await client.sendPresence(instanceName, toPhone, 'composing', 2000);
          result = await client.sendText(instanceName, toPhone, content);
        }
      } else if (targetType === 'image') {
        this.logger.log(`🖼️ Sending warmup image...`);
        const sampleImages = [
          'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop',
        ];
        const imgUrl =
          mediaUrl ||
          sampleImages[Math.floor(Math.random() * sampleImages.length)];

        await client.sendPresence(instanceName, toPhone, 'composing', 2000);
        result = await client.sendMedia(instanceName, toPhone, {
          type: 'image',
          url: imgUrl,
          caption: content,
        });
      } else if (targetType === 'sticker') {
        this.logger.log(`🏷️ Sending warmup sticker...`);
        const sampleStickers = [
          'https://raw.githubusercontent.com/wppconnect-team/wppconnect/main/templates/sticker.webp',
        ];
        const stickerUrl =
          mediaUrl ||
          sampleStickers[Math.floor(Math.random() * sampleStickers.length)];

        await client.sendPresence(instanceName, toPhone, 'composing', 1500);
        if (client.sendSticker) {
          result = await client.sendSticker(instanceName, toPhone, {
            url: stickerUrl,
          });
        } else {
          result = await client.sendMedia(instanceName, toPhone, {
            type: 'sticker',
            url: stickerUrl,
          });
        }
      } else {
        // Text message
        const timing = this.humanBehavior.generateTimingMetadata(content);
        await client.sendPresence(
          instanceName,
          toPhone,
          'composing',
          timing.typingDurationMs,
        );
        result = await client.sendText(instanceName, toPhone, content);
      }

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
        `✅ Warmup Message (${targetType}) Sent with Active Protection | instanceName=${instanceName} | to=${toPhone}`,
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
