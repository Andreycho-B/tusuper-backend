import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../domain/enums/order-status.enum';
import { PaymentStatus } from '../domain/enums/payment-status.enum';
import { OrderItem } from './order-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_ORDER_CUSTOMER')
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Index('IDX_ORDER_STATUS')
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'delivery_address', type: 'varchar', length: 255 })
  deliveryAddress: string;

  @Column({ name: 'delivery_notes', type: 'text', nullable: true })
  deliveryNotes: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  deliveryFee: number;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone: string;

  @Column({
    name: 'cash_change_requested',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cashChangeRequested: number;

  @Column({ name: 'stock_deducted', type: 'boolean', default: false })
  stockDeducted: boolean;

  @Column({ name: 'customer_rating', type: 'smallint', nullable: true })
  customerRating: number | null;

  @Column({ name: 'customer_feedback', type: 'text', nullable: true })
  customerFeedback: string | null;

  @Column({ name: 'delivery_confirmed_at', type: 'timestamp', nullable: true })
  deliveryConfirmedAt: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Index('IDX_ORDER_CREATED_AT')
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
