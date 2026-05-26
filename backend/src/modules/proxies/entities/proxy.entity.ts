import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('proxies')
export class ProxyEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string;

    @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
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

    @Column({ nullable: true })
    assignedInstanceId: string; // O ID do chip do Evolution/Waha

    @Column({ type: 'timestamp', nullable: true })
    expirationDate: Date;

    @Column({ default: 'active' }) // active, expired, suspended
    status: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
