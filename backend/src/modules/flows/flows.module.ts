import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { FlowFolder } from './entities/flow-folder.entity';
import { CampaignContact } from '../campaigns/entities/campaign.entity';
import { InstancesModule } from '../instances/instances.module';
import { ContactsModule } from '../contacts/contacts.module';
import { AiModule } from '../ai/ai.module';
import { FLOW_QUEUE } from '../../config/bull.config';
import { FlowExecutionProcessor } from './flow-execution.processor';
import { MetaTemplatesModule } from '../meta-templates/meta-templates.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Flow, FlowExecution, FlowTrigger, FlowFolder, CampaignContact]),
        BullModule.registerQueue({
            name: FLOW_QUEUE,
        }),
        InstancesModule,
        ContactsModule,
        ContactsModule,
        AiModule,
        MetaTemplatesModule,
    ],
    controllers: [FlowsController, FoldersController],
    providers: [FlowsService, FoldersService, FlowExecutionProcessor],
    exports: [FlowsService, FoldersService],
})
export class FlowsModule { }

