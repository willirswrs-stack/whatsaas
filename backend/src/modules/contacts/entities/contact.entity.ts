import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    JoinTable,
    JoinColumn,
    OneToMany,
} from 'typeorm';

import { CampaignContact } from '../../campaigns/entities/campaign.entity';

@Entity('contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
    tenantId: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'varchar', nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ name: 'custom_fields', type: 'jsonb', default: {} })
    customFields: Record<string, any>;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string;


    @Column({ name: 'is_valid', type: 'boolean', default: true })
    isValid: boolean;

    @Column({ name: 'on_whatsapp', type: 'boolean', nullable: true })
    onWhatsapp: boolean;

    @Column({ name: 'last_interaction', type: 'timestamp', nullable: true })
    lastInteraction: Date;

    @Column({ name: 'opted_out', type: 'boolean', default: false })
    optedOut: boolean;

    @Column({ name: 'opted_out_at', type: 'timestamp', nullable: true })
    optedOutAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relacionamento com Tags (será resolvido depois)
    tags?: Tag[];

    @OneToMany(() => CampaignContact, (cc) => cc.contact)
    campaignContacts: CampaignContact[];
}

@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 7, default: '#a855f7' })
    color: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'contact_count', type: 'int', default: 0 })
    contactCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('contact_tags')
export class ContactTag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'contact_id', type: 'uuid' })
    contactId: string;

    @Column({ name: 'tag_id', type: 'uuid' })
    tagId: string;

    @CreateDateColumn({ name: 'added_at' })
    addedAt: Date;
}

@Entity('custom_fields')
export class CustomField {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 100 })
    key: string; // slug do campo, ex: "data_nascimento"

    @Column({ type: 'varchar', length: 20, default: 'text' })
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';

    @Column({ type: 'jsonb', nullable: true })
    options: string[]; // Para campos do tipo 'select'

    @Column({ type: 'boolean', default: false })
    required: boolean;

    @Column({ type: 'int', default: 0, name: 'field_order' })
    order: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
