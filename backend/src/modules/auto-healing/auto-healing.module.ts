import { Module, Global } from '@nestjs/common';
import { AutoHealingService } from './auto-healing.service';
import { AutoHealingGateway } from './auto-healing.gateway';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [AiModule],
  providers: [AutoHealingService, AutoHealingGateway],
  exports: [AutoHealingService, AutoHealingGateway],
})
export class AutoHealingModule {}
