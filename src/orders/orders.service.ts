import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Product } from '../inventory/entities/product.entity';
import { OrderStatus } from './domain/enums/order-status.enum';
import { PaymentStatus } from './domain/enums/payment-status.enum';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

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
  ) {}

  async checkout(customerId: number, dto: CheckoutDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productResult = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: dto.productId })
        .getOne();

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

      await queryRunner.manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock - ${dto.quantity}` })
        .where('id = :id', { id: dto.productId })
        .execute();

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

      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
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
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      const sortedItems = [...createOrderDto.items].sort(
        (a, b) => a.productId - b.productId,
      );

      for (const itemDto of sortedItems) {
        const productData = (await queryRunner.manager.query(
          `SELECT id, price, stock FROM product WHERE id = $1 FOR UPDATE`,
          [itemDto.productId],
        )) as unknown as {
          id: number;
          price: string | number;
          stock: number;
        }[];

        if (!productData || productData.length === 0) {
          throw new NotFoundException(
            `El producto con ID ${itemDto.productId} no existe en el inventario.`,
          );
        }

        const product = productData[0];

        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${itemDto.productId}. Solicitado: ${itemDto.quantity}, Disponible: ${product.stock}`,
          );
        }

        const unitPrice = Number(product.price);
        const subTotal = unitPrice * itemDto.quantity;
        totalAmount += subTotal;

        await queryRunner.manager.query(
          `UPDATE product SET stock = stock - $1 WHERE id = $2`,
          [itemDto.quantity, itemDto.productId],
        );

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
      return savedOrder;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Order>> {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.orderRepository.findAndCount({
      relations: ['items'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { data, total, limit, offset };
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
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
      const order = await this.findOne(id);

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('El pedido ya se encuentra cancelado.');
      }

      const productQuantities = new Map<number, number>();
      for (const item of order.items) {
        const currentQuantity = productQuantities.get(item.productId) || 0;
        productQuantities.set(item.productId, currentQuantity + item.quantity);
      }

      const productIds = Array.from(productQuantities.keys()).sort(
        (a, b) => a - b,
      );

      for (const productId of productIds) {
        const quantity = productQuantities.get(productId);

        const productResult = (await queryRunner.manager.query(
          `SELECT id, stock FROM product WHERE id = $1 FOR UPDATE`,
          [productId],
        )) as unknown as { id: number; stock: number }[];

        if (!productResult || productResult.length === 0) {
          throw new NotFoundException(
            `Producto con ID ${productId} no encontrado`,
          );
        }

        await queryRunner.manager.query(
          `UPDATE product SET stock = stock + $1 WHERE id = $2`,
          [quantity, productId],
        );
      }

      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
