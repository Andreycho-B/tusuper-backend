import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async checkout(customerId: number, dto: CheckoutDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productResult = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
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
      try {
        this.notificationsService.notifyNewOrder(finalOrder);
      } catch (notifyErr: unknown) {
        this.logger.error(
          'Failed to send new-order notification',
          notifyErr instanceof Error ? notifyErr.stack : String(notifyErr),
        );
      }

      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        'Error processing checkout',
        error instanceof Error ? error.stack : String(error),
      );
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
          lock: { mode: 'pessimistic_write' },
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

      const deliveryFee = createOrderDto.deliveryFee || 0;
      totalAmount += deliveryFee;

      const order = this.orderRepository.create({
        customerId,
        paymentMethod: createOrderDto.paymentMethod,
        deliveryAddress: createOrderDto.deliveryAddress,
        deliveryNotes: createOrderDto.deliveryNotes,
        contactPhone: createOrderDto.contactPhone,
        cashChangeRequested: createOrderDto.cashChangeRequested,
        totalAmount,
        deliveryFee,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      // Notificar a Admin/Tendero
      savedOrder.customer = user;
      try {
        this.notificationsService.notifyNewOrder(savedOrder);
      } catch (notifyErr: unknown) {
        this.logger.error(
          'Failed to send new-order notification',
          notifyErr instanceof Error ? notifyErr.stack : String(notifyErr),
        );
      }

      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        'Error creating order',
        error instanceof Error ? error.stack : String(error),
      );
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
            .where('CAST(order.id AS VARCHAR) ILIKE :search', {
              search: searchTerm,
            })
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

      // Validar transicion de estado
      const allowedTransitions = VALID_TRANSITIONS.get(order.status);
      if (allowedTransitions && !allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid status transition: ${order.status} → ${newStatus}`,
        );
      }

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
      await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      // Notificar al cliente sobre el cambio de estado (fuera de la transacción de bloqueo)
      const enrichedOrder = await this.findOne(order.id);
      this.notificationsService.notifyOrderStatusChanged(
        enrichedOrder,
        enrichedOrder.customerId,
      );

      // Enviar notificacion push nativa al celular del cliente
      const statusLabel = this.getStatusLabel(enrichedOrder.status);
      const statusEmoji = this.getStatusEmoji(enrichedOrder.status);
      this.pushNotificationsService
        .sendToUser(
          enrichedOrder.customerId,
          `${statusEmoji} ${statusLabel}`,
          `Tu pedido #${enrichedOrder.id} fue actualizado a "${statusLabel}". Toca para ver.`,
          { orderId: enrichedOrder.id, status: enrichedOrder.status },
        )
        .catch((err) => {
          this.logger.error(
            'Push notification failed',
            err instanceof Error ? err.stack : String(err),
          );
        });

      // Notificar al staff si fue cancelado
      if (enrichedOrder.status === OrderStatus.CANCELLED) {
        this.notificationsService.notifyOrderCancelled(enrichedOrder);
      }

      return enrichedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Error updating order status',
        error instanceof Error ? error.stack : String(error),
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

  async confirmDelivery(
    orderId: number,
    userId: number,
    rating: number,
    feedback?: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para confirmar este pedido',
      );
    }

    if (
      order.status !== OrderStatus.DISPATCHED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Solo puedes confirmar pedidos que estén en camino o entregados',
      );
    }

    if (order.customerRating !== null) {
      throw new BadRequestException(
        'Ya has calificado este pedido anteriormente',
      );
    }

    order.customerRating = rating;
    order.customerFeedback = feedback ?? null;
    order.deliveryConfirmedAt = new Date();

    if (order.status === OrderStatus.DISPATCHED) {
      order.status = OrderStatus.DELIVERED;
    }

    await this.orderRepository.save(order);

    const enrichedOrder = await this.findOne(order.id);

    this.notificationsService.notifyOrderStatusChanged(
      enrichedOrder,
      enrichedOrder.customerId,
    );

    this.notificationsService.notifyOrderRated(enrichedOrder);

    this.pushNotificationsService
      .sendToUser(
        enrichedOrder.customerId,
        '⭐ ¡Gracias por tu opinión!',
        `Has calificado tu pedido #${enrichedOrder.id} con ${rating}/5. ¡Gracias por tu feedback!`,
        { orderId: enrichedOrder.id, status: enrichedOrder.status },
      )
      .catch((err) => {
        this.logger.error(
          'Push notification failed for rating confirmation',
          err instanceof Error ? err.stack : String(err),
        );
      });

    return enrichedOrder;
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

  async remove(id: number, userId?: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('order.items', 'items')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      const allowedTransitions = VALID_TRANSITIONS.get(order.status);
      if (
        !allowedTransitions ||
        !allowedTransitions.includes(OrderStatus.CANCELLED)
      ) {
        throw new BadRequestException(
          `No se puede cancelar un pedido en estado ${order.status}.`,
        );
      }

      if (typeof userId === 'number' && order.customerId !== userId) {
        throw new ForbiddenException(
          'No tienes permiso para cancelar este pedido',
        );
      }

      if (order.stockDeducted) {
        await this.restoreStock(queryRunner, order.items);
        order.stockDeducted = false;
      }

      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      // Notificar cancelacion al staff fuera de la transaccion
      const enrichedOrder = await this.findOne(order.id);
      this.notificationsService.notifyOrderCancelled(enrichedOrder);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[OrdersService.remove] id=${id} userId=${userId}`,
        error instanceof Error ? error.stack : error,
      );
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

  private getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Pendiente',
      [OrderStatus.PREPARING]: 'En preparación',
      [OrderStatus.READY_FOR_DISPATCH]: 'Listo para despachar',
      [OrderStatus.DISPATCHED]: 'En camino',
      [OrderStatus.DELIVERED]: 'Entregado',
      [OrderStatus.CANCELLED]: 'Cancelado',
    };
    return labels[status] || status;
  }

  private getStatusEmoji(status: OrderStatus): string {
    const emojis: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '📋',
      [OrderStatus.PREPARING]: '👨‍🍳',
      [OrderStatus.READY_FOR_DISPATCH]: '📦',
      [OrderStatus.DISPATCHED]: '🛵',
      [OrderStatus.DELIVERED]: '✅',
      [OrderStatus.CANCELLED]: '❌',
    };
    return emojis[status] || '📋';
  }
}
