import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('webhook_event_types')
@Index(['code'], { unique: true })
export class WebhookEventType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50, unique: true })
    code: string;

    @Column({ length: 100 })
    label: string;

    @Column({ nullable: true })
    description: string;

    @Column('jsonb', { name: 'default_payload_schema', nullable: true })
    defaultPayloadSchema: Record<string, any>;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

// Default event types to seed
export const DEFAULT_EVENT_TYPES = [
    {
        code: 'order_created',
        label: 'Pedido Criado',
        description: 'Disparado quando um novo pedido é criado',
    },
    {
        code: 'order_paid',
        label: 'Pedido Pago',
        description: 'Disparado quando o pagamento é confirmado',
    },
    {
        code: 'order_shipped',
        label: 'Pedido Enviado',
        description: 'Disparado quando o pedido é despachado',
    },
    {
        code: 'order_out_for_delivery',
        label: 'Pedido Saiu para Entrega',
        description: 'Disparado quando o pedido está a caminho',
    },
    {
        code: 'order_delivered',
        label: 'Pedido Entregue',
        description: 'Disparado quando o pedido é entregue',
    },
    {
        code: 'order_canceled',
        label: 'Pedido Cancelado',
        description: 'Disparado quando o pedido é cancelado',
    },
    {
        code: 'order_rescheduled',
        label: 'Entrega Reagendada',
        description: 'Disparado quando a data de entrega é alterada',
    },
    {
        code: 'delivery_failed',
        label: 'Entrega Falhou',
        description: 'Disparado quando há falha na entrega',
    },
];
