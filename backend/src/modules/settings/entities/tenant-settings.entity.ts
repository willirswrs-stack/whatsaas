import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('tenant_settings')
export class TenantSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', unique: true })
    tenantId: string;

    @Column({ name: 'openai_key', nullable: true })
    openaiKey: string;

    @Column({ name: 'anthropic_key', nullable: true })
    anthropicKey: string;

    @Column({ name: 'gemini_key', nullable: true })
    geminiKey: string;

    @Column({ name: 'groq_key', nullable: true })
    groqKey: string;

    @Column('jsonb', { name: 'extra_settings', default: {} })
    extraSettings: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

