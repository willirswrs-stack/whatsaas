import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { FlowFolder } from './entities/flow-folder.entity';
import { InstancesModule } from '../instances/instances.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Flow, FlowExecution, FlowTrigger, FlowFolder]),
        InstancesModule,
        ContactsModule,
    ],
    controllers: [FlowsController, FoldersController],
    providers: [FlowsService, FoldersService],
    exports: [FlowsService, FoldersService],
})
export class FlowsModule { }
