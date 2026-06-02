import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Message } from './entities/message.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Instance } from '../instances/entities/instance.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { InboxCleanupService } from './inbox-cleanup.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Message, Contact, Instance, Tenant]),
    ],
    controllers: [InboxController],
    providers: [InboxService, InboxCleanupService],
    exports: [InboxService],
})
export class InboxModule {}

