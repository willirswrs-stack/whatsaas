import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/** Settings salvas por tenant (configurações específicas do cliente) */
@Entity('tenant_settings')
export class TenantSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', unique: true })
    tenantId: string;

    // ─── Chaves de API (por tenant) ───────────────────────────
    @Column({ name: 'openai_key', nullable: true })
    openaiKey: string;

    @Column({ name: 'anthropic_key', nullable: true })
    anthropicKey: string;

    @Column({ name: 'gemini_key', nullable: true })
    geminiKey: string;

    @Column({ name: 'groq_key', nullable: true })
    groqKey: string;

    /** Settings extras por tenant (elevenLabsKey, etc.) */
    @Column('jsonb', { name: 'extra_settings', default: {} })
    extraSettings: Record<string, any>;

    /**
     * Configurações globais — apenas o Super Admin pode alterar.
     * Armazenadas no tenant virtual "system" (tenantId = 'system').
     * Inclui: LLM global, dias de aquecimento, prompts dos agentes.
     */
    @Column('jsonb', { name: 'global_config', default: {} })
    globalConfig: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
