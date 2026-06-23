import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn
} from 'typeorm';
import { Instance } from './instance.entity';

@Entity('chip_details')
export class ChipDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'instance_id' })
    instanceId: string;

    @OneToOne(() => Instance, (instance) => instance.chipDetail, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'instance_id' })
    instance: Instance;

    @Column({ nullable: true })
    carrier: string;

    @Column({ name: 'device_name', nullable: true })
    deviceName: string;

    @Column({ name: 'is_in_drawer', type: 'boolean', default: false })
    isInDrawer: boolean;

    @Column({ name: 'plan_type', nullable: true })
    planType: string;

    @Column({ type: 'date', name: 'recharge_date', nullable: true })
    rechargeDate: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'recharge_value', nullable: true })
    rechargeValue: number;

    @Column({ type: 'date', name: 'expiration_date', nullable: true })
    expirationDate: Date;

    @Column({ name: 'health_score', type: 'int', default: 100 })
    healthScore: number;

    @Column({ name: 'ban_count', type: 'int', default: 0 })
    banCount: number;

    @Column({ name: 'unban_count', type: 'int', default: 0 })
    unbanCount: number;

    @Column('text', { array: true, default: [] })
    tags: string[];

    @Column({ name: 'physical_location', nullable: true })
    physicalLocation: string;

    @Column({ nullable: true })
    iccid: string;

    @Column('jsonb', { name: 'profile_status', default: {} })
    profileStatus: Record<string, boolean>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
