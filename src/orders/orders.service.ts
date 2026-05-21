import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, Brackets } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Product } from '../inventory/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from './domain/enums/order-status.enum';
import { PaymentStatus } from './domain/enums/payment-status.enum';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const VALID_TRANSITIONS: ReadonlyMap<OrderStatus, readonly OrderStatus[]> =
  new Map<OrderStatus, readonly OrderStatus[]>([
    [
      OrderStatus.PENDING,
      [OrderStatus.PREPARING, OrderStatus.CANCELLED] as const,
    ],
    [
      OrderStatus.PREPARING,
      [OrderStatus.READY_FOR_DISPATCH, OrderStatus.CANCELLED] as const,
    ],
    [
      OrderStatus.READY_FOR_DISPATCH,
      [OrderStatus.DISPATCHED, OrderStatus.CANCELLED] as const,
    ],
    [
      OrderStatus.DISPATCHED,
      [OrderStatus.DELIVERED, OrderStatus.CANCELLED] as const,
    ],
    [OrderStatus.DELIVERED, [] as const],
    [OrderStatus.CANCELLED, [] as const],
  ]);

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(customerId: number, dto: CheckoutDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productResult = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
      });

      if (!productResult) {
        throw new NotFoundException(
          `Product with ID ${dto.productId} not found.`,
        );
      }

      if (productResult.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ID ${dto.productId}. Requested: ${dto.quantity}, Available: ${productResult.stock}`,
        );
      }

      const unitPrice = Number(productResult.price);
      const subTotal = unitPrice * dto.quantity;

      const orderItem = this.orderItemRepository.create({
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice,
        subTotal,
      });

      const order = this.orderRepository.create({
        customerId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
        deliveryAddress: 'Simulated Address MVP',
        contactPhone: '000000000',
        totalAmount: subTotal,
        deliveryFee: 0,
        items: [orderItem],
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      // Notificar a Admin/Tendero
      const finalOrder = await this.findOne(savedOrder.id);
      this.notificationsService.notifyNewOrder(finalOrder);

      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error processing checkout transaction',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async create(
    customerId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: customerId },
      });

      if (!user) {
        throw new NotFoundException(
          `El usuario con ID ${customerId} no existe.`,
        );
      }

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      const sortedItems = [...createOrderDto.items].sort(
        (a, b) => a.productId - b.productId,
      );

      for (const itemDto of sortedItems) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `El producto con ID ${itemDto.productId} no existe en el inventario.`,
          );
        }

        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${itemDto.productId}. Solicitado: ${itemDto.quantity}, Disponible: ${product.stock}`,
          );
        }

        const unitPrice = Number(product.price);
        const subTotal = unitPrice * itemDto.quantity;
        totalAmount += subTotal;

        const orderItem = this.orderItemRepository.create({
          productId: itemDto.productId,
          quantity: itemDto.quantity,
          unitPrice,
          subTotal,
        });
        orderItems.push(orderItem);
      }

      const order = this.orderRepository.create({
        customerId,
        paymentMethod: createOrderDto.paymentMethod,
        deliveryAddress: createOrderDto.deliveryAddress,
        deliveryNotes: createOrderDto.deliveryNotes,
        contactPhone: createOrderDto.contactPhone,
        cashChangeRequested: createOrderDto.cashChangeRequested,
        totalAmount,
        deliveryFee: createOrderDto.deliveryFee || 0,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      // Notificar a Admin/Tendero
      savedOrder.customer = user;
      this.notificationsService.notifyNewOrder(savedOrder);

      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error processing order transaction',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAllAdmin(filters: OrderFilterDto): Promise<PaginatedResult<Order>> {
    const { limit = 10, offset = 0 } = filters;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters.startDate) {
      qb.andWhere('order.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere('order.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('CAST(order.id AS VARCHAR) ILIKE :search', { search: searchTerm })
            .orWhere('customer.email ILIKE :search', { search: searchTerm })
            .orWhere('customer.firstName ILIKE :search', { search: searchTerm })
            .orWhere('customer.lastName ILIKE :search', { search: searchTerm });
        }),
      );
    }

    qb.orderBy('order.createdAt', 'DESC').take(limit).skip(offset);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, limit, offset };
  }

  async findMyOrders(
    customerId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    const { limit = 10, offset = 0 } = pagination;

    const [data, total] = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.customerId = :customerId', { customerId })
      .orderBy('order.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { data, total, limit, offset };
  }

  async updateStatus(orderId: number, newStatus: OrderStatus): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (order.status === newStatus) {
        throw new BadRequestException(
          `Order is already in status ${newStatus}`,
        );
      }

      // La validación de transiciones se flexibiliza para permitir gestión total desde el panel administrativo
      /*
      const allowedTransitions = VALID_TRANSITIONS.get(order.status);

      if (!allowedTransitions?.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid status transition: ${order.status} → ${newStatus}`,
        );
      }
      */

      if (newStatus === OrderStatus.READY_FOR_DISPATCH) {
        const items = await queryRunner.manager.find(OrderItem, {
          where: { order: { id: orderId } },
        });
        await this.deductStock(queryRunner, items);
        order.stockDeducted = true;
      }

      if (newStatus === OrderStatus.CANCELLED && order.stockDeducted) {
        const items = await queryRunner.manager.find(OrderItem, {
          where: { order: { id: orderId } },
        });
        await this.restoreStock(queryRunner, items);
        order.stockDeducted = false;
      }

      order.status = newStatus;
      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      // Notificar al cliente sobre el cambio de estado (fuera de la transacción de bloqueo)
      const enrichedOrder = await this.findOne(order.id);
      this.notificationsService.notifyOrderStatusChanged(
        enrichedOrder,
        enrichedOrder.customerId,
      );

      return enrichedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      console.error(
        '[OrdersService.updateStatus] Error updating status:',
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error processing status update transaction',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async remove(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.items', 'items')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('El pedido ya se encuentra cancelado.');
      }

      if (order.stockDeducted) {
        await this.restoreStock(queryRunner, order.items);
        order.stockDeducted = false;
      }

      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error processing order cancellation',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async deductStock(
    queryRunner: QueryRunner,
    items: OrderItem[],
  ): Promise<void> {
    const productQuantities = new Map<number, number>();
    for (const item of items) {
      const current = productQuantities.get(item.productId) ?? 0;
      productQuantities.set(item.productId, current + item.quantity);
    }

    const productIds = Array.from(productQuantities.keys()).sort((a, b) => a - b);

    for (const productId of productIds) {
      const quantity = productQuantities.get(productId) ?? 0;

      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${productId} no encontrado durante deducción de stock`,
        );
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `Stock insuficiente para producto ID ${productId}. Solicitado: ${quantity}, Disponible: ${product.stock}`,
        );
      }

      product.stock -= quantity;
      await queryRunner.manager.save(Product, product);
    }
  }

  private async restoreStock(
    queryRunner: QueryRunner,
    items: OrderItem[],
  ): Promise<void> {
    const productQuantities = new Map<number, number>();
    for (const item of items) {
      const currentQuantity = productQuantities.get(item.productId) || 0;
      productQuantities.set(item.productId, currentQuantity + item.quantity);
    }

    const productIds = Array.from(productQuantities.keys()).sort(
      (a, b) => a - b,
    );

    for (const productId of productIds) {
      const quantity = productQuantities.get(productId) ?? 0;

      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${productId} no encontrado durante restauración de stock`,
        );
      }

      product.stock += quantity;
      await queryRunner.manager.save(Product, product);
    }
  }
}
