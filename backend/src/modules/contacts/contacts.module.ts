import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact, Tag, ContactTag, CustomField } from './entities/contact.entity';
import { AntiBanModule } from '../anti-ban/anti-ban.module';
import { Instance } from '../instances/entities/instance.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contact, Tag, ContactTag, CustomField, Instance]),
        AntiBanModule, // PhoneNormalizerService
    ],
    controllers: [ContactsController],
    providers: [ContactsService],
    exports: [ContactsService],
})
export class ContactsModule { }

