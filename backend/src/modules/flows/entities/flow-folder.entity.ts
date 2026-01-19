import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('flow_folders')
export class FlowFolder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ name: 'parent_id', nullable: true })
    parentId: string;

    @ManyToOne(() => FlowFolder, folder => folder.children, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent: FlowFolder;

    @OneToMany(() => FlowFolder, folder => folder.parent)
    children: FlowFolder[];

    @Column({ default: false })
    archived: boolean;

    @Column({ default: 0 })
    order: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
