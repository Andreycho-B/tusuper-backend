import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './domain/enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    // Inyección obligatoria para el control transaccional ACID
    private readonly dataSource: DataSource,
  ) {}

  async create(
    customerId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    // 1. Inicialización de la Transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 2. Iteración y Validación de Inventario (Zero Trust)
      for (const itemDto of createOrderDto.items) {
        // Consultar producto con bloqueo para concurrencia (evita que otro pedido robe el stock simultáneamente)
        const products = await queryRunner.manager.query(
          `SELECT id, price, stock FROM product WHERE id = $1 FOR UPDATE`,
          [itemDto.productId],
        );

        if (!products || products.length === 0) {
          throw new NotFoundException(
            `El producto con ID ${itemDto.productId} no existe en el inventario.`,
          );
        }

        const currentProduct = products[0];

        if (currentProduct.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${itemDto.productId}. Solicitado: ${itemDto.quantity}, Disponible: ${currentProduct.stock}`,
          );
        }

        // 3. Cálculos matemáticos en el servidor
        const unitPrice = Number(currentProduct.price);
        const subTotal = unitPrice * itemDto.quantity;
        totalAmount += subTotal;

        // 4. Descuento de inventario dentro de la transacción
        await queryRunner.manager.query(
          `UPDATE product SET stock = stock - $1 WHERE id = $2`,
          [itemDto.quantity, itemDto.productId],
        );

        // 5. Construcción en memoria del OrderItem
        const orderItem = this.orderItemRepository.create({
          productId: itemDto.productId,
          quantity: itemDto.quantity,
          unitPrice: unitPrice,
          subTotal: subTotal,
        });
        orderItems.push(orderItem);
      }

      // 6. Construcción y persistencia del Pedido
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

      // 7. Confirmación de la Transacción (Commit)
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      // 8. Reversión de la Transacción (Rollback)
      // Si falla la creación del pedido o cualquier descuento de stock, se deshace todo.
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 9. Liberación de la conexión
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find({ relations: ['items'] });
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
      // 1. Obtener la orden con sus items
      const order = await this.findOne(id);

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('El pedido ya se encuentra cancelado.');
      }

      // 2. Extraer cantidades por productId
      const productQuantities = new Map<number, number>();
      for (const item of order.items) {
        const currentQuantity = productQuantities.get(item.productId) || 0;
        productQuantities.set(item.productId, currentQuantity + item.quantity);
      }

      // 3. Obtener productIds únicos y ordenarlos ascendentemente (prevención de deadlocks)
      const productIds = Array.from(productQuantities.keys()).sort(
        (a, b) => a - b,
      );

      // 4. Ejecutar bloqueos y actualizaciones en orden estricto
      for (const productId of productIds) {
        const quantity = productQuantities.get(productId);

        // Bloquear el producto para actualización
        const productResult = await queryRunner.manager.query(
          `SELECT id, stock FROM product WHERE id = $1 FOR UPDATE`,
          [productId],
        );

        if (!productResult || productResult.length === 0) {
          throw new NotFoundException(
            `Producto con ID ${productId} no encontrado`,
          );
        }

        // Restaurar el stock (reversión)
        await queryRunner.manager.query(
          `UPDATE product SET stock = stock + $1 WHERE id = $2`,
          [quantity, productId],
        );
      }

      // 5. Actualizar estado de la orden a CANCELLED
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      // 6. Confirmar transacción
      await queryRunner.commitTransaction();
    } catch (error) {
      // 7. Revertir transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 8. Liberar conexión
      await queryRunner.release();
    }
  }
}
