import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../instances/entities/instance.entity';

export enum ChipStage {
  REGISTRATION = 'registration',
  MOBILE_WARMUP = 'mobile_warmup',
  WEB_MIGRATION = 'web_migration',
  MATURE = 'mature',
  SOLD = 'sold'
}

@Injectable()
export class ChipLifecycleService {
  private readonly logger = new Logger(ChipLifecycleService.name);

  constructor(
    @InjectRepository(Instance)
    private instanceRepo: Repository<Instance>,
  ) {}

  async calculateTrustScore(instanceId: string): Promise<number> {
    const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
    if (!instance) return 0;

    let score = 0;
    score += Math.min((instance.warmupDay || 0) * 10, 50);
    
    if (instance.provider === 'mobile_farm' as any) {
      score += 30;
    } else if (instance.provider === 'antidetect' as any) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  async promoteStage(instanceId: string) {
    const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
    if (!instance) return;

    if (instance.warmupDay >= 3 && instance.provider === 'mobile_farm' as any) {
      this.logger.log(`📱 Chip ${instance.phone || instance.id} pronto para migração para Web Antidetect.`);
    }
    if (instance.warmupDay >= 10) {
      this.logger.log(`⭐ Chip ${instance.phone || instance.id} atingiu maturidade máxima. Pronto para venda!`);
    }
  }
}
