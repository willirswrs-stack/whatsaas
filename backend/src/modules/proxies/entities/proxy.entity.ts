import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Instance } from '../../instances/entities/instance.entity';

@Entity('proxies')
export class ProxyEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ default: 'iproyal' })
    provider: string; // iproyal, proxy-cheap, etc

    @Column()
    host: string;

    @Column()
    port: string;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column({ name: 'assignedInstanceId', type: 'uuid', nullable: true })
    assignedInstanceId: string | null; // O ID do chip do Evolution/Waha

    @Column({ name: 'expirationDate', type: 'timestamp', nullable: true })
    expirationDate: Date;

    @Column({ default: 'active' }) // active, expired, suspended
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;

    @OneToMany(() => Instance, (instance) => instance.proxy)
    instances: Instance[];
}
